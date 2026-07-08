"""
Iteration 26 · Audio-Studio manual URL paste + Voice Lab file upload
====================================================================

Covers three new endpoints / behaviours introduced in iter-26:

  1. PATCH /api/admin/phonemes/{card_id}/audio-url
     – Auth-guarded manual URL paste. Verifies routing to each of the
       key shapes: isolated-{AmE|RP}, example-{AmE|RP}-{i}, mnemonic,
       word-{i}-{AmE|RP}. Persists via GET after PATCH.

  2. POST /api/admin/elevenlabs/upload-audio
     – Multipart file upload guarded by admin. Verifies:
         * 401 without admin JWT
         * 200 + {url, relative_url, filename starting with 'manual/',
                  content_type, size_bytes} on tiny valid MP3
         * 413 on > 5MB payload
         * 415 on unsupported extension (.txt)
         * 400 on empty file

  3. Regression: PATCH endpoint rejects malformed keys with 400 and
     unknown card_id with 404.
"""

from __future__ import annotations

import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend/.env as ultimate fallback (test-only)
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"
TARGET_CARD = "e-dress"  # has both AmE + RP audio, used in Bug #3


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def admin_token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("access_token") or r.json().get("token")
    if not tok:
        pytest.skip("no token in login response")
    return tok


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


def _minimal_mp3() -> bytes:
    """A tiny but non-empty MP3-shaped byte string. Not a valid decoded
    MP3, but sufficient to exercise the upload endpoint (which does not
    decode the audio, only stores the bytes and enforces size/ext)."""
    return (b"ID3\x04\x00\x00\x00\x00\x00\x00"
            + b"\xff\xfb\x90\x00"
            + b"\x00" * 512)


# --------------------------------------------------------------------------- #
# 1) PATCH /admin/phonemes/{card_id}/audio-url — key taxonomy coverage
# --------------------------------------------------------------------------- #
class TestPatchAudioUrl:

    def test_auth_guard(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/phonemes/{TARGET_CARD}/audio-url",
            json={"key": "isolated-AmE", "url": "https://example.com/x.mp3"},
            timeout=10,
        )
        assert r.status_code in (401, 403), (
            f"expected 401/403 without auth, got {r.status_code}"
        )

    def test_unknown_card_returns_404(self, admin_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/phonemes/does-not-exist/audio-url",
            headers=admin_headers,
            json={"key": "isolated-AmE", "url": "https://example.com/x.mp3"},
            timeout=10,
        )
        assert r.status_code == 404

    def test_malformed_key_returns_400(self, admin_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/phonemes/{TARGET_CARD}/audio-url",
            headers=admin_headers,
            json={"key": "banana", "url": "https://example.com/x.mp3"},
            timeout=10,
        )
        assert r.status_code == 400

    @pytest.mark.parametrize("key,verify_path", [
        ("isolated-AmE",   ("audio", "AmE", "isolated")),
        ("isolated-RP",    ("audio", "RP",  "isolated")),
        ("example-AmE-0",  ("audio", "AmE", "examples", 0)),
        ("example-RP-0",   ("audio", "RP",  "examples", 0)),
        ("mnemonic",       ("mnemonic", "audio")),
        ("word-3-AmE",     ("commonWords", 3, "audioAmE")),
        ("word-3-RP",      ("commonWords", 3, "audioRP")),
    ])
    def test_patch_and_persist_each_key_shape(self, admin_headers, key, verify_path):
        marker_url = f"https://example.com/TEST_{key}.mp3"

        # PATCH
        r = requests.patch(
            f"{BASE_URL}/api/admin/phonemes/{TARGET_CARD}/audio-url",
            headers=admin_headers,
            json={"key": key, "url": marker_url},
            timeout=10,
        )
        assert r.status_code == 200, f"PATCH {key}: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body.get("ok") is True
        assert body.get("card_id") == TARGET_CARD
        assert body.get("key") == key
        assert body.get("url") == marker_url

        # GET to verify persistence
        g = requests.get(
            f"{BASE_URL}/api/admin/phonemes/{TARGET_CARD}",
            headers=admin_headers,
            timeout=10,
        )
        assert g.status_code == 200, f"GET after PATCH failed: {g.status_code}"
        doc = g.json()

        # Walk verify_path down the doc
        cur = doc
        for step in verify_path:
            assert cur is not None, f"Path missing at {step}: doc={doc}"
            cur = cur[step] if isinstance(step, int) else cur.get(step)
        assert cur == marker_url, (
            f"key={key} path={verify_path}: expected {marker_url}, got {cur!r}"
        )


# --------------------------------------------------------------------------- #
# 2) POST /admin/elevenlabs/upload-audio — file upload
# --------------------------------------------------------------------------- #
class TestElevenLabsUpload:

    def test_auth_guard(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            files={"file": ("test.mp3", _minimal_mp3(), "audio/mpeg")},
            timeout=15,
        )
        assert r.status_code in (401, 403), (
            f"expected 401/403 without auth, got {r.status_code}"
        )

    def test_upload_tiny_mp3(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            headers=admin_headers,
            files={"file": ("TEST_iter26.mp3", _minimal_mp3(), "audio/mpeg")},
            data={"filename_hint": "TEST_iter26"},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        j = r.json()
        assert "url" in j and j["url"], "no url in response"
        assert "relative_url" in j and j["relative_url"].startswith("/api/uploads/manual/")
        assert j.get("filename", "").startswith("manual/"), f"filename={j.get('filename')}"
        assert j.get("content_type") == "audio/mpeg"
        assert j.get("size_bytes", 0) > 0

    def test_upload_wav_extension(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            headers=admin_headers,
            files={"file": ("TEST_iter26.wav", _minimal_mp3(), "audio/wav")},
            timeout=15,
        )
        assert r.status_code == 200
        j = r.json()
        assert j.get("content_type") == "audio/wav"
        assert j.get("filename", "").endswith(".wav")

    def test_reject_invalid_extension(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            headers=admin_headers,
            files={"file": ("hack.txt", b"hello", "text/plain")},
            timeout=15,
        )
        assert r.status_code == 415, f"expected 415, got {r.status_code} {r.text[:200]}"

    def test_reject_empty_file(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            headers=admin_headers,
            files={"file": ("empty.mp3", b"", "audio/mpeg")},
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text[:200]}"

    def test_reject_oversized_file(self, admin_headers):
        big = b"\x00" * (5 * 1024 * 1024 + 100)  # > 5MB
        r = requests.post(
            f"{BASE_URL}/api/admin/elevenlabs/upload-audio",
            headers=admin_headers,
            files={"file": ("big.mp3", big, "audio/mpeg")},
            timeout=30,
        )
        assert r.status_code == 413, f"expected 413, got {r.status_code} {r.text[:200]}"
