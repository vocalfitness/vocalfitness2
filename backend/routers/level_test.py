"""
Level Test (Lead Magnet) — public endpoints.

M2 · piece 1: ``POST /api/level-test/score`` — PUBLIC, anonymous formant
scoring for a single recorded clip (isolated phoneme OR key phoneme of a
phrase). Reuses the Phase-2 scoring core (Gaussian curve + per-formant
weights) from ``phoneme_formants`` WITHOUT auth/consent and WITHOUT persisting
the audio (transient analysis only — privacy-friendly for anonymous leads).

Architectural constraints (Emergent Support):
* Parselmouth is CPU-bound → the measurement runs in a ProcessPoolExecutor
  worker (one analysis ≈ one core), never inline in the async handler.
* No server-side session state: this endpoint is fully STATELESS. Any test
  progress lives client-side (React) or, at the gate step, in MongoDB.
"""
from __future__ import annotations

import os
import re
import asyncio
import logging
import tempfile
import difflib
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from pydantic import BaseModel


class VerdictIn(BaseModel):
    isolated: list  # [{ipa,label,target_score,lexical_ok,by_dialect:{RP,AmE}}]
    phrase_score: float | None = None

from routers.phoneme_formants import (
    _measure_all_ceilings,
    find_reference,
    fetch_and_extract,
    compute_formant_score,
    _cefr_band,
)

try:
    from emergentintegrations.llm.openai import OpenAISpeechToText
except Exception:  # noqa: BLE001
    OpenAISpeechToText = None

logger = logging.getLogger(__name__)

# --- V2 combined-verdict TUNABLE params (env) -----------------------------
_WRONG_WORD_CAP = float(os.environ.get("LEVEL_TEST_WRONG_WORD_CAP", "20"))  # A1
_W_ISO = float(os.environ.get("LEVEL_TEST_W_ISO", "0.6"))
_W_PHRASE = float(os.environ.get("LEVEL_TEST_W_PHRASE", "0.4"))
_LEXICAL_VARIANT_MODE = os.environ.get("LEVEL_TEST_LEXICAL_VARIANT_MODE", "plural")  # strict|plural|plural+typo
_ASR_MIN_CHARS = int(os.environ.get("LEVEL_TEST_ASR_MIN_CHARS", "2"))
_OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
_ASR_READY = bool(OpenAISpeechToText) and _OPENAI_KEY and _OPENAI_KEY != "REPLACE_IN_PANEL"

_MAX_WORKERS = int(os.environ.get("LEVEL_TEST_POOL_WORKERS", "2"))
_pool: ProcessPoolExecutor | None = None

# Vowel-coherence gate (option b) — TUNABLE. The Level Test is an EXAM: the user
# may produce the WRONG vowel, so we trust ONLY the HIGHEST LPC ceiling (where
# F1 tracking is most reliable). A take that is implausible at the top ceiling
# and only becomes "plausible" after the retry LOWERS the ceiling is mistracking
# → reject. (Verified on real-voice logs: correct vowels are plausible at 5500;
# the FOOT sabotage was implausible at 5500 and only fit at 5000/4500.)
# Phase-2 practice endpoint keeps the generous retry; contexts differ.
_RELIABLE_CEILINGS = set(
    int(x) for x in os.environ.get("LEVEL_TEST_RELIABLE_CEILINGS_HZ", "5500,5000").split(",")
    if x.strip().isdigit()
)
# Default gate rule: require plausibility at the TOP tested ceiling.
_GATE_TOP_CEILING_ONLY = os.environ.get("LEVEL_TEST_GATE_TOP_CEILING_ONLY", "true").lower() != "false"

# Actionable, non-technical rejection copy: example word per target vowel.
_EXAMPLE_WORD = {
    "iː": "sheep", "i": "sheep", "ɪ": "ship",
    "æ": "cat", "ʊ": "foot", "uː": "goose", "u": "goose",
}


def _coherence_ok(result: dict) -> bool:
    """True iff the target is plausible at the HIGHEST tested ceiling (where F1
    tracking is most trustworthy). Rejects windows that only fit the target
    after the retry lowered the ceiling — the mistracking signature."""
    attempts = (result.get("diagnostics") or {}).get("attempts") or []
    if not attempts:
        return False
    if _GATE_TOP_CEILING_ONLY:
        top = max(attempts, key=lambda a: int(a.get("ceiling_hz", 0) or 0))
        return bool(top.get("plausible"))
    return any(
        a.get("plausible") and int(a.get("ceiling_hz", 0) or 0) in _RELIABLE_CEILINGS
        for a in attempts
    )


def _get_pool() -> ProcessPoolExecutor:
    global _pool
    if _pool is None:
        # 'spawn' → clean workers that don't inherit the asyncio loop / Mongo
        # client from the parent (safe under fork-averse async servers).
        _pool = ProcessPoolExecutor(
            max_workers=_MAX_WORKERS, mp_context=mp.get_context("spawn")
        )
    return _pool


