"""
Regression tests for the idempotent seed_admin() function.
Uses mongomock-style in-memory dict to validate behaviour without hitting MongoDB.

Key invariants we want guaranteed:
  1. If admin row missing → created with ADMIN_PASSWORD hash.
  2. If admin row exists with matching password → no-op (no DB write).
  3. If admin row exists with DIFFERENT password → hash refreshed to env value.
  4. If ADMIN_PASSWORD env unset/empty → entire seed skipped (no admin auto-created).
  5. Other users (role != admin or username != admin) are never touched.
"""
import os
import asyncio
import importlib
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def fake_db():
    """Return a fake `db` object exposing the subset of methods seed_admin uses."""
    store = {}

    db = MagicMock()
    db._store = store
    db.users = MagicMock()

    async def find_one(query):
        if "username" in query:
            return store.get(query["username"])
        return None

    async def insert_one(doc):
        store[doc["username"]] = dict(doc)

    async def update_one(query, update):
        username = query.get("username")
        if username in store:
            store[username].update(update.get("$set", {}))

    db.users.find_one = find_one
    db.users.insert_one = insert_one
    db.users.update_one = update_one
    return db


@pytest.fixture
def patched_seed(monkeypatch, fake_db):
    """Import seed_admin from server module with a swapped-in fake db."""
    import sys
    sys.path.insert(0, "/app/backend")
    import server
    monkeypatch.setattr(server, "db", fake_db)
    return server.seed_admin


def test_creates_admin_if_missing(patched_seed, fake_db, monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "SuperSecret!2026")
    monkeypatch.setenv("ADMIN_EMAIL", "admin@test.local")
    
    asyncio.run(patched_seed())
    
    assert "admin" in fake_db._store
    admin = fake_db._store["admin"]
    assert admin["role"] == "admin"
    assert admin["email"] == "admin@test.local"
    # Verify hash is a real bcrypt hash for the env password
    import sys
    sys.path.insert(0, "/app/backend")
    from server import verify_password
    assert verify_password("SuperSecret!2026", admin["hashed_password"]) is True


def test_noop_when_password_matches(patched_seed, fake_db, monkeypatch):
    import sys
    sys.path.insert(0, "/app/backend")
    from server import get_password_hash
    fake_db._store["admin"] = {
        "id": "fixed-id",
        "username": "admin",
        "hashed_password": get_password_hash("Existing!Pass"),
        "role": "admin",
        "email": "x@y.z",
    }
    original_hash = fake_db._store["admin"]["hashed_password"]
    
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "Existing!Pass")
    
    asyncio.run(patched_seed())
    
    # Hash must be byte-identical (no rotation when password matches)
    assert fake_db._store["admin"]["hashed_password"] == original_hash
    assert "password_changed_at" not in fake_db._store["admin"]


def test_rotates_hash_when_password_diverges(patched_seed, fake_db, monkeypatch):
    import sys
    sys.path.insert(0, "/app/backend")
    from server import get_password_hash, verify_password
    fake_db._store["admin"] = {
        "id": "fixed-id",
        "username": "admin",
        "hashed_password": get_password_hash("OldPassword1!"),
        "role": "admin",
        "email": "x@y.z",
    }
    old_hash = fake_db._store["admin"]["hashed_password"]
    
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "NewRotated!2026")
    
    asyncio.run(patched_seed())
    
    new_hash = fake_db._store["admin"]["hashed_password"]
    assert new_hash != old_hash
    assert verify_password("NewRotated!2026", new_hash) is True
    assert verify_password("OldPassword1!", new_hash) is False
    assert "password_changed_at" in fake_db._store["admin"]


def test_uses_recovery_fallback_when_admin_password_env_empty(patched_seed, fake_db, monkeypatch):
    """⚠️ TEMPORARY behaviour (production recovery 05/06/2026):
    When ADMIN_PASSWORD env is missing, the seed now falls back to a hardcoded
    recovery password instead of skipping. This unblocks production owners who
    cannot edit secrets from the Emergent deploy UI.
    
    REMOVE this test and restore `test_skips_when_admin_password_env_empty`
    once the fallback is removed from seed_admin().
    """
    import sys
    sys.path.insert(0, "/app/backend")
    from server import verify_password
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    
    asyncio.run(patched_seed())
    
    # Admin must be created even without env var, using the hardcoded fallback
    assert "admin" in fake_db._store
    admin = fake_db._store["admin"]
    # Hardcoded recovery password is "Mulignanes.2025!" — keep in sync with server.seed_admin
    assert verify_password("Mulignanes.2025!", admin["hashed_password"]) is True


def test_does_not_touch_other_users(patched_seed, fake_db, monkeypatch):
    import sys
    sys.path.insert(0, "/app/backend")
    from server import get_password_hash
    fake_db._store["aciofani"] = {
        "id": "client-id",
        "username": "aciofani",
        "hashed_password": get_password_hash("aciofani"),
        "role": "client",
        "email": "a@b.c",
    }
    original = dict(fake_db._store["aciofani"])
    
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "SomethingElse!")
    
    asyncio.run(patched_seed())
    
    # aciofani must be byte-for-byte untouched
    assert fake_db._store["aciofani"] == original
