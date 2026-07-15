"""Phase C tests — Frequency Chart canonical-computed lockdown.

Coverage:
- GET /api/phonemes/u-foot returns 9 canonical bars with /ʊ/ active, heights in [30,100].
- GET /api/phonemes/i-fleece returns 9 canonical bars with /iː/ active, height=100.
- GET /api/admin/phonemes/u-foot returns SAME computed chart as public (parity).
- PUT /api/admin/phonemes/u-foot with malicious frequencyChart is silently stripped;
  other legit updates (dialectNote) go through. Cleanup restores original dialectNote.
- POST /api/admin/phonemes with a fake frequencyChart at create time is ignored
  (computed from canonical for the new IPA, not the garbage). Cleanup deletes.
- Phase A regression: canonical count 84 (40 GenAm + 44 RP), controlled_vocabulary
  includes height (7 IPA terms) + activation (HIGH/MODERATE/LOW).
- Phase B regression: u-foot activation strict enum; classification Near-close;
  funFact no 'least common vowel'.
"""

import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://canonical-voice-lab.preview.emergentagent.com",
).rstrip("/")

ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"

HEIGHT_TERMS = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"]
ACTIVATION_TERMS = ["HIGH", "MODERATE", "LOW"]
U_FOOT_EXPECTED = ["iː", "ɪ", "ə", "æ", "ɛ", "ʌ", "ɚ", "uː", "ʊ"]


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=30,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:400]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# --------------------------------------------------------------------------- #
# Public GET — canonical-computed frequency chart
# --------------------------------------------------------------------------- #
class TestPublicFrequencyChart:
    def test_u_foot_has_9_canonical_bars(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30)
        assert r.status_code == 200, r.text[:400]
        card = r.json()
        bars = card.get("frequencyChart", [])
        assert len(bars) == 9, f"expected 9 bars, got {len(bars)}: {bars}"
        ipas = [b["ipa"] for b in bars]
        assert set(ipas) == set(U_FOOT_EXPECTED), (
            f"unexpected IPA set for u-foot: {ipas}"
        )
        # /ʊ/ marked active
        active = [b for b in bars if b.get("active")]
        assert len(active) == 1 and active[0]["ipa"] == "ʊ", (
            f"exactly one active bar (/ʊ/) expected: {active}"
        )
        # heights in [30, 100]
        for b in bars:
            h = b.get("height")
            assert isinstance(h, int), f"non-integer height: {b}"
            assert 30 <= h <= 100, f"height out of range: {b}"

    def test_i_fleece_iː_active_height_100(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/i-fleece", timeout=30)
        assert r.status_code == 200, r.text[:400]
        card = r.json()
        bars = card.get("frequencyChart", [])
        assert len(bars) == 9, f"expected 9 bars for i-fleece, got {len(bars)}"
        active = [b for b in bars if b.get("active")]
        assert len(active) == 1, f"exactly one active bar expected: {active}"
        assert active[0]["ipa"] == "iː", f"active bar must be /iː/: {active[0]}"
        assert active[0]["height"] == 100, (
            f"/iː/ is rank 1 → height must be 100: {active[0]}"
        )


# --------------------------------------------------------------------------- #
# Admin GET — parity with public read
# --------------------------------------------------------------------------- #
class TestAdminPublicParity:
    def test_admin_get_matches_public_chart(self, admin_session):
        rp = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30).json()
        ra = admin_session.get(f"{BASE_URL}/api/admin/phonemes/u-foot", timeout=30)
        assert ra.status_code == 200, ra.text[:400]
        admin_card = ra.json()
        assert admin_card.get("frequencyChart") == rp.get("frequencyChart"), (
            "admin and public frequencyChart should be identical"
        )


