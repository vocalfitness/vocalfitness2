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
import time
import asyncio
import logging
import tempfile
import difflib
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel


class VerdictIn(BaseModel):
    isolated: list  # [{ipa,label,target_score,lexical_ok,by_dialect:{RP,AmE}}]
    phrase_score: float | None = None

from routers.phoneme_formants import (
    _measure_all_ceilings,
    find_reference,
    fetch_and_extract,
    compute_formant_score,
    score_against_reference,
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
# Whisper key: prefer the Emergent universal key (works for whisper-1); fall back
# to a real OpenAI key if the user later swaps in their own. The placeholder means
# "not set" → ASR stays off (graceful degrade).
_EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
_OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
_ASR_KEY = _EMERGENT_KEY or (_OPENAI_KEY if _OPENAI_KEY and _OPENAI_KEY != "REPLACE_IN_PANEL" else "")
_ASR_READY = bool(OpenAISpeechToText) and bool(_ASR_KEY)

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
# Gate rule: accept a take if the target is plausible at ANY RELIABLE ceiling
# (5500 OR 5000). Relaxed from "top ceiling only" because back rounded vowels
# (e.g. /ɔː/ LAW) legitimately mistrack at 5500Hz (spurious high F2) while
# tracking cleanly at 5000Hz — the strict top-ceiling rule was REJECTING correct
# pronunciations. The wrong-word sabotage vector is now covered by the Whisper
# lexical gate, so we no longer need the top-ceiling rule to catch it.
_GATE_TOP_CEILING_ONLY = os.environ.get("LEVEL_TEST_GATE_TOP_CEILING_ONLY", "false").lower() != "false"

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
        stt = OpenAISpeechToText(api_key=_ASR_KEY)
        with open(path, "rb") as fh:
            resp = await stt.transcribe(
                file=fh, model="whisper-1", language="en",
                temperature=0, response_format="json",
            )
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


def _lexical_similar(token: str, expected: str) -> bool:
    """Coarse 'law-ish' acceptance (Option B). Whisper conflates short minimal
    pairs (law↔low, bird↔bad) BOTH ways, so on isolated monosyllables we accept
    the phonetic NEIGHBOURHOOD and leave the fine vowel-quality discrimination
    (law /ɔː/ monophthong vs low /əʊ/ diphthong) to the formant engine. We reject
    only clearly different / non-English / Italian words (different onset AND low
    character overlap)."""
    if not token or not expected:
        return False
    if token == expected:
        return True
    ratio = difflib.SequenceMatcher(None, token, expected).ratio()
    same_onset = token[0] == expected[0]
    close_len = abs(len(token) - len(expected)) <= 2
    # Short target (≤5 chars): same onset + similar length = a mis-hearing of it.
    if len(expected) <= 5 and same_onset and close_len:
        return True
    # General fallback: high character overlap (reordered / minor typos).
    return ratio >= 0.6


def _lexical_word(transcript: str | None, expected: str) -> dict:
    """Signal A — COARSE lexical gate → correct | wrong | uncertain (Option B).
    'correct' = the target word OR a plausible mis-hearing neighbour (accent-safe).
    'wrong' = a clearly different word (Italian / unrelated) → A1 cap. Fine vowel
    quality is judged by the formant engine, NOT here."""
    if transcript is None:
        return {"status": "unavailable", "transcript": None}
    norm = _normalize(transcript)
    if len(norm.replace(" ", "")) < _ASR_MIN_CHARS:
        return {"status": "uncertain", "transcript": transcript}
    exp = _normalize(expected)
    accepted = _accepted_variants(expected)
    tokens = norm.split() or [norm]
    ok = (
        norm in accepted
        or any(t in accepted for t in tokens)
        or any(_lexical_similar(t, exp) for t in tokens)
    )
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


def build_level_test_router(db, get_admin_user=None, emergent_put=None, uploads_dir=None) -> APIRouter:
    router = APIRouter(prefix="/level-test", tags=["level-test"])

    # ------------------------------------------------------------------ #
    # M2.3 · Audio-da-imitare (word-example) — resolver + admin generator.
    # Reads/writes the CANONICAL store on the phoneme cards
    # (audio.{dialect}.wordExample). Generation is PREDISPOSED but is NEVER
    # invoked automatically — an admin must call it explicitly, per slot.
    # ------------------------------------------------------------------ #
    @router.get("/word-examples")
    async def word_examples():
        """The 6 word-example slots (LAW/BIRD/TRAP × RP/US) with live state
        (ready | da_generare), from the single canonical card store."""
        from data.level_test_word_examples import get_word_example_slots
        return {"slots": await get_word_example_slots(db)}

    @router.post("/admin/word-examples/generate")
    async def generate_word_example(
        payload: dict = Body(...),
        admin: dict = Depends(get_admin_user) if get_admin_user else None,
    ):
        """PREDISPOSED (not auto-run): persist ONE word-example clip URL into the
        canonical card store. The reference is the WHOLE WORD ("law"/"bird"/"cat")
        in a NATURAL voice — NOT an SSML-forced isolated phoneme. ``slot['ipa']``
        stays a DATA field only (verdict / expert detail), never a synthesis input.

        NOTE ON SOURCE (pending decision): the strongest asset for a lead magnet
        selling the Prof.'s method is a REAL recording of the Prof. saying the word
        in each accent — upload it via ``/admin/elevenlabs/upload-audio`` then patch
        its URL here. ElevenLabs synthesis with a SINGLE cloned voice CANNOT produce
        an authentic RP↔US divergence for BIRD (same voice, plain word = same output);
        it is kept here only as a fallback and synthesises the plain word text."""
        if not (emergent_put and uploads_dir):
            raise HTTPException(status_code=503, detail="Generazione audio non configurata")
        from data.level_test_word_examples import LEVEL_TEST_WORD_EXAMPLES
        phoneme = (payload or {}).get("phoneme")
        dialect = (payload or {}).get("dialect")
        url = (payload or {}).get("url")  # manual upload path: attach a real recording
        slot = next((s for s in LEVEL_TEST_WORD_EXAMPLES
                     if s["phoneme"] == phoneme and s["dialect"] == dialect), None)
        if not slot:
            raise HTTPException(status_code=404, detail="Slot parola-esempio inesistente")
        if not url:
            # Fallback synthesis: PLAIN WORD, natural voice (no SSML phoneme).
            from routers.elevenlabs import synthesize_and_store
            res = synthesize_and_store(
                slot["word"], os.environ.get("ELEVENLABS_DEFAULT_VOICE_ID", ""),
                emergent_put=emergent_put, uploads_dir=uploads_dir,
                filename_hint=f"leveltest_word_{slot['label']}_{dialect}",
            )
            url = res.get("relative_url") or res.get("url", "")
        await db.phoneme_cards.update_one(
            {"id": slot["card_id"]},
            {"$set": {f"audio.{dialect}.wordExample": {
                "word": slot["word"], "ipa": slot["ipa"], "url": url}}},
        )
        return {"phoneme": phoneme, "dialect": dialect, "url": url, "state": "ready"}

    @router.post("/admin/word-examples/upload")
    async def upload_word_example(
        file: UploadFile = File(...),
        phoneme: str = Form(...),
        dialect: str = Form(...),
        admin: dict = Depends(get_admin_user) if get_admin_user else None,
    ):
        """Attach a REAL recording (the Prof.'s voice) to a word-example slot.
        Stored under /api/uploads/leveltest/ and written into the canonical card
        store (single source of truth, reusable by lessons)."""
        if not emergent_put:
            raise HTTPException(status_code=503, detail="Storage non configurato")
        from data.level_test_word_examples import LEVEL_TEST_WORD_EXAMPLES
        slot = next((s for s in LEVEL_TEST_WORD_EXAMPLES
                     if s["phoneme"] == phoneme and s["dialect"] == dialect), None)
        if not slot:
            raise HTTPException(status_code=404, detail="Slot parola-esempio inesistente")
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File vuoto")
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File troppo grande (max 5 MB)")
        orig = file.filename or "clip.mp3"
        ext = orig.rsplit(".", 1)[-1].lower() if "." in orig else "mp3"
        if ext not in {"mp3", "wav", "ogg", "m4a", "flac", "aac"}:
            raise HTTPException(status_code=415, detail=f"Estensione non supportata: .{ext}")
        ctype = {"mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
                 "m4a": "audio/mp4", "flac": "audio/flac", "aac": "audio/aac"}.get(ext, "audio/mpeg")
        filename = f"leveltest/{slot['label']}_{dialect}_{int(time.time())}.{ext}"
        ok = emergent_put(filename, raw, ctype)
        if not ok and uploads_dir:
            p = uploads_dir / filename
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(raw)
        url = f"/api/uploads/{filename}"
        await db.phoneme_cards.update_one(
            {"id": slot["card_id"]},
            {"$set": {f"audio.{dialect}.wordExample": {
                "word": slot["word"], "ipa": slot["ipa"], "url": url}}},
        )
        return {"phoneme": phoneme, "dialect": dialect, "url": url, "state": "ready"}

    # ------------------------------------------------------------------ #
    # Publication gate. DRAFT-NOT-PUBLISH: 6/6 ready is only the PREREQUISITE
    # that ENABLES the toggle. The system NEVER auto-publishes — an admin must
    # explicitly set approved=true after listening to the clips.
    # ------------------------------------------------------------------ #
    @router.get("/config")
    async def level_test_config():
        from data.level_test_word_examples import get_word_example_slots
        slots = await get_word_example_slots(db)
        ready = sum(1 for s in slots if s["state"] == "ready")
        total = len(slots)
        cfg = await db.level_test_config.find_one({"key": "config"}, {"_id": 0}) or {}
        approved = bool(cfg.get("approved", False))
        return {
            "approved": approved, "ready_count": ready, "total": total,
            "can_publish": ready == total,           # prerequisite for the toggle
            "published": approved and ready == total,  # public gate condition
        }

    @router.post("/admin/config")
    async def set_level_test_config(
        payload: dict = Body(...),
        admin: dict = Depends(get_admin_user) if get_admin_user else None,
    ):
        approved = bool((payload or {}).get("approved", False))
        if approved:
            from data.level_test_word_examples import get_word_example_slots
            slots = await get_word_example_slots(db)
            if any(s["state"] != "ready" for s in slots):
                raise HTTPException(
                    status_code=409,
                    detail="Non puoi pubblicare: servono tutte e 6 le clip audio pronte.",
                )
        await db.level_test_config.update_one(
            {"key": "config"}, {"$set": {"key": "config", "approved": approved}}, upsert=True
        )
        return {"approved": approved}

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

        # ---- Signal A: lexical check (transcript computed above) -----------
        lexical = _lexical_word(transcript, expected) if expected else {"status": "unavailable", "transcript": transcript}
        if lexical["status"] == "uncertain":
            raise HTTPException(status_code=422, detail={
                "message": f"Non ho sentito chiaramente. Riprova pronunciando \"{expected}\".",
                "reason": "asr_uncertain"})

        # Option-1: the SHOWN dialect (what the card presents) is the PRIMARY score.
        # The other dialect is scored on the SAME measurement window (single window)
        # purely for the verdict's bidialectal comparison — never to inflate the
        # primary score. Default shown = RP (isolated cards are presented in RP).
        shown = dialect if dialect in {"AmE", "RP"} else "RP"
        other = "AmE" if shown == "RP" else "RP"

        def _wrong_word_result(by_dialect, primary_composite):
            return {
                "kind": "word", "phoneme_ipa": phoneme_ipa, "shown_dialect": shown,
                "lexical": lexical, "by_dialect": by_dialect,
                "best_dialect": shown if by_dialect else None,
                "composite_score": primary_composite, "target_score": _WRONG_WORD_CAP,
                "cefr": _cefr_band(_WRONG_WORD_CAP), "asr_available": _ASR_READY,
            }

        # Wrong WORD (said clearly, but not the target) → capped at A1 regardless of
        # vowel quality. Short-circuit: no need to measure formants.
        if lexical["status"] == "wrong":
            logger.info("level-test/score WRONG-WORD phoneme=%s expected=%r transcript=%r -> A1",
                        phoneme_ipa, expected, transcript)
            return _wrong_word_result({}, None)

        # ============== Signal B: formant measurement ======================
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

        refs_shown = await find_reference(db, phoneme_ipa, shown)
        teacher_ref = None
        if not refs_shown and reference_url:
            teacher_ref = await fetch_and_extract(reference_url)
        if not refs_shown and not teacher_ref:
            raise HTTPException(status_code=422, detail={
                "message": "Riferimento non disponibile per questo suono.", "reason": "no_reference"})

        def _incoherent_error(reason):
            word = expected or _EXAMPLE_WORD.get(phoneme_ipa, "")
            hint = f" Riprova pronunciando \"{word}\"." if word else " Riprova, tenendo il suono fermo 1-2 secondi."
            return HTTPException(status_code=422, detail={
                "message": f"Non ho riconosciuto chiaramente il suono.{hint}",
                "reason": reason or "vowel_incoherence"})

        # PRIMARY = shown dialect: this call selects the SINGLE LPC window + gate.
        try:
            primary = compute_formant_score(meas, refs_shown, phoneme_ipa, shown, teacher_ref)
        except HTTPException as exc:
            reason = exc.detail if isinstance(exc.detail, str) else (exc.detail or {}).get("reason")
            raise _incoherent_error(reason)

        diag = primary.get("diagnostics", {})
        logger.info(
            "level-test/score DIAG phoneme=%s shown=%s f0=%s group=%s composite=%s "
            "coherence=%s attempts=%s lexical=%s transcript=%r",
            phoneme_ipa, shown, primary["student_formants"].get("F0"), primary.get("reference_group"),
            primary["composite_score"], _coherence_ok(primary),
            [(a.get("ceiling_hz"), a.get("F1"), a.get("F2"), a.get("plausible")) for a in diag.get("attempts", [])],
            lexical["status"], transcript,
        )
        if not _coherence_ok(primary):
            raise _incoherent_error("vowel_incoherence")

        # Same-window bidialectal comparison (verdict only — NEVER inflates primary).
        student = primary["student_formants"]
        f0 = meas.get("f0_global")

        def _pack(res):
            return {"composite_score": res["composite_score"], "cefr": res["cefr"],
                    "per_formant": res["per_formant"], "reference_group": res.get("reference_group")}

        by_dialect = {shown: _pack(primary)}
        refs_other = await find_reference(db, phoneme_ipa, other)
        o = score_against_reference(student, f0, refs_other, phoneme_ipa, other) if refs_other else None
        if o:
            by_dialect[other] = _pack(o)
        logger.info("level-test/score BIDIALECT phoneme=%s shown=%s(%s) other=%s(%s)",
                    phoneme_ipa, shown, primary["composite_score"], other,
                    o["composite_score"] if o else None)

        return {
            "kind": "word", "phoneme_ipa": phoneme_ipa, "shown_dialect": shown,
            "lexical": lexical, "by_dialect": by_dialect, "best_dialect": shown,
            "composite_score": primary["composite_score"],
            "target_score": primary["composite_score"],
            "cefr": primary["cefr"], "asr_available": _ASR_READY,
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
