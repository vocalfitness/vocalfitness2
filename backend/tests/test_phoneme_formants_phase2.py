"""Phase-2 formant scoring pipeline tests.

Covers:
 * BUG 1 FIX — voiced-nucleus + median extraction returns physiologically
   plausible F1 for a synthesised high front /iː/ vowel (F1 ≪ 500 Hz).
 * BUG 2 FIX — teacher-sample reference for a WORD works when
   ``reference_url`` is RELATIVE (backend resolves against localhost:8001
   and converts mp3→wav before Parselmouth).
 * REGRESSION — GDPR consent gate (403 without audio consent) and the
   dataset-vowel path still returning ``reference_source == 'dataset'`` with
   a CEFR band + citation.
"""
from __future__ import annotations

import io
import os
import math
import struct
import wave
import numpy as np
import pytest
import requests

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
