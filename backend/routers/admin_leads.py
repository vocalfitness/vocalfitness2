"""
Admin Leads / CRM — REST API router.

Exposes the small CRM API surface used by the admin lead inbox:

* ``GET    /admin/leads``                — list bookings with filters
* ``PATCH  /admin/leads/{lead_id}``      — update ``status`` / ``internal_notes``
* ``POST   /admin/leads/{lead_id}/email`` — send a templated (or free-form)
  rich-text email through Zoho SMTP with variable substitution and log
  the touch on the lead document.

Templates are inlined here (EN + IT) so the admin can pick a template key
(``welcome`` | ``followup`` | ``proposal``) *or* pass a fully custom
``subject`` / ``body`` override. Variable placeholders are the double-brace
mustache form ``{{name}}`` — kept intentionally simple; no template engine.
"""

from __future__ import annotations

import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Email templates (EN + IT)
# --------------------------------------------------------------------------- #
_TEMPLATES: Dict[str, Dict[str, Dict[str, str]]] = {
    "welcome": {
        "en": {
            "subject": "Welcome to VocalFitness — your diagnostic assessment",
            "body": (
                "<p>Hi {{name}},</p>"
                "<p>Thank you for completing your VocalFitness onboarding. Based on your profile "
                "(<strong>{{englishLevel}} · {{role}}</strong>), we are preparing a tailored diagnostic session.</p>"
                "<p>You will hear from us within 48 hours with the proposed schedule and a brief preparation note.</p>"
                "<p>In the meantime, feel free to reply to this email with any context you'd like us to know.</p>"
                "<p>— VocalFitness Team</p>"
            ),
        },
        "it": {
            "subject": "Benvenuto in VocalFitness — la tua valutazione diagnostica",
            "body": (
                "<p>Ciao {{name}},</p>"
                "<p>Grazie per aver completato l'onboarding di VocalFitness. In base al tuo profilo "
                "(<strong>{{englishLevel}} · {{role}}</strong>), stiamo preparando una sessione diagnostica su misura.</p>"
                "<p>Ti contatteremo entro 48 ore con la pianificazione proposta e una breve nota di preparazione.</p>"
                "<p>Nel frattempo, sentiti libero di rispondere a questa email con eventuali contesti utili.</p>"
                "<p>— Il Team VocalFitness</p>"
            ),
        },
    },
    "followup": {
        "en": {
            "subject": "Follow-up: VocalFitness diagnostic — next steps",
            "body": (
                "<p>Hi {{name}},</p>"
                "<p>Following up on your VocalFitness onboarding submission. Given your <strong>{{englishLevel}}</strong> "
                "level and your role as <strong>{{role}}</strong> in the <strong>{{sector}}</strong> sector, "
                "we have outlined a recommended path that integrates with your current schedule.</p>"
                "<p>Would you have 20 minutes this week for a brief diagnostic call? Reply with two preferred slots and we'll lock one in.</p>"
                "<p>— VocalFitness Team</p>"
            ),
        },
        "it": {
            "subject": "Follow-up: diagnostica VocalFitness — prossimi passi",
            "body": (
                "<p>Ciao {{name}},</p>"
                "<p>Ti scrivo come follow-up della tua compilazione di onboarding VocalFitness. Considerando il tuo livello "
                "<strong>{{englishLevel}}</strong> e il ruolo di <strong>{{role}}</strong> nel settore <strong>{{sector}}</strong>, "
                "abbiamo delineato un percorso consigliato che si integra con il tuo calendario attuale.</p>"
                "<p>Avresti 20 minuti questa settimana per una breve call diagnostica? Rispondi con due slot preferiti e ne fissiamo uno.</p>"
                "<p>— Il Team VocalFitness</p>"
            ),
        },
    },
    "proposal": {
        "en": {
            "subject": "Custom proposal — VocalFitness for {{role}}",
            "body": (
                "<p>Hi {{name}},</p>"
                "<p>As discussed, please find below an outline of a tailored VocalFitness programme calibrated to "
                "<strong>{{englishLevel}}</strong> level and <strong>{{role}}</strong> use cases:</p>"
                "<ul>"
                "<li>Diagnostic assessment (90 min, complimentary)</li>"
                "<li>Articulatory & prosody focus modules — 6 sessions</li>"
                "<li>Application sessions in {{sector}} contexts — 4 sessions</li>"
                "</ul>"
                "<p>I can send the full proposal PDF on request, or set a 20-minute call to walk you through it.</p>"
                "<p>— VocalFitness Team</p>"
            ),
        },
        "it": {
            "subject": "Proposta su misura — VocalFitness per {{role}}",
            "body": (
                "<p>Ciao {{name}},</p>"
                "<p>Come discusso, trovi qui sotto la traccia di un programma VocalFitness su misura calibrato sul livello "
                "<strong>{{englishLevel}}</strong> e sui casi d'uso del ruolo <strong>{{role}}</strong>:</p>"
                "<ul>"
                "<li>Sessione diagnostica (90 min, gratuita)</li>"
                "<li>Moduli focus articolazione e prosodia — 6 sessioni</li>"
                "<li>Sessioni di applicazione in contesti {{sector}} — 4 sessioni</li>"
                "</ul>"
                "<p>Posso inviare il PDF completo della proposta su richiesta, oppure fissare una call di 20 minuti per illustrartela.</p>"
                "<p>— Il Team VocalFitness</p>"
            ),
        },
    },
}


