"""
Phoneme Recordings router — Student self-assessment (Phase 1, audio only).

Students record themselves pronouncing a phoneme or an example word directly
in the browser (MediaRecorder). The recorded clip is persisted to Emergent
object storage and a metadata document is stored in ``phoneme_recordings``
linked to the student, the card, the phoneme (IPA), the target dialect
(AmE/GenAm or RP) and a UTC timestamp.

No scoring, no LPC, no video — the spectrogram comparison is rendered fully
client-side by reusing the existing ``SpectrogramView`` component.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

_ALLOWED_EXT = {"webm", "ogg", "m4a", "mp4", "wav", "mp3"}
_CONTENT_TYPES = {
    "webm": "audio/webm",
    "ogg": "audio/ogg",
    "m4a": "audio/mp4",
    "mp4": "audio/mp4",
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
}
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB — a short spoken clip is well under this


def build_phoneme_recordings_router(
    db,
    get_current_user: Callable,
    emergent_put: Callable[[str, bytes, str], bool],
    uploads_dir,
) -> APIRouter:
    router = APIRouter(prefix="/phonemes", tags=["phoneme-recordings"])

    def _serialize(doc: dict) -> dict:
        base = os.environ.get("FRONTEND_URL", "").rstrip("/")
        rel = doc.get("audio_url", "")
        return {
            "id": doc.get("id"),
            "card_id": doc.get("card_id"),
            "phoneme_ipa": doc.get("phoneme_ipa"),
            "dialect": doc.get("dialect"),
            "target_kind": doc.get("target_kind"),
            "target_label": doc.get("target_label"),
            "audio_url": f"{base}{rel}" if base and rel.startswith("/") else rel,
            "relative_url": rel,
            "content_type": doc.get("content_type"),
            "size_bytes": doc.get("size_bytes"),
            "created_at": doc.get("created_at"),
        }

    @router.post("/{card_id}/recordings")
    async def create_recording(
        card_id: str,
        file: UploadFile = File(...),
        phoneme_ipa: str = Form(...),
        dialect: str = Form(...),
        target_kind: str = Form("phoneme"),
        target_label: str = Form(""),
        current_user: dict = Depends(get_current_user),
    ):
        """Persist a student recording + metadata. Requires authentication."""
        if dialect not in {"AmE", "RP"}:
            raise HTTPException(status_code=400, detail="Dialetto non valido (AmE|RP)")
        if target_kind not in {"phoneme", "word"}:
            raise HTTPException(status_code=400, detail="target_kind non valido")

        # GDPR: audio consent required before persisting any recording.
        consent = await db.user_consents.find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not consent or not consent.get("audio_granted"):
            raise HTTPException(status_code=403, detail="Consenso audio mancante.")

        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Registrazione vuota")
        if len(raw) > _MAX_BYTES:
            raise HTTPException(status_code=413, detail="Registrazione troppo grande (max 15 MB)")

        orig = file.filename or "rec.webm"
        ext = orig.rsplit(".", 1)[-1].lower() if "." in orig else "webm"
        if ext not in _ALLOWED_EXT:
            # MediaRecorder mimeType may not carry an extension — fall back to webm.
            ext = "webm"
        content_type = _CONTENT_TYPES.get(ext, "audio/webm")

        student_id = current_user["id"]
        safe_student = re.sub(r"[^a-zA-Z0-9_-]+", "_", str(student_id))[:40]
        ts = int(datetime.now(timezone.utc).timestamp())
        filename = f"recordings/{safe_student}/{card_id}_{ts}_{uuid.uuid4().hex[:8]}.{ext}"

        ok = emergent_put(filename, raw, content_type)
        if not ok:
            local_path = uploads_dir / filename
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(raw)

        doc = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "student_name": current_user.get("full_name") or current_user.get("username", ""),
            "card_id": card_id,
            "phoneme_ipa": phoneme_ipa,
            "dialect": dialect,
            "target_kind": target_kind,
            "target_label": (target_label or "").strip()[:120],
            "audio_url": f"/api/uploads/{filename}",
            "filename": filename,
            "content_type": content_type,
            "size_bytes": len(raw),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.phoneme_recordings.insert_one(doc)
        return _serialize(doc)

    @router.get("/{card_id}/recordings")
    async def list_recordings(
        card_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """List the current student's recordings for a card, newest first."""
        cursor = db.phoneme_recordings.find(
            {"card_id": card_id, "student_id": current_user["id"]}, {"_id": 0}
        ).sort("created_at", -1)
        docs = await cursor.to_list(length=200)
        return [_serialize(d) for d in docs]

    @router.delete("/recordings/{recording_id}")
    async def delete_recording(
        recording_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Delete a recording the student owns."""
        doc = await db.phoneme_recordings.find_one({"id": recording_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Registrazione non trovata")
        if doc.get("student_id") != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Non autorizzato")
        await db.phoneme_recordings.delete_one({"id": recording_id})
        return {"deleted": True, "id": recording_id}

    return router
