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

Validation (FIX A2 + PROBLEMA B)
--------------------------------
* PROBLEMA B — plausibility is per-phoneme / per-group, NOT a global F1<900 Hz
  ceiling. A measured formant is plausible iff
  ``|measured − reference| ≤ 3 × SD``, where SD is the dataset SD when available
  (``sd_source`` recorded for transparency) or a pooled estimate
  (F1≈12%, F2≈10%, F3≈8% of the mean) otherwise. If no LPC ceiling
  (5500→5000→4500 Hz) yields a plausible window → explicit 422 (mistracking).
* FIX A2 — within the chosen nucleus window the per-formant dispersion must be
  stable: F1_SD≤25 Hz, F2_SD≤50 Hz, F3_SD≤70 Hz (provisional, to be tuned on
  real data — the measured SDs are exposed in Expert Mode on every take, pass or
  fail). If a plausible-but-jittery window is all we can find → explicit 422
  (unstable recording).
* The user-facing 422 message is actionable; the technical detail (which
  formant, which SD, which range) lives in the structured ``expert`` payload
  for Expert Mode.
"""
from __future__ import annotations

import os
import math
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


# ---- Validation constants (FIX A2 + PROBLEMA B) ---- #
# FIX A2 — per-formant within-window SD ceilings (Hz). Proportional, not
# absolute: a higher formant has larger natural dispersion. PROVISIONAL — to be
# tuned on real data (measured SDs are surfaced in Expert Mode on every take).
NUCLEUS_SD_THRESHOLDS = {"F1": 25.0, "F2": 50.0, "F3": 70.0}
# PROBLEMA B — pooled SD estimate as a fraction of the reference mean, used ONLY
# when a dataset SD is unavailable for that phoneme/group/formant.
SD_EST_PCT = {"F1": 0.12, "F2": 0.10, "F3": 0.08}
PLAUSIBILITY_SD_MULT = 3.0
# LPC ceilings retried in order (Hz, max n formants).
_CEILINGS = ((5500.0, 5.0), (5000.0, 5.0), (4500.0, 5.0))
_CEILING_RANGE = [5500, 5000, 4500]


def _median(vals: list) -> Optional[int]:
    xs = sorted(v for v in vals if v)
    return round(xs[len(xs) // 2]) if xs else None


def _pstdev(vals: list) -> Optional[float]:
    xs = [v for v in vals if v]
    return round(statistics.pstdev(xs), 1) if len(xs) >= 2 else 0.0


def _candidate_windows(snd, dur, VOI, step, max_formant, max_num) -> list[dict]:
    """All stable voiced 20 ms windows for one LPC ceiling, sorted by combined
    F1+F2 SD (least variance first). Each window carries median F1/F2/F3 and the
    within-window per-formant SD used by the FIX A2 stability check."""
    try:
        fp = call(snd, "To FormantPath (burg)", 0.0025, float(max_num), float(max_formant),
                  0.025, 50.0, 0.05, 4)
        formant = call(fp, "Extract Formant")
    except Exception:  # noqa: BLE001
        return []

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
    windows: list[dict] = []
    for start in range(0, len(times) - wframes + 1):
        idxs = list(range(start, start + wframes))
        f1s = [F1[j] for j in idxs if F1[j]]
        f2s = [F2[j] for j in idxs if F2[j]]
        f3s = [F3[j] for j in idxs if F3[j]]
        vcount = sum(1 for j in idxs if j < len(VOI) and VOI[j])
        if len(f1s) < wframes or len(f2s) < wframes or vcount < wframes * 0.5:
            continue
        windows.append({
            "start_ms": round(times[idxs[0]] * 1000, 1),
            "end_ms": round(times[idxs[-1]] * 1000, 1),
            "F1": _median(f1s), "F2": _median(f2s), "F3": _median(f3s),
            "F1_sd": _pstdev(f1s), "F2_sd": _pstdev(f2s), "F3_sd": _pstdev(f3s),
            "sd_f1f2": round(statistics.pstdev(f1s) + statistics.pstdev(f2s), 1),
        })
    windows.sort(key=lambda w: w["sd_f1f2"])
    return windows


def _measure_all_ceilings(path: str) -> Optional[dict]:
    """Ceiling-independent pitch analysis + per-ceiling candidate windows.

    Returns ``{f0_global, duration, max_num_formants, ceilings:[{ceiling_hz,
    max_num, windows:[...]}]}`` or ``None`` if the sound cannot be loaded or is
    too short. Plausibility (per-phoneme/group) and stability (FIX A2) are
    applied downstream in the router, where the reference is known.
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

    VOI = []
    voiced_f0 = []
    t = 0.0
    while t <= dur:
        fv = f0_at(t)
        VOI.append(bool(fv) if pitch is not None else True)
        if fv:
            voiced_f0.append(fv)
        t += step
    f0_global = round(sum(voiced_f0) / len(voiced_f0)) if len(voiced_f0) * step >= 0.100 else None

    ceilings = []
    for max_formant, max_num in _CEILINGS:
        windows = _candidate_windows(snd, dur, VOI, step, max_formant, max_num)
        ceilings.append({"ceiling_hz": round(max_formant), "max_num": int(max_num), "windows": windows})
    if not any(c["windows"] for c in ceilings):
        return None
    return {"f0_global": f0_global, "duration": dur, "max_num_formants": 5, "ceilings": ceilings}


