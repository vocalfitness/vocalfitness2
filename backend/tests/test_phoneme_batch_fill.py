"""
Phase F+ — Batch-fill (Autofill + AI-draft + save-as-bozza).
Endpoint: POST /api/admin/phonemes/{id}/batch-fill

Strategy (per review request):
  - include_ai:false for most tests (fast, no LLM latency)
  - include_ai:true on ONE card only (e-dress)
  - Snapshot e-dress before ALL tests; restore to skeleton at teardown.
  - DO NOT test overwrite:true on u-foot (only published card besides i-fleece,
    both critical). Skip that scenario per explicit instruction.
"""
import copy
import os
import time
import pytest
import requests

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or "https://vocal-members-pro.preview.emergentagent.com"
).rstrip("/")
ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"

# ---------- Fixtures ----------
@pytest.fixture(scope="session")
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


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session", autouse=True)
def snapshot_and_restore_edress(auth_headers):
    """Snapshot e-dress skeleton state, restore at teardown."""
    r = requests.get(f"{BASE_URL}/api/admin/phonemes/e-dress", headers=auth_headers, timeout=10)
    assert r.status_code == 200, f"pre-snapshot failed: {r.status_code}"
    pre = r.json()
    # Only keep the fields the batch-fill flow modifies
    restore_payload = {
        "features": pre.get("features") or [],
        "knobs": pre.get("knobs") or [],
        "classification": pre.get("classification") or [],
        "vowelChartPosition": pre.get("vowelChartPosition") or {},
        "mnemonic": pre.get("mnemonic") or {},
        "funFact": pre.get("funFact"),
        "published": bool(pre.get("published", False)),
    }
    yield pre
    # Teardown → restore skeleton
    # PUT the full doc (mongo-safe) with the pre-test values for the touched keys.
    # We need to pass the whole doc — grab current, overlay skeleton fields.
    r_cur = requests.get(f"{BASE_URL}/api/admin/phonemes/e-dress", headers=auth_headers, timeout=10)
    if r_cur.status_code != 200:
        return
    cur = r_cur.json()
    # remove server-managed keys
    for k in ("_id", "createdAt", "updatedAt", "createdBy", "updatedBy", "frequencyChart"):
        cur.pop(k, None)
    cur.update(restore_payload)
    put = requests.put(
        f"{BASE_URL}/api/admin/phonemes/e-dress",
        headers=auth_headers,
        json=cur,
        timeout=15,
    )
    # Best-effort restore — log if it fails but don't fail the test suite
    if put.status_code >= 400:
        print(f"[teardown] e-dress restore failed: {put.status_code} {put.text[:200]}")


# ---------- Helpers ----------
def _get_admin_card(auth_headers, card_id):
    r = requests.get(f"{BASE_URL}/api/admin/phonemes/{card_id}", headers=auth_headers, timeout=10)
    assert r.status_code == 200, f"GET admin/{card_id}: {r.status_code}"
    return r.json()


# ---------- Tests ----------
class TestBatchFillAuthAndErrors:
    def test_no_auth_returns_403(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            json={"include_ai": False},
            timeout=10,
        )
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"

    def test_nonexistent_id_returns_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/nonexistent-id/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},
            timeout=10,
        )
        assert r.status_code == 404
        detail = (r.json().get("detail") or "").lower()
        assert "non trovato" in detail

    def test_published_card_without_overwrite_returns_409(self, auth_headers):
        # u-foot is published — batch-fill should refuse without overwrite:true
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},
            timeout=15,
        )
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "pubblicata" in detail
        assert "overwrite" in detail


class TestBatchFillAutofillOnly:
    """include_ai:false → deterministic autofill only, fast."""

    def test_autofill_only_no_ai(self, auth_headers, snapshot_and_restore_edress):
        # NOTE (post iter21 fix): auto-detect now falls back from GenAm to RP for
        # e-dress (ipa='e' → RP has /e/, GenAm does not). We pass dialect=RP
        # explicitly here to keep the assertions deterministic across re-runs.
        # If e-dress is already populated from prior runs (autofill fields set),
        # this call is a no-op (empty applied.autofill). We still assert that
        # readinessScore is populated (iter21 fix #2) and dialect='RP'.
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": False, "dialect": "RP"},
            timeout=30,
        )
        assert r.status_code == 200, f"batch-fill (no ai) failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["id"] == "e-dress"
        assert data.get("dialect") == "RP"
        assert "applied" in data
        auto = data["applied"].get("autofill", [])
        ai = data["applied"].get("ai", [])
        assert ai == [], f"AI must be empty when include_ai=false, got {ai}"
        assert isinstance(data.get("readinessScore"), int)
        assert data["readinessScore"] >= 55  # at minimum unchanged; probably higher

        # If autofill was applied (fresh skeleton), verify the expected keys.
        # If not (already populated from prior test run), just verify persistence.
        if auto:
            for key in ("features", "knobs", "classification", "vowelChartPosition"):
                assert key in auto, f"missing autofill key {key}; got {auto}"

        # Verify persistence via admin GET (fields must be present either way)
        card = _get_admin_card(auth_headers, "e-dress")
        assert card.get("published") is False
        assert card.get("features"), "features not persisted"
        assert card.get("knobs"), "knobs not persisted"
        assert card.get("classification"), "classification not persisted"
        assert card.get("vowelChartPosition"), "vowelChartPosition not persisted"


