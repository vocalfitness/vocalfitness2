"""Phase B (Bug fix) tests — Phoneme CMS controlled-vocabulary lockdown.

Coverage:
- GET /api/canonical/phonemes controlled_vocabulary.height (7 IPA terms) & activation ([HIGH,MODERATE,LOW])
- Phase A regression: dialect filters (GenAm=40, RP=44, total=84)
- Seeded phoneme cards (u-foot, i-fleece) must have:
    * facialMuscles.activation ∈ {HIGH,MODERATE,LOW}
    * classification labels do NOT contain 'Near-high'
    * funFact.body does NOT contain 'least common vowel'
    * knob id=height valueLabel is a proper IPA term (capitalized)
- Idempotent migration: repeated calls stable (count stays same, no re-corruption).
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://canonical-voice-lab.preview.emergentagent.com").rstrip("/")
CANON = f"{BASE_URL}/api/canonical/phonemes"

HEIGHT_TERMS = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"]
ACTIVATION_TERMS = ["HIGH", "MODERATE", "LOW"]


# --------------------------------------------------------------------------- #
# Canonical controlled_vocabulary — new ACTIVATION key
# --------------------------------------------------------------------------- #
class TestCanonicalControlledVocab:
    @pytest.fixture(scope="class")
    def cv(self):
        r = requests.get(CANON, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "controlled_vocabulary" in data
        return data["controlled_vocabulary"]

    def test_height_is_seven_ipa_terms(self, cv):
        assert cv.get("height") == HEIGHT_TERMS, f"height list mismatch: {cv.get('height')}"

    def test_height_excludes_legacy_terms(self, cv):
        heights = cv.get("height", [])
        assert "Near-high" not in heights
        assert "High" not in heights
        assert "Low" not in heights

    def test_activation_terms_present(self, cv):
        assert "activation" in cv, "controlled_vocabulary must expose 'activation' key"
        assert cv["activation"] == ACTIVATION_TERMS, (
            f"activation must be exactly [HIGH,MODERATE,LOW]: got {cv['activation']}"
        )


# --------------------------------------------------------------------------- #
# Phase A regression — counts didn't drift
# --------------------------------------------------------------------------- #
class TestPhaseARegression:
    def test_total_count_84(self):
        r = requests.get(CANON, timeout=30)
        assert r.status_code == 200
        assert r.json()["count"] == 84

    def test_genam_count_40(self):
        r = requests.get(CANON, params={"dialect": "GenAm"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["count"] == 40

    def test_rp_count_44(self):
        r = requests.get(CANON, params={"dialect": "RP"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["count"] == 44


# --------------------------------------------------------------------------- #
# Phoneme card lockdown — u-foot
# --------------------------------------------------------------------------- #
class TestUFootCard:
    @pytest.fixture(scope="class")
    def card(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30)
        assert r.status_code == 200, f"u-foot GET failed: {r.status_code} {r.text[:400]}"
        return r.json()

    def test_classification_no_near_high(self, card):
        labels = [c.get("label", "") for c in card.get("classification", [])]
        assert "Near-high" not in labels, f"classification still has Near-high: {labels}"
        # 'Near-close' is the accepted IPA term
        assert "Near-close" in labels, f"expected Near-close in classification: {labels}"

    def test_facial_muscles_strict_enum(self, card):
        muscles = card.get("facialMuscles", [])
        assert len(muscles) > 0
        for m in muscles:
            act = m.get("activation")
            assert act in ACTIVATION_TERMS, (
                f"muscle {m.get('name')} activation={act!r} not in {ACTIVATION_TERMS}"
            )

    def test_funfact_no_superlative(self, card):
        body = (card.get("funFact") or {}).get("body", "")
        assert "least common vowel" not in body.lower(), (
            f"funFact.body still has superlative language: {body}"
        )

    def test_height_knob_capitalized(self, card):
        knobs = card.get("knobs", [])
        height_knob = next((k for k in knobs if k.get("id") == "height"), None)
        assert height_knob is not None, "u-foot must have a knob with id='height'"
        vl = height_knob.get("valueLabel", "")
        assert vl in HEIGHT_TERMS, (
            f"knob height valueLabel={vl!r} must be one of {HEIGHT_TERMS} (capitalized IPA form)"
        )


# --------------------------------------------------------------------------- #
# Phoneme card lockdown — i-fleece
# --------------------------------------------------------------------------- #
class TestIFleeceCard:
    @pytest.fixture(scope="class")
    def card(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/i-fleece", timeout=30)
        assert r.status_code == 200, f"i-fleece GET failed: {r.status_code} {r.text[:400]}"
        return r.json()

    def test_facial_muscles_strict_enum(self, card):
        muscles = card.get("facialMuscles", [])
        assert len(muscles) > 0
        for m in muscles:
            act = m.get("activation")
            assert act in ACTIVATION_TERMS, (
                f"muscle {m.get('name')} activation={act!r} not in {ACTIVATION_TERMS}"
            )

    def test_height_knob_capitalized(self, card):
        knobs = card.get("knobs", [])
        height_knob = next((k for k in knobs if k.get("id") == "height"), None)
        assert height_knob is not None
        vl = height_knob.get("valueLabel", "")
        assert vl in HEIGHT_TERMS, (
            f"knob height valueLabel={vl!r} must be capitalized IPA form"
        )


# --------------------------------------------------------------------------- #
# Migration idempotency — repeated GETs return stable data (no re-corruption)
# --------------------------------------------------------------------------- #
class TestMigrationIdempotency:
    def test_repeated_reads_stable(self):
        r1 = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30).json()
        r2 = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30).json()
        # facialMuscles activation values should not flip between HIGH/MODERATE and lowercase
        acts1 = [m.get("activation") for m in r1.get("facialMuscles", [])]
        acts2 = [m.get("activation") for m in r2.get("facialMuscles", [])]
        assert acts1 == acts2

    def test_no_legacy_free_text_in_activation_across_both_cards(self):
        for cid in ("u-foot", "i-fleece"):
            r = requests.get(f"{BASE_URL}/api/phonemes/{cid}", timeout=30).json()
            for m in r.get("facialMuscles", []):
                a = m.get("activation", "")
                # any lowercase or legacy free-text value is a failure
                assert a == a.upper(), f"{cid} muscle activation not uppercase: {a}"
                assert a in ACTIVATION_TERMS, f"{cid} illegal activation: {a}"
