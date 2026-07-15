"""Tests for /api/booking endpoint - onboarding wizard fields."""
import os
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://canonical-voice-lab.preview.emergentagent.com').rstrip('/')


def test_booking_onboarding_wizard_payload():
    """New onboarding wizard payload with role/nativeLanguage/motivation/source."""
    payload = {
        "name": "TEST_OnboardUser", "email": "TEST_onboard@example.com",
        "phone": "+39 333 1234567", "sector": "Technology & Software",
        "englishLevel": "B2", "age": "", "preferredDay": "", "preferredTime": "",
        "message": "Lead intl meetings", "type": "onboarding", "language": "en",
        "role": "executive", "nativeLanguage": "Italian",
        "motivation": "Lead intl meetings", "source": "onboarding_wizard"
    }
    r = requests.post(f"{BASE_URL}/api/booking", json=payload, timeout=30)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["role"] == "executive"
    assert d["nativeLanguage"] == "Italian"
    assert d["motivation"] == "Lead intl meetings"
    assert d["source"] == "onboarding_wizard"
    assert d["englishLevel"] == "B2"
    assert "id" in d


def test_booking_legacy_payload_backward_compat():
    """Legacy payload without new fields should still succeed with defaults."""
    payload = {
        "name": "TEST_LegacyUser", "email": "TEST_legacy@example.com",
        "phone": "+39 333 7654321", "sector": "finance", "englishLevel": "B1",
        "age": "35", "preferredDay": "monday", "preferredTime": "10:00",
        "message": "old form", "type": "booking", "language": "it"
    }
    r = requests.post(f"{BASE_URL}/api/booking", json=payload, timeout=30)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["role"] == ""
    assert d["nativeLanguage"] == ""
    assert d["motivation"] == ""
    assert d["source"] == "booking_form"


def test_booking_validation_missing_required():
    r = requests.post(f"{BASE_URL}/api/booking", json={"name": "x"}, timeout=30)
    assert r.status_code == 422
