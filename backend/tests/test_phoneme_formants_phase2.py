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
    """BUG-2 FIX: relative reference_url must resolve + mp3→wav conversion works."""

    def test_word_reference_relative_url(self, auth_headers, voiced_wav):
        _grant_audio_consent(auth_headers)
        r = _post_analyze(
            auth_headers, voiced_wav,
            phoneme_ipa="ʊ", dialect="AmE",
            target_kind="word", reference_url=REL_REF_URL,
        )
        assert r.status_code == 200, (
            f"Expected 200 for teacher-sample word reference, "
            f"got {r.status_code}: {r.text}"
        )
        body = r.json()
        assert body.get("reference_source") == "teacher_sample", body
        pf = body.get("per_formant", [])
        assert len(pf) == 3, f"Expected 3 formant entries, got {len(pf)}: {pf}"
        names = {p["name"] for p in pf}
        assert names == {"F1", "F2", "F3"}, names


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

