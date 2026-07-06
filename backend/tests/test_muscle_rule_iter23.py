"""
Iteration 23 — §3.1 facial-muscle rule server-side enforcement.

Covers:
  1. AUTH: admin login works with credentials from /app/memory/test_credentials.md.
  2. PUBLIC READ (published card): /api/phonemes/u-foot returns §3.1 muscles
     (MODERATE, MODERATE, LOW, MODERATE, LOW).
  3. DRAFT VISIBILITY:
     - Anonymous GET /api/phonemes/u-goose → 404
     - Admin JWT GET /api/phonemes/u-goose → 200 with §3.1 muscles for /uː/
       (HIGH, MODERATE, LOW, MODERATE, MODERATE).
  4. AUTOMATED RULE ON UPDATE: PUT /api/admin/phonemes/u-foot with an unrelated
     field (dialectNote) still returns §3.1 muscles.
  5. AUTOMATED RULE ON CREATE: POST /api/admin/phonemes with a bilabial /p/
     returns §3.1 bilabial muscles (HIGH, LOW, LOW, MODERATE, MODERATE).
     Cleanup: DELETE afterwards.
  6. REGRESSION: every card returned by /api/admin/phonemes has non-empty
     facialMuscles in its detail response.
"""

import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend .env for REACT_APP_BACKEND_URL fallback
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL must be set")

ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"

# §3.1 expected sequences (name, activation)
EXPECTED_U_FOOT = [
    ("Orbicularis oris",  "MODERATE"),
    ("Buccinator",        "MODERATE"),
    ("Zygomaticus major", "LOW"),
    ("Masseter",          "MODERATE"),
    ("Mentalis",          "LOW"),
]
EXPECTED_U_GOOSE = [
    ("Orbicularis oris",  "HIGH"),
    ("Buccinator",        "MODERATE"),
    ("Zygomaticus major", "LOW"),
    ("Masseter",          "MODERATE"),
    ("Mentalis",          "MODERATE"),
]
EXPECTED_BILABIAL_P = [
    ("Orbicularis oris",  "HIGH"),
    ("Buccinator",        "LOW"),
    ("Zygomaticus major", "LOW"),
    ("Masseter",          "MODERATE"),
    ("Mentalis",          "MODERATE"),
]


def _pairs(muscles):
    return [(m.get("name"), m.get("activation")) for m in (muscles or [])]


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_client(api_client, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# --------------------------------------------------------------- AUTH
class TestAuth:
    def test_admin_login_succeeds(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20


# --------------------------------------------------------------- PUBLIC CARD (u-foot)
class TestPublicUFoot:
    def test_u_foot_public_get_ok(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "u-foot"
        assert data.get("published") is True

    def test_u_foot_muscles_match_spec(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/phonemes/u-foot", timeout=15)
        assert r.status_code == 200
        pairs = _pairs(r.json().get("facialMuscles"))
        assert pairs == EXPECTED_U_FOOT, f"u-foot muscles mismatch: {pairs}"


# --------------------------------------------------------------- DRAFT VISIBILITY (u-goose)
class TestDraftUGoose:
    def test_u_goose_anonymous_returns_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/phonemes/u-goose", timeout=15)
        assert r.status_code == 404

    def test_u_goose_admin_returns_200_with_spec_muscles(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/phonemes/u-goose", timeout=15)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert data["id"] == "u-goose"
        pairs = _pairs(data.get("facialMuscles"))
        assert pairs == EXPECTED_U_GOOSE, f"u-goose muscles mismatch: {pairs}"


# --------------------------------------------------------------- AUTO RULE ON UPDATE
class TestAdminUpdateAutoMuscleRule:
    def test_update_u_foot_dialect_note_preserves_muscle_rule(self, admin_client):
        payload = {"dialectNote": "regression test iter23"}
        r = admin_client.put(
            f"{BASE_URL}/api/admin/phonemes/u-foot",
            json=payload,
            timeout=20,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        pairs = _pairs(data.get("facialMuscles"))
        assert pairs == EXPECTED_U_FOOT, f"After PUT muscles mismatch: {pairs}"
        # Verify GET returns the same
        r2 = admin_client.get(f"{BASE_URL}/api/admin/phonemes/u-foot", timeout=15)
        assert r2.status_code == 200
        assert _pairs(r2.json().get("facialMuscles")) == EXPECTED_U_FOOT


# --------------------------------------------------------------- AUTO RULE ON CREATE + CLEANUP
class TestAdminCreateAutoMuscleRule:
    NEW_ID = "test-p-bilabial"

    @pytest.fixture(autouse=True)
    def _cleanup(self, admin_client):
        # pre-cleanup in case previous run left it
        admin_client.delete(f"{BASE_URL}/api/admin/phonemes/{self.NEW_ID}")
        yield
        admin_client.delete(f"{BASE_URL}/api/admin/phonemes/{self.NEW_ID}")

    def test_create_bilabial_p_applies_muscle_rule(self, admin_client):
        payload = {
            "id": self.NEW_ID,
            "ipa": "p",
            "displayIpa": "/p/",
            "category": "consonant",
            "examples": ["pat"],
        }
        r = admin_client.post(
            f"{BASE_URL}/api/admin/phonemes",
            json=payload,
            timeout=20,
        )
        assert r.status_code == 201, r.text[:300]
        data = r.json()
        pairs = _pairs(data.get("facialMuscles"))
        assert pairs == EXPECTED_BILABIAL_P, f"Create /p/ muscles mismatch: {pairs}"

        # Confirm via GET (admin, since unpublished)
        r2 = admin_client.get(f"{BASE_URL}/api/admin/phonemes/{self.NEW_ID}", timeout=15)
        assert r2.status_code == 200
        assert _pairs(r2.json().get("facialMuscles")) == EXPECTED_BILABIAL_P


# --------------------------------------------------------------- REGRESSION — startup backfill
class TestStartupBackfill:
    def test_all_cards_have_facial_muscles(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/phonemes", timeout=20)
        assert r.status_code == 200, r.text[:200]
        cards = r.json()
        assert len(cards) >= 40, f"Expected 40+ cards, got {len(cards)}"

        empty_ids = []
        wrong_shape = []
        # Sample every card via detail endpoint; keep it under ~5s by limiting depth
        for card in cards:
            cid = card["id"]
            rd = admin_client.get(f"{BASE_URL}/api/admin/phonemes/{cid}", timeout=15)
            if rd.status_code != 200:
                empty_ids.append(f"{cid}(http={rd.status_code})")
                continue
            m = rd.json().get("facialMuscles") or []
            if not m:
                empty_ids.append(cid)
                continue
            # Must be exactly 5 rows with valid activation enum
            if len(m) != 5:
                wrong_shape.append(f"{cid}(rows={len(m)})")
                continue
            for row in m:
                act = (row.get("activation") or "").upper()
                if act not in {"HIGH", "MODERATE", "LOW"}:
                    wrong_shape.append(f"{cid}(act={act})")
                    break
        assert not empty_ids, f"Cards with empty facialMuscles: {empty_ids[:10]}"
        assert not wrong_shape, f"Cards with wrong-shape muscles: {wrong_shape[:10]}"
