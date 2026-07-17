"""
Phase-2 formant scoring pipeline + GDPR consent endpoints.

* ``POST /api/phonemes/analyze-formants`` — extract F1/F2/F3 from a student
  recording (WAV) via Parselmouth ``To FormantPath (burg)`` (adaptive ceiling,
  gender-agnostic), compare to a canonical native reference (Hillenbrand 1995 /
  Deterding 1997 for monophthong vowels; the teacher's Phase-1 sample for
  diphthongs and dialectal consonant realisations), score each formant 0-100
  (GOP, ±2.5 SD tolerance) and map the composite to a CEFR-inspired band.

* Consent (GDPR): separate, independently revocable audio & video consents.
* RBAC (minimal now): recordings are scoped per student; admins may read all.
  ``teacher`` / ``corporate`` roles are reserved for a later phase.
"""
from __future__ import annotations

import os
import logging
import tempfile
import statistics
from datetime import datetime, timezone
from typing import Callable, Optional

import httpx
import parselmouth
from parselmouth.praat import call
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from data.formant_references import build_reference_rows, HIGH_IMPACT_IPA


class ConsentUpdate(BaseModel):
    kind: str          # 'audio' | 'video'
    granted: bool



# IPA equivalence for reference lookup (short/long, ASCII vs IPA, mergers).
_EQUIV = {
    "i": ["i", "iː"], "iː": ["iː", "i"],
    "u": ["u", "uː"], "uː": ["uː", "u"],
    "ɔ": ["ɔ", "ɔː"], "ɔː": ["ɔː", "ɔ"],
    "ɑ": ["ɑ", "ɑː", "ɒ"], "ɑː": ["ɑː", "ɑ", "ɒ"], "ɒ": ["ɒ", "ɑ", "ɑː"],
    "ɛ": ["ɛ", "e"], "e": ["e", "ɛ"],
    "ɜ": ["ɜ", "ɜː", "ɝ"], "ɜː": ["ɜː", "ɜ", "ɝ"], "ɝ": ["ɝ", "ɜː", "ɜ"],
    "ə": ["ə", "ɜː", "ɝ", "ʌ"],
}


async def ensure_formant_references(db) -> dict:
    """Idempotently seed the ``formant_references`` collection."""
    rows = build_reference_rows()
    inserted = 0
    for r in rows:
        res = await db.formant_references.update_one(
            {"phoneme_ipa": r["phoneme_ipa"], "dialect": r["dialect"],
             "speaker_group": r["speaker_group"]},
            {"$set": r}, upsert=True,
        )
        if res.upserted_id is not None:
            inserted += 1
    return {"total": len(rows), "inserted": inserted}


F1_MAX = 900.0  # implausible ceiling for any adult vowel F1


