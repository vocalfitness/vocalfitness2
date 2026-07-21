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
import asyncio
import logging
import tempfile
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from routers.phoneme_formants import (
    _measure_all_ceilings,
    find_reference,
    fetch_and_extract,
    compute_formant_score,
)

logger = logging.getLogger(__name__)

_MAX_WORKERS = int(os.environ.get("LEVEL_TEST_POOL_WORKERS", "2"))
_pool: ProcessPoolExecutor | None = None

# Vowel-coherence gate (option b) — TUNABLE. The Level Test is an EXAM: the user
# may produce the WRONG vowel, so we require the target to be plausible at a
# RELIABLE LPC ceiling (where vowel formant tracking is trustworthy). A window
# that is plausible ONLY at a low ceiling (e.g. 4500 Hz) is mistracking → reject.
# (Phase-2 practice endpoint keeps the generous retry; contexts differ.)
_RELIABLE_CEILINGS = set(
    int(x) for x in os.environ.get("LEVEL_TEST_RELIABLE_CEILINGS_HZ", "5500,5000").split(",")
    if x.strip().isdigit()
)

# Actionable, non-technical rejection copy: example word per target vowel.
_EXAMPLE_WORD = {
    "iː": "sheep", "i": "sheep", "ɪ": "ship",
    "æ": "cat", "ʊ": "foot", "uː": "goose", "u": "goose",
}


def _coherence_ok(result: dict) -> bool:
    """True iff the target is plausible at >=1 RELIABLE ceiling. Rejects windows
    that only fit the target at a low (mistracking-prone) ceiling."""
    attempts = (result.get("diagnostics") or {}).get("attempts") or []
    return any(
        a.get("plausible") and int(a.get("ceiling_hz", 0)) in _RELIABLE_CEILINGS
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


def build_level_test_router(db) -> APIRouter:
    router = APIRouter(prefix="/level-test", tags=["level-test"])

    @router.post("/score")
    async def score(
        file: UploadFile = File(...),
        phoneme_ipa: str = Form(...),
        dialect: str = Form(""),
        reference_url: str = Form(""),
    ):
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Audio vuoto")
        if len(raw) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio troppo grande")

        # CPU-bound Parselmouth measurement → offload to the process pool.
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
                errors[d] = exc.detail
                continue
            # Vowel-coherence gate: only accept if the target is plausible at a
            # reliable ceiling (otherwise it's a mistracked / wrong vowel).
            if not _coherence_ok(r):
                errors[d] = {"reason": "vowel_incoherence"}
                continue
            results[d] = r

        if not results:
            word = _EXAMPLE_WORD.get(phoneme_ipa)
            hint = f" Riprova pronunciando la vocale di '{word}'." if word else " Riprova, tenendo il suono fermo 1-2 secondi."
            raise HTTPException(
                status_code=422,
                detail={
                    "message": f"Non ho riconosciuto chiaramente il suono [{phoneme_ipa}].{hint}",
                    "reason": "vowel_incoherence",
                    "errors": errors,
                },
            )

        best_d = max(results, key=lambda k: results[k]["composite_score"])
        logger.info(
            "level-test/score: phoneme=%s dialects=%s best=%s composite=%s",
            phoneme_ipa, list(results.keys()), best_d, results[best_d]["composite_score"],
        )
        return {
            "phoneme_ipa": phoneme_ipa,
            "by_dialect": results,
            "best_dialect": best_d,
            "composite_score": results[best_d]["composite_score"],
            "cefr": results[best_d]["cefr"],
            "errors": errors,
        }

    return router
