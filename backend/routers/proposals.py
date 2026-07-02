"""
Proposals — track opens + email send-out router.

Serves the ``/proposta-ey`` landing-page workflow:

* ``POST /proposals/track-open``     — public. Records a landing-page open
  and returns a sequence number for the same (page, ref) tuple so the
  page can render "aperto la Nª volta" for the recipient.
* ``GET  /admin/proposals/opens``    — admin. Lists recent opens, newest
  first, with optional ``page`` / ``ref`` filters.
* ``POST /proposals/send-by-email``  — public. Emails a PDF attachment of
  the proposal to the visitor (and BCCs the seller), then audit-logs the
  send in ``proposal_sends``.

The mapping of proposal ``page`` slugs → PDF URLs lives in
``PROPOSAL_PDFS`` — keep it here so a new landing page only needs one edit.
"""

from __future__ import annotations

import logging
import os
import re
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Callable, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
PROPOSAL_PDFS = {
    "proposta-ey": {
        "url": "https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/aytlq3w2_proposta_commerciale_E%26Y_Layla_Cannizzaro.pdf",
        "filename": "VocalFitness_Proposta_EY_Italia.pdf",
        "title": "Proposta Commerciale Esecutiva — EY Italia",
        "page_url": "https://vocalfitness.org/proposta-ey",
    },
}

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class ProposalOpenCreate(BaseModel):
    page: str                              # e.g. "proposta-ey"
    ref: Optional[str] = None              # e.g. "layla"
    referrer: Optional[str] = None
    client_tz: Optional[str] = None


class ProposalOpenResponse(BaseModel):
    id: str
    page: str
    ref: Optional[str]
    opened_at: datetime
    sequence: int