def _formants_for_ceiling(snd, dur, F0grid, VOI, step, max_formant, max_num):
    """Extract median F1/F2/F3 at the min-variance vowel window for one LPC
    ceiling. Returns dict with F1/F2/F3 and ``_plausible`` (True if the chosen
    window's median F1 <= F1_MAX), or None if no usable window exists."""
    try:
        fp = call(snd, "To FormantPath (burg)", 0.0025, float(max_num), float(max_formant),
                  0.025, 50.0, 0.05, 4)
        formant = call(fp, "Extract Formant")
    except Exception:  # noqa: BLE001
        return None

    times, F1, F2, F3 = [], [], [], []
    t = 0.0
    while t <= dur:
        for i, arr in ((1, F1), (2, F2), (3, F3)):
            try:
                v = call(formant, "Get value at time", i, t, "hertz", "Linear")
                arr.append(v if (v and v == v) else None)
            except Exception:  # noqa: BLE001
                arr.append(None)
        times.append(t)
        t += step

    wframes = max(3, int(round(0.020 / step)))  # 20 ms sliding window
    candidates = []
    for start in range(0, len(times) - wframes + 1):
        idxs = list(range(start, start + wframes))
        f1s = [F1[j] for j in idxs if F1[j]]
        f2s = [F2[j] for j in idxs if F2[j]]
        vcount = sum(1 for j in idxs if j < len(VOI) and VOI[j])
        if len(f1s) < wframes or len(f2s) < wframes or vcount < wframes * 0.5:
            continue
        sd = statistics.pstdev(f1s) + statistics.pstdev(f2s)
        candidates.append((sd, idxs))
    candidates.sort(key=lambda x: x[0])

    def _measure(idxs):
        out = {}
        for i, key, arr in ((1, "F1", F1), (2, "F2", F2), (3, "F3", F3)):
            vals = sorted(arr[j] for j in idxs if arr[j])
            out[key] = round(vals[len(vals) // 2]) if vals else None
        return out

    def _win_ms(idxs):
        return round(times[idxs[0]] * 1000, 1), round(times[idxs[-1]] * 1000, 1)

    # Diagnostics: candidate windows (top 6 by stability) BEFORE final selection.
    diag_candidates = []
    for sd, idxs in candidates[:6]:
        m = _measure(idxs)
        s_ms, e_ms = _win_ms(idxs)
        diag_candidates.append({
            "start_ms": s_ms, "end_ms": e_ms,
            "F1": m.get("F1"), "F2": m.get("F2"), "F3": m.get("F3"),
            "sd_f1f2": round(sd, 1),
            "plausible": bool(m.get("F1") and m["F1"] <= F1_MAX),
        })

    chosen, plausible, chosen_idxs = None, False, None
    for sd, idxs in candidates:
        m = _measure(idxs)
        if m.get("F1") and m["F1"] <= F1_MAX:
            chosen, plausible, chosen_idxs = m, True, idxs
            break
    if chosen is None and candidates:
        chosen_idxs = candidates[0][1]
        chosen = _measure(chosen_idxs)  # least-variance, still implausible
    if chosen is None:  # no stable voiced window → mid third
        lo, hi = int(len(times) * 0.33), int(len(times) * 0.67)
        chosen_idxs = list(range(lo, max(lo + 1, hi)))
        chosen = _measure(chosen_idxs)
    if not chosen or (not chosen.get("F1") and not chosen.get("F2")):
        return None
    win_start_ms, win_end_ms = _win_ms(chosen_idxs) if chosen_idxs else (None, None)
    chosen["_plausible"] = plausible
    chosen["_diag"] = {
        "ceiling_hz": round(max_formant),
        "max_num_formants": int(max_num),
        "candidates": diag_candidates,
        "nucleus_window_ms": {"start": win_start_ms, "end": win_end_ms},
    }
    return chosen



def _extract_formants(path: str) -> Optional[dict]:
    """Return median F1/F2/F3 + F0 (Hz) at the most STABLE vowel window.

    Robustness for words in a consonantal context (e.g. /lʊk/, /siːzn̩/):
    * DC offset removed; a pitch contour marks voiced frames.
    * The vowel window is the 20 ms slice with the MINIMUM combined SD of F1+F2.
    * Plausibility: a window whose median F1 > 900 Hz is rejected.
    * If NO ceiling yields a plausible window, the extraction is RETRIED with
      alternative LPC ceilings (5500 → 5000 → 4500 Hz). Only if every retry
      still yields an implausible F1 is the result returned with
      ``reliable=False`` (the caller then rejects it), logged at WARNING.
    * F0 = MEAN over ALL voiced frames of the whole take (>=100 ms voiced),
      used for the fixed-threshold speaker-group choice.
    """
    try:
        snd = parselmouth.Sound(path)
    except Exception:  # noqa: BLE001
        return None
    dur = snd.get_total_duration()
    if dur <= 0.05:
        return None
    try:
        snd.subtract_mean()
    except Exception:  # noqa: BLE001
        pass

    pitch = None
    try:
        pitch = call(snd, "To Pitch", 0.0, 60.0, 500.0)
    except Exception:  # noqa: BLE001
        pitch = None

    step = 0.005

    def f0_at(t: float):
        if pitch is None:
            return None
        try:
            v = call(pitch, "Get value at time", t, "Hertz", "Linear")
            return v if (v and v == v) else None
        except Exception:  # noqa: BLE001
            return None

    # Voiced mask + F0 grid (ceiling-independent → computed once).
    F0grid, VOI = [], []
    t = 0.0
    while t <= dur:
        fv = f0_at(t)
        F0grid.append(fv)
        VOI.append(bool(fv) if pitch is not None else True)
        t += step
    voiced_f0 = [v for v in F0grid if v]
    f0_global = round(sum(voiced_f0) / len(voiced_f0)) if len(voiced_f0) * step >= 0.100 else None

    ceiling_range = [5500, 5000, 4500]
    fallback = None
    attempts = []  # per-ceiling diagnostic summary
    for max_formant, max_num in ((5500.0, 5.0), (5000.0, 5.0), (4500.0, 5.0)):
        res = _formants_for_ceiling(snd, dur, F0grid, VOI, step, max_formant, max_num)
        if res is None:
            attempts.append({"ceiling_hz": round(max_formant), "result": "no_usable_window"})
            continue
        d = res.get("_diag", {})
        attempts.append({
            "ceiling_hz": round(max_formant),
            "F1": res.get("F1"), "F2": res.get("F2"), "F3": res.get("F3"),
            "plausible": bool(res.get("_plausible")),
        })
        if res.pop("_plausible", False):
            diag = res.pop("_diag", {})
            res["F0"] = f0_global
            res["reliable"] = True
            res["_diagnostics"] = {
                "max_num_formants": diag.get("max_num_formants"),
                "ceiling_range_tested_hz": ceiling_range,
                "ceiling_selected_hz": diag.get("ceiling_hz"),
                "candidate_formants": diag.get("candidates", []),
                "nucleus_window_ms": diag.get("nucleus_window_ms"),
                "reliable": True,
                "attempts": attempts,
            }
            logging.info("analyze-formants[expert]: %s", res["_diagnostics"])
            return res
        if fallback is None:
            fallback = res

    if fallback is not None:
        diag = fallback.pop("_diag", {})
        fallback.pop("_plausible", None)
        logging.warning(
            "analyze-formants: implausible F1=%s Hz after all LPC-ceiling retries "
            "(5500/5000/4500) → measurement flagged UNRELIABLE",
            fallback.get("F1"),
        )
        fallback["F0"] = f0_global
        fallback["reliable"] = False
        fallback["_diagnostics"] = {
            "max_num_formants": diag.get("max_num_formants"),
            "ceiling_range_tested_hz": ceiling_range,
            "ceiling_selected_hz": diag.get("ceiling_hz"),
            "candidate_formants": diag.get("candidates", []),
            "nucleus_window_ms": diag.get("nucleus_window_ms"),
            "reliable": False,
            "attempts": attempts,
        }
        logging.warning("analyze-formants[expert]: %s", fallback["_diagnostics"])
        return fallback
    return None




def _score_gop(measured: float, mean: float, sd: float, tol_sd: float = 2.5) -> float:
    """GOP score 0-100: 100 at the native mean, 0 at ±``tol_sd`` SD.

    Tolerance widened to ±2.5 SD (from ±2 SD) because the native reference
    corpora (Hillenbrand 1995 / Deterding 1997) are studio recordings, while
    students record on consumer microphones in untreated rooms.
    """
    if not measured or not mean or not sd:
        return 0.0
    z = abs(measured - mean) / sd
    return round(max(0.0, min(100.0, 100.0 * (1.0 - z / tol_sd))), 1)


# Composite weighting. F1 (vowel height) sits in the low-frequency band most
# corrupted by consumer-mic low-end roll-off and room modes, so it is weighted
# down relative to F2/F3 to avoid a single unreliable formant tanking the score.
_W_WITH_F3 = {"F1": 0.15, "F2": 0.425, "F3": 0.425}
_W_NO_F3 = {"F1": 0.35, "F2": 0.65}


def _weighted_composite(per_formant: list) -> float:
    present = {p["name"] for p in per_formant}
    weights = _W_WITH_F3 if "F3" in present else _W_NO_F3
    total_w = sum(weights.get(p["name"], 0.0) for p in per_formant)
    if total_w <= 0:
        return round(sum(p["score"] for p in per_formant) / len(per_formant), 1)
    acc = sum(p["score"] * weights.get(p["name"], 0.0) for p in per_formant)
    return round(acc / total_w, 1)



def _score_relative(measured: float, ref: float, tol: float = 0.15) -> float:
    """Relative score for teacher-sample references (no SD available)."""
    if not measured or not ref:
        return 0.0
    err = abs(measured - ref) / ref
    return round(max(0.0, min(100.0, 100.0 * (1.0 - err / tol))), 1)


def _cefr_band(composite: float) -> dict:
    if composite >= 90:
        return {"band": "C1–C2", "label": "Articolazione molto chiara e precisa"}
    if composite >= 75:
        return {"band": "B2", "label": "Pronuncia chiara e naturale"}
    if composite >= 60:
        return {"band": "B1", "label": "Generalmente intelligibile"}
    if composite >= 45:
        return {"band": "A2", "label": "Intelligibile con qualche sforzo"}
    return {"band": "A1", "label": "Pronuncia da consolidare"}


def _direction_hint(name: str, measured: float, ref: float) -> str:
    if not measured or not ref:
        return ""
    diff = measured - ref
    pct = abs(diff) / ref
    if pct < 0.06:
        return "in linea con il riferimento ✓"
    if name == "F1":
        return ("F1 troppo alto = bocca troppo aperta" if diff > 0
                else "F1 troppo basso = bocca troppo chiusa")
    if name == "F2":
        return ("F2 troppo alto = lingua troppo avanzata" if diff > 0
                else "F2 troppo basso = non abbastanza frontale")
    return ("F3 troppo alto" if diff > 0 else "F3 troppo basso")


def build_phoneme_formants_router(
    db,
    get_current_user: Callable,
    emergent_put: Callable[[str, bytes, str], bool],
    uploads_dir,
) -> APIRouter:
    router = APIRouter(prefix="/phonemes", tags=["phoneme-formants"])

    async def _find_reference(phoneme_ipa: str, dialect: str) -> list[dict]:
        candidates = _EQUIV.get(phoneme_ipa, [phoneme_ipa])
        if phoneme_ipa not in candidates:
            candidates = [phoneme_ipa] + candidates
        for cand in candidates:
            rows = await db.formant_references.find(
                {"phoneme_ipa": cand, "dialect": dialect}, {"_id": 0}
            ).to_list(length=10)
            if rows:
                return rows
        return []

    async def _require_audio_consent(user: dict):
        c = await db.user_consents.find_one({"user_id": user["id"]}, {"_id": 0})
        if not c or not c.get("audio_granted"):
            raise HTTPException(
                status_code=403,
                detail="Consenso audio mancante. Concedi il consenso per registrare/analizzare.",
            )

    # ---------------- Consent (GDPR) ---------------- #
    @router.get("/consent")
    async def get_consent(user: dict = Depends(get_current_user)):
        c = await db.user_consents.find_one({"user_id": user["id"]}, {"_id": 0})
        return c or {"user_id": user["id"], "audio_granted": False, "video_granted": False}

    @router.post("/consent")
    async def set_consent(payload: ConsentUpdate, user: dict = Depends(get_current_user)):
        if payload.kind not in {"audio", "video"}:
            raise HTTPException(status_code=400, detail="kind deve essere audio|video")
        field = f"{payload.kind}_granted"
        now = datetime.now(timezone.utc).isoformat()
        await db.user_consents.update_one(
            {"user_id": user["id"]},
            {"$set": {field: payload.granted, f"{payload.kind}_updated_at": now},
             "$setOnInsert": {"user_id": user["id"]}},
            upsert=True,
        )
        c = await db.user_consents.find_one({"user_id": user["id"]}, {"_id": 0})
        return c

    # ---------------- Analyze formants ---------------- #
    @router.post("/analyze-formants")
    async def analyze_formants(
        file: UploadFile = File(...),
        phoneme_ipa: str = Form(...),
        dialect: str = Form(...),
        target_kind: str = Form("phoneme"),
        reference_url: str = Form(""),
        user: dict = Depends(get_current_user),
    ):
        if dialect not in {"AmE", "RP"}:
            raise HTTPException(status_code=400, detail="Dialetto non valido (AmE|RP)")
        await _require_audio_consent(user)

        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Audio vuoto")
        if len(raw) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio troppo grande")

        suffix = ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
            tf.write(raw)
            tmp_path = tf.name
        try:
            student = _extract_formants(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        if not student:
            raise HTTPException(
                status_code=422,
                detail="Impossibile estrarre le formanti. Registra di nuovo in un ambiente silenzioso.",
            )
        # Reject implausible measurements outright rather than scoring them as
        # if valid (F1 > 900 Hz after all LPC-ceiling retries → unreliable).
        if student.get("reliable") is False:
            logging.warning(
                "analyze-formants: REJECTED unreliable measurement F1=%s Hz "
                "phoneme=%s dialect=%s user=%s",
                student.get("F1"), phoneme_ipa, dialect, user.get("id"),
            )
            raise HTTPException(
                status_code=422,
                detail="Misura non affidabile (formanti implausibili). Registra di nuovo "
                       "avvicinando il microfono e in un ambiente silenzioso.",
            )

        # ---- Resolve reference ---- #
        ref_source = None
        ref_group = None
        citation = ""
        per_formant = []
        # Numeric GOP scoring ALWAYS uses the Hillenbrand/Deterding dataset means
        # whenever a reference exists for this phoneme+dialect — regardless of
        # target_kind (word or isolated phoneme) or whether a teacher clip exists.
        # The teacher's clip stays as the VISUAL spectrogram reference only, since
        # its extracted formants vary too much across words to be a stable numeric
        # reference. Teacher-sample scoring is used ONLY as a fallback for phonemes
        # absent from the dataset (diphthongs / consonant realisations).
        refs = await _find_reference(phoneme_ipa, dialect)

        if refs:
            # Speaker group selected from the whole-take mean F0 with FIXED
            # thresholds (stable across recordings, unlike a noisy nucleus-only
            # estimate): <165 Hz → men, 165-255 Hz → women, >255 Hz → children.
            # RP references only have male/female, so women/children map to female.
            f0 = student.get("F0")

            def group_distance(r):
                d = 0.0
                n = 0
                for k in ("F1", "F2", "F3"):
                    m, s = r.get(f"{k}_mean"), student.get(k)
                    if m and s:
                        d += abs(s - m) / m
                        n += 1
                return d / n if n else 9e9

            if f0:
                if f0 < 165:
                    label = "men"
                elif f0 <= 255:
                    label = "women"
                else:
                    label = "children"
                avail = {r["speaker_group"]: r for r in refs}
                prefs = {
                    "men": ["men", "male"],
                    "women": ["women", "female"],
                    "children": ["children", "female", "women"],
                }[label]
                best = next((avail[g] for g in prefs if g in avail), None)
                if best is None:
                    best = min(refs, key=group_distance)
                group_method = "f0_threshold"
            else:
                best = min(refs, key=group_distance)
                group_method = "formant_distance"
            ref_group = best["speaker_group"]
            citation = best["source_citation"]
            ref_source = "dataset"
            logging.info(
                "analyze-formants: phoneme=%s dialect=%s student=%s F0=%s "
                "selected_group=%s (via %s) groups_available=%s group_refs=%s",
                phoneme_ipa, dialect, student, f0, ref_group, group_method,
                [r["speaker_group"] for r in refs],
                {r["speaker_group"]: {"F1": r.get("F1_mean"), "F2": r.get("F2_mean"), "F3": r.get("F3_mean")} for r in refs},
            )
            for k in ("F1", "F2", "F3"):
                m, sd = best.get(f"{k}_mean"), best.get(f"{k}_sd")
                meas = student.get(k)
                if m and meas:
                    per_formant.append({
                        "name": k, "measured": meas, "reference": m,
                        "score": _score_gop(meas, m, sd),
                        "hint": _direction_hint(k, meas, m),
                    })
        else:
            # Teacher-sample reference: fetch & analyze Prof. Dapper's clip.
            if not reference_url:
                raise HTTPException(
                    status_code=422,
                    detail="Nessun riferimento disponibile per questo bersaglio.",
                )
            ref_formants = await _fetch_and_extract(reference_url)
            if not ref_formants:
                raise HTTPException(
                    status_code=422,
                    detail="Impossibile analizzare l'audio di riferimento del docente.",
                )
            ref_source = "teacher_sample"
            citation = "Campione di riferimento Prof. Dapper (Fase 1)"
            logging.info(
                "analyze-formants: phoneme=%s dialect=%s student=%s F0=%s "
                "source=teacher_sample ref_formants=%s",
                phoneme_ipa, dialect, student, student.get("F0"), ref_formants,
            )
            for k in ("F1", "F2", "F3"):
                m, meas = ref_formants.get(k), student.get(k)
                if m and meas:
                    per_formant.append({
                        "name": k, "measured": meas, "reference": m,
                        "score": _score_relative(meas, m),
                        "hint": _direction_hint(k, meas, m),
                    })

        if not per_formant:
            raise HTTPException(status_code=422, detail="Confronto formanti non disponibile.")

        composite = _weighted_composite(per_formant)
        diagnostics = student.pop("_diagnostics", None)
        logging.info(
            "analyze-formants: source=%s group=%s per_formant=%s composite=%s",
            ref_source, ref_group,
            [(p["name"], p["measured"], p["reference"], p["score"]) for p in per_formant],
            composite,
        )
        result = {
            "phoneme_ipa": phoneme_ipa,
            "dialect": dialect,
            "student_formants": student,
            "reference_source": ref_source,
            "reference_group": ref_group,
            "citation": citation,
            "per_formant": per_formant,
            "composite_score": composite,
            "cefr": _cefr_band(composite),
            "high_impact": phoneme_ipa in HIGH_IMPACT_IPA,
            "diagnostics": diagnostics,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }
        return result

    async def _fetch_and_extract(url: str) -> Optional[dict]:
        # Relative URLs (e.g. per-word clips stored as ``/api/uploads/...``)
        # are resolved against the backend's own internal origin so the fetch
        # works identically in Preview and Production, regardless of the
        # public domain configured in FRONTEND_URL.
        full = f"http://localhost:8001{url}" if url.startswith("/") else url
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
                resp = await client.get(full)
                resp.raise_for_status()
                data = resp.content
        except Exception:  # noqa: BLE001
            return None
        if not data:
            return None
        is_mp3 = full.lower().split("?")[0].endswith(".mp3")
        src_ext = ".mp3" if is_mp3 else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=src_ext) as tf:
            tf.write(data)
            src_path = tf.name
        wav_path = None
        try:
            # Convert to WAV before handing the clip to Parselmouth.
            if is_mp3:
                try:
                    snd = parselmouth.Sound(src_path)
                    wav_path = src_path + ".wav"
                    snd.save(wav_path, parselmouth.SoundFileFormat.WAV)
                    return _extract_formants(wav_path)
                except Exception:  # noqa: BLE001
                    return _extract_formants(src_path)
            return _extract_formants(src_path)
        finally:
            for p in (src_path, wav_path):
                if p:
                    try:
                        os.unlink(p)
                    except OSError:
                        pass

    return router
