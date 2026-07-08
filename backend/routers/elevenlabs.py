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
    # Optional IPA hint: when set, wraps text in SSML <phoneme alphabet="ipa"
    # ph="…">…</phoneme> and auto-switches to eleven_turbo_v2. If unset, the
    # engine still scans ``text`` for inline /…/ fragments and wraps each
    # in an SSML tag (auto model switch applies as soon as any wrap occurs).
    ipa_phoneme: Optional[str] = None


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
    inline_ipa_hits: list[str] = []

    def _xml_escape(s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    if ipa_clean:
        # Explicit single-phoneme override (Audio Studio Sparkles button,
        # or auto-generated for isolated clips).
        fallback = _xml_escape(text) or ipa_clean
        ph_attr  = ipa_clean.replace('"', "&quot;")
        final_text = f'<phoneme alphabet="ipa" ph="{ph_attr}">{fallback}</phoneme>'
        ssml_used = True
    else:
        # -----------------------------------------------------------------
        # Empirical finding (08/02/2026):
        #   ElevenLabs multilingual_v2 (and turbo_v2) with Professional
        #   Voice Clones produce heavily truncated audio when SSML
        #   ``<phoneme>`` tags appear inside prose. A 6-word sentence
        #   went from 2.12 s (plain) → 1.02 s (SSML), essentially
        #   dropping the tail of the utterance. The voice clone reads
        #   through the first tag then stops.
        #
        #   For MNEMONIC PROSE the surface spelling is already perfect
        #   (Steve is a native speaker) — so we STRIP the bracket
        #   syntax back to surface words and send natural prose to TTS.
        #   For BARE ``/ipa/`` fragments (isolated-phoneme demonstrations
        #   like "Say /ʌ/") we keep the SSML wrap because the clip is
        #   supposed to be short by design.
        # -----------------------------------------------------------------
        bracket_re = re.compile(r'\[([^\|\]\r\n]{1,40})\|/([^/\r\n]{1,20})/\]')
        bare_re    = re.compile(r'/([^/\s]{1,8})/')

        # 1. Strip bracket syntax to surface spelling (no SSML for prose).
        def _bracket_to_surface(m: re.Match) -> str:
            inline_ipa_hits.append(m.group(2).strip())
            return m.group(1).strip()
        text_after_brackets = bracket_re.sub(_bracket_to_surface, text)

        # 2. Scan the (bracket-stripped) text for bare ``/ipa/`` fragments
        #    → SSML wrap those (isolated phoneme demonstrations).
        if bare_re.search(text_after_brackets):
            parts: list[str] = []
            last = 0
            for m in bare_re.finditer(text_after_brackets):
                if m.start() > last:
                    parts.append(_xml_escape(text_after_brackets[last:m.start()]))
                ipa = m.group(1)
                inline_ipa_hits.append(ipa)
                ph_attr  = ipa.replace('"', "&quot;")
                fallback = ph_attr
                parts.append(f'<phoneme alphabet="ipa" ph="{ph_attr}">{fallback}</phoneme>')
                last = m.end()
            if last < len(text_after_brackets):
                parts.append(_xml_escape(text_after_brackets[last:]))
            final_text = "".join(parts)
            ssml_used = True
        else:
            # No bare IPA remaining → pure prose, no SSML wrap.
            final_text = text_after_brackets
            ssml_used = False

    # NOTE (Feb 2026): earlier versions of this file force-switched the
    # request to ``eleven_turbo_v2`` whenever SSML ``<phoneme>`` tags were
    # emitted, based on outdated docs. Per ElevenLabs docs 2026,
    # ``eleven_multilingual_v2`` supports SSML phoneme tags (IPA + Arpabet)
    # in all 29 of its languages — so the auto-switch is unnecessary and
    # actively harmful for Professional Voice Clones trained on
    # multilingual_v2 (they lose their timbre on turbo_v2 and start
    # sounding like the base voice, which for an Italian-labelled voice
    # produces an Italian-accented English). We therefore respect
    # whichever ``model_id`` the caller provided.
    #
    # Explicit safety net: only Eleven V3 does NOT support SSML phoneme
    # tags — in that specific case we fall back to multilingual_v2.
    if ssml_used and (model_id or "").startswith("eleven_v3"):
        model_id = "eleven_multilingual_v2"

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
        "inline_ipa_hits": inline_ipa_hits or None,
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

        Uses the shared ``synthesize_and_store`` helper so it benefits from
        the same SSML IPA logic (auto-wrap of ``/ʌ/`` fragments, explicit
        ``ipa_phoneme`` override, auto model-switch to ``eleven_turbo_v2``
        when SSML is used).
        """
        if not (req.text or "").strip():
            raise HTTPException(status_code=400, detail="text obbligatorio")
        try:
            res = synthesize_and_store(
                text=req.text,
                voice_id=req.voice_id or "",
                emergent_put=emergent_put,
                uploads_dir=uploads_dir,
                stability=req.stability,
                similarity_boost=req.similarity_boost,
                style=req.style,
                use_speaker_boost=req.use_speaker_boost,
                model_id=req.model_id,
                output_format=req.output_format,
                filename_hint=req.filename_hint,
                ipa_phoneme=req.ipa_phoneme,
            )
            # Enrich with echo fields for backward-compat with older callers
            res["text"]          = req.text
            res["output_format"] = req.output_format
            return res
        except RuntimeError as e:
            # ``synthesize_and_store`` raises RuntimeError for config or empty-audio
            raise HTTPException(status_code=502, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            logging.exception("ElevenLabs TTS failed")
            raise HTTPException(status_code=502, detail=f"ElevenLabs error: {e}")

    return router
