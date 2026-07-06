"""Security primitives for VocalFitness auth.

Central place for bcrypt hashing, JWT signing and FastAPI auth
dependencies. Kept as a stateless module so both ``server.py`` and every
``routers/*`` module can import from here without triggering circular
imports.

Contents
--------
* ``SECRET_KEY``, ``ALGORITHM``, ``ACCESS_TOKEN_EXPIRE_MINUTES`` — JWT config
* ``pwd_context``  — passlib bcrypt context
* ``security``     — shared FastAPI ``HTTPBearer`` instance
* ``verify_password(plain, hashed) -> bool``
* ``get_password_hash(password) -> str``
* ``create_access_token(data, expires_delta=None) -> str``
* ``build_user_deps(db) -> (get_current_user, get_admin_user)`` — factory
  returning the two closures used everywhere as FastAPI ``Depends``.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional, Tuple

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

# --------------------------------------------------------------------------- #
# JWT configuration
# --------------------------------------------------------------------------- #
SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "vocalfitness-secret-key-change-in-production-2024",
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# --------------------------------------------------------------------------- #
# Password hashing + HTTP bearer scheme
# --------------------------------------------------------------------------- #
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """bcrypt verification. Returns False on any exception (never raises)."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of ``password``."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Return a signed JWT with the given payload. Default expiry: 7 days."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# --------------------------------------------------------------------------- #
# FastAPI user dependencies (factory)
# --------------------------------------------------------------------------- #
def build_user_deps(db) -> Tuple[Callable, Callable]:
    """
    Build ``(get_current_user, get_admin_user)`` closures with ``db`` captured.

    The factory pattern lets us avoid a global ``db`` reference in this
    module (which would require importing from ``server.py`` → circular).

    Returns
    -------
    (get_current_user, get_admin_user):
        Both are ``async`` functions ready to be passed as FastAPI
        ``Depends(...)``. ``get_admin_user`` transitively depends on
        ``get_current_user`` — same behaviour as the original inline pair.

    Additionally exposes ``build_user_deps.optional_admin`` — an ``async``
    dependency that returns the admin dict when a valid admin JWT is
    supplied via ``Authorization: Bearer ...`` and ``None`` otherwise.
    Used to let public endpoints (e.g. ``GET /api/phonemes/{id}``)
    optionally reveal draft cards to signed-in admins without gating the
    endpoint for anonymous callers.
    """

    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        token = credentials.credentials
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: Optional[str] = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=401, detail="Token non valido")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token scaduto")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Token non valido")

        user = await db.users.find_one({"username": username}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user

    async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Accesso riservato agli amministratori",
            )
        return current_user

    async def get_optional_admin_user(request: Request) -> Optional[dict]:
        """Return the admin dict when a valid admin JWT is present, else None.

        Silent on every failure path (missing header, wrong scheme, expired
        token, non-admin role) — never raises. Intended for endpoints that
        want to *optionally* upgrade the response for signed-in admins.
        """
        auth = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth or not auth.lower().startswith("bearer "):
            return None
        token = auth.split(" ", 1)[1].strip()
        if not token:
            return None
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                return None
        except Exception:  # noqa: BLE001
            return None
        user = await db.users.find_one({"username": username}, {"_id": 0})
        if not user or user.get("role") != "admin":
            return None
        return user

    # Expose the optional dep as an attribute so callers can grab it after
    # unpacking the primary tuple, without breaking existing 2-tuple usage.
    build_user_deps.optional_admin = get_optional_admin_user
    return get_current_user, get_admin_user