class ProposalSendRequest(BaseModel):
    email: str
    name: Optional[str] = None
    page: str
    ref: Optional[str] = None
    notify_seller: bool = True             # CC/BCC steve@vocalfitness.org


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_proposals_router(db, get_admin_user: Callable) -> APIRouter:
    router = APIRouter()

    # ---- track-open ------------------------------------------------------- #
    @router.post("/proposals/track-open", response_model=ProposalOpenResponse)
    async def track_proposal_open(payload: ProposalOpenCreate, request: Request):
        """Record one open of a proposal landing page. Returns the canonical
        opened_at timestamp (server-side) and the sequence number for the same
        (page, ref) tuple — so the client can render 'aperto la 3ª volta'."""
        ua = request.headers.get("user-agent", "")[:512]
        # Best-effort client IP — honours X-Forwarded-For from the K8s ingress.
        xff = request.headers.get("x-forwarded-for", "")
        client_ip = (
            xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")
        ) or ""

        now = datetime.now(timezone.utc)
        doc = {
            "id":         str(uuid.uuid4()),
            "page":       payload.page,
            "ref":        payload.ref or None,
            "referrer":   (payload.referrer or "")[:512],
            "client_tz":  (payload.client_tz or "")[:64],
            "user_agent": ua,
            "client_ip":  client_ip,
            "opened_at":  now.isoformat(),
        }
        await db.proposal_opens.insert_one(doc)

        # Sequence number for this (page, ref) — counts events up to and including this one.
        seq_filter = {"page": payload.page}
        if payload.ref:
            seq_filter["ref"] = payload.ref
        sequence = await db.proposal_opens.count_documents(seq_filter)

        return ProposalOpenResponse(
            id=doc["id"],
            page=doc["page"],
            ref=doc["ref"],
            opened_at=now,
            sequence=sequence,
        )

    # ---- admin list opens ------------------------------------------------- #
    @router.get("/admin/proposals/opens")
    async def list_proposal_opens(
        page: Optional[str] = None,
        ref: Optional[str] = None,
        limit: int = 200,
        _admin: dict = Depends(get_admin_user),
    ):
        """Admin: list recent proposal opens, newest first. Optional filters."""
        q = {}
        if page:
            q["page"] = page
        if ref:
            q["ref"] = ref
        items = (
            await db.proposal_opens.find(q, {"_id": 0})
            .sort("opened_at", -1)
            .to_list(max(1, min(limit, 1000)))
        )
        return {"total": len(items), "items": items}

    # ---- send by email ---------------------------------------------------- #
    @router.post("/proposals/send-by-email")
    async def send_proposal_by_email(payload: ProposalSendRequest, request: Request):
        """Email the proposal PDF as an attachment to the recipient. Used by the
        public landing page so a visitor can self-serve a copy. Best-effort: any
        SMTP failure is reported back as ``email_sent: false`` without leaking
        the underlying exception."""
        email_to = (payload.email or "").strip()
        if not _EMAIL_RE.match(email_to):
            raise HTTPException(status_code=400, detail="Indirizzo email non valido")

        proposal = PROPOSAL_PDFS.get(payload.page)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposta non trovata")

        # Download the PDF (the customer-assets host serves it via HTTPS)
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                r = await client.get(proposal["url"])
                r.raise_for_status()
                pdf_bytes = r.content
        except Exception as e:
            logger.warning(f"[send_proposal] PDF download failed: {e}")
            raise HTTPException(
                status_code=502,
                detail="Impossibile scaricare il PDF della proposta in questo momento",
            )

        if len(pdf_bytes) < 1024:
            raise HTTPException(status_code=502, detail="PDF non valido (file troppo piccolo)")

        # Compose the email
        smtp_server   = os.environ.get("SMTP_SERVER", "")
        smtp_port     = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user     = os.environ.get("SMTP_USER", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        seller_email  = "steve@vocalfitness.org"

        msg = MIMEMultipart()
        msg["From"]    = smtp_user or "admissions@vocalfitness.org"
        msg["To"]      = email_to
        msg["Subject"] = f"{proposal['title']} — VocalFitness"
        if payload.notify_seller and seller_email:
            msg["Bcc"] = seller_email

        salutation = (payload.name or "").strip() or "Gentile destinatario"
        html_body = f"""
        <html><body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background:#f8fafc; padding:20px;">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1d4ed8 0%,#4338ca 100%); padding:28px 28px 24px; color:#ffffff;">
              <p style="margin:0 0 6px; font-size:12px; letter-spacing:.18em; text-transform:uppercase; opacity:.85;">VocalFitness International</p>
              <h1 style="margin:0; font-size:22px; line-height:1.25;">{proposal['title']}</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 14px;">{salutation},</p>
              <p style="margin:0 0 14px;">come richiesto dalla landing page <a href="{proposal['page_url']}" style="color:#1d4ed8; text-decoration:none;">vocalfitness.org/proposta-ey</a>, in allegato trova il documento completo della proposta commerciale esecutiva.</p>
              <p style="margin:0 0 14px;">Il documento riassume i tre livelli dell&rsquo;offerta (Executive Elite, Blended Performance e Digital Enterprise Scaling), le modalità di erogazione e la validità dell&rsquo;offerta (60 giorni dalla data di emissione).</p>
              <p style="margin:18px 0;">
                <a href="{proposal['page_url']}" style="display:inline-block; background:linear-gradient(135deg,#2563eb,#4f46e5); color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:999px; font-weight:600; font-size:14px;">Apri la proposta interattiva</a>
              </p>
              <p style="margin:24px 0 6px; font-size:14px;">Per qualsiasi domanda o per fissare un incontro:</p>
              <p style="margin:0; font-size:14px;">
                <strong>Professor Steve Dapper</strong><br/>
                Linguist &amp; Experimental Phonetician<br/>
                <a href="mailto:steve@vocalfitness.org" style="color:#1d4ed8;">steve@vocalfitness.org</a> · +39 351 576 5749
              </p>
            </div>
            <div style="padding:14px 28px; background:#f1f5f9; color:#64748b; font-size:11px; border-top:1px solid #e2e8f0;">
              VocalFitness International · Strada del Carasoo 30, 6535 Roveredo GR (Svizzera) · vocalfitness.org
            </div>
          </div>
        </body></html>
        """
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # Attach the PDF
        attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        attachment.add_header("Content-Disposition", "attachment", filename=proposal["filename"])
        msg.attach(attachment)

        email_sent = False
        smtp_error: Optional[str] = None
        if smtp_password and smtp_server and smtp_user:
            try:
                with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as srv:
                    srv.starttls()
                    srv.login(smtp_user, smtp_password)
                    rcpts = [email_to]
                    if (
                        payload.notify_seller
                        and seller_email
                        and seller_email.lower() != email_to.lower()
                    ):
                        rcpts.append(seller_email)
                    srv.sendmail(msg["From"], rcpts, msg.as_string())
                    email_sent = True
            except Exception as e:
                smtp_error = str(e)
                logger.warning(f"[send_proposal] SMTP send failed: {e}")
        else:
            logger.warning("[send_proposal] SMTP not configured — email NOT sent")

        # Audit-log the send (separately from open tracking)
        try:
            await db.proposal_sends.insert_one({
                "id":         str(uuid.uuid4()),
                "page":       payload.page,
                "ref":        payload.ref,
                "email_to":   email_to,
                "name":       payload.name,
                "email_sent": email_sent,
                "smtp_error": smtp_error,
                "sent_at":    datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"[send_proposal] audit log insert failed: {e}")

        if not email_sent:
            # We never expose SMTP details to the client.
            raise HTTPException(
                status_code=503,
                detail="Servizio email temporaneamente non disponibile, riprova più tardi",
            )
        return {"email_sent": True}

    return router
