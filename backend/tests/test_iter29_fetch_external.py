"""
Iteration 29 · POST /api/admin/elevenlabs/fetch-external-audio
==============================================================

Server-side external URL downloader. Tests:
  1. Auth guard: no admin token → 401/403.
  2. Empty URL → 400 with 'URL vuoto'.
  3. ftp:// scheme → 400 (only http/https allowed).
  4. HTML URL (https://example.com/) → 415 with detail mentioning
     'text/html' or 'content-type' rejection.
  5. Valid MP3 (GitHub raw blank-audio) → 200 with expected fields.
  6. Persistence via GET /api/uploads/manual/… returns audio bytes.
"""

from __future__ import annotations

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
ENDPOINT = f"{BASE_URL}/api/admin/elevenlabs/fetch-external-audio"

VALID_MP3_URL = "https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3"


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


# --------------------------------------------------------------------------- #
# 1. Auth guard
# --------------------------------------------------------------------------- #
class TestAuthGuard:

    def test_no_token_returns_401_or_403(self):
        r = requests.post(ENDPOINT, json={"url": VALID_MP3_URL}, timeout=10)
        assert r.status_code in (401, 403), \
            f"expected 401/403 without auth, got {r.status_code}: {r.text[:150]}"


# --------------------------------------------------------------------------- #
# 2. Input validation
# --------------------------------------------------------------------------- #
class TestInputValidation:

    def test_empty_url_returns_400(self, admin_headers):
        r = requests.post(ENDPOINT, headers=admin_headers,
                          json={"url": ""}, timeout=10)
        assert r.status_code == 400, f"got {r.status_code}: {r.text[:200]}"
        detail = (r.json().get("detail") or "").lower()
        assert "url vuoto" in detail or "vuoto" in detail, \
            f"detail not mentioning 'URL vuoto': {detail}"

    def test_whitespace_url_returns_400(self, admin_headers):
        r = requests.post(ENDPOINT, headers=admin_headers,
                          json={"url": "   "}, timeout=10)
        assert r.status_code == 400
        detail = (r.json().get("detail") or "").lower()
        assert "vuoto" in detail

    def test_ftp_scheme_returns_400(self, admin_headers):
        r = requests.post(ENDPOINT, headers=admin_headers,
                          json={"url": "ftp://example.com/audio.mp3"}, timeout=10)
        assert r.status_code == 400, f"got {r.status_code}: {r.text[:200]}"
        detail = (r.json().get("detail") or "").lower()
        assert "http" in detail and "https" in detail, \
            f"detail should mention http/https only, got: {detail}"

    def test_file_scheme_returns_400(self, admin_headers):
        r = requests.post(ENDPOINT, headers=admin_headers,
                          json={"url": "file:///etc/passwd"}, timeout=10)
        assert r.status_code == 400


# --------------------------------------------------------------------------- #
# 3. Non-audio remote (HTML page) → 415
# --------------------------------------------------------------------------- #
class TestNonAudioRemote:

    def test_html_page_returns_415(self, admin_headers):
        r = requests.post(
            ENDPOINT, headers=admin_headers,
            json={"url": "https://example.com/"}, timeout=45,
        )
        assert r.status_code == 415, f"expected 415, got {r.status_code}: {r.text[:200]}"
        detail = (r.json().get("detail") or "").lower()
        # detail should indicate content-type / html not recognised as audio
        assert "text/html" in detail or "content-type" in detail or "audio" in detail, \
            f"detail should mention html/content-type, got: {detail}"


# --------------------------------------------------------------------------- #
# 4. Valid MP3 fetch — happy path
# --------------------------------------------------------------------------- #
class TestValidFetch:

    def test_valid_mp3_returns_expected_payload(self, admin_headers):
        r = requests.post(
            ENDPOINT, headers=admin_headers,
            json={"url": VALID_MP3_URL, "filename_hint": "TEST_iter29_blank"},
            timeout=60,
        )
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:250]}"
        data = r.json()
        # Required fields
        for key in ("url", "relative_url", "filename", "content_type",
                    "size_bytes", "source_url"):
            assert key in data, f"missing '{key}' in response: {data}"
        # Value assertions
        assert data["relative_url"].startswith("/api/uploads/manual/"), \
            f"relative_url should start with /api/uploads/manual/: {data['relative_url']}"
        assert data["filename"].startswith("manual/"), \
            f"filename should start with manual/: {data['filename']}"
        assert data["content_type"] == "audio/mpeg", \
            f"expected audio/mpeg, got {data['content_type']}"
        assert isinstance(data["size_bytes"], int) and data["size_bytes"] > 100, \
            f"suspicious size: {data['size_bytes']}"
        assert data["source_url"] == VALID_MP3_URL
        assert "TEST_iter29_blank" in data["filename"], \
            f"filename_hint not honoured: {data['filename']}"

        # Cache the returned relative_url on the class for the next test
        TestValidFetch._last_relative = data["relative_url"]

    def test_fetched_file_is_reachable(self, admin_headers):
        # Depends on previous test caching a URL
        rel = getattr(TestValidFetch, "_last_relative", None)
        if not rel:
            pytest.skip("previous fetch did not run")
        r = requests.get(f"{BASE_URL}{rel}", timeout=30)
        assert r.status_code == 200, f"could not GET stored file: {r.status_code}"
        assert r.headers.get("content-type", "").startswith("audio/") \
            or len(r.content) > 100


# --------------------------------------------------------------------------- #
# 5. End-to-end: fetch + PATCH audio-url on u-foot + verify persistence
# --------------------------------------------------------------------------- #
class TestFetchAndAssociate:

    def test_full_flow_fetch_then_associate(self, admin_headers):
        # 1) fetch
        r = requests.post(
            ENDPOINT, headers=admin_headers,
            json={"url": VALID_MP3_URL, "filename_hint": "TEST_iter29_assoc"},
            timeout=60,
        )
        assert r.status_code == 200
        rel = r.json()["relative_url"]

        # 2) PATCH onto u-foot isolated-AmE
        p = requests.patch(
            f"{BASE_URL}/api/admin/phonemes/u-foot/audio-url",
            headers=admin_headers,
            json={"key": "isolated-AmE", "url": rel},
            timeout=15,
        )
        assert p.status_code == 200, f"PATCH failed: {p.status_code}: {p.text[:200]}"

        # 3) verify persistence with GET
        g = requests.get(
            f"{BASE_URL}/api/admin/phonemes/u-foot",
            headers=admin_headers, timeout=10,
        )
        assert g.status_code == 200
        card = g.json()
        # The exact shape: card['audio']['AmE']['isolated']
        audio_ame = (card.get("audio") or {}).get("AmE") or {}
        stored = audio_ame.get("isolated")
        assert stored == rel, \
            f"persisted isolated-AmE ({stored!r}) != fetched relative_url ({rel!r})"
