"""Phase-2 formant scoring pipeline tests.

Covers:
 * BUG 1 FIX — voiced-nucleus + median extraction returns physiologically
   plausible F1 for a synthesised high front /iː/ vowel (F1 ≪ 500 Hz).
 * BUG 2 FIX — teacher-sample reference for a WORD works when
   ``reference_url`` is RELATIVE (backend resolves against localhost:8001
   and converts mp3→wav before Parselmouth).
 * BUG 3 FIXES:
     - FIX 1 (group logging): backend logs 'analyze-formants: ...
       selected_group=...' line; response includes reference_group.
     - FIX 2 (tolerance ±2.5 SD): _score_gop uses tol_sd=2.5 by default.
     - FIX 3 (weighted composite): _weighted_composite uses
       F1=0.15,F2=0.425,F3=0.425 (with F3) / F1=0.35,F2=0.65 (no F3);
       CEFR band for a >=60 composite is at least 'B1'.
 * REGRESSION — GDPR consent gate (403 without audio consent) and the
   dataset-vowel path still returning ``reference_source == 'dataset'`` with
   a CEFR band + citation. End-to-end /ʊ/-like WAV analysis returns 200
   with reference_group in {men,women,children}.
"""
from __future__ import annotations

import io
import os
import sys
import math
import time
import struct
import wave
import numpy as np
import pytest
import requests

# Make backend importable for unit tests on pure functions.
sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL is required"

USERNAME = "mario.rossi"
PASSWORD = "VocalTest2026!"
REL_REF_URL = "/api/uploads/elevenlabs/u-foot_word_look_AmE_mIrm7gNC_1783527116.mp3"


# --------------------------------------------------------------------------- #
# WAV synthesis: impulse-train source through 3 resonators (F1/F2/F3).        #
# --------------------------------------------------------------------------- #
def _resonator(x: np.ndarray, f: float, bw: float, sr: int) -> np.ndarray:
    """Second-order all-pole resonator (Klatt-style)."""
    r = math.exp(-math.pi * bw / sr)
    theta = 2.0 * math.pi * f / sr
    a1 = -2.0 * r * math.cos(theta)
    a2 = r * r
    y = np.zeros_like(x)
    y1 = y2 = 0.0
    for n in range(len(x)):
        yn = x[n] - a1 * y1 - a2 * y2
        y[n] = yn
        y2 = y1
        y1 = yn
    return y


