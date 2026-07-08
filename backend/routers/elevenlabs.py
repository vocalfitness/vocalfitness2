"""
ElevenLabs TTS / Voice Cloning — REST API router.

Exposes two admin endpoints:

* ``GET  /admin/elevenlabs/voices`` — list voices bound to the account
* ``POST /admin/elevenlabs/tts``    — synthesise audio with a voice clone
  and persist the result to Emergent Object Storage (with a local
  fallback under ``UPLOADS_DIR``). Returns a public URL ready to be
  referenced from Phoneme Cards or VocalLab profiles.

The router is built via a factory so ``server.py`` can inject the
shared ``get_admin_user`` FastAPI dependency, the ``emergent_put``
storage callable and the ``UPLOADS_DIR`` path — keeping this module
free of top-level imports from ``server.py`` (no circular deps).
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class ElevenLabsTTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None  # falls back to ELEVENLABS_DEFAULT_VOICE_ID env
    stability: float = 0.45
    similarity_boost: float = 0.85
    style: float = 0.0
    use_speaker_boost: bool = True
    model_id: str = "eleven_multilingual_v2"
    output_format: str = "mp3_44100_128"  # mp3 default; "pcm_44100" for raw waveguide source
    filename_hint: Optional[str] = None   # optional human-readable hint for saved filename


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _get_elevenlabs_client():
    """Lazy-init ElevenLabs client. Returns None if API key missing."""
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from elevenlabs.client import ElevenLabs
        return ElevenLabs(api_key=api_key)
    except Exception as e:
        logging.error(f"ElevenLabs client init failed: {e}")
        return None


# --------------------------------------------------------------------------- #
# Reusable synth+persist helper — used by /tts endpoint AND by the phoneme
# mass-audio batch runner. Kept at module scope so any router can import it.
# --------------------------------------------------------------------------- #
def synthesize_and_store(
    text: str,
    voice_id: str,
    *,
    emergent_put: Callable[[str, bytes, str], bool],
    uploads_dir: Path,
    stability: float = 0.45,
    similarity_boost: float = 0.85,
    style: float = 0.0,
    use_speaker_boost: bool = True,
    model_id: str = "eleven_multilingual_v2",
    output_format: str = "mp3_44100_128",
    filename_hint: Optional[str] = None,
    ipa_phoneme: Optional[str] = None,
) -> dict:
    """Synthesise ``text`` with ElevenLabs and persist the audio to storage.

    ⚙️ ``ipa_phoneme`` (07/07/2026): when set, the text is wrapped in an
    SSML ``<phoneme alphabet="ipa" ph="…">…</phoneme>`` tag so the model
    pronounces the exact IPA transcription rather than the surface
    spelling. This is REQUIRED for isolated phoneme clips ("say /ʌ/")
    where scientific accuracy trumps naturalness. Because ElevenLabs
    SSML phoneme tags only work with v2 English models, we AUTO-SWITCH
    to ``eleven_turbo_v2`` when an IPA hint is present (unless the caller
    explicitly overrides ``model_id``).

    Returns ``{url, relative_url, filename, voice_id, content_type, size_bytes,
    ssml_used, ipa_phoneme}``.
    """
    if not (text or "").strip():
        raise RuntimeError("text vuoto")

    client = _get_elevenlabs_client()
    if not client:
        raise RuntimeError("ElevenLabs non configurato (ELEVENLABS_API_KEY mancante)")

    vid = (voice_id or os.environ.get("ELEVENLABS_DEFAULT_VOICE_ID", "")).strip()
    if not vid:
        raise RuntimeError("voice_id mancante")

    # SSML IPA wrapping + auto-switch to SSML-compatible English model.
    # We first strip any surrounding /…/ notation the caller may have
    # passed as raw input (``/ʌ/`` → ``ʌ``).
    ipa_clean = (ipa_phoneme or "").strip().strip("/").strip()
    ssml_used = False
    final_text = text
    if ipa_clean:
        # XML-escape the fallback word (the tag's text content, spoken by
        # non-SSML-aware models as a graceful degradation).
        fallback = (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")) or ipa_clean
        ph_attr  = ipa_clean.replace('"', "&quot;")
        final_text = f'<phoneme alphabet="ipa" ph="{ph_attr}">{fallback}</phoneme>'
        ssml_used = True
        # Model auto-switch: SSML <phoneme> works ONLY on v2 English models.
        # Preserve caller override if they explicitly chose a v2 English model.
        if model_id.startswith("eleven_multilingual"):
            model_id = "eleven_turbo_v2"

    from elevenlabs import VoiceSettings
    settings = VoiceSettings(
        stability=float(stability),
        similarity_boost=float(similarity_boost),
        style=float(style),
        use_speaker_boost=bool(use_speaker_boost),
    )
    chunks = client.text_to_speech.convert(
        text=final_text,
        voice_id=vid,
        model_id=model_id,
        voice_settings=settings,
        output_format=output_format,
    )
    audio_data = b"".join(chunks)
    if not audio_data:
        raise RuntimeError("ElevenLabs ha restituito audio vuoto")

    fmt = (output_format or "").lower()
    if fmt.startswith("mp3"):
        ext, content_type = "mp3", "audio/mpeg"
    elif fmt.startswith("pcm"):
        ext, content_type = "pcm", "audio/L16"
    elif fmt.startswith("ulaw"):
        ext, content_type = "ulaw", "audio/basic"
    else:
        ext, content_type = "mp3", "audio/mpeg"

    safe_hint = re.sub(r"[^a-zA-Z0-9_-]+", "_", (filename_hint or "tts"))[:48].strip("_") or "tts"
    ts = int(datetime.now(timezone.utc).timestamp())
    filename = f"elevenlabs/{safe_hint}_{vid[:8]}_{ts}.{ext}"

    ok = emergent_put(filename, audio_data, content_type)
    if not ok:
        local_path = uploads_dir / filename
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(audio_data)

    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    public_url = f"{base}/api/uploads/{filename}" if base else f"/api/uploads/{filename}"
    return {
        "url":          public_url,
        "relative_url": f"/api/uploads/{filename}",
        "filename":     filename,
        "voice_id":     vid,
        "content_type": content_type,
        "size_bytes":   len(audio_data),
        "ssml_used":    ssml_used,
        "ipa_phoneme":  ipa_clean or None,
        "model_id":     model_id,
    }


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_elevenlabs_router(
    get_admin_user: Callable,
    emergent_put: Callable[[str, bytes, str], bool],
    uploads_dir: Path,
) -> APIRouter:
    """
    Build and return the ElevenLabs APIRouter.

    Parameters
    ----------
    get_admin_user:
        FastAPI dependency from ``server.py`` that enforces
        ``role == "admin"``.
    emergent_put:
        Callable ``(key, data, content_type) -> bool`` for uploading to
        Emergent Object Storage.
    uploads_dir:
        Local ``Path`` used as a fallback when Emergent storage upload
        fails (or is unavailable).
    """

    router = APIRouter()

    @router.get("/admin/elevenlabs/voices")
    async def list_elevenlabs_voices(_admin: dict = Depends(get_admin_user)):
        """List voices available on the connected ElevenLabs account."""
        client = _get_elevenlabs_client()
        if not client:
            raise HTTPException(
                status_code=503,
                detail="ElevenLabs non configurato (ELEVENLABS_API_KEY mancante)",
            )
        try:
            resp = client.voices.get_all()
            voices = []
            for v in (getattr(resp, "voices", None) or []):
                voices.append({
                    "voice_id":    getattr(v, "voice_id", None),
                    "name":        getattr(v, "name", ""),
                    "category":    getattr(v, "category", ""),
                    "labels":      getattr(v, "labels", {}) or {},
                    "description": getattr(v, "description", "") or "",
                    "preview_url": getattr(v, "preview_url", "") or "",
                })
            default_id = os.environ.get("ELEVENLABS_DEFAULT_VOICE_ID", "").strip()
            return {"voices": voices, "default_voice_id": default_id}
        except Exception as e:
            logging.error(f"ElevenLabs voices fetch failed: {e}")
            raise HTTPException(status_code=502, detail=f"ElevenLabs error: {e}")

    @router.post("/admin/elevenlabs/tts")
    async def elevenlabs_tts(
        req: ElevenLabsTTSRequest,
        _admin: dict = Depends(get_admin_user),
    ):
        """Generate TTS audio with the user's ElevenLabs voice clone and persist
        the result to Emergent Object Storage. Returns a public URL ready to be
        set as ``voiceClone.url`` in the VocalLab profiles or referenced elsewhere.
        """
        if not (req.text or "").strip():
            raise HTTPException(status_code=400, detail="text obbligatorio")

        client = _get_elevenlabs_client()
        if not client:
            raise HTTPException(
                status_code=503,
                detail="ElevenLabs non configurato (ELEVENLABS_API_KEY mancante)",
            )

        voice_id = (req.voice_id or os.environ.get("ELEVENLABS_DEFAULT_VOICE_ID", "")).strip()
        if not voice_id:
            raise HTTPException(
                status_code=400,
                detail="voice_id richiesto (oppure setta ELEVENLABS_DEFAULT_VOICE_ID)",
            )

        try:
            from elevenlabs import VoiceSettings
            voice_settings = VoiceSettings(
                stability=float(req.stability),
                similarity_boost=float(req.similarity_boost),
                style=float(req.style),
                use_speaker_boost=bool(req.use_speaker_boost),
            )
            # `convert` returns a generator yielding bytes chunks
            chunks = client.text_to_speech.convert(
                text=req.text,
                voice_id=voice_id,
                model_id=req.model_id,
                voice_settings=voice_settings,
                output_format=req.output_format,
            )
            audio_data = b"".join(chunks)
            if not audio_data:
                raise HTTPException(status_code=502, detail="ElevenLabs returned empty audio")

            # Pick extension/content type from output_format
            fmt = (req.output_format or "").lower()
            if fmt.startswith("mp3"):
                ext, content_type = "mp3", "audio/mpeg"
            elif fmt.startswith("pcm"):
                ext, content_type = "pcm", "audio/L16"
            elif fmt.startswith("ulaw"):
                ext, content_type = "ulaw", "audio/basic"
            else:
                ext, content_type = "mp3", "audio/mpeg"

            # Save to storage with a deterministic-ish name
            safe_hint = re.sub(r"[^a-zA-Z0-9_-]+", "_", (req.filename_hint or "tts"))[:48].strip("_") or "tts"
            ts = int(datetime.now(timezone.utc).timestamp())
            filename = f"elevenlabs/{safe_hint}_{voice_id[:8]}_{ts}.{ext}"

            ok = emergent_put(filename, audio_data, content_type)
            if not ok:
                # Fallback: write to local uploads dir
                local_path = uploads_dir / filename
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(audio_data)

            # Build public URL
            base = os.environ.get("FRONTEND_URL", "").rstrip("/")
            public_url = f"{base}/api/uploads/{filename}" if base else f"/api/uploads/{filename}"

            return {
                "url": public_url,
                "relative_url": f"/api/uploads/{filename}",
                "filename": filename,
                "voice_id": voice_id,
                "content_type": content_type,
                "size_bytes": len(audio_data),
                "text": req.text,
                "model_id": req.model_id,
                "output_format": req.output_format,
            }
        except HTTPException:
            raise
        except Exception as e:
            logging.exception("ElevenLabs TTS failed")
            raise HTTPException(status_code=502, detail=f"ElevenLabs error: {e}")

    return router