def _measure_from_bytes(raw: bytes):
    """Runs INSIDE a worker process: write bytes to a temp WAV and measure."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
        tf.write(raw)
        path = tf.name
    try:
        return _measure_all_ceilings(path)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


# --------------------------------------------------------------------------- #
# ASR (Whisper) + lexical correctness — Signal A of the V2 combined verdict.
# --------------------------------------------------------------------------- #
def _normalize(text: str) -> str:
    return re.sub(r"[^a-z' ]+", " ", (text or "").lower()).strip()


def _accepted_variants(expected: str) -> set:
    e = _normalize(expected)
    variants = {e}
    if _LEXICAL_VARIANT_MODE in ("plural", "plural+typo"):
        variants |= {e + "s", e + "es"}
    return variants


async def _transcribe(raw: bytes) -> str | None:
    """Outbound HTTPS to Whisper (thin-client). Returns transcript text, or None
    if ASR is unavailable/failed (caller degrades gracefully). language='en'
    forced so an Italian word is transcribed as (wrong) English, not 'recognised'."""
    if not _ASR_READY:
        return None
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
        tf.write(raw)
        path = tf.name
    try:
        stt = OpenAISpeechToText(api_key=_OPENAI_KEY)
        resp = await stt.transcribe(file=path, model="whisper-1", language="en", temperature=0)
        text = getattr(resp, "text", None)
        if text is None and isinstance(resp, dict):
            text = resp.get("text")
        return text if text is not None else str(resp)
    except Exception:  # noqa: BLE001
        logger.exception("level-test: Whisper transcription failed")
        return None
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _lexical_word(transcript: str | None, expected: str) -> dict:
    """Signal A for an isolated word → correct | wrong | uncertain."""
    if transcript is None:
        return {"status": "unavailable", "transcript": None}
    norm = _normalize(transcript)
    if len(norm.replace(" ", "")) < _ASR_MIN_CHARS:
        return {"status": "uncertain", "transcript": transcript}
    accepted = _accepted_variants(expected)
    tokens = norm.split()
    ok = any(t in accepted for t in tokens) or norm in accepted
    return {"status": "correct" if ok else "wrong", "transcript": transcript}


def _phrase_accuracy(transcript: str | None, expected: str) -> dict:
    """Signal A for the phrase → order-aware word accuracy 0..1 (or uncertain)."""
    if transcript is None:
        return {"status": "unavailable", "accuracy": None, "transcript": None}
    norm = _normalize(transcript)
    if len(norm.replace(" ", "")) < _ASR_MIN_CHARS:
        return {"status": "uncertain", "accuracy": None, "transcript": transcript}
    exp_tokens = _normalize(expected).split()
    hyp_tokens = norm.split()
    ratio = difflib.SequenceMatcher(None, exp_tokens, hyp_tokens).ratio() if exp_tokens else 0.0
    return {"status": "ok", "accuracy": round(ratio, 3), "transcript": transcript}


def build_level_test_router(db) -> APIRouter:
    router = APIRouter(prefix="/level-test", tags=["level-test"])

    @router.post("/score")
    async def score(
        file: UploadFile = File(...),
        phoneme_ipa: str = Form(...),
        expected: str = Form(""),
        kind: str = Form("word"),
        dialect: str = Form(""),
        reference_url: str = Form(""),
    ):
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Audio vuoto")
        if len(raw) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio troppo grande")

        # ---- Signal A: ASR (Whisper) — what did the user actually say? -----
        transcript = await _transcribe(raw)

        # ===================== PHRASE (lexical only) ========================
        if kind == "phrase":
            acc = _phrase_accuracy(transcript, expected)
            if acc["status"] == "uncertain":
                raise HTTPException(status_code=422, detail={
                    "message": "Non ho sentito chiaramente la frase. Riprova a voce più chiara.",
                    "reason": "asr_uncertain"})
            phrase_score = round((acc["accuracy"] or 0.0) * 100, 1) if acc["accuracy"] is not None else None
            logger.info("level-test/score PHRASE expected=%r transcript=%r accuracy=%s score=%s",
                        expected, transcript, acc["accuracy"], phrase_score)
            return {"kind": "phrase", "lexical": acc, "phrase_score": phrase_score,
                    "asr_available": _ASR_READY}

        # ============== Signal B: formant measurement (V1) ==================
        loop = asyncio.get_running_loop()
        try:
            meas = await loop.run_in_executor(_get_pool(), _measure_from_bytes, raw)
        except Exception:  # noqa: BLE001
            logger.exception("level-test/score: measurement worker failed")
            raise HTTPException(status_code=500, detail="Errore di analisi")
        if not meas:
            raise HTTPException(
                status_code=422,
                detail="Impossibile estrarre le formanti. Registra di nuovo in un ambiente silenzioso.",
            )

        # Lexical check for the isolated word.
        lexical = _lexical_word(transcript, expected) if expected else {"status": "unavailable", "transcript": transcript}
        # Uncertain (no speech captured) → ask to re-record (like the formant gate).
        if lexical["status"] == "uncertain":
            raise HTTPException(status_code=422, detail={
                "message": f"Non ho sentito chiaramente. Riprova pronunciando \"{expected}\".",
                "reason": "asr_uncertain"})

        # Score against both standards (bidialectal) unless a specific dialect
        # is requested. This feeds the verdict's AmE↔RP comparison honestly.
        dialects = [dialect] if dialect in {"AmE", "RP"} else ["RP", "AmE"]
        results: dict = {}
        errors: dict = {}
        for d in dialects:
            refs = await find_reference(db, phoneme_ipa, d)
            teacher_ref = None
            if not refs and reference_url:
                teacher_ref = await fetch_and_extract(reference_url)
            if not refs and not teacher_ref:
                errors[d] = "no_reference"
                continue
            try:
                r = compute_formant_score(meas, refs, phoneme_ipa, d, teacher_ref)
            except HTTPException as exc:
                errors[d] = exc.detail if isinstance(exc.detail, str) else (exc.detail or {}).get("reason")
                continue
            diag = r.get("diagnostics", {})
            logger.info(
                "level-test/score DIAG phoneme=%s dialect=%s f0=%s group=%s composite=%s "
                "coherence=%s attempts=%s lexical=%s transcript=%r",
                phoneme_ipa, d, r["student_formants"].get("F0"), r.get("reference_group"),
                r["composite_score"], _coherence_ok(r),
                [(a.get("ceiling_hz"), a.get("F1"), a.get("F2"), a.get("plausible")) for a in diag.get("attempts", [])],
                lexical["status"], transcript,
            )
            if not _coherence_ok(r):
                errors[d] = {"reason": "vowel_incoherence"}
                continue
            results[d] = r

        # ---- Combine A + B into the target_score --------------------------
        if lexical["status"] == "wrong":
            # Wrong WORD → crashes to A1 regardless of vowel quality. We do NOT
            # 422 here (the word was said clearly, just wrong) — it counts, low.
            best_d = max(results, key=lambda k: results[k]["composite_score"]) if results else None
            return {
                "kind": "word", "phoneme_ipa": phoneme_ipa,
                "lexical": lexical, "by_dialect": results, "best_dialect": best_d,
                "composite_score": results[best_d]["composite_score"] if best_d else None,
                "target_score": _WRONG_WORD_CAP,
                "cefr": _cefr_band(_WRONG_WORD_CAP), "asr_available": _ASR_READY,
            }

        # Correct (or ASR unavailable) → need a valid formant measurement.
        if not results:
            word = expected or _EXAMPLE_WORD.get(phoneme_ipa, "")
            hint = f" Riprova pronunciando \"{word}\"." if word else " Riprova, tenendo il suono fermo 1-2 secondi."
            raise HTTPException(status_code=422, detail={
                "message": f"Non ho riconosciuto chiaramente il suono.{hint}",
                "reason": "vowel_incoherence", "errors": errors})

        best_d = max(results, key=lambda k: results[k]["composite_score"])
        composite = results[best_d]["composite_score"]
        return {
            "kind": "word", "phoneme_ipa": phoneme_ipa,
            "lexical": lexical, "by_dialect": results, "best_dialect": best_d,
            "composite_score": composite, "target_score": composite,
            "cefr": results[best_d]["cefr"], "asr_available": _ASR_READY,
        }

    # ======================= COMBINED VERDICT ==============================
    @router.post("/verdict")
    async def verdict(body: VerdictIn = Body(...)):
        iso = body.isolated or []
        if not iso:
            raise HTTPException(status_code=400, detail="Nessun fonema valutato")
        iso_scores = [i.get("target_score", 0) or 0 for i in iso]
        iso_mean = sum(iso_scores) / len(iso_scores)

        if body.phrase_score is not None:
            overall = _W_ISO * iso_mean + _W_PHRASE * body.phrase_score
        else:
            overall = iso_mean  # phrase excluded if unavailable
        overall = round(overall, 1)

        # Bidialect: only phonemes said correctly (a wrong word is meaningless).
        rp_vals, ame_vals = [], []
        for i in iso:
            if i.get("lexical_ok"):
                bd = i.get("by_dialect") or {}
                if bd.get("RP") is not None:
                    rp_vals.append(bd["RP"])
                if bd.get("AmE") is not None:
                    ame_vals.append(bd["AmE"])
        avg = lambda a: round(sum(a) / len(a)) if a else None
        bidialect = {"rp": avg(rp_vals), "ame": avg(ame_vals),
                     "insufficient": (len(rp_vals) < 2 and len(ame_vals) < 2)}

        focus = sorted(iso, key=lambda i: i.get("target_score", 0) or 0)[:3]
        focus_out = [{
            "ipa": f.get("ipa"), "label": f.get("label"),
            "score": f.get("target_score"),
            "wrong_word": not f.get("lexical_ok", True),
        } for f in focus]

        return {
            "scorePercent": overall,
            "cefr": _cefr_band(overall),
            "iso_mean": round(iso_mean, 1),
            "phrase_score": body.phrase_score,
            "bidialect": bidialect,
            "focus": focus_out,
            "weights": {"w_iso": _W_ISO, "w_phrase": _W_PHRASE},
        }

    return router