def _render(template: str, variables: Dict[str, str]) -> str:
    """Very small mustache-style replacement — good enough for our fixed keys."""
    out = template
    for k, v in variables.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


def _wrap_html(body_html: str) -> str:
    return f"""
    <html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f8fafc;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">VocalFitness</h1>
        </div>
        <div style="padding:28px;color:#334155;font-size:15px;line-height:1.65;">{body_html}</div>
      </div>
    </body></html>
    """


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_admin_leads_router(db, get_admin_user: Callable) -> APIRouter:
    """
    Build and return the Admin Leads APIRouter.

    ``db`` is the motor database (uses ``db.bookings``).
    ``get_admin_user`` is the FastAPI dependency that enforces role == "admin".
    """
    router = APIRouter()

    @router.get("/admin/leads")
    async def get_admin_leads(
        admin: dict = Depends(get_admin_user),
        source: Optional[str] = None,
        englishLevel: Optional[str] = None,
        role: Optional[str] = None,
        sector: Optional[str] = None,
        nativeLanguage: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 200,
    ):
        """List bookings (leads) for the admin lead inbox with filters."""
        query: Dict[str, Any] = {}
        if source:
            query["source"] = source
        if englishLevel:
            query["englishLevel"] = englishLevel
        if role:
            query["role"] = role
        if sector:
            query["sector"] = sector
        if nativeLanguage:
            query["nativeLanguage"] = nativeLanguage
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"name":       {"$regex": search, "$options": "i"}},
                {"email":      {"$regex": search, "$options": "i"}},
                {"phone":      {"$regex": search, "$options": "i"}},
                {"motivation": {"$regex": search, "$options": "i"}},
            ]

        cursor = db.bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(min(limit, 500))
        items = await cursor.to_list(length=None)
        return {"items": items, "count": len(items)}

    @router.patch("/admin/leads/{lead_id}")
    async def update_admin_lead(
        lead_id: str,
        payload: dict,
        _admin: dict = Depends(get_admin_user),
    ):
        """Update lead status / notes."""
        allowed = {k: v for k, v in payload.items() if k in {"status", "internal_notes"}}
        if not allowed:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        result = await db.bookings.update_one({"id": lead_id}, {"$set": allowed})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        doc = await db.bookings.find_one({"id": lead_id}, {"_id": 0})
        return doc

    @router.post("/admin/leads/{lead_id}/email")
    async def send_lead_email(
        lead_id: str,
        payload: dict,
        admin: dict = Depends(get_admin_user),
    ):
        """Send a templated email to the lead via Zoho SMTP, with variable substitution."""
        template_key   = payload.get("template")
        custom_subject = (payload.get("subject") or "").strip()
        custom_body    = (payload.get("body") or "").strip()  # optional override
        lang           = payload.get("language", "en")

        lead = await db.bookings.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        if not custom_body and template_key not in _TEMPLATES:
            raise HTTPException(status_code=400, detail="Invalid template key")

        chosen = (
            _TEMPLATES.get(template_key, {}).get(lang)
            or _TEMPLATES.get(template_key, {}).get("en")
            or {}
        )
        subject_raw = custom_subject or chosen.get("subject", "VocalFitness")
        body_raw    = custom_body    or chosen.get("body", "")

        variables = {
            "name":           lead.get("name", ""),
            "englishLevel":   lead.get("englishLevel", "") or "—",
            "role":           lead.get("role", "") or "—",
            "sector":         lead.get("sector", "") or "—",
            "nativeLanguage": lead.get("nativeLanguage", "") or "—",
            "email":          lead.get("email", ""),
        }
        subject_raw = _render(subject_raw, variables)
        body_raw    = _render(body_raw, variables)

        # Send via Zoho SMTP
        smtp_server   = os.environ.get("SMTP_SERVER", "smtp.zoho.eu")
        smtp_port     = int(os.environ.get("SMTP_PORT", 587))
        smtp_user     = os.environ.get("SMTP_USER")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        if not smtp_password:
            raise HTTPException(status_code=503, detail="SMTP not configured")

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject_raw
            msg["From"]    = smtp_user
            msg["To"]      = lead.get("email", "")
            msg.attach(MIMEText(_wrap_html(body_raw), "html"))
            with smtplib.SMTP(smtp_server, smtp_port) as srv:
                srv.starttls()
                srv.login(smtp_user, smtp_password)
                srv.send_message(msg)
        except Exception as e:
            logger.error(f"Lead email send failed: {e}")
            raise HTTPException(status_code=500, detail=f"Email send failed: {e}")

        # Log the touch in the lead document
        touch = {
            "type":     "email",
            "template": template_key,
            "subject":  subject_raw,
            "language": lang,
            "by":       admin.get("username", "admin"),
            "at":       datetime.now(timezone.utc).isoformat(),
        }
        await db.bookings.update_one(
            {"id": lead_id},
            {
                "$push": {"touches": touch},
                "$set":  {"last_contacted_at": touch["at"], "status": "contacted"},
            },
        )

        return {"sent": True, "subject": subject_raw, "to": lead.get("email", "")}

    return router
