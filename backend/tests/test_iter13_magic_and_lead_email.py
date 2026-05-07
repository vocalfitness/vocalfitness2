"""
Iteration 13 backend tests:
- Magic-link auto-registration via POST /api/booking (source='onboarding_wizard')
- POST /api/auth/magic exchange (valid / invalid / expired / non-magic JWT)
- POST /api/admin/leads/{id}/email templated emails (welcome/followup/proposal)
- Touch history persistence on lead document
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vocal-members-pro.preview.emergentagent.com").rstrip("/")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "vocalfitness-secret-key-change-in-production-2024")
ALGO = "HS256"

ADMIN_USER = "admin"
ADMIN_PASS = "VocalFitness2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=20,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_session(session, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ---------- Magic-link auto-registration via /api/booking ----------
class TestBookingMagicAutoRegister:
    @pytest.fixture(scope="class")
    def unique_email(self):
        return f"TEST_iter13_{uuid.uuid4().hex[:8]}@example.com"

    def _payload(self, email, source="onboarding_wizard"):
        return {
            "name": "Test Iter13",
            "age": "30-40",
            "email": email,
            "phone": "+391234567890",
            "company": "TestCo",
            "englishLevel": "B2",
            "sector": "Tech",
            "preferredDay": "Monday",
            "preferredMode": "online",
            "preferredTime": "morning",
            "notes": "iter13 test",
            "language": "en",
            "source": source,
            "role": "executive",
            "nativeLanguage": "Italian",
            "motivation": "career",
        }

    def test_onboarding_wizard_creates_user(self, session, unique_email):
        r = session.post(f"{BASE_URL}/api/booking", json=self._payload(unique_email), timeout=30)
        assert r.status_code in (200, 201), f"booking failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("email") == unique_email
        # Allow some time for any background commit (it is sync though)
        time.sleep(1)
        # Login as admin to query the user
        login = session.post(f"{BASE_URL}/api/auth/login",
                             json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15).json()
        h = {"Authorization": f"Bearer {login['access_token']}"}
        # Use admin/users endpoint
        ur = session.get(f"{BASE_URL}/api/admin/users", headers=h, timeout=15)
        assert ur.status_code == 200, ur.text
        users = ur.json()
        matching = [u for u in users if u.get("email") == unique_email]
        assert len(matching) == 1, f"expected 1 user for email, got {len(matching)}"
        u = matching[0]
        assert u.get("role") == "client"
        assert u.get("username")  # derived

    def test_duplicate_email_does_not_create_second_user(self, session, unique_email):
        # Re-submit same wizard with same email
        r = session.post(f"{BASE_URL}/api/booking", json=self._payload(unique_email), timeout=30)
        assert r.status_code in (200, 201)
        time.sleep(1)
        login = session.post(f"{BASE_URL}/api/auth/login",
                             json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15).json()
        h = {"Authorization": f"Bearer {login['access_token']}"}
        ur = session.get(f"{BASE_URL}/api/admin/users", headers=h, timeout=15).json()
        matching = [u for u in ur if u.get("email") == unique_email]
        assert len(matching) == 1, f"duplicate user created: {len(matching)}"

    def test_legacy_booking_form_does_not_create_user(self, session):
        legacy_email = f"TEST_iter13_legacy_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Legacy",
            "age": "30-40",
            "email": legacy_email,
            "phone": "+391234567890",
            "company": "LegacyCo",
            "englishLevel": "B1",
            "sector": "Other",
            "preferredDay": "Monday",
            "preferredMode": "online",
            "preferredTime": "morning",
            "notes": "legacy",
            "language": "en",
            "source": "booking_form",
        }
        r = session.post(f"{BASE_URL}/api/booking", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        time.sleep(0.5)
        login = session.post(f"{BASE_URL}/api/auth/login",
                             json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15).json()
        h = {"Authorization": f"Bearer {login['access_token']}"}
        ur = session.get(f"{BASE_URL}/api/admin/users", headers=h, timeout=15).json()
        matching = [u for u in ur if u.get("email") == legacy_email]
        assert len(matching) == 0, "legacy booking_form should NOT create a user"


# ---------- /api/auth/magic ----------
class TestAuthMagic:
    def test_missing_token_returns_400(self, session):
        r = session.post(f"{BASE_URL}/api/auth/magic", json={}, timeout=15)
        assert r.status_code == 400
        assert "Missing token" in r.text

    def test_invalid_token_returns_401(self, session):
        r = session.post(f"{BASE_URL}/api/auth/magic", json={"token": "not.a.jwt"}, timeout=15)
        assert r.status_code == 401
        assert "Invalid magic token" in r.text

    def test_jwt_without_magic_claim_returns_400(self, session):
        # Encode a valid JWT but without 'magic' claim
        payload = {
            "sub": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        tok = jwt.encode(payload, JWT_SECRET, algorithm=ALGO)
        r = session.post(f"{BASE_URL}/api/auth/magic", json={"token": tok}, timeout=15)
        assert r.status_code == 400
        assert "Invalid magic token" in r.text

    def test_expired_magic_token_returns_401(self, session):
        payload = {
            "sub": "admin",
            "magic": True,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        }
        tok = jwt.encode(payload, JWT_SECRET, algorithm=ALGO)
        r = session.post(f"{BASE_URL}/api/auth/magic", json={"token": tok}, timeout=15)
        assert r.status_code == 401
        assert "expired" in r.text.lower()

    def test_valid_magic_token_returns_session(self, session):
        # First create a user via onboarding wizard
        email = f"TEST_iter13_magic_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Magic Test",
            "age": "30-40",
            "email": email,
            "phone": "+391234567890",
            "company": "MagicCo",
            "englishLevel": "C1",
            "sector": "Tech",
            "preferredDay": "Monday",
            "preferredMode": "online",
            "preferredTime": "morning",
            "notes": "magic test",
            "language": "en",
            "source": "onboarding_wizard",
            "role": "manager",
            "nativeLanguage": "Italian",
        }
        r = session.post(f"{BASE_URL}/api/booking", json=payload, timeout=30)
        assert r.status_code in (200, 201)
        time.sleep(1)

        # Look up the user by email to find the username
        login = session.post(f"{BASE_URL}/api/auth/login",
                             json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15).json()
        h = {"Authorization": f"Bearer {login['access_token']}"}
        users = session.get(f"{BASE_URL}/api/admin/users", headers=h, timeout=15).json()
        target = next((u for u in users if u.get("email") == email), None)
        assert target is not None, "user not auto-created"
        username = target["username"]

        # Build a valid magic token
        magic_payload = {
            "sub": username,
            "magic": True,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        }
        tok = jwt.encode(magic_payload, JWT_SECRET, algorithm=ALGO)
        r = session.post(f"{BASE_URL}/api/auth/magic", json={"token": tok}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body
        assert body["user"]["username"] == username
        assert body["user"]["role"] == "client"


# ---------- /api/admin/leads/{id}/email ----------
class TestLeadTemplatedEmail:
    @pytest.fixture(scope="class")
    def lead_id(self, session):
        # Create a fresh lead via wizard so we have a known id and email
        email = f"TEST_iter13_lead_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Lead Tester",
            "age": "30-40",
            "email": email,
            "phone": "+391234567890",
            "company": "LeadCo",
            "englishLevel": "B2",
            "sector": "Finance",
            "preferredDay": "Monday",
            "preferredMode": "online",
            "preferredTime": "morning",
            "notes": "lead email test",
            "language": "en",
            "source": "onboarding_wizard",
            "role": "executive",
            "nativeLanguage": "Italian",
        }
        r = session.post(f"{BASE_URL}/api/booking", json=payload, timeout=30)
        assert r.status_code in (200, 201)
        body = r.json()
        # The booking response carries id and email
        return {"id": body.get("id"), "email": email}

    def test_invalid_template_returns_400(self, admin_session, lead_id):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/leads/{lead_id['id']}/email",
            json={"template": "nonexistent", "language": "en"},
            timeout=20,
        )
        assert r.status_code == 400
        assert "Invalid template key" in r.text

    def test_nonexistent_lead_returns_404(self, admin_session):
        bogus = str(uuid.uuid4())
        r = admin_session.post(
            f"{BASE_URL}/api/admin/leads/{bogus}/email",
            json={"template": "welcome", "language": "en"},
            timeout=20,
        )
        assert r.status_code == 404
        assert "Lead not found" in r.text

    def test_unauthenticated_request_blocked(self, session, lead_id):
        r = session.post(
            f"{BASE_URL}/api/admin/leads/{lead_id['id']}/email",
            json={"template": "welcome", "language": "en"},
            timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_welcome_template_sends_and_logs_touch(self, admin_session, lead_id):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/leads/{lead_id['id']}/email",
            json={"template": "welcome", "language": "en"},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True
        assert body.get("subject") == "Welcome to VocalFitness — your diagnostic assessment"
        assert body.get("to") == lead_id["email"]

        # Verify the lead document via admin search
        time.sleep(1)
        srch = admin_session.get(
            f"{BASE_URL}/api/admin/leads", params={"search": lead_id["email"]}, timeout=20
        )
        assert srch.status_code == 200, srch.text
        leads = srch.json()
        # Endpoint may return list or {items:[...]} or {leads:[...]}
        if isinstance(leads, dict):
            leads = leads.get("items") or leads.get("leads") or []
        target = next((l for l in leads if l.get("id") == lead_id["id"]), None)
        assert target is not None, "lead not found in admin search"
        assert target.get("status") == "contacted"
        assert target.get("last_contacted_at")
        touches = target.get("touches", [])
        assert len(touches) >= 1
        t0 = touches[0]
        assert t0.get("type") == "email"
        assert t0.get("template") == "welcome"
        assert t0.get("language") == "en"
        assert t0.get("by") in ("admin", ADMIN_USER)

    def test_followup_italian_with_role_substitution(self, admin_session, lead_id):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/leads/{lead_id['id']}/email",
            json={"template": "followup", "language": "it"},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True
        # IT subject
        assert "Follow-up" in body["subject"] and "diagnostica" in body["subject"].lower()

    def test_proposal_subject_substitutes_role(self, admin_session, lead_id):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/leads/{lead_id['id']}/email",
            json={"template": "proposal", "language": "en"},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # role for this lead is 'executive'
        assert "executive" in body["subject"].lower()
        assert "Custom proposal" in body["subject"]