# --------------------------------------------------------------------------- #
# PUT lockdown — malicious frequencyChart is stripped
# --------------------------------------------------------------------------- #
class TestPutLockdown:
    def test_malicious_freq_chart_is_stripped_but_other_updates_apply(self, admin_session):
        # Preserve current dialectNote for cleanup
        orig = admin_session.get(f"{BASE_URL}/api/admin/phonemes/u-foot", timeout=30).json()
        original_note = orig.get("dialectNote", "")

        try:
            payload = {
                "frequencyChart": [
                    {"ipa": "FAKE", "height": 999, "active": True}
                ],
                "dialectNote": "test-c",
            }
            r = admin_session.put(
                f"{BASE_URL}/api/admin/phonemes/u-foot", json=payload, timeout=30
            )
            assert r.status_code == 200, f"PUT should succeed: {r.status_code} {r.text[:400]}"
            resp = r.json()

            # Legit update went through
            assert resp.get("dialectNote") == "test-c", (
                f"dialectNote update should apply: {resp.get('dialectNote')}"
            )

            # Malicious frequencyChart stripped, canonical remained
            bars = resp.get("frequencyChart", [])
            assert len(bars) == 9, f"expected 9 canonical bars, got {len(bars)}"
            ipas = [b["ipa"] for b in bars]
            assert "FAKE" not in ipas, f"malicious 'FAKE' bar leaked: {bars}"
            assert set(ipas) == set(U_FOOT_EXPECTED), (
                f"unexpected IPA set after tamper attempt: {ipas}"
            )
            # heights all sane
            for b in bars:
                assert 30 <= b["height"] <= 100, f"tampered height leaked: {b}"

            # Confirm persistence: re-GET returns same canonical chart
            r2 = admin_session.get(
                f"{BASE_URL}/api/admin/phonemes/u-foot", timeout=30
            ).json()
            ipas2 = [b["ipa"] for b in r2.get("frequencyChart", [])]
            assert "FAKE" not in ipas2, f"FAKE leaked to persisted read: {ipas2}"
        finally:
            # Cleanup — restore dialectNote
            admin_session.put(
                f"{BASE_URL}/api/admin/phonemes/u-foot",
                json={"dialectNote": original_note},
                timeout=30,
            )


# --------------------------------------------------------------------------- #
# POST lockdown — fake frequencyChart at create time is ignored
# --------------------------------------------------------------------------- #
class TestPostLockdown:
    TEST_ID = "test-c-phasec"

    def test_create_ignores_client_freq_chart(self, admin_session):
        # Ensure clean start
        admin_session.delete(f"{BASE_URL}/api/admin/phonemes/{self.TEST_ID}", timeout=30)

        try:
            payload = {
                "id": self.TEST_ID,
                "ipa": "æ",
                "displayIpa": "/æ/",
                "category": "vowel",
                "dialects": ["AmE", "RP"],
                "frequencyChart": [
                    {"ipa": "GARBAGE", "height": 500, "active": True}
                ],
                "published": False,
                "order": 999,
            }
            r = admin_session.post(
                f"{BASE_URL}/api/admin/phonemes", json=payload, timeout=30
            )
            assert r.status_code == 201, f"POST should create: {r.status_code} {r.text[:400]}"
            created = r.json()

            bars = created.get("frequencyChart", [])
            ipas = [b["ipa"] for b in bars]
            assert "GARBAGE" not in ipas, (
                f"client-supplied GARBAGE leaked into created card: {bars}"
            )
            # bars must be either [] (fallback) or canonical-computed for /æ/
            if bars:
                assert all(30 <= b["height"] <= 100 for b in bars)
                # /æ/ should be active (target ipa) if canonical entry exists
                active = [b for b in bars if b.get("active")]
                if active:
                    assert active[0]["ipa"] == "æ", (
                        f"active bar should be target ipa /æ/: {active[0]}"
                    )
        finally:
            admin_session.delete(
                f"{BASE_URL}/api/admin/phonemes/{self.TEST_ID}", timeout=30
            )


# --------------------------------------------------------------------------- #
# Phase A & B regression sanity — nothing broke while implementing Phase C
# --------------------------------------------------------------------------- #
class TestRegression:
    def test_canonical_count_84(self):
        r = requests.get(f"{BASE_URL}/api/canonical/phonemes", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 84
        cv = data["controlled_vocabulary"]
        assert cv["height"] == HEIGHT_TERMS
        assert cv["activation"] == ACTIVATION_TERMS

    def test_genam_and_rp_split(self):
        rg = requests.get(
            f"{BASE_URL}/api/canonical/phonemes", params={"dialect": "GenAm"}, timeout=30
        ).json()
        rp = requests.get(
            f"{BASE_URL}/api/canonical/phonemes", params={"dialect": "RP"}, timeout=30
        ).json()
        assert rg["count"] == 40
        assert rp["count"] == 44

    def test_u_foot_phase_b_still_holds(self):
        r = requests.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=30).json()
        # classification: Near-close in, Near-high out
        labels = [c.get("label", "") for c in r.get("classification", [])]
        assert "Near-high" not in labels
        assert "Near-close" in labels
        # activation strict enum
        for m in r.get("facialMuscles", []):
            assert m.get("activation") in ACTIVATION_TERMS
        # funFact no 'least common vowel'
        body = (r.get("funFact") or {}).get("body", "")
        assert "least common vowel" not in body.lower()