def _extract_formants(path: str) -> Optional[dict]:
    """Best-effort median F1/F2/F3 + F0 from the most stable window of the
    default LPC ceiling — used ONLY for the teacher reference clip (a single
    clean studio take, so no per-phoneme plausibility retry is needed)."""
    meas = _measure_all_ceilings(path)
    if not meas:
        return None
    for c in meas["ceilings"]:
        if c["windows"]:
            w = c["windows"][0]
            return {"F1": w["F1"], "F2": w["F2"], "F3": w["F3"], "F0": meas["f0_global"]}
    return None


def _window_plausible(w: dict, ranges: dict) -> bool:
    """A window is plausible iff every measured formant that HAS a reference
    range falls inside ``[min, max]`` (missing measurements are ignored — they
    simply won't be scored)."""
    for name, rng in ranges.items():
        m = w.get(name)
        if m is None:
            continue
        if not (rng["min"] <= m <= rng["max"]):
            return False
    return True


def _window_stable(w: dict, ranges: dict) -> tuple:
    """FIX A2 — per-formant within-window SD check. Returns
    ``(stable: bool, offenders: [{name, sd, threshold}])`` over the formants
    that are both measured and referenced."""
    offenders = []
    for name in ("F1", "F2", "F3"):
        if name not in ranges or w.get(name) is None:
            continue
        sd = w.get(f"{name}_sd")
        thr = NUCLEUS_SD_THRESHOLDS[name]
        if sd is not None and sd > thr:
            offenders.append({"name": name, "sd": sd, "threshold": thr})
    return (len(offenders) == 0, offenders)


def _select_measurement(ceilings: list, ranges: dict) -> dict:
    """Walk the LPC ceilings; for each, take the least-variance window that is
    plausible (PROBLEMA B). Prefer the first plausible AND stable (FIX A2)
    window. Returns a dict describing the outcome:

    * ``status='ok'``     → ``window``, ``ceiling``, ``attempts``
    * ``status='unstable'`` → ``window``, ``ceiling``, ``offenders``, ``attempts``
    * ``status='implausible'`` → ``attempts``
    """
    attempts = []
    first_plausible = None  # (window, ceiling, offenders)
    for c in ceilings:
        windows = c["windows"]
        plaus = next((w for w in windows if _window_plausible(w, ranges)), None)
        rep = plaus or (windows[0] if windows else None)
        if rep is None:
            attempts.append({"ceiling_hz": c["ceiling_hz"], "result": "no_usable_window"})
            continue
        attempts.append({
            "ceiling_hz": c["ceiling_hz"],
            "F1": rep.get("F1"), "F2": rep.get("F2"), "F3": rep.get("F3"),
            "plausible": plaus is not None,
        })
        if plaus is None:
            continue
        stable, offenders = _window_stable(plaus, ranges)
        if first_plausible is None:
            first_plausible = (plaus, c, offenders)
        if stable:
            return {"status": "ok", "window": plaus, "ceiling": c, "attempts": attempts}
    if first_plausible is not None:
        w, c, offenders = first_plausible
        return {"status": "unstable", "window": w, "ceiling": c,
                "offenders": offenders, "attempts": attempts}
    return {"status": "implausible", "attempts": attempts}


