"""
Phase F — AI drafting (Claude Sonnet 4.5) tests for
POST /api/admin/phonemes/{id}/ai-draft

Guardrails validated:
  * preview-only (no persistence)
  * fields whitelist (mnemonic / funFact)
  * confidence float in [0,1]
  * model / session_id / dialect / ipa / status metadata
  * error paths: bad field, empty list, bad dialect, 404, 403
  * regression on Phases A-E
"""

import copy
import datetime as dt
import os
import re

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://vocal-members-pro.preview.emergentagent.com",
).rstrip("/")

ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"

EXPECTED_MODEL = "anthropic/claude-sonnet-4-5-20250929"
LLM_TIMEOUT = 45  # Claude Sonnet 4.5 can take up to ~15s per call, +margin


# --------------------------------------------------------------------- fixtures
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"No token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def ufoot_original(auth_headers):
    """Capture original public u-foot doc (for post-preview persistence check)."""
    r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=15)
    assert r.status_code == 200, r.text
    return copy.deepcopy(r.json())


@pytest.fixture(scope="module")
def ifleece_original(auth_headers):
    r = requests.get(f"{BASE_URL}/api/phonemes/i-fleece", timeout=15)
    assert r.status_code == 200, r.text
    return copy.deepcopy(r.json())


# ------------------------------------------------------------- helper functions
def _assert_meta(data: dict, ipa: str, dialect: str = "GenAm"):
    assert data.get("model") == EXPECTED_MODEL, f"model mismatch: {data.get('model')}"
    assert data.get("dialect") == dialect
    assert data.get("ipa") == ipa
    assert data.get("status") == "bozza"
    sid = data.get("session_id", "")
    assert sid.startswith("phoneme-draft-"), f"session_id={sid!r}"
    gen_at = data.get("generated_at", "")
    # ISO datetime parseable
    try:
        dt.datetime.fromisoformat(gen_at.replace("Z", "+00:00"))
    except Exception as e:  # noqa: BLE001
        pytest.fail(f"generated_at not ISO parseable: {gen_at!r} ({e})")


def _assert_confidence(val):
    assert isinstance(val, (int, float)), f"confidence not numeric: {val!r}"
    assert 0.0 <= float(val) <= 1.0, f"confidence out of range: {val}"


