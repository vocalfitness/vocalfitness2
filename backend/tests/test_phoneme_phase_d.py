"""Phase D — Deterministic Autofill from canonical inventory.

Tests POST /api/admin/phonemes/autofill?ipa=&dialect= endpoint.
Endpoint is PREVIEW-ONLY: response is never persisted.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "VocalFitness2026!"


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def admin_token():
    res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    if res.status_code != 200:
        pytest.skip(f"Admin login failed: {res.status_code} {res.text}")
    data = res.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip(f"No token in login response: {data}")
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --------------------------------------------------------------------------- #
# Vowel autofill (/ʊ/ GenAm)
# --------------------------------------------------------------------------- #
class TestAutofillVowelUFoot:
    def test_status_and_source(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 200, res.text
        data = res.json()
        src = data.get("source", {})
        assert src.get("canonical_kind") == "vowel"
        assert src.get("lexical_set") == "FOOT"

    def test_features(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 200
        features = res.json()["features"]
        assert len(features) >= 6
        fmap = {f["label"]: f["value"] for f in features}
        assert fmap.get("Height") == "Near-close"
        assert fmap.get("Backness") == "Back"
        assert fmap.get("Rounding") == "Moderate"
        assert fmap.get("Tenseness") == "Lax"
        assert fmap.get("Duration") == "Short"
        assert fmap.get("Voicing") == "Voiced"
        assert fmap.get("Manner") == "Pure monophthong"
        assert fmap.get("Lexical set") == "FOOT"

    def test_knobs(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        knobs = res.json()["knobs"]
        assert len(knobs) == 4
        ids = [k["id"] for k in knobs]
        assert set(ids) == {"advancement", "tenseness", "height", "roundness"}
        height_knob = next(k for k in knobs if k["id"] == "height")
        assert height_knob["highlight"] is True
        assert height_knob["valueLabel"] == "Near-close"

    def test_classification(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        classification = res.json()["classification"]
        labels = [c["label"] for c in classification]
        for expected in ["Near-close", "Back", "Moderate", "Lax", "Monophthong"]:
            assert expected in labels, f"Missing '{expected}' in classification: {labels}"

    def test_vowel_chart_position(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        pos = res.json()["vowelChartPosition"]
        assert pos.get("x") == 95
        assert pos.get("y") == 22


# --------------------------------------------------------------------------- #
# Vowel autofill (/iː/ RP)
# --------------------------------------------------------------------------- #
class TestAutofillVowelFleeceRP:
    def test_status_and_features(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "iː", "dialect": "RP"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 200, res.text
        data = res.json()
        fmap = {f["label"]: f["value"] for f in data["features"]}
        assert fmap.get("Height") == "Close"
        assert data["vowelChartPosition"].get("y") == 5
        assert data["source"].get("lexical_set") == "FLEECE"


# --------------------------------------------------------------------------- #
# Consonant autofill (/t/ GenAm)
# --------------------------------------------------------------------------- #
class TestAutofillConsonantT:
    def test_status_and_shape(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "t", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["source"]["canonical_kind"] == "consonant"
        fmap = {f["label"]: f["value"] for f in data["features"]}
        assert fmap.get("Voicing") == "Voiceless"
        assert fmap.get("Place") == "Alveolar"
        assert fmap.get("Manner") == "Plosive"
        assert data["knobs"] == []
        assert len(data["classification"]) == 3
        assert data["vowelChartPosition"] == {}
        # GenAm flapping note (dialect_notes may be dict or str)
        dnotes = data["source"].get("dialect_notes") or ""
        dnotes_str = str(dnotes).lower() if not isinstance(dnotes, str) else dnotes.lower()
        assert "flap" in dnotes_str, f"Expected 'flap' in dialect_notes, got: {dnotes!r}"


# --------------------------------------------------------------------------- #
# Diphthong autofill (/ɪə/ RP-only)
# --------------------------------------------------------------------------- #
class TestAutofillDiphthongCentring:
    def test_rp_ok(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ɪə", "dialect": "RP"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["source"]["canonical_kind"] == "diphthong"
        labels = [c["label"] for c in data["classification"]]
        assert "Diphthong" in labels

    def test_genam_404(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ɪə", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 404


# --------------------------------------------------------------------------- #
# Error cases
# --------------------------------------------------------------------------- #
class TestAutofillErrors:
    def test_unknown_ipa_404(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "X", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 404
        detail = (res.json().get("detail") or "").lower()
        assert "non presente" in detail

    def test_invalid_dialect_400(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "Italian"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code == 400
        detail = res.json().get("detail") or ""
        assert "GenAm" in detail and "RP" in detail

    def test_missing_ipa_400_or_422(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert res.status_code in (400, 422)

    def test_no_auth_403(self):
        res = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            timeout=10,
        )
        # 401 or 403 both acceptable admin-guard rejects
        assert res.status_code in (401, 403), f"Got {res.status_code}: {res.text}"


# --------------------------------------------------------------------------- #
# Persistence guarantee: autofill NEVER writes to Mongo
# --------------------------------------------------------------------------- #
class TestAutofillNoPersistence:
    def test_u_foot_unchanged_after_autofill(self, admin_headers):
        # Snapshot before
        before = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=10)
        assert before.status_code == 200
        before_doc = before.json()
        before_features = before_doc.get("features", [])
        before_knobs = before_doc.get("knobs", [])

        # Fire autofill
        af = requests.post(
            f"{BASE_URL}/api/admin/phonemes/autofill",
            params={"ipa": "ʊ", "dialect": "GenAm"},
            headers=admin_headers,
            timeout=10,
        )
        assert af.status_code == 200

        # Snapshot after
        after = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=10)
        assert after.status_code == 200
        after_doc = after.json()
        assert after_doc.get("features", []) == before_features
        assert after_doc.get("knobs", []) == before_knobs


# --------------------------------------------------------------------------- #
# Phase A/B/C regression
# --------------------------------------------------------------------------- #
class TestRegression:
    def test_canonical_count_84(self):
        res = requests.get(f"{BASE_URL}/api/canonical/phonemes", timeout=10)
        assert res.status_code == 200
        data = res.json()
        # Response shape: {count, items, controlled_vocabulary}
        if isinstance(data, dict):
            items = data.get("items") or data.get("phonemes") or []
            count = data.get("count", len(items))
        else:
            items = data
            count = len(items)
        assert count == 84, f"Expected 84 canonical items, got {count}"
        assert len(items) == 84

    def test_u_foot_frequency_chart_9_bars(self):
        res = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=10)
        assert res.status_code == 200
        chart = res.json().get("frequencyChart", [])
        assert len(chart) == 9, f"Expected 9 canonical bars, got {len(chart)}"