def _build_diagnostics(meas: dict, ranges: dict, sel: dict, reliable: bool) -> dict:
    """Expert-Mode diagnostics — surfaced on EVERY take (pass or fail): the
    measured per-formant nucleus SDs + thresholds, the plausibility ranges, the
    per-ceiling attempts and the candidate windows of the selected ceiling."""
    win = sel.get("window") or {}
    chosen_c = sel.get("ceiling") or {}
    candidates = []
    for w in (chosen_c.get("windows") or [])[:6]:
        candidates.append({
            "start_ms": w["start_ms"], "end_ms": w["end_ms"],
            "F1": w["F1"], "F2": w["F2"], "F3": w["F3"],
            "sd_f1f2": w["sd_f1f2"],
            "plausible": _window_plausible(w, ranges),
        })
    plausibility_range = {
        name: {
            "ref": rng["ref"], "sd_used": rng["sd_used"], "sd_source": rng["sd_source"],
            "min": round(rng["min"]), "max": round(rng["max"]),
        }
        for name, rng in ranges.items()
    }
    nucleus_sd = {name: win.get(f"{name}_sd") for name in ("F1", "F2", "F3")
                  if win.get(name) is not None}
    return {
        "max_num_formants": meas.get("max_num_formants"),
        "ceiling_range_tested_hz": _CEILING_RANGE,
        "ceiling_selected_hz": chosen_c.get("ceiling_hz"),
        "nucleus_window_ms": {"start": win.get("start_ms"), "end": win.get("end_ms")},
        "reliable": reliable,
        "attempts": sel.get("attempts", []),
        "candidate_formants": candidates,
        "nucleus_sd_hz": nucleus_sd,
        "nucleus_sd_thresholds_hz": NUCLEUS_SD_THRESHOLDS,
        "plausibility_range_hz": plausibility_range,
    }


def _score_gop(measured: float, mean: float, sd: float, tol_sd: float = 2.5) -> float:
    """DEPRECATED (kept for unit tests). Legacy linear GOP score. Production
    scoring now uses ``_score_gaussian`` (PUNTO D)."""
    if not measured or not mean or not sd:
        return 0.0
    z = abs(measured - mean) / sd
    return round(max(0.0, min(100.0, 100.0 * (1.0 - z / tol_sd))), 1)


# ---- PUNTO D: deviation → score curve (gaussian) ---- #
# score = 100·exp(−GAUSSIAN_K·d²) with d = |measured − reference| / SD, where SD
# is the SAME per-phoneme/per-group dispersion used by the ±3·SD plausibility
# gate (read from ``ranges[k]["sd_used"]`` — single source of truth). A gaussian
# (not linear) is the correct shape for a distance from a distribution: small
# deviations near the native mean barely cost, large ones cost steeply. d > 3
# is already rejected upstream (PROBLEMA B), so no score is produced there.
# GAUSSIAN_K is the ONLY tunable knob: raise (0.25) for stricter, lower (0.15)
# for more lenient. Exposed as a named constant on purpose.
GAUSSIAN_K = 0.20


def _score_gaussian(measured: float, ref: float, sd: float) -> float:
    if not measured or not ref or not sd:
        return 0.0
    d = abs(measured - ref) / sd
    return round(100.0 * math.exp(-GAUSSIAN_K * d * d), 1)


# ---- PUNTO E: per-phoneme formant weighting ---- #
# F3 is the acoustic correlate of rhoticity. On a NON-rhotic vowel F3 carries no
# distinctive phonemic information, so it is down-weighted; on an r-coloured
# vowel it is the defining cue and dominates. RP/Deterding has no F3 → F1+F2
# only. Weights are named + per-phoneme configurable (to be tuned on data).
RHOTIC_IPA = {"ɝ", "ɚ", "ɹ", "ɜɹ", "ɑɹ", "ɔɹ", "ɪɹ", "ɛɹ", "ʊɹ", "ɝː"}
_WEIGHTS_NONRHOTIC = {"F1": 0.45, "F2": 0.45, "F3": 0.10}
_WEIGHTS_RHOTIC = {"F1": 0.25, "F2": 0.25, "F3": 0.50}
_WEIGHTS_NO_F3 = {"F1": 0.50, "F2": 0.50}


def _formant_weights(phoneme_ipa: str, present: set) -> dict:
    if "F3" not in present:
        return dict(_WEIGHTS_NO_F3)
    return dict(_WEIGHTS_RHOTIC if phoneme_ipa in RHOTIC_IPA else _WEIGHTS_NONRHOTIC)


