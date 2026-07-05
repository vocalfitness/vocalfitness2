"""
Iteration 21 — Verify the two fixes flagged in iteration_20:

  (1) HIGH — dialect fallback: e-dress has ipa='e' + dialects=['AmE','RP'].
      Auto-detect used to pick GenAm and 404. Now backend iterates through
      candidate dialects and picks the first one that has the IPA in canonical
      inventory. Response now includes `dialect` field for transparency.

  (2) MINOR — when no fields updated, readinessScore was null; now it's still
      computed from the current doc.

  Only NEW/regression-specific scenarios are added — the pre-existing suite in
  test_phoneme_batch_fill.py already covers 403/404/409, autofill happy path,
  AI happy path, and preserve-user-edits.
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"


# ------------------ Fixtures ------------------
@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ------------------ Helpers ------------------
def _get_admin_card(auth_headers, card_id):
    r = requests.get(f"{BASE_URL}/api/admin/phonemes/{card_id}", headers=auth_headers, timeout=10)
    assert r.status_code == 200, f"GET admin/{card_id}: {r.status_code}"
    return r.json()


# ------------------ Fix #1: dialect fallback ------------------
class TestDialectFallback:
    """Auto-detect must now fallback across candidate dialects."""

    def test_edress_auto_detect_falls_back_to_rp(self, auth_headers):
        """
        e-dress has ipa='e' with dialects=['AmE','RP']. GenAm canonical has /ɛ/
        (not /e/) for DRESS. RP has /e/. Auto-detect must skip GenAm and land
        on RP. Response must include dialect='RP'.
        """
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},   # NO explicit dialect → auto-detect
            timeout=30,
        )
        assert r.status_code == 200, f"expected 200 (fallback), got {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data.get("dialect") == "RP", \
            f"expected dialect='RP' from fallback, got {data.get('dialect')}. Full response: {data}"
        # readinessScore always populated (fix #2)
        assert isinstance(data.get("readinessScore"), int), \
            f"readinessScore must be an int (fix #2), got {data.get('readinessScore')!r}"
        # published must still be False regardless
        card = _get_admin_card(auth_headers, "e-dress")
        assert card.get("published") is False

    def test_apalm_auto_detect_prefers_genam_when_both_work(self, auth_headers):
        """
        a-palm has ipa='ɑː' + dialects=['AmE','RP']. Both GenAm and RP have
        this vowel — preferred (GenAm) wins.
        """
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/a-palm/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},
            timeout=30,
        )
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data.get("dialect") == "GenAm", \
            f"expected dialect='GenAm' (preferred), got {data.get('dialect')}. Full: {data}"

    def test_explicit_dialect_overrides_auto_detect(self, auth_headers):
        """Explicit {dialect:'RP'} on a-palm forces RP even though GenAm works."""
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/a-palm/batch-fill",
            headers=auth_headers,
            json={"include_ai": False, "dialect": "RP"},
            timeout=30,
        )
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data.get("dialect") == "RP", \
            f"expected dialect='RP' (explicit), got {data.get('dialect')}. Full: {data}"


# ------------------ Fix #1 negative: no dialect works ------------------
class TestNoCandidateDialectMatches:
    """
    Create a temporary card with a made-up IPA symbol → batch-fill should 404
    with detail mentioning 'tutti i dialetti candidati'. Cleanup via DELETE.
    """
    _card_id = "test-iter21-nonexistent-ipa"

    def test_nonexistent_ipa_404_with_candidate_message(self, auth_headers):
        # ---- Setup: create draft card with a made-up IPA
        payload = {
            "id": self._card_id,
            "ipa": "θʒ",           # not in any canonical dialect
            "displayIpa": "/θʒ/",
            "category": "vowel",
            "examples": ["test"],
            "dialects": ["AmE", "RP"],
        }
        # Cleanup first if leftover from prior run
        requests.delete(
            f"{BASE_URL}/api/admin/phonemes/{self._card_id}",
            headers=auth_headers, timeout=10,
        )
        c = requests.post(
            f"{BASE_URL}/api/admin/phonemes",
            headers=auth_headers, json=payload, timeout=10,
        )
        assert c.status_code == 201, f"create failed: {c.status_code} {c.text}"

        try:
            r = requests.post(
                f"{BASE_URL}/api/admin/phonemes/{self._card_id}/batch-fill",
                headers=auth_headers,
                json={"include_ai": False},
                timeout=30,
            )
            assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"
            detail = (r.json().get("detail") or "").lower()
            # Fix requires the phrase 'tutti i dialetti candidati'
            assert "dialetti candidati" in detail, \
                f"detail must mention 'tutti i dialetti candidati', got: {detail!r}"
        finally:
            requests.delete(
                f"{BASE_URL}/api/admin/phonemes/{self._card_id}",
                headers=auth_headers, timeout=10,
            )


# ------------------ Fix #2: readinessScore populated even when no changes ------------------
class TestNoChangesReadinessScorePopulated:
    """
    Call batch-fill twice back-to-back (without overwrite=true) on the same
    card. Second call should return applied.autofill=[] AND readinessScore
    populated (not null). Message must contain 'Nessun campo modificato'.
    """

    def test_double_batch_no_change_returns_score(self, auth_headers):
        # Use e-dress (already populated by previous tests). If not, first
        # call will populate; second call is our target.
        # 1st call — with explicit RP for determinism
        r1 = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": False, "dialect": "RP"},
            timeout=30,
        )
        assert r1.status_code == 200, f"first call failed: {r1.status_code} {r1.text[:200]}"

        # 2nd call — same params, nothing should change
        r2 = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": False, "dialect": "RP"},
            timeout=30,
        )
        assert r2.status_code == 200, f"second call failed: {r2.status_code} {r2.text[:200]}"
        data = r2.json()

        assert data.get("applied", {}).get("autofill") == [], \
            f"expected empty applied.autofill on no-change, got {data.get('applied')}"
        assert data.get("applied", {}).get("ai") == [], \
            f"expected empty applied.ai on no-change (include_ai=false), got {data.get('applied')}"

        # THE FIX — readinessScore must NOT be null
        assert data.get("readinessScore") is not None, \
            "readinessScore must be computed even when no fields updated (fix #2)"
        assert isinstance(data.get("readinessScore"), int), \
            f"readinessScore must be int, got {type(data.get('readinessScore')).__name__}"
        assert 0 <= data["readinessScore"] <= 100

        # Message contains 'Nessun campo modificato'
        assert "nessun campo modificato" in (data.get("message") or "").lower(), \
            f"message must mention 'Nessun campo modificato', got: {data.get('message')!r}"

        # And dialect is still returned
        assert data.get("dialect") == "RP", f"expected dialect='RP' in no-change path, got {data.get('dialect')}"
