"""Tests for Phase A: Canonical Phoneme Inventory endpoints.

Endpoints under test:
- GET /api/canonical/phonemes
- GET /api/canonical/phonemes/{ipa}?dialect=

Also runs a light regression against pre-existing public endpoints to ensure
the newly wired router did not break the include-order in server.py.
"""

import os
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://canonical-voice-lab.preview.emergentagent.com").rstrip("/")
CANON = f"{BASE_URL}/api/canonical/phonemes"


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def all_docs():
    r = requests.get(CANON, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def genam_docs():
    r = requests.get(CANON, params={"dialect": "GenAm"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def rp_docs():
    r = requests.get(CANON, params={"dialect": "RP"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# --------------------------------------------------------------------------- #
# Counts & partitioning
# --------------------------------------------------------------------------- #
class TestCanonicalCounts:
    def test_total_count_is_84(self, all_docs):
        assert all_docs["count"] == 84
        assert len(all_docs["items"]) == 84

    def test_genam_count_40(self, genam_docs):
        items = genam_docs["items"]
        assert genam_docs["count"] == 40, f"Expected 40 GenAm docs, got {genam_docs['count']}"
        vowels = [d for d in items if d["kind"] == "vowel"]
        diph = [d for d in items if d["kind"] == "diphthong"]
        cons = [d for d in items if d["kind"] == "consonant"]
        assert len(vowels) == 11, f"GenAm vowels expected 11, got {len(vowels)}"
        assert len(diph) == 5, f"GenAm diphthongs expected 5, got {len(diph)}"
        assert len(cons) == 24, f"GenAm consonants expected 24, got {len(cons)}"

    def test_rp_count_44(self, rp_docs):
        items = rp_docs["items"]
        assert rp_docs["count"] == 44, f"Expected 44 RP docs, got {rp_docs['count']}"
        vowels = [d for d in items if d["kind"] == "vowel"]
        diph = [d for d in items if d["kind"] == "diphthong"]
        cons = [d for d in items if d["kind"] == "consonant"]
        assert len(vowels) == 12, f"RP vowels expected 12, got {len(vowels)}"
        assert len(diph) == 8, f"RP diphthongs expected 8, got {len(diph)}"
        assert len(cons) == 24, f"RP consonants expected 24, got {len(cons)}"


# --------------------------------------------------------------------------- #
# Dialect divergence
# --------------------------------------------------------------------------- #
class TestDialectDivergence:
    def test_rp_centring_diphthongs_present(self, rp_docs):
        rp_ipas = {d["ipa"] for d in rp_docs["items"] if d["kind"] == "diphthong"}
        for centring in ("ɪə", "eə", "ʊə"):
            assert centring in rp_ipas, f"RP diphthong {centring} missing"

    def test_centring_diphthongs_absent_from_genam(self, genam_docs):
        genam_ipas = {d["ipa"] for d in genam_docs["items"]}
        for centring in ("ɪə", "eə", "ʊə"):
            assert centring not in genam_ipas, f"GenAm should not contain {centring}"

    def test_rp_has_lot_ɒ_and_genam_does_not(self, genam_docs, rp_docs):
        genam_ipas = {d["ipa"] for d in genam_docs["items"]}
        rp_ipas = {d["ipa"] for d in rp_docs["items"]}
        assert "ɒ" in rp_ipas, "RP must contain LOT /ɒ/"
        assert "ɒ" not in genam_ipas, "GenAm must NOT contain /ɒ/ (LOT merges into /ɑː/)"

    def test_rp_has_nurse_ɜː_with_anti_drift_note(self):
        ipa_enc = urllib.parse.quote("ɜː", safe="")
        r = requests.get(f"{CANON}/{ipa_enc}", params={"dialect": "RP"}, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["ipa"] == "ɜː"
        assert doc["lexical_set"] == "NURSE"
        assert "notes" in doc and doc["notes"], "NURSE must include anti-drift notes field"
        # anti-drift language should mention it's not identical to GenAm /ɝ/
        low = doc["notes"].lower()
        assert "ɝ" in doc["notes"] or "genam" in low, (
            f"NURSE notes should mention non-identity with GenAm /ɝ/. Got: {doc['notes']}"
        )

    def test_genam_dress_is_open_mid_ɛ(self, genam_docs):
        dress = [d for d in genam_docs["items"] if d.get("lexical_set") == "DRESS"]
        assert len(dress) == 1
        assert dress[0]["ipa"] == "ɛ"
        assert dress[0]["height"] == "Open-mid"

    def test_rp_dress_is_open_mid_e(self, rp_docs):
        dress = [d for d in rp_docs["items"] if d.get("lexical_set") == "DRESS"]
        assert len(dress) == 1
        assert dress[0]["ipa"] == "e"
        assert dress[0]["height"] == "Open-mid"


# --------------------------------------------------------------------------- #
# Filtering & sorting
# --------------------------------------------------------------------------- #
class TestFilteringAndSort:
    def test_kind_vowel_filter(self):
        r = requests.get(CANON, params={"kind": "vowel"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert all(d["kind"] == "vowel" for d in data["items"])
        # Sorted ascending by frequency_rank, None sorts last
        ranks = [d.get("frequency_rank") for d in data["items"]]
        non_null_ranks = [r for r in ranks if r is not None]
        assert non_null_ranks == sorted(non_null_ranks), f"Not sorted asc: {ranks}"
        # None-rank docs should come after all int-rank docs
        first_none = next((i for i, x in enumerate(ranks) if x is None), None)
        if first_none is not None:
            assert all(r is None for r in ranks[first_none:]), f"None-rank not last: {ranks}"

    def test_dialect_rp_and_kind_diphthong_combo(self):
        r = requests.get(CANON, params={"dialect": "RP", "kind": "diphthong"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        ipas = {d["ipa"] for d in data["items"]}
        for centring in ("ɪə", "eə", "ʊə"):
            assert centring in ipas


# --------------------------------------------------------------------------- #
# Controlled vocabulary — Bug #4 fix
# --------------------------------------------------------------------------- #
class TestControlledVocabulary:
    def test_controlled_vocab_present(self, all_docs):
        cv = all_docs.get("controlled_vocabulary")
        assert cv is not None
        for k in ("height", "backness", "rounding", "tenseness", "manner", "place", "voicing"):
            assert k in cv, f"controlled_vocabulary missing key: {k}"

    def test_height_uses_ipa_standard_terms(self, all_docs):
        heights = all_docs["controlled_vocabulary"]["height"]
        expected = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"]
        assert heights == expected, f"Height list must match IPA order: got {heights}"
        # Bug #4 anti-regression:
        assert "Near-high" not in heights
        assert "High" not in heights
        assert "Low" not in heights


# --------------------------------------------------------------------------- #
# Consonant dialect_notes
# --------------------------------------------------------------------------- #
class TestConsonantDialectNotes:
    def test_t_has_dialect_notes_both(self):
        r = requests.get(f"{CANON}/t", params={"dialect": "GenAm"}, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["ipa"] == "t"
        assert "dialect_notes" in doc, "Consonant /t/ must have dialect_notes"
        notes = doc["dialect_notes"]
        assert "GenAm" in notes and "flap" in notes["GenAm"].lower()
        assert "RP" in notes and "glottal" in notes["RP"].lower()


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
class TestValidation:
    def test_bad_dialect_returns_400(self):
        r = requests.get(CANON, params={"dialect": "BadValue"}, timeout=30)
        assert r.status_code == 400
        assert "dialect must be GenAm or RP" in r.json().get("detail", "")

    def test_bad_kind_returns_400(self):
        r = requests.get(CANON, params={"kind": "bogus"}, timeout=30)
        assert r.status_code == 400
        assert "kind must be vowel, diphthong or consonant" in r.json().get("detail", "")

    def test_missing_phoneme_returns_404(self):
        r = requests.get(f"{CANON}/zzz", params={"dialect": "RP"}, timeout=30)
        assert r.status_code == 404
        assert "Canonical phoneme not found" in r.json().get("detail", "")

    def test_single_lookup_bad_dialect_400(self):
        r = requests.get(f"{CANON}/t", params={"dialect": "XX"}, timeout=30)
        assert r.status_code == 400


# --------------------------------------------------------------------------- #
# Idempotency (indirect: total = 84 after any restart; unique index enforced)
# --------------------------------------------------------------------------- #
class TestIdempotency:
    def test_no_duplicate_dialect_ipa_pairs(self, all_docs):
        seen = set()
        for d in all_docs["items"]:
            k = (d["dialect"], d["ipa"])
            assert k not in seen, f"Duplicate (dialect, ipa): {k}"
            seen.add(k)

    def test_total_remains_84_on_second_call(self):
        r1 = requests.get(CANON, timeout=30).json()
        r2 = requests.get(CANON, timeout=30).json()
        assert r1["count"] == r2["count"] == 84


# --------------------------------------------------------------------------- #
# Regression on pre-existing endpoints (router include order didn't break anything)
# --------------------------------------------------------------------------- #
class TestRegressionPublicEndpoints:
    def test_testimonials(self):
        r = requests.get(f"{BASE_URL}/api/testimonials", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Existing endpoint returns {"testimonials": [...]}
        items = data.get("testimonials") if isinstance(data, dict) else data
        assert isinstance(items, list)

    def test_clients(self):
        r = requests.get(f"{BASE_URL}/api/clients", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Existing endpoint returns {"clients": [...]}
        items = data.get("clients") if isinstance(data, dict) else data
        assert isinstance(items, list)

    def test_admin_login(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "VocalFitness2026!"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data or "token" in data

    def test_admin_leads_requires_auth(self):
        # Should be 401/403 without token
        r = requests.get(f"{BASE_URL}/api/admin/leads", timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_leads_with_auth(self):
        login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "VocalFitness2026!"},
            timeout=30,
        )
        token = login.json().get("access_token") or login.json().get("token")
        r = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text

    def test_chat_endpoint(self):
        r = requests.post(
            f"{BASE_URL}/api/chat",
            json={"session_id": "canonical-test", "message": "hi"},
            timeout=90,
        )
        # Chat may take time / be rate-limited but must not 404/500
        assert r.status_code in (200, 429), f"Chat unexpected status {r.status_code}: {r.text[:400]}"

    def test_admin_popups(self):
        r = requests.get(f"{BASE_URL}/api/admin/popups", timeout=30)
        # popups may be public or admin-only; either 200 or 401/403 is acceptable
        assert r.status_code in (200, 401, 403), r.text
