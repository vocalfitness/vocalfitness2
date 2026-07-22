"""M2.5 Level-Test Lead Endpoint Tests — GDPR enforcement + segmentation."""
import os
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None

# We only rely on the frontend .env for BASE_URL — load if not present.
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

MONGO_URL = None
DB_NAME = None
with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("MONGO_URL="):
            MONGO_URL = line.split("=", 1)[1].strip().strip('"')
        if line.startswith("DB_NAME="):
            DB_NAME = line.split("=", 1)[1].strip().strip('"')


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    return MongoClient(MONGO_URL)[DB_NAME]


# -------- GDPR consent enforcement --------
class TestGdprConsentGate:
    def test_missing_consent_returns_422(self, http):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = http.post(f"{BASE_URL}/api/level-test/lead", json={
            "session_id": sid, "email": "qa@ey.com", "name": "QA",
            "segment": "professional", "consent_privacy": False,
        })
        assert r.status_code == 422, r.text
        body = r.json()
        # Detail may be a dict with reason field
        detail = body.get("detail")
        assert isinstance(detail, dict), f"expected dict detail, got {detail!r}"
        assert detail.get("reason") == "gdpr_consent_required"

    def test_private_lead_saved_when_consent_true(self, http):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = http.post(f"{BASE_URL}/api/level-test/lead", json={
            "session_id": sid, "email": "qa@ey.com", "name": "QA",
            "segment": "professional", "consent_privacy": True,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("lead_type") == "private"


# -------- Corporate branch persistence --------
class TestCorporateBranchPersistence:
    def test_corporate_saved_with_company_and_phone(self, http, mongo):
        sid = f"TEST_sess_corp_{uuid.uuid4().hex[:8]}"
        payload = {
            "session_id": sid,
            "email": "qa.corporate.pytest@ey.com",
            "name": "QA Corp",
            "segment": "corporate",
            "company": "EY QA",
            "phone": "+39 06 999",
            "consent_privacy": True,
            "consent_marketing": False,
            "consent_version": "lt-1.0",
            "consent_text": "Ho letto e accetto",
        }
        r = http.post(f"{BASE_URL}/api/level-test/lead", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["lead_type"] == "corporate"

        doc = mongo.leads.find_one({"session_id": sid})
        assert doc is not None
        assert doc["email"] == "qa.corporate.pytest@ey.com"
        assert doc["source"] == "level_test"
        assert doc["lead_type"] == "corporate"
        assert doc["company"] == "EY QA"
        assert doc["phone"] == "+39 06 999"
        assert doc["consent"]["privacy"] is True
        assert doc["consent"]["version"] == "lt-1.0"
        assert doc["consent"]["text"] == "Ho letto e accetto"
        assert "accepted_at" in doc["consent"]

    def test_private_lead_does_not_store_phone(self, http, mongo):
        sid = f"TEST_sess_priv_{uuid.uuid4().hex[:8]}"
        r = http.post(f"{BASE_URL}/api/level-test/lead", json={
            "session_id": sid,
            "email": "qa.private.pytest@ey.com",
            "name": "QA Priv",
            "segment": "professional",
            "phone": "+39 06 000",  # intentionally passed — must be dropped
            "consent_privacy": True,
        })
        assert r.status_code == 200, r.text
        doc = mongo.leads.find_one({"session_id": sid})
        assert doc is not None
        assert doc["lead_type"] == "private"
        assert doc["phone"] == ""  # phone must not be stored for private


# -------- Invalid email --------
class TestInvalidEmail:
    def test_invalid_email_returns_422(self, http):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = http.post(f"{BASE_URL}/api/level-test/lead", json={
            "session_id": sid, "email": "notanemail", "name": "QA",
            "segment": "professional", "consent_privacy": True,
        })
        assert r.status_code == 422, r.text


@pytest.fixture(scope="module", autouse=True)
def cleanup(mongo):
    yield
    mongo.leads.delete_many({"session_id": {"$regex": "^TEST_sess_"}})