class TestBatchFillPublishedPreserved:
    """Frequency chart untouched: after batch-fill, public GET still returns canonical chart."""

    def test_frequency_chart_unchanged_after_batch(self, auth_headers, snapshot_and_restore_edress):
        # e-dress is not published → no public route. Instead verify u-foot pre/post
        # (batch-fill on u-foot is refused with 409, so its chart never changes).
        pre = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=10).json()
        # trigger a refused batch-fill (409) — nothing should change
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/u-foot/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},
            timeout=15,
        )
        assert r.status_code == 409
        post = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=10).json()
        assert pre.get("frequencyChart") == post.get("frequencyChart"), \
            "frequencyChart drifted after refused batch-fill"


class TestBatchFillWithAI:
    """include_ai:true — only ONE call, e-dress. LLM latency ~5-15s."""

    def test_batch_fill_with_ai_full(self, auth_headers, snapshot_and_restore_edress):
        # e-dress currently has autofill applied from prior test.
        # For this test we need to also apply AI on top. Since mnemonic/funFact
        # were previously empty, AI drafting should run.
        # Re-check pre-state
        pre = _get_admin_card(auth_headers, "e-dress")
        pre_mnem = (pre.get("mnemonic") or {}).get("phrase", "")
        # If a prior test happened to fill mnemonic (should not, only autofill),
        # we still expect AI to be applied since prior test used include_ai=false.

        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": True, "dialect": "RP"},
            timeout=90,  # LLM can be slow (up to 60s for two fields)
        )
        assert r.status_code == 200, f"batch-fill w/ AI failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["id"] == "e-dress"

        applied_ai = data["applied"].get("ai", [])
        # If mnemonic empty pre-call, AI should apply it
        if not pre_mnem:
            assert "mnemonic" in applied_ai, f"expected mnemonic in ai applied, got {applied_ai}"
        # funFact was None → should apply
        pre_ff = (pre.get("funFact") or {}).get("body", "")
        if not pre_ff:
            assert "funFact" in applied_ai, f"expected funFact in ai applied, got {applied_ai}"

        conf = data.get("ai_confidences") or {}
        if "mnemonic" in applied_ai:
            assert isinstance(conf.get("mnemonic"), float)
            assert 0.0 <= conf["mnemonic"] <= 1.0
        if "funFact" in applied_ai:
            assert isinstance(conf.get("funFact"), float)
            assert 0.0 <= conf["funFact"] <= 1.0

        # readinessScore should be >=70 now
        assert isinstance(data.get("readinessScore"), int)
        assert data["readinessScore"] >= 70, f"readinessScore expected >=70, got {data['readinessScore']}"

        # Message contains 'campi autofill' and 'bozze AI'
        msg = (data.get("message") or "").lower()
        assert "campi autofill" in msg
        assert "bozze ai" in msg

        # Verify persistence & published still False
        card = _get_admin_card(auth_headers, "e-dress")
        assert card.get("published") is False
        # mnemonic.phrase now populated
        assert (card.get("mnemonic") or {}).get("phrase"), "mnemonic.phrase not persisted"


class TestBatchFillDialectFallback:
    """
    Iteration 21 fix: e-dress ipa='e' + dialects=['AmE','RP'].
    Auto-detect now falls back from GenAm (no /e/) to RP (has /e/) and returns 200
    with response.dialect='RP'. See test_phoneme_batch_fill_iter21.py for the
    dedicated fix-verification suite.
    """
    def test_edress_default_dialect_falls_back_to_rp(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": False},
            timeout=15,
        )
        assert r.status_code == 200, f"expected 200 after fallback fix, got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert data.get("dialect") == "RP", f"expected dialect='RP' via fallback, got {data.get('dialect')}"


class TestBatchFillPreserveUserEdits:
    """Safety: pre-existing user edits are NOT overwritten unless overwrite=true."""

    def test_existing_mnemonic_preserved(self, auth_headers, snapshot_and_restore_edress):
        # After previous AI test, e-dress mnemonic.phrase is populated.
        # Call batch-fill again with include_ai:true, overwrite:false → mnemonic
        # should NOT be overwritten (applied.ai must NOT include 'mnemonic').
        pre = _get_admin_card(auth_headers, "e-dress")
        pre_mnem_phrase = (pre.get("mnemonic") or {}).get("phrase", "")
        if not pre_mnem_phrase:
            pytest.skip("e-dress mnemonic not populated; upstream AI test may have failed")

        r = requests.post(
            f"{BASE_URL}/api/admin/phonemes/e-dress/batch-fill",
            headers=auth_headers,
            json={"include_ai": True, "overwrite": False, "dialect": "RP"},
            timeout=90,
        )
        assert r.status_code == 200, f"batch-fill preserve failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        applied_ai = data["applied"].get("ai", [])
        assert "mnemonic" not in applied_ai, \
            f"mnemonic MUST be preserved but appeared in applied.ai: {applied_ai}"

        # Confirm on disk
        post = _get_admin_card(auth_headers, "e-dress")
        assert (post.get("mnemonic") or {}).get("phrase") == pre_mnem_phrase, \
            "mnemonic.phrase was overwritten despite overwrite=false"
