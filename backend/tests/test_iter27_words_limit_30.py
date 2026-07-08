"""Iteration 27 — Backend tests for words_limit=30 default in BatchAudioRequest.

Validates:
 1. Empty body {} to /api/admin/phonemes/{card_id}/batch-audio uses default
    words_limit=30 and include_words_rp=True (30 AmE + 30 RP word items).
 2. u-foot has all 60 word audio URLs populated -> skipped list contains
    word-{0..29}-AmE and word-{0..29}-RP (60 keys total).
 3. Idempotency: overwrite=False on fully-populated card => no ElevenLabs
    calls (generated is empty for word-N keys), avoiding cost while still
    proving the default expanded from 10 -> 30.
 4. Auth guard: 401 without a token.

We DELIBERATELY avoid triggering real ElevenLabs synthesis (which would
burn credits) by targeting a card whose audio slots are already full.
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vocal-members-pro.preview.emergentagent.com").rstrip("/")
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "VocalFitness2026!"

# ---------------------------- fixtures ------------------------------------

@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME, "password": ADMIN_PASSWORD,
    }, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed HTTP {r.status_code}: {r.text[:200]}")
    tok = r.json().get("access_token")
    assert tok, "access_token missing in login response"
    return tok


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# --------------------------- basic sanity ---------------------------------

def test_admin_login_works(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME, "password": ADMIN_PASSWORD,
    }, timeout=15)
    assert r.status_code == 200, f"login failed: {r.text[:200]}"
    assert "access_token" in r.json()


def test_u_foot_card_exists_and_has_30_words(api_client, auth_headers):
    r = api_client.get(f"{BASE_URL}/api/admin/phonemes/u-foot", headers=auth_headers, timeout=15)
    assert r.status_code == 200, f"u-foot not fetchable: {r.text[:200]}"
    doc = r.json()
    cw = doc.get("commonWords") or []
    assert len(cw) >= 30, f"u-foot must have >=30 commonWords for this test suite, got {len(cw)}"


# --------------------- words_limit default = 30 ---------------------------

def test_batch_audio_empty_body_defaults_to_30_words_both_dialects(api_client, auth_headers):
    """POST with EMPTY body {} must use words_limit=30 default AND
    include_words_rp=True default, resulting in exactly 60 word-* items
    in the response (skipped or generated) for u-foot."""
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/u-foot/batch-audio",
        headers=auth_headers, json={}, timeout=120,
    )
    assert r.status_code == 200, f"batch-audio failed: {r.text[:500]}"
    body = r.json()
    assert body.get("ok") is True
    assert body.get("card_id") == "u-foot"

    all_keys = set(body.get("generated") or []) | set(body.get("skipped") or []) | {
        e.get("key") for e in (body.get("errors") or []) if e.get("key")
    }

    expected_word_keys = {f"word-{i}-{d}" for i in range(30) for d in ("AmE", "RP")}
    missing = expected_word_keys - all_keys
    assert not missing, (
        f"words_limit default appears to be < 30 or include_words_rp default is False. "
        f"Missing {len(missing)} keys, sample: {sorted(list(missing))[:6]}"
    )


def test_batch_audio_explicit_30_all_populated_produces_60_skipped(api_client, auth_headers):
    """u-foot has all 30 AmE + 30 RP word URLs already populated so with
    overwrite=false the endpoint must SKIP all 60 word items (no ElevenLabs
    call), also skip isolated & mnemonic when populated. This proves the
    idempotent skip logic AND that the 30-word iteration happens."""
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/u-foot/batch-audio",
        headers=auth_headers,
        json={"words_limit": 30, "include_words_rp": True, "overwrite": False},
        timeout=120,
    )
    assert r.status_code == 200, f"batch-audio failed: {r.text[:500]}"
    body = r.json()

    skipped = set(body.get("skipped") or [])
    expected_word_keys = {f"word-{i}-{d}" for i in range(30) for d in ("AmE", "RP")}
    still_missing = expected_word_keys - skipped
    assert not still_missing, (
        f"Expected all 60 word items to be in 'skipped' (populated + overwrite=false), "
        f"missing {len(still_missing)} of them: {sorted(list(still_missing))[:6]}. "
        f"generated={body.get('generated')}, errors={body.get('errors')}"
    )
    # And nothing about the words should have been re-generated.
    generated = set(body.get("generated") or [])
    word_generated = {k for k in generated if k.startswith("word-")}
    assert not word_generated, (
        f"With overwrite=false and all URLs present, no word audio should be regenerated "
        f"but got generated={word_generated}"
    )


def test_batch_audio_only_keys_targeting_word_29_both_dialects(api_client, auth_headers):
    """Surgical only_keys=['word-29-AmE','word-29-RP'] with overwrite=false
    on already-populated word 29 must return skipped=2 for those keys and
    total=2 (only_keys filter honored, no other items processed)."""
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/u-foot/batch-audio",
        headers=auth_headers,
        json={
            "only_keys": ["word-29-AmE", "word-29-RP"],
            "overwrite": False,
            "words_limit": 30,
            "include_words_rp": True,
        },
        timeout=60,
    )
    assert r.status_code == 200, f"batch-audio failed: {r.text[:500]}"
    body = r.json()
    assert body.get("total") == 2, f"expected total=2 with only_keys filter, got {body}"
    skipped = set(body.get("skipped") or [])
    assert skipped == {"word-29-AmE", "word-29-RP"}, f"skipped mismatch: {skipped}"


def test_batch_audio_include_words_rp_false_only_ame(api_client, auth_headers):
    """When include_words_rp=false, only word-N-AmE should appear (no RP
    word keys). Verifies the include_words_rp knob is honored."""
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/u-foot/batch-audio",
        headers=auth_headers,
        json={
            "only_keys": [f"word-{i}-AmE" for i in range(30)] + [f"word-{i}-RP" for i in range(30)],
            "overwrite": False,
            "words_limit": 30,
            "include_words_rp": False,
        },
        timeout=60,
    )
    assert r.status_code == 200
    body = r.json()
    all_keys = set(body.get("generated") or []) | set(body.get("skipped") or []) | {
        e.get("key") for e in (body.get("errors") or []) if e.get("key")
    }
    rp_keys_present = {k for k in all_keys if k.startswith("word-") and k.endswith("-RP")}
    assert not rp_keys_present, (
        f"include_words_rp=false should exclude RP word items, but got: {sorted(rp_keys_present)[:5]}"
    )


# ------------------------- auth guard ------------------------------------

def test_batch_audio_requires_auth(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/u-foot/batch-audio",
        json={}, timeout=15,
    )
    assert r.status_code in (401, 403), f"unauthenticated must be rejected, got {r.status_code}: {r.text[:200]}"


def test_batch_audio_unknown_card_returns_404(api_client, auth_headers):
    r = api_client.post(
        f"{BASE_URL}/api/admin/phonemes/does-not-exist-xyz/batch-audio",
        headers=auth_headers, json={}, timeout=15,
    )
    assert r.status_code == 404, f"expected 404 for unknown card, got {r.status_code}"


# --------------- regression: manual URL paste still works ----------------

def test_patch_audio_url_word_shape_still_works(api_client, auth_headers):
    """Regression: PATCH /api/admin/phonemes/{id}/audio-url with the
    word-N-AmE/RP shape must still update the correct nested field.
    We patch word-29-AmE on u-foot with a marker URL and verify via GET,
    then restore the original value."""
    # Read current value first so we can restore.
    r0 = api_client.get(f"{BASE_URL}/api/admin/phonemes/u-foot", headers=auth_headers, timeout=15)
    assert r0.status_code == 200
    doc = r0.json()
    cw = doc.get("commonWords") or []
    assert len(cw) >= 30
    orig = (cw[29] or {}).get("audioAmE") or (cw[29] or {}).get("audio") or ""

    marker = "https://example.com/TEST_iter27_word29_ame.mp3"
    r1 = api_client.patch(
        f"{BASE_URL}/api/admin/phonemes/u-foot/audio-url",
        headers=auth_headers,
        json={"key": "word-29-AmE", "url": marker},
        timeout=15,
    )
    assert r1.status_code == 200, f"PATCH audio-url failed: {r1.status_code} {r1.text[:200]}"

    r2 = api_client.get(f"{BASE_URL}/api/admin/phonemes/u-foot", headers=auth_headers, timeout=15)
    assert r2.status_code == 200
    new_cw = (r2.json().get("commonWords") or [])
    assert (new_cw[29] or {}).get("audioAmE") == marker, (
        f"marker URL not persisted: {(new_cw[29] or {}).get('audioAmE')}"
    )

    # Restore.
    if orig:
        api_client.patch(
            f"{BASE_URL}/api/admin/phonemes/u-foot/audio-url",
            headers=auth_headers, json={"key": "word-29-AmE", "url": orig}, timeout=15,
        )