def _weighted_composite(per_formant: list, phoneme_ipa: str = "") -> float:
    present = {p["name"] for p in per_formant}
    weights = _formant_weights(phoneme_ipa, present)
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


# User-facing 422 messages: actionable, no jargon (technical detail → Expert Mode).
_MSG_IMPLAUSIBLE = (
    "Non siamo riusciti a misurare questa registrazione in modo affidabile. "
    "Prova a tenere il suono più fermo e costante per 1-2 secondi, in un ambiente silenzioso."
)
_MSG_UNSTABLE = (
    "Non siamo riusciti a misurare questa registrazione in modo affidabile. "
    "Prova a tenere il suono più fermo e costante per 1-2 secondi, in un ambiente silenzioso."
)


# --------------------------------------------------------------------------- #
# Reusable module-level scoring core (shared by the authenticated
# /phonemes/analyze-formants endpoint AND the public /level-test/score
# endpoint). Kept at module scope so it is import-friendly and picklable-safe.
# --------------------------------------------------------------------------- #
async def find_reference(db, phoneme_ipa: str, dialect: str) -> list[dict]:
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


async def fetch_and_extract(url: str) -> Optional[dict]:
    """Download a (possibly relative) reference clip and extract its formants."""
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


def compute_formant_score(
    meas: dict,
    refs: list[dict],
    phoneme_ipa: str,
    dialect: str,
    teacher_ref: Optional[dict] = None,
) -> dict:
    """Pure scoring core: given an already-computed measurement (`meas`), the
    dataset reference rows (`refs`, may be empty) and an optional teacher clip
    reference, resolve the speaker group, build plausibility ranges, select the
    reliable window and score F1/F2/F3. Raises HTTPException on failure so both
    callers surface identical, actionable errors."""
    f0 = meas["f0_global"]
    ref_source = None
    ref_group = None
    citation = ""
    best = None
    ranges: dict = {}
    group_method = None
    groups_available: list = []
    group_refs: dict = {}

    def _range(name, ref, sd_real, source):
        if sd_real:
            sd_used, sd_source = round(float(sd_real), 1), source
        else:
            sd_used, sd_source = round(ref * SD_EST_PCT[name], 1), "estimated_pct"
        span = PLAUSIBILITY_SD_MULT * sd_used
        return {"ref": ref, "sd_used": sd_used, "sd_source": sd_source,
                "min": ref - span, "max": ref + span}

    if refs:
        def group_distance(r):
            rough = next((c["windows"][0] for c in meas["ceilings"] if c["windows"]), {})
            d, n = 0.0, 0
            for k in ("F1", "F2", "F3"):
                m, s = r.get(f"{k}_mean"), rough.get(k)
                if m and s:
                    d += abs(s - m) / m
                    n += 1
            return d / n if n else 9e9

        if f0:
            label = "men" if f0 < 165 else ("women" if f0 <= 255 else "children")
            avail = {r["speaker_group"]: r for r in refs}
            prefs = {
                "men": ["men", "male"],
                "women": ["women", "female"],
                "children": ["children", "female", "women"],
            }[label]
            best = next((avail[g] for g in prefs if g in avail), None) or min(refs, key=group_distance)
            group_method = "f0_threshold"
        else:
            best = min(refs, key=group_distance)
            group_method = "formant_distance"
        ref_group = best["speaker_group"]
        citation = best["source_citation"]
        ref_source = "dataset"
        groups_available = [r["speaker_group"] for r in refs]
        group_refs = {r["speaker_group"]: {"F1": r.get("F1_mean"), "F2": r.get("F2_mean"), "F3": r.get("F3_mean")} for r in refs}
        row_sd_source = best.get("sd_source", "estimated_pooled")
        for k in ("F1", "F2", "F3"):
            m, sd = best.get(f"{k}_mean"), best.get(f"{k}_sd")
            if m:
                ranges[k] = _range(k, m, sd, row_sd_source)
    elif teacher_ref:
        ref_source = "teacher_sample"
        citation = "Campione di riferimento Prof. Dapper (Fase 1)"
        for k in ("F1", "F2", "F3"):
            m = teacher_ref.get(k)
            if m:
                ranges[k] = _range(k, m, None, "teacher_estimate")
    else:
        raise HTTPException(status_code=422, detail="Nessun riferimento disponibile per questo bersaglio.")

    if not ranges:
        raise HTTPException(status_code=422, detail="Confronto formanti non disponibile.")

    sel = _select_measurement(meas["ceilings"], ranges)
    if sel["status"] != "ok":
        diag = _build_diagnostics(meas, ranges, sel, False)
        reason = sel["status"]
        logging.warning("compute_formant_score: REJECTED (%s) phoneme=%s dialect=%s expert=%s",
                        reason, phoneme_ipa, dialect, diag)
        raise HTTPException(
            status_code=422,
            detail={
                "message": _MSG_IMPLAUSIBLE if reason == "implausible" else _MSG_UNSTABLE,
                "reason": reason,
                "offenders": sel.get("offenders", []),
                "expert": diag,
            },
        )

    win = sel["window"]
    student = {"F1": win["F1"], "F2": win["F2"], "F3": win["F3"], "F0": f0, "reliable": True}
    diagnostics = _build_diagnostics(meas, ranges, sel, True)

    per_formant = []
    dispersion_sources = set()
    for k in ("F1", "F2", "F3"):
        r = ranges.get(k)
        meas_v = student.get(k)
        if r and meas_v:
            per_formant.append({
                "name": k, "measured": meas_v, "reference": r["ref"],
                "score": _score_gaussian(meas_v, r["ref"], r["sd_used"]),
                "hint": _direction_hint(k, meas_v, r["ref"]),
            })
            dispersion_sources.add(r["sd_source"])

    if not per_formant:
        raise HTTPException(status_code=422, detail="Confronto formanti non disponibile.")

    weights = _formant_weights(phoneme_ipa, {p["name"] for p in per_formant})
    composite = _weighted_composite(per_formant, phoneme_ipa)
    diagnostics["scoring_curve"] = {"model": "gaussian", "k": GAUSSIAN_K}
    diagnostics["formant_weights"] = {p["name"]: weights.get(p["name"]) for p in per_formant}
    diagnostics["rhotic"] = phoneme_ipa in RHOTIC_IPA
    if ref_source == "teacher_sample":
        dispersion_source = "teacher"
    elif dispersion_sources and all(s in ("published",) for s in dispersion_sources if s):
        dispersion_source = "published"
    else:
        dispersion_source = "estimated"

    return {
        "phoneme_ipa": phoneme_ipa,
        "dialect": dialect,
        "student_formants": student,
        "reference_source": ref_source,
        "reference_group": ref_group,
        "citation": citation,
        "dispersion_source": dispersion_source,
        "per_formant": per_formant,
        "composite_score": composite,
        "cefr": _cefr_band(composite),
        "high_impact": phoneme_ipa in HIGH_IMPACT_IPA,
        "diagnostics": diagnostics,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


def score_against_reference(
    student: dict,
    f0: Optional[float],
    refs: list[dict],
    phoneme_ipa: str,
    dialect: str,
) -> Optional[dict]:
    """Score an ALREADY-MEASURED formant vector (`student` = {F1,F2,F3}) against a
    dialect's dataset reference — WITHOUT re-selecting an LPC window. Used for the
    bidialectal comparison in the Level Test: the shown dialect selects the single
    measurement window (via ``compute_formant_score``); the OTHER dialect is scored
    on that SAME window here, so RP and AmE are compared on identical acoustics
    (no per-dialect window flattery). Returns None if no reference formant applies."""
    if not refs:
        return None
    if f0:
        label = "men" if f0 < 165 else ("women" if f0 <= 255 else "children")
        avail = {r["speaker_group"]: r for r in refs}
        prefs = {
            "men": ["men", "male"],
            "women": ["women", "female"],
            "children": ["children", "female", "women"],
        }[label]
        best = next((avail[g] for g in prefs if g in avail), None) or refs[0]
    else:
        best = refs[0]
    row_sd_source = best.get("sd_source", "estimated_pooled")
    per_formant = []
    for k in ("F1", "F2", "F3"):
        m, sd = best.get(f"{k}_mean"), best.get(f"{k}_sd")
        mv = student.get(k)
        if not (m and mv):
            continue
        sd_used = round(float(sd), 1) if sd else round(m * SD_EST_PCT[k], 1)
        per_formant.append({
            "name": k, "measured": mv, "reference": m,
            "score": _score_gaussian(mv, m, sd_used),
            "hint": _direction_hint(k, mv, m),
        })
    if not per_formant:
        return None
    composite = _weighted_composite(per_formant, phoneme_ipa)
    return {
        "phoneme_ipa": phoneme_ipa,
        "dialect": dialect,
        "reference_group": best["speaker_group"],
        "per_formant": per_formant,
        "composite_score": composite,
        "cefr": _cefr_band(composite),
        "same_window": True,
    }




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

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
            tf.write(raw)
            tmp_path = tf.name
        try:
            meas = _measure_all_ceilings(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        if not meas:
            raise HTTPException(
                status_code=422,
                detail="Impossibile estrarre le formanti. Registra di nuovo in un ambiente silenzioso.",
            )

        f0 = meas["f0_global"]

        # ---- Resolve reference + build per-formant plausibility ranges ---- #
        # Numeric GOP scoring ALWAYS uses the Hillenbrand/Deterding dataset means
        # whenever a reference exists for this phoneme+dialect. The teacher clip
        # is the VISUAL spectrogram reference; it becomes the NUMERIC reference
        # only for phonemes absent from the dataset (diphthongs/consonants).
        refs = await _find_reference(phoneme_ipa, dialect)
        ref_source = None
        ref_group = None
        citation = ""
        best = None
        teacher_ref = None
        ranges: dict = {}
        group_method = None
        groups_available: list = []
        group_refs: dict = {}

        def _range(name, ref, sd_real, source):
            if sd_real:
                sd_used, sd_source = round(float(sd_real), 1), source
            else:
                sd_used, sd_source = round(ref * SD_EST_PCT[name], 1), "estimated_pct"
            span = PLAUSIBILITY_SD_MULT * sd_used
            return {"ref": ref, "sd_used": sd_used, "sd_source": sd_source,
                    "min": ref - span, "max": ref + span}

        if refs:
            # Speaker group from whole-take mean F0 with FIXED thresholds
            # (stable across recordings): <165→men, 165-255→women, >255→children.
            def group_distance(r):
                # Fallback only (F0 unavailable): pick group nearest to the
                # least-variance window of the first usable ceiling.
                rough = next((c["windows"][0] for c in meas["ceilings"] if c["windows"]), {})
                d, n = 0.0, 0
                for k in ("F1", "F2", "F3"):
                    m, s = r.get(f"{k}_mean"), rough.get(k)
                    if m and s:
                        d += abs(s - m) / m
                        n += 1
                return d / n if n else 9e9

            if f0:
                label = "men" if f0 < 165 else ("women" if f0 <= 255 else "children")
                avail = {r["speaker_group"]: r for r in refs}
                prefs = {
                    "men": ["men", "male"],
                    "women": ["women", "female"],
                    "children": ["children", "female", "women"],
                }[label]
                best = next((avail[g] for g in prefs if g in avail), None) or min(refs, key=group_distance)
                group_method = "f0_threshold"
            else:
                best = min(refs, key=group_distance)
                group_method = "formant_distance"
            ref_group = best["speaker_group"]
            citation = best["source_citation"]
            ref_source = "dataset"
            groups_available = [r["speaker_group"] for r in refs]
            group_refs = {r["speaker_group"]: {"F1": r.get("F1_mean"), "F2": r.get("F2_mean"), "F3": r.get("F3_mean")} for r in refs}
            row_sd_source = best.get("sd_source", "estimated_pooled")
            for k in ("F1", "F2", "F3"):
                m, sd = best.get(f"{k}_mean"), best.get(f"{k}_sd")
                if m:
                    ranges[k] = _range(k, m, sd, row_sd_source)
            logging.info(
                "analyze-formants: phoneme=%s dialect=%s F0=%s group=%s (via %s) ranges=%s",
                phoneme_ipa, dialect, f0, ref_group, group_method,
                {k: (round(v["min"]), round(v["max"])) for k, v in ranges.items()},
            )
        else:
            if not reference_url:
                raise HTTPException(
                    status_code=422,
                    detail="Nessun riferimento disponibile per questo bersaglio.",
                )
            teacher_ref = await _fetch_and_extract(reference_url)
            if not teacher_ref:
                raise HTTPException(
                    status_code=422,
                    detail="Impossibile analizzare l'audio di riferimento del docente.",
                )
            ref_source = "teacher_sample"
            citation = "Campione di riferimento Prof. Dapper (Fase 1)"
            for k in ("F1", "F2", "F3"):
                m = teacher_ref.get(k)
                if m:
                    # A single clip has no population SD → pooled estimate only.
                    ranges[k] = _range(k, m, None, "teacher_estimate")

        if not ranges:
            raise HTTPException(status_code=422, detail="Confronto formanti non disponibile.")

        # ---- PROBLEMA B + FIX A2: plausibility + stability selection ---- #
        sel = _select_measurement(meas["ceilings"], ranges)
        if sel["status"] != "ok":
            reliable = False
            diag = _build_diagnostics(meas, ranges, sel, reliable)
            reason = sel["status"]  # 'implausible' | 'unstable'
            logging.warning(
                "analyze-formants: REJECTED (%s) phoneme=%s dialect=%s user=%s expert=%s",
                reason, phoneme_ipa, dialect, user.get("id"), diag,
            )
            logging.warning("analyze-formants[expert]: %s", diag)
            raise HTTPException(
                status_code=422,
                detail={
                    "message": _MSG_IMPLAUSIBLE if reason == "implausible" else _MSG_UNSTABLE,
                    "reason": reason,
                    "offenders": sel.get("offenders", []),
                    "expert": diag,
                },
            )

        win = sel["window"]
        student = {"F1": win["F1"], "F2": win["F2"], "F3": win["F3"], "F0": f0, "reliable": True}
        diagnostics = _build_diagnostics(meas, ranges, sel, True)
        if ref_source == "dataset":
            logging.info(
                "analyze-formants: phoneme=%s dialect=%s student=%s F0=%s "
                "selected_group=%s (via %s) groups_available=%s group_refs=%s",
                phoneme_ipa, dialect, student, f0, ref_group, group_method,
                groups_available, group_refs,
            )
        logging.info("analyze-formants[expert]: %s", diagnostics)

        # ---- Score (PUNTO D gaussian curve + PUNTO E per-phoneme weights) ---- #
        # Single source of truth: both the score and the plausibility gate read
        # the SAME per-formant SD from ``ranges[k]["sd_used"]`` (no divergent path).
        per_formant = []
        dispersion_sources = set()
        for k in ("F1", "F2", "F3"):
            r = ranges.get(k)
            meas_v = student.get(k)
            if r and meas_v:
                per_formant.append({
                    "name": k, "measured": meas_v, "reference": r["ref"],
                    "score": _score_gaussian(meas_v, r["ref"], r["sd_used"]),
                    "hint": _direction_hint(k, meas_v, r["ref"]),
                })
                dispersion_sources.add(r["sd_source"])

        if not per_formant:
            raise HTTPException(status_code=422, detail="Confronto formanti non disponibile.")

        present = {p["name"] for p in per_formant}
        weights = _formant_weights(phoneme_ipa, present)
        composite = _weighted_composite(per_formant, phoneme_ipa)
        # Expose the scoring knobs in Expert Mode (PUNTO D/E): the k of the
        # gaussian curve and the per-formant weights actually applied.
        diagnostics["scoring_curve"] = {"model": "gaussian", "k": GAUSSIAN_K}
        diagnostics["formant_weights"] = {p["name"]: weights.get(p["name"]) for p in per_formant}
        diagnostics["rhotic"] = phoneme_ipa in RHOTIC_IPA
        # Dispersion provenance for an honest, dynamic footer (PUNTO C):
        #   'published'  → all scored formants used a real dataset SD
        #   'estimated'  → at least one used the pooled % estimate
        #   'teacher'    → reference is the teacher clip (single sample)
        if ref_source == "teacher_sample":
            dispersion_source = "teacher"
        elif dispersion_sources and all(s in ("published",) for s in dispersion_sources if s):
            dispersion_source = "published"
        else:
            dispersion_source = "estimated"

        logging.info(
            "analyze-formants: source=%s group=%s per_formant=%s composite=%s "
            "weights=%s dispersion=%s",
            ref_source, ref_group,
            [(p["name"], p["measured"], p["reference"], p["score"]) for p in per_formant],
            composite, weights, dispersion_source,
        )
        return {
            "phoneme_ipa": phoneme_ipa,
            "dialect": dialect,
            "student_formants": student,
            "reference_source": ref_source,
            "reference_group": ref_group,
            "citation": citation,
            "dispersion_source": dispersion_source,
            "per_formant": per_formant,
            "composite_score": composite,
            "cefr": _cefr_band(composite),
            "high_impact": phoneme_ipa in HIGH_IMPACT_IPA,
            "diagnostics": diagnostics,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }

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