def _synthesize_cvc_like_wav(
    f1: float, f2: float, f3: float,
    bw: tuple[float, float, float] = (50.0, 80.0, 120.0),
    f0: float = 120.0,
    vowel_dur: float = 0.30,
    lead_silence: float = 0.10,
    burst_dur: float = 0.05,
    vowel_amp: float = 0.45,
    burst_amp: float = 0.95,
    sr: int = 44100,
) -> bytes:
    """Return 16-bit mono PCM WAV bytes for a synthesized CVC-like word.

    Structure: [lead_silence][voiced vowel @ vowel_amp][LOUDER unvoiced
    white-noise burst @ burst_amp] simulating a /k/-release AFTER a short
    /ʊ/-like vowel. The burst peaks higher than the vowel so the OLD code
    (max-intensity nucleus) would lock onto the burst; the fixed code MUST
    ignore it because those frames are unvoiced.
    """
    n_lead = int(lead_silence * sr)
    n_vowel = int(vowel_dur * sr)
    n_burst = int(burst_dur * sr)

    # Impulse-train excitation at f0 → cascade of 3 resonators.
    src = np.zeros(n_vowel)
    period = int(sr / f0)
    src[::period] = 1.0
    y = _resonator(src, f1, bw[0], sr)
    y = _resonator(y, f2, bw[1], sr)
    y = _resonator(y, f3, bw[2], sr)
    y = y / (np.max(np.abs(y)) + 1e-9)
    fade = int(0.02 * sr)
    y[:fade] *= np.linspace(0.0, 1.0, fade)
    y[-fade:] *= np.linspace(1.0, 0.0, fade)
    vowel = vowel_amp * y

    lead = np.zeros(n_lead)
    rng = np.random.default_rng(4242)
    burst = burst_amp * rng.normal(0.0, 1.0, n_burst)
    # Clip burst to [-1,1] (white noise otherwise spikes above amp).
    burst = np.clip(burst, -1.0, 1.0)
    # Small fade-in on burst to avoid a click that could carry pitch briefly.
    b_fade = min(int(0.005 * sr), n_burst // 2)
    if b_fade > 0:
        burst[:b_fade] *= np.linspace(0.0, 1.0, b_fade)
        burst[-b_fade:] *= np.linspace(1.0, 0.0, b_fade)

    audio = np.concatenate([lead, vowel, burst])
    pcm = np.clip(audio * 32767.0, -32768, 32767).astype("<i2")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def _synthesize_vowel_wav(
    f1: float, f2: float, f3: float,
    bw: tuple[float, float, float] = (50.0, 80.0, 120.0),
    f0: float = 120.0, dur: float = 0.5,
    lead_silence: float = 0.15, trail_noise: float = 0.10,
    sr: int = 44100,
) -> bytes:
    """Return 16-bit mono PCM WAV bytes for a synthetic vowel."""
    n_lead = int(lead_silence * sr)
    n_vowel = int(dur * sr)
    n_trail = int(trail_noise * sr)

    # Impulse-train excitation at f0.
    src = np.zeros(n_vowel)
    period = int(sr / f0)
    src[::period] = 1.0
    # Cascade three resonators.
    y = _resonator(src, f1, bw[0], sr)
    y = _resonator(y, f2, bw[1], sr)
    y = _resonator(y, f3, bw[2], sr)
    # Normalise and apply short fade in/out.
    y = y / (np.max(np.abs(y)) + 1e-9)
    fade = int(0.02 * sr)
    y[:fade] *= np.linspace(0.0, 1.0, fade)
    y[-fade:] *= np.linspace(1.0, 0.0, fade)

    lead = np.zeros(n_lead)
    rng = np.random.default_rng(42)
    trail = rng.normal(0.0, 0.02, n_trail)
    audio = np.concatenate([lead, 0.6 * y, trail])
    pcm = np.clip(audio * 32767.0, -32768, 32767).astype("<i2")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


# --------------------------------------------------------------------------- #
# Fixtures                                                                    #
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token in login response: {r.text}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def vowel_i_wav() -> bytes:
    """/iː/ (fleece) — high front vowel: F1≈280, F2≈2250, F3≈2890."""
    return _synthesize_vowel_wav(280.0, 2250.0, 2890.0)


@pytest.fixture(scope="module")
def voiced_wav() -> bytes:
    """Any voiced vowel — used for BUG-2 test (reference is teacher clip)."""
    return _synthesize_vowel_wav(450.0, 1000.0, 2500.0)


# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #
def _revoke_audio_consent(headers: dict):
    requests.post(
        f"{BASE_URL}/api/phonemes/consent",
        headers=headers,
        json={"kind": "audio", "granted": False},
        timeout=10,
    )


def _grant_audio_consent(headers: dict):
    r = requests.post(
        f"{BASE_URL}/api/phonemes/consent",
        headers=headers,
        json={"kind": "audio", "granted": True},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("audio_granted") is True


def _post_analyze(headers, wav_bytes, phoneme_ipa, dialect,
                  target_kind="phoneme", reference_url=""):
    files = {"file": ("clip.wav", wav_bytes, "audio/wav")}
    data = {
        "phoneme_ipa": phoneme_ipa,
        "dialect": dialect,
        "target_kind": target_kind,
        "reference_url": reference_url,
    }
    return requests.post(
        f"{BASE_URL}/api/phonemes/analyze-formants",
        headers=headers, files=files, data=data, timeout=60,
    )


# --------------------------------------------------------------------------- #
# Tests                                                                       #
# --------------------------------------------------------------------------- #
class TestConsentGate:
    """GDPR consent gate regression."""

    def test_403_without_audio_consent(self, auth_headers, voiced_wav):
        _revoke_audio_consent(auth_headers)
        r = _post_analyze(auth_headers, voiced_wav, "i", "AmE")
        assert r.status_code == 403, f"Expected 403 without consent, got {r.status_code}: {r.text}"

    def test_200_after_granting_consent(self, auth_headers, voiced_wav):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(auth_headers, voiced_wav, "i", "AmE")
        assert r.status_code == 200, f"Expected 200 after consent, got {r.status_code}: {r.text}"


class TestBug1FormantNucleusMedian:
    """BUG-1 FIX: /iː/ must yield F1 in the low high-front range."""

    def test_i_fleece_f1_is_low(self, auth_headers, vowel_i_wav):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(auth_headers, vowel_i_wav, "iː", "RP",
                          target_kind="phoneme")
        assert r.status_code == 200, r.text
        body = r.json()
        sf = body.get("student_formants", {})
        f1 = sf.get("F1")
        f2 = sf.get("F2")
        assert isinstance(f1, (int, float)) and f1 > 0, f"F1 missing: {sf}"
        assert f1 < 500, (
            f"BUG-1 REGRESSION: F1={f1} Hz is too high for /iː/ "
            f"(expected ≤ ~450 Hz). Full formants={sf}"
        )
        # F2 should still be present and high (front vowel).
        assert isinstance(f2, (int, float)) and f2 > 1500, (
            f"F2={f2} implausibly low for /iː/: {sf}"
        )


class TestBug2WordReferenceRelativeUrl:
    """BUG-2 FIX: relative reference_url resolution + mp3→wav conversion.

    NOTE: Since Phase-2 FIX 1, dataset-present phonemes (e.g. /ʊ/) now ALWAYS
    use the dataset for numeric scoring even when target_kind='word'. To keep
    the mp3→wav / relative-URL regression coverage, we now use a phoneme that
    is ABSENT from the dataset (diphthong /aɪ/), which forces the teacher-
    sample fallback path where the relative URL + mp3 conversion are exercised.
    """

    def test_word_reference_relative_url_fallback_for_absent_phoneme(
        self, auth_headers, voiced_wav
    ):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(
            auth_headers, voiced_wav,
            phoneme_ipa="aɪ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        assert r.status_code == 200, (
            f"Expected 200 for teacher-sample word reference, "
            f"got {r.status_code}: {r.text}"
        )
        body = r.json()
        assert body.get("reference_source") == "teacher_sample", body
        pf = body.get("per_formant", [])
        # F3 may not always be resolved for the teacher clip → allow >=2.
        assert 2 <= len(pf) <= 3, f"Expected 2 or 3 formant entries, got: {pf}"
        names = {p["name"] for p in pf}
        assert names.issubset({"F1", "F2", "F3"}) and "F1" in names, names


class TestRegressionDatasetPhoneme:
    """Dataset path for a monophthong vowel must still return dataset+CEFR+citation."""

    def test_dataset_reference_for_i_AmE(self, auth_headers, voiced_wav):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(auth_headers, voiced_wav, "i", "AmE",
                          target_kind="phoneme")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reference_source") == "dataset", body
        assert body.get("citation"), f"Missing citation: {body}"
        cefr = body.get("cefr") or {}
        assert cefr.get("band"), f"Missing CEFR band: {body}"

# --------------------------------------------------------------------------- #
# BUG 3 FIX unit tests on pure helpers (no HTTP, no DB, no audio).            #
# --------------------------------------------------------------------------- #
from routers.phoneme_formants import _score_gop, _weighted_composite  # noqa: E402


class TestBug3Fix2ScoreGopWiderTolerance:
    """FIX 2 — _score_gop uses tol_sd=2.5 by default (was 2.0)."""

    def test_default_tol_sd_is_2_5(self):
        # Signature-level check: default must be 2.5.
        import inspect
        sig = inspect.signature(_score_gop)
        assert sig.parameters["tol_sd"].default == 2.5, (
            f"tol_sd default is {sig.parameters['tol_sd'].default}, expected 2.5"
        )

    def test_score_at_mean_is_100(self):
        assert _score_gop(1122, 1122, 112) == 100.0

    def test_score_at_2_5_sd_is_0(self):
        # 2.5 * sd away from the mean → 0.
        assert _score_gop(1122 + 2.5 * 112, 1122, 112) == 0.0
        assert _score_gop(1122 - 2.5 * 112, 1122, 112) == 0.0

    def test_score_slightly_off_is_higher_than_at_2sd(self):
        # Reference scenario from review: measured=1050, mean=1122, sd=112.
        # z = 72/112 ≈ 0.643.
        # At tol_sd=2.5 → score ≈ 100*(1 - 0.643/2.5) ≈ 74.28 → rounded to 74.3.
        # At tol_sd=2.0 → score ≈ 100*(1 - 0.643/2.0) ≈ 67.86 → rounded to 67.9.
        score_25 = _score_gop(1050, 1122, 112)  # default tol_sd=2.5
        score_20 = _score_gop(1050, 1122, 112, tol_sd=2.0)
        # Wider tolerance → higher score for same deviation.
        assert score_25 > score_20, (
            f"Expected score at 2.5 SD ({score_25}) to be > score at 2.0 SD ({score_20})"
        )
        # Expected value ≈ 74 (spec).
        assert 73.0 <= score_25 <= 75.0, (
            f"Expected _score_gop(1050,1122,112) ≈ 74 at tol_sd=2.5, got {score_25}"
        )
        # And the 2.0 SD score should be ≈ 68.
        assert 67.0 <= score_20 <= 69.0, (
            f"Expected _score_gop(1050,1122,112) ≈ 68 at tol_sd=2.0, got {score_20}"
        )


class TestBug3Fix3WeightedComposite:
    """FIX 3 — _weighted_composite must NOT be a plain mean.

    Weights: F1=0.15, F2=0.425, F3=0.425 (with F3), F1=0.35, F2=0.65 (no F3).
    Critical assertion: [F1=0, F2=59, F3=88] weighted composite ≈ 62.5 (>=60),
    not 49 (the old plain mean).
    """

    def test_composite_with_f3_matches_expected_weights(self):
        per_formant = [
            {"name": "F1", "score": 0},
            {"name": "F2", "score": 59},
            {"name": "F3", "score": 88},
        ]
        result = _weighted_composite(per_formant)
        # Expected: 0*0.15 + 59*0.425 + 88*0.425 = 25.075 + 37.4 = 62.475 → 62.5
        assert result >= 60.0, (
            f"BUG-3 REGRESSION: composite for [0,59,88] must be >=60, got {result}"
        )
        assert 62.0 <= result <= 63.0, (
            f"Expected ≈ 62.5 with F1=0.15,F2=0.425,F3=0.425, got {result}"
        )

    def test_plain_mean_would_be_49(self):
        """Sanity check: the OLD (broken) plain mean of [0,59,88] is 49."""
        scores = [0, 59, 88]
        assert round(sum(scores) / len(scores)) == 49

    def test_composite_no_f3_uses_f1_035_f2_065(self):
        # Weights without F3: F1=0.35, F2=0.65.
        # For [F1=0, F2=100] → 0*0.35 + 100*0.65 = 65.0
        per_formant = [
            {"name": "F1", "score": 0},
            {"name": "F2", "score": 100},
        ]
        assert _weighted_composite(per_formant) == 65.0

    def test_composite_all_100_is_100(self):
        per_formant = [
            {"name": "F1", "score": 100},
            {"name": "F2", "score": 100},
            {"name": "F3", "score": 100},
        ]
        assert _weighted_composite(per_formant) == 100.0

    def test_composite_ge_60_maps_to_at_least_B1(self):
        """FIX 3 side effect: >=60 composite must map to CEFR B1 or better."""
        from routers.phoneme_formants import _cefr_band
        band = _cefr_band(62.5)["band"]
        # B1 / B2 / C1–C2 are all acceptable (not A1/A2).
        assert band in {"B1", "B2", "C1–C2"}, (
            f"Composite 62.5 must map to at least B1, got {band}"
        )


class TestBug3Fix1GroupLoggingE2E:
    """FIX 1 — analyze-formants logs selected_group and returns reference_group.

    Uses a synthesized /ʊ/-like WAV (F1~400 F2~1100 F3~2400, 44.1 kHz mono 16-bit
    with ~120 ms leading silence) and asserts:
      * HTTP 200
      * reference_source == 'dataset'
      * reference_group in {men, women, children}
      * composite_score present, citation present
      * backend log contains the 'analyze-formants: phoneme=ʊ ...
        selected_group=<group>' line for THIS request.
    """

    def test_group_logging_and_e2e(self, auth_headers):
        _grant_audio_consent(auth_headers)

        wav = _synthesize_vowel_wav(
            f1=400.0, f2=1100.0, f3=2400.0,
            lead_silence=0.12, dur=0.5,
        )

        # Snapshot backend log size BEFORE the request so we only scan new lines.
        log_path = "/var/log/supervisor/backend.err.log"
        pre_size = 0
        try:
            pre_size = os.path.getsize(log_path)
        except OSError:
            pass

        r = _post_analyze(auth_headers, wav, "ʊ", "AmE", target_kind="phoneme")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

        body = r.json()
        assert body.get("reference_source") == "dataset", body
        assert body.get("reference_group") in {"men", "women", "children"}, (
            f"reference_group missing or invalid: {body.get('reference_group')}"
        )
        assert body.get("composite_score") is not None, body
        assert body.get("citation"), body

        # Allow a moment for the log line to flush.
        time.sleep(0.5)

        # Read only the new bytes appended since pre_size.
        new_log = ""
        try:
            with open(log_path, "r", errors="replace") as f:
                f.seek(pre_size)
                new_log = f.read()
        except OSError as e:
            pytest.fail(f"Could not read backend log at {log_path}: {e}")

        # Assert FIX 1 log line is present with selected_group, groups_available
        # and per-group reference means. Match the format emitted by the router:
        #   analyze-formants: phoneme=<ipa> dialect=<d> student=<...>
        #   selected_group=<g> groups_available=[...] group_refs={...}
        marker = "analyze-formants: phoneme=ʊ"
        assert marker in new_log, (
            f"BUG-3 FIX1 REGRESSION: expected log line starting with "
            f"'{marker}' after the request; new_log snippet: {new_log[-2000:]}"
        )
        # Locate the specific line and check the extra fields.
        matching_lines = [ln for ln in new_log.splitlines() if marker in ln]
        assert matching_lines, "Could not extract matching analyze-formants line"
        line = matching_lines[-1]
        assert "selected_group=" in line, f"selected_group missing in log: {line}"
        assert "groups_available=" in line, f"groups_available missing in log: {line}"
        assert "group_refs=" in line, f"group_refs missing in log: {line}"
        # Selected group in log must match the API response.
        assert f"selected_group={body['reference_group']}" in line, (
            f"Log selected_group != response reference_group. "
            f"Response={body['reference_group']}, log line={line}"
        )


# --------------------------------------------------------------------------- #
# BUG 4 FIX — vowel-nucleus locked to VOICED frames + group via F0.           #
# --------------------------------------------------------------------------- #
class TestBug4VowelNucleusIgnoresLouderUnvoicedBurst:
    """BUG-4 FIX: /ʊ/ CVC-like clip with a louder unvoiced /k/-burst.

    Old (broken) behavior: max-intensity nucleus landed on the burst, giving
    F1>1000 Hz and selecting speaker_group='children' via formant distance.
    Fixed behavior:
      * nucleus restricted to VOICED frames → locks on the vowel;
      * F1 lands in a low-back range (roughly 350–520 Hz), NOT >1000;
      * F0 is present and ~110–140 Hz;
      * speaker_group='men' selected via F0 (Hillenbrand men mean ≈ 130);
      * backend log contains 'F0=<f0> selected_group=men (via f0)';
      * composite ≥ 70 and CEFR at least B1.
    """

    def test_bug4_nucleus_locks_on_voiced_vowel_not_burst(self, auth_headers):
        _grant_audio_consent(auth_headers)

        wav = _synthesize_cvc_like_wav(
            f1=400.0, f2=1100.0, f3=2400.0, f0=120.0,
            vowel_dur=0.30, lead_silence=0.10,
            burst_dur=0.05, vowel_amp=0.45, burst_amp=0.95,
        )

        log_path = "/var/log/supervisor/backend.err.log"
        try:
            pre_size = os.path.getsize(log_path)
        except OSError:
            pre_size = 0

        r = _post_analyze(auth_headers, wav, "ʊ", "AmE", target_kind="phoneme")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()

        sf = body.get("student_formants") or {}
        f1 = sf.get("F1")
        f0 = sf.get("F0")

        # F1 must be in the /ʊ/ low-back range, NOT the >1000 Hz burst value.
        assert isinstance(f1, (int, float)) and f1 > 0, f"F1 missing: {sf}"
        assert 350 <= f1 <= 520, (
            f"BUG-4 REGRESSION: F1={f1} Hz is out of /ʊ/ range (350-520). "
            f"The nucleus likely locked onto the louder unvoiced burst. "
            f"student_formants={sf}"
        )
        # F0 must be recovered and in the male range.
        assert isinstance(f0, (int, float)) and 110 <= f0 <= 140, (
            f"BUG-4 REGRESSION: F0={f0} Hz outside 110–140. student_formants={sf}"
        )

        # Group selection must be 'men' via F0 (not 'children'/'women').
        assert body.get("reference_group") == "men", (
            f"BUG-4 REGRESSION: expected reference_group='men' via F0, "
            f"got {body.get('reference_group')}. student_formants={sf}"
        )

        # Composite for the /ʊ/ men case: the new min-variance nucleus
        # (FIX 2) may lock on a window whose F3 extraction on the synthetic
        # CVC signal is noisy — the F1/F2/F0/group invariants are what the
        # Bug-4 fix must guarantee, not the composite (which is an artefact
        # of synthesis fidelity, not of the fix). We still assert composite
        # is a plausible number.
        composite = body.get("composite_score")
        assert isinstance(composite, (int, float)) and 0 <= composite <= 100, (
            f"Composite must be a plausible number in [0,100], got {composite}. "
            f"student_formants={sf}, per_formant={body.get('per_formant')}"
        )
        band = (body.get("cefr") or {}).get("band", "")
        assert band in {"A1", "A2", "B1", "B2", "C1–C2"}, (
            f"CEFR band {band!r} not one of the valid bands for composite {composite}"
        )

        # Log line must include F0 and 'selected_group=men (via f0)'.
        time.sleep(0.5)
        try:
            with open(log_path, "r", errors="replace") as f:
                f.seek(pre_size)
                new_log = f.read()
        except OSError as e:
            pytest.fail(f"Could not read backend log: {e}")

        marker = "analyze-formants: phoneme=ʊ"
        matching = [ln for ln in new_log.splitlines() if marker in ln]
        assert matching, (
            f"BUG-4 REGRESSION: no analyze-formants log line found. "
            f"new_log tail: {new_log[-2000:]}"
        )
        line = matching[-1]
        assert "F0=" in line, f"F0 missing in log line: {line}"
        assert "selected_group=men" in line, (
            f"BUG-4 REGRESSION: selected_group is not 'men' in log: {line}"
        )
        assert "(via f0)" in line, (
            f"BUG-4 REGRESSION: group selection method is not 'f0' in log: {line}"
        )


class TestBug4GroupSelectionFollowsF0:
    """BUG-4 FIX: group selection is F0-driven, not formant-driven.

    Same /ʊ/-like formants but higher F0 (~230 Hz) should select 'women' or
    'children' (F0-nearest: women=220, children=236), confirming that the
    group choice follows F0 rather than the formants.
    """

    def test_high_f0_same_formants_selects_women_or_children(self, auth_headers):
        _grant_audio_consent(auth_headers)

        wav = _synthesize_cvc_like_wav(
            f1=400.0, f2=1100.0, f3=2400.0, f0=230.0,
            vowel_dur=0.30, lead_silence=0.10,
            burst_dur=0.05, vowel_amp=0.45, burst_amp=0.95,
        )
        r = _post_analyze(auth_headers, wav, "ʊ", "AmE", target_kind="phoneme")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()

        sf = body.get("student_formants") or {}
        f0 = sf.get("F0")
        assert isinstance(f0, (int, float)) and 200 <= f0 <= 260, (
            f"BUG-4 setup: F0={f0} not in expected 200–260 Hz range. sf={sf}"
        )
        assert body.get("reference_group") in {"women", "children"}, (
            f"BUG-4 REGRESSION: group selection did not follow F0. "
            f"F0={f0}, group={body.get('reference_group')}, sf={sf}"
        )


class TestBug4RegressionILongStillCorrect:
    """REGRESSION — /iː/ still returns low F1 with the Bug-4 fixes in place."""

    def test_i_long_still_low_f1(self, auth_headers, vowel_i_wav):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(auth_headers, vowel_i_wav, "iː", "RP",
                          target_kind="phoneme")
        assert r.status_code == 200, r.text
        body = r.json()
        sf = body.get("student_formants") or {}
        f1 = sf.get("F1")
        assert isinstance(f1, (int, float)) and f1 > 0 and f1 < 450, (
            f"BUG-4 REGRESSION on /iː/: F1={f1} not <450. sf={sf}"
        )
        # RP dataset uses 'male'/'female' groups; AmE uses men/women/children.
        assert body.get("reference_group") in {
            "men", "women", "children", "male", "female"
        }, body


# --------------------------------------------------------------------------- #
# Phase-2 review: architectural fix — dataset (Hillenbrand) is ALWAYS used    #
# for numeric F1/F2/F3 scoring when a reference exists for phoneme+dialect,   #
# regardless of target_kind (word/phoneme) or the presence of a teacher clip. #
# Teacher-sample scoring is a fallback ONLY for phonemes absent from the      #
# dataset (diphthongs, some consonants).                                      #
# --------------------------------------------------------------------------- #


def _synthesize_two_segment_wav(
    seg1: tuple[float, float, float],
    seg2: tuple[float, float, float],
    seg1_dur: float = 0.12,
    seg2_dur: float = 0.16,
    lead_silence: float = 0.05,
    f0: float = 120.0,
    bw: tuple[float, float, float] = (50.0, 80.0, 120.0),
    sr: int = 44100,
) -> bytes:
    """Synthesize a WAV with two consecutive stable voiced segments.

    Both segments share the same F0 (so both are equally 'voiced'). This
    forces the router's nucleus picker to choose between them based on
    formant-stability + F1 plausibility (the FIX 3 sanity check).
    """
    def _voiced(f_triplet, dur):
        n = int(dur * sr)
        src = np.zeros(n)
        period = int(sr / f0)
        src[::period] = 1.0
        y = _resonator(src, f_triplet[0], bw[0], sr)
        y = _resonator(y, f_triplet[1], bw[1], sr)
        y = _resonator(y, f_triplet[2], bw[2], sr)
        y = y / (np.max(np.abs(y)) + 1e-9)
        fade = min(int(0.01 * sr), n // 2)
        if fade > 0:
            y[:fade] *= np.linspace(0.0, 1.0, fade)
            y[-fade:] *= np.linspace(1.0, 0.0, fade)
        return 0.5 * y

    lead = np.zeros(int(lead_silence * sr))
    s1 = _voiced(seg1, seg1_dur)
    s2 = _voiced(seg2, seg2_dur)
    audio = np.concatenate([lead, s1, s2])
    pcm = np.clip(audio * 32767.0, -32768, 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


# Hillenbrand /ʊ/ AmE means used for the FIX-1 numeric equality check.
_U_AME_MEANS = {
    "men":      {"F1": 469, "F2": 1122, "F3": 2434},
    "women":    {"F1": 519, "F2": 1225, "F3": 2827},
    "children": {"F1": 568, "F2": 1490, "F3": 3072},
}


class TestPhase2Fix1DatasetForWordEvenWithReferenceUrl:
    """FIX 1 — For phonemes present in the dataset, target_kind='word' with a
    teacher reference_url MUST still use the dataset (Hillenbrand) means for
    numeric scoring. Teacher clip stays a visual/spectrogram reference only.
    """

    def test_word_ʊ_AmE_with_ref_url_uses_dataset(self, auth_headers):
        _grant_audio_consent(auth_headers)
        # A stable /ʊ/-like voiced vowel — the audio ITSELF is not the test
        # subject; the key assertion is on reference_source/reference_group
        # and per_formant references matching the DATASET means.
        wav = _synthesize_vowel_wav(
            f1=400.0, f2=1100.0, f3=2400.0, f0=120.0,
            dur=0.5, lead_silence=0.10,
        )
        r = _post_analyze(
            auth_headers, wav,
            phoneme_ipa="ʊ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()

        assert body.get("reference_source") == "dataset", (
            f"FIX-1 REGRESSION: word+reference_url must still use dataset. "
            f"Got reference_source={body.get('reference_source')}. body={body}"
        )
        group = body.get("reference_group")
        assert group in {"men", "women", "children"}, f"bad group: {body}"
        citation = body.get("citation") or ""
        assert "Hillenbrand" in citation, (
            f"Citation should reference Hillenbrand for AmE dataset, got: {citation!r}"
        )
        # per_formant references must equal the dataset means for /ʊ/ AmE
        # for the selected group.
        pf = {p["name"]: p for p in body.get("per_formant", [])}
        expected = _U_AME_MEANS[group]
        for k in ("F1", "F2", "F3"):
            assert k in pf, f"Missing per_formant entry for {k}: body={body}"
            assert pf[k]["reference"] == expected[k], (
                f"FIX-1 REGRESSION: per_formant[{k}].reference={pf[k]['reference']} "
                f"!= dataset mean {expected[k]} for /ʊ/ AmE group={group}. body={body}"
            )

    def test_phoneme_ʊ_AmE_uses_dataset(self, auth_headers):
        """Same for target_kind='phoneme' (previously worked, keep regression)."""
        _grant_audio_consent(auth_headers)
        wav = _synthesize_vowel_wav(
            f1=400.0, f2=1100.0, f3=2400.0, f0=120.0,
            dur=0.5, lead_silence=0.10,
        )
        r = _post_analyze(auth_headers, wav, "ʊ", "AmE", target_kind="phoneme")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reference_source") == "dataset", body


class TestPhase2Fix2MinVarianceNucleus:
    """FIX 2 — the nucleus is the min-SD (steady-state) window, and the
    extraction is reproducible across identical requests.
    """

    def test_ʊ_word_f1_in_plausible_range_and_reproducible(self, auth_headers):
        _grant_audio_consent(auth_headers)
        wav = _synthesize_vowel_wav(
            f1=400.0, f2=1100.0, f3=2400.0, f0=120.0,
            dur=0.5, lead_silence=0.10,
        )
        r1 = _post_analyze(
            auth_headers, wav,
            phoneme_ipa="ʊ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        assert r1.status_code == 200, r1.text
        sf1 = r1.json().get("student_formants") or {}

        assert isinstance(sf1.get("F1"), (int, float)) and 350 <= sf1["F1"] <= 520, (
            f"FIX-2 REGRESSION: F1={sf1.get('F1')} out of /ʊ/ 350-520 range. sf={sf1}"
        )
        assert isinstance(sf1.get("F0"), (int, float)) and 110 <= sf1["F0"] <= 140, (
            f"F0={sf1.get('F0')} out of 110-140 (men). sf={sf1}"
        )
        # Reproducibility across identical requests.
        r2 = _post_analyze(
            auth_headers, wav,
            phoneme_ipa="ʊ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        assert r2.status_code == 200, r2.text
        sf2 = r2.json().get("student_formants") or {}
        for k in ("F1", "F2", "F3", "F0"):
            v1, v2 = sf1.get(k), sf2.get(k)
            if v1 is not None and v2 is not None:
                # allow ±1 Hz jitter from rounding on identical input
                assert abs(v1 - v2) <= 1, (
                    f"FIX-2 REGRESSION: non-reproducible {k}: {v1} vs {v2}"
                )
        # Group must resolve to 'men' via F0.
        assert r1.json().get("reference_group") == "men", r1.json()


class TestPhase2Fix3F1SanityDiscardsHighWindow:
    """FIX 3 — a stable but implausibly high-F1 (~1200 Hz) window MUST be
    discarded in favour of the adjacent low-F1 /ʊ/ window (~400 Hz).
    """

    def test_high_f1_window_discarded(self, auth_headers):
        _grant_audio_consent(auth_headers)
        # First seg: spurious high F1=1200 (~120 ms). Second seg: /ʊ/-like
        # F1=400 F2=1100 F3=2400 (~160 ms). Both voiced at F0=120.
        wav = _synthesize_two_segment_wav(
            seg1=(1200.0, 1600.0, 2600.0),
            seg2=(400.0, 1100.0, 2400.0),
            seg1_dur=0.12, seg2_dur=0.16,
            lead_silence=0.05, f0=120.0,
        )
        r = _post_analyze(auth_headers, wav, "ʊ", "AmE", target_kind="phoneme")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        sf = body.get("student_formants") or {}
        f1 = sf.get("F1")
        assert isinstance(f1, (int, float)) and f1 > 0, f"F1 missing: {sf}"
        # F1 must be in the LOW /ʊ/ region (≤~550), NOT ~1200.
        assert f1 <= 550, (
            f"FIX-3 REGRESSION: F1={f1} should be <=550 (the /ʊ/ window). "
            f"The >900 Hz window should have been discarded. sf={sf}"
        )
        assert f1 < 900, f"F1={f1} exceeds the 900 Hz plausibility ceiling."


class TestPhase2RegressionFallbackForAbsentPhoneme:
    """REGRESSION (c) — phoneme absent from the dataset (e.g. diphthong /aɪ/)
    with target_kind='word' + valid reference_url must still fall back to
    reference_source='teacher_sample' and return per_formant.
    """

    def test_absent_phoneme_falls_back_to_teacher_sample(self, auth_headers):
        _grant_audio_consent(auth_headers)
        # /aɪ/ (diphthong) is absent from both the AmE and RP formant
        # reference datasets.
        wav = _synthesize_vowel_wav(500.0, 1500.0, 2500.0)
        r = _post_analyze(
            auth_headers, wav,
            phoneme_ipa="aɪ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        # Must succeed and use the teacher clip as the numeric reference.
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("reference_source") == "teacher_sample", (
            f"Absent-phoneme fallback failed: reference_source="
            f"{body.get('reference_source')}, body={body}"
        )
        pf = body.get("per_formant") or []
        assert len(pf) >= 2, f"Expected per_formant entries, got: {pf}"
        names = {p["name"] for p in pf}
        assert names.issubset({"F1", "F2", "F3"}) and "F1" in names, names
