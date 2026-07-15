"""
§3.6 · Mnemonic Inline-IPA Rewriter — end-to-end backend tests
against the live preview backend.

Covers:
  1) Auth guard (401/403 without admin JWT)
  2) Default batch run → returns {ok, processed>=40, changed>=0, skipped>=0, results}
  3) Idempotency: re-running immediately after → changed == 0
  4) Semantic correctness on card id='u-foot' (target IPA ʊ):
     — after must contain [Pull|/pʊl/] [wool|/wʊl/] [push|/pʊʃ/]
       [hood|/hʊd/] [put|/pʊt/] [foot|/fʊt/]
  5) Force-rewrite (overwrite_existing_brackets=True) still leaves the
     card annotated correctly (strip + re-annotate deterministic).
"""

import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://canonical-voice-lab.preview.emergentagent.com").rstrip("/")
# Fallback for backend-side .env when frontend env is unavailable in this shell
if not BASE_URL:
    BASE_URL = "https://canonical-voice-lab.preview.emergentagent.com"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "VocalFitness2026!"

ENDPOINT = f"{BASE_URL}/api/admin/phonemes/batch/rewrite-mnemonics"


@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return the JWT bearer token."""
    # Try common login endpoints
    for path in ("/api/auth/login", "/api/login"):
        r = requests.post(
            f"{BASE_URL}{path}",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        if r.status_code == 200:
            data = r.json()
            # Look for token in common shapes
            tok = data.get("access_token") or data.get("token") or (data.get("data") or {}).get("access_token")
            if tok:
                return tok
    pytest.skip("Could not authenticate admin — /api/auth/login not responding as expected")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestAuthGuard:
    def test_unauthenticated_is_rejected(self):
        r = requests.post(ENDPOINT, json={}, timeout=20)
        assert r.status_code in (401, 403), f"Expected 401/403 for unauthenticated, got {r.status_code}: {r.text[:300]}"

    def test_bad_token_is_rejected(self):
        r = requests.post(
            ENDPOINT,
            json={},
            headers={"Authorization": "Bearer not-a-real-token", "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code in (401, 403)


class TestBatchRewrite:
    def test_default_run_returns_summary(self, admin_headers):
        r = requests.post(ENDPOINT, json={"overwrite_existing_brackets": False}, headers=admin_headers, timeout=90)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:500]}"
        data = r.json()
        # Contract fields
        assert data.get("ok") is True
        assert "processed" in data and isinstance(data["processed"], int)
        assert data["processed"] >= 40, f"processed={data['processed']} (expected >=40)"
        assert "changed" in data and isinstance(data["changed"], int)
        assert data["changed"] >= 0
        assert "skipped" in data and isinstance(data["skipped"], int)
        assert data["skipped"] >= 0
        assert "results" in data and isinstance(data["results"], list)
        assert len(data["results"]) == data["processed"]

    def test_idempotency_second_run_no_changes(self, admin_headers):
        # Run once to ensure baseline
        r1 = requests.post(ENDPOINT, json={"overwrite_existing_brackets": False}, headers=admin_headers, timeout=90)
        assert r1.status_code == 200
        # Run again immediately
        r2 = requests.post(ENDPOINT, json={"overwrite_existing_brackets": False}, headers=admin_headers, timeout=90)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["ok"] is True
        assert d2["changed"] == 0, (
            f"Endpoint is NOT idempotent — second run changed={d2['changed']} cards. Sample: "
            f"{[r for r in d2['results'] if r.get('changed')][:3]}"
        )


class TestUFootSemantics:
    """Card id='u-foot' (target IPA ʊ), phrase:
        'Pull the wool, push the hood, put the foot.'
    Expected annotated tokens must be present in 'after'.
    """

    EXPECTED_TOKENS = [
        (r"pull", "pʊl"),
        (r"wool", "wʊl"),
        (r"push", "pʊʃ"),
        (r"hood", "hʊd"),
        (r"put",  "pʊt"),
        (r"foot", "fʊt"),
    ]

    def _find_u_foot(self, results):
        for r in results:
            if r.get("id") == "u-foot":
                return r
        return None

    def test_u_foot_has_all_target_tokens(self, admin_headers):
        # Force a fresh annotation from scratch so we always exercise the
        # rewrite pipeline for this card (not just idempotent-preserved).
        r = requests.post(
            ENDPOINT,
            json={"overwrite_existing_brackets": True, "only_ids": ["u-foot"]},
            headers=admin_headers,
            timeout=60,
        )
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:500]}"
        data = r.json()
        entry = self._find_u_foot(data["results"])
        assert entry is not None, f"u-foot not found in results: {data['results']}"

        after = entry.get("after") or ""
        # The bracket-annotated form is case-preserving — test with case-insensitive regex
        for surface, ipa in self.EXPECTED_TOKENS:
            pat = re.compile(rf"\[{surface}\|/{re.escape(ipa)}/\]", re.IGNORECASE)
            assert pat.search(after), (
                f"Missing expected token for '{surface}' → '/{ipa}/' in after='{after}'"
            )

    def test_u_foot_reannotates_correctly_after_force(self, admin_headers):
        # 1st force-rewrite
        r1 = requests.post(
            ENDPOINT,
            json={"overwrite_existing_brackets": True, "only_ids": ["u-foot"]},
            headers=admin_headers,
            timeout=60,
        )
        assert r1.status_code == 200
        e1 = self._find_u_foot(r1.json()["results"])
        assert e1 is not None
        annotated_1 = set(w.lower() for w in e1.get("annotated") or [])
        # Must contain the six target words
        for surface, _ipa in self.EXPECTED_TOKENS:
            assert surface in annotated_1, f"{surface} not in annotated after force: {annotated_1}"

        # 2nd force-rewrite — result must be equivalent (still contains the 6 tokens)
        r2 = requests.post(
            ENDPOINT,
            json={"overwrite_existing_brackets": True, "only_ids": ["u-foot"]},
            headers=admin_headers,
            timeout=60,
        )
        assert r2.status_code == 200
        e2 = self._find_u_foot(r2.json()["results"])
        after = e2.get("after") or ""
        for surface, ipa in self.EXPECTED_TOKENS:
            pat = re.compile(rf"\[{surface}\|/{re.escape(ipa)}/\]", re.IGNORECASE)
            assert pat.search(after), f"After 2nd force, missing [{surface}|/{ipa}/] in '{after}'"


class TestOnlyIdsFilter:
    def test_only_ids_restricts_processing(self, admin_headers):
        r = requests.post(
            ENDPOINT,
            json={"overwrite_existing_brackets": False, "only_ids": ["u-foot"]},
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["processed"] == 1
        assert data["results"][0]["id"] == "u-foot"