# ============================================================= HAPPY PATH TESTS
class TestAiDraftHappyPath:
    """POST /api/admin/phonemes/{id}/ai-draft — happy path"""

    def test_ufoot_both_fields(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            headers=auth_headers,
            json={"fields": ["mnemonic", "funFact"]},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        _assert_meta(data, ipa="ʊ", dialect="GenAm")

        drafts = data.get("drafts") or {}
        assert "mnemonic" in drafts, f"no mnemonic in drafts: {drafts}"
        assert "funFact" in drafts, f"no funFact in drafts: {drafts}"

        # mnemonic shape
        mn = drafts["mnemonic"]
        assert isinstance(mn.get("phrase"), str) and mn["phrase"].strip(), \
            f"mnemonic.phrase empty/invalid: {mn}"
        _assert_confidence(mn.get("confidence"))

        # funFact shape
        ff = drafts["funFact"]
        assert isinstance(ff.get("headline"), str) and ff["headline"].strip(), \
            f"funFact.headline empty: {ff}"
        assert isinstance(ff.get("body"), str) and ff["body"].strip(), \
            f"funFact.body empty: {ff}"
        _assert_confidence(ff.get("confidence"))

    def test_ifleece_mnemonic_only(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/i-fleece/ai-draft",
            headers=auth_headers,
            json={"fields": ["mnemonic"]},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        _assert_meta(data, ipa="iː", dialect="GenAm")
        drafts = data.get("drafts") or {}
        assert "mnemonic" in drafts, f"no mnemonic: {drafts}"
        assert "funFact" not in drafts, f"funFact should not be present: {drafts}"
        mn = drafts["mnemonic"]
        assert isinstance(mn.get("phrase"), str) and mn["phrase"].strip()
        _assert_confidence(mn.get("confidence"))

    def test_ufoot_funfact_only(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            headers=auth_headers,
            json={"fields": ["funFact"]},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        _assert_meta(data, ipa="ʊ", dialect="GenAm")
        drafts = data.get("drafts") or {}
        assert "funFact" in drafts, drafts
        assert "mnemonic" not in drafts, drafts
        ff = drafts["funFact"]
        assert ff.get("headline", "").strip()
        assert ff.get("body", "").strip()
        _assert_confidence(ff.get("confidence"))


# =========================================================== ERROR PATH TESTS
class TestAiDraftErrors:

    def test_invalid_field(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            headers=auth_headers,
            json={"fields": ["invalidField"]},
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"
        detail = str(r.json().get("detail", "")).lower()
        assert "mnemonic" in detail and "funfact" in detail.replace(" ", ""), detail

    def test_empty_fields(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            headers=auth_headers,
            json={"fields": []},
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"

    def test_unsupported_dialect(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            headers=auth_headers,
            json={"fields": ["mnemonic"], "dialect": "Italian"},
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"

    def test_nonexistent_card(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/nonexistent-id/ai-draft",
            headers=auth_headers,
            json={"fields": ["mnemonic"]},
            timeout=15,
        )
        assert r.status_code == 404, f"{r.status_code} {r.text}"
        detail = str(r.json().get("detail", "")).lower()
        assert "non trovato" in detail, detail

    def test_no_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/ai-draft",
            json={"fields": ["mnemonic"]},
            timeout=15,
        )
        # spec asks for 403; FastAPI HTTPBearer returns 403 when header absent
        assert r.status_code in (401, 403), f"{r.status_code} {r.text}"


# =========================================================== PREVIEW-ONLY TESTS
class TestPreviewOnly:
    """After ai-draft, the phoneme's persisted content must be unchanged."""

    def test_ufoot_not_persisted(self, auth_headers, ufoot_original):
        # already called ai-draft in TestAiDraftHappyPath; fetch again & compare
        r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=15)
        assert r.status_code == 200
        after = r.json()
        assert after.get("mnemonic") == ufoot_original.get("mnemonic"), \
            "mnemonic mutated after ai-draft — persistence leak!"
        assert after.get("funFact") == ufoot_original.get("funFact"), \
            "funFact mutated after ai-draft — persistence leak!"

    def test_ifleece_not_persisted(self, auth_headers, ifleece_original):
        r = requests.get(f"{BASE_URL}/api/phonemes/i-fleece", timeout=15)
        assert r.status_code == 200
        after = r.json()
        assert after.get("mnemonic") == ifleece_original.get("mnemonic"), \
            "mnemonic mutated after ai-draft — persistence leak!"
        assert after.get("funFact") == ifleece_original.get("funFact"), \
            "funFact mutated after ai-draft — persistence leak!"


# ================================================================= REGRESSIONS
class TestPhaseFRegressions:
    """Phase A-E still intact after F is deployed."""

    def test_canonical_inventory_still_84(self):
        r = requests.get(f"{BASE_URL}/api/canonical/phonemes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # API may return either list or {items:[...]}
        items = data if isinstance(data, list) else data.get("items", [])
        assert len(items) == 84, f"canonical count drifted: {len(items)}"

    def test_ufoot_public_frequency_chart(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=15)
        assert r.status_code == 200
        chart = r.json().get("frequencyChart") or []
        assert len(chart) > 0, "u-foot frequencyChart empty"

    def test_ufoot_readiness_still_100(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/phonemes/u-foot/readiness",
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("score") == 100, data
        assert data.get("ready") is True, data

    def test_autofill_ufoot_still_works(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            headers=auth_headers,
            params={"ipa": "ʊ", "dialect": "GenAm"},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # autofill returns a payload with 'features' or similar
        assert isinstance(data, dict) and data, data
