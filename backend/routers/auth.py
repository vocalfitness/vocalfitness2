"""Authentication + Newsletter endpoints.

The user-facing auth surface (login/magic/me/change-password) plus the
newsletter subscription flow — kept together because both target the
"user account lifecycle" domain.

Endpoints exposed
-----------------
* ``POST /auth/login``            — username/password → JWT
* ``POST /auth/magic``            — magic-link token exchange (from
                                     onboarding wizard emails) → JWT
* ``GET  /auth/me``               — current user profile
* ``POST /auth/change-password``  — change own password (requires session)
* ``POST /newsletter/subscribe``  — public subscribe (reactivates if inactive)
* ``POST /newsletter/unsubscribe`` — public unsubscribe
* ``GET  /admin/newsletter/subscribers`` — admin list w/ active filter

Auth primitives (``verify_password``, ``create_access_token``) come from
``utils.security``. ``UserResponse`` is injected via the factory because
it lives in ``server.py`` (used by many other admin CRUD endpoints too);
duplicating it here would risk drift.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Callable, Type

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from utils.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
)


# --------------------------------------------------------------------------- #
# Local models (auth-specific)
# --------------------------------------------------------------------------- #
class UserLogin(BaseModel):
    username: str
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class NewsletterSubscription(BaseModel):
    email: str
    name: str = ""
    language: str = "it"


# ``TokenResponse`` and ``NewsletterResponse`` embed ``UserResponse`` /
# other server-side types — declared inside the factory once the concrete
# ``UserResponse`` class is available (see build_auth_router below).


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_auth_router(
    db,
    get_current_user: Callable,
    get_admin_user: Callable,
    UserResponse: Type[BaseModel],
    NewsletterResponse: Type[BaseModel],
) -> APIRouter:
    """
    Build the auth + newsletter router.

    Parameters
    ----------
    db:
        Motor MongoDB database instance.
    get_current_user, get_admin_user:
        FastAPI dependencies from ``utils.security.build_user_deps``.
    UserResponse, NewsletterResponse:
        Pydantic models declared in ``server.py`` — injected so we avoid
        a circular import.
    """

    router = APIRouter()

    class TokenResponse(BaseModel):
        access_token: str
        token_type: str = "bearer"
        user: UserResponse

    def _make_user_response(user: dict) -> "UserResponse":
        """Map a raw Mongo user doc → ``UserResponse`` (safe date parsing)."""
        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user.get("email", ""),
            full_name=user.get("full_name", ""),
            role=user.get("role", "client"),
            created_at=(
                datetime.fromisoformat(user["created_at"])
                if isinstance(user["created_at"], str)
                else user["created_at"]
            ),
        )

    # ---- AUTH ------------------------------------------------------------ #
    @router.post("/auth/login", response_model=TokenResponse)
    async def login(credentials: UserLogin):
        """Login and get access token."""
        user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
        if not user or not verify_password(
            credentials.password, user.get("hashed_password", ""),
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username o password non corretti",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(data={"sub": user["username"]})
        return TokenResponse(access_token=access_token, user=_make_user_response(user))

    @router.post("/auth/magic", response_model=TokenResponse)
    async def magic_login(payload: dict):
        """Exchange a magic-link token for a regular session token."""
        token = payload.get("token") if isinstance(payload, dict) else None
        if not token:
            raise HTTPException(status_code=400, detail="Missing token")
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if not decoded.get("magic"):
                raise HTTPException(status_code=400, detail="Invalid magic token")
            username = decoded.get("sub")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Magic link expired")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid magic token")

        user = await db.users.find_one({"username": username}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        access_token = create_access_token(data={"sub": user["username"]})
        return TokenResponse(access_token=access_token, user=_make_user_response(user))

    @router.get("/auth/me", response_model=UserResponse)
    async def get_current_user_info(current_user: dict = Depends(get_current_user)):
        """Get current user information."""
        return _make_user_response(current_user)

    @router.post("/auth/change-password")
    async def change_password(
        request: PasswordChangeRequest,
        current_user: dict = Depends(get_current_user),
    ):
        """Change password for the current user."""
        user = await db.users.find_one({"id": current_user["id"]})
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato")

        if not verify_password(request.current_password, user.get("hashed_password", "")):
            raise HTTPException(status_code=400, detail="Password attuale non corretta")

        if len(request.new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="La nuova password deve avere almeno 8 caratteri",
            )

        if request.current_password == request.new_password:
            raise HTTPException(
                status_code=400,
                detail="La nuova password deve essere diversa dalla precedente",
            )

        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {
                "hashed_password":     get_password_hash(request.new_password),
                "password_changed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"success": True, "message": "Password aggiornata con successo"}

    # ---- NEWSLETTER ------------------------------------------------------ #
    _EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

    @router.post("/newsletter/subscribe", response_model=NewsletterResponse, status_code=201)
    async def subscribe_newsletter(subscription: NewsletterSubscription):
        """Subscribe to the newsletter."""
        if not _EMAIL_RE.match(subscription.email):
            raise HTTPException(status_code=400, detail="Email non valida")

        email = subscription.email.lower()
        existing = await db.newsletter_subscribers.find_one({"email": email})
        if existing:
            if existing.get("is_active"):
                raise HTTPException(status_code=400, detail="Email già iscritta alla newsletter")
            # Reactivate
            await db.newsletter_subscribers.update_one(
                {"email": email},
                {"$set": {
                    "is_active":       True,
                    "resubscribed_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            return NewsletterResponse(
                id=existing["id"],
                email=existing["email"],
                name=existing.get("name", ""),
                language=existing.get("language", "it"),
                subscribed_at=(
                    datetime.fromisoformat(existing["subscribed_at"])
                    if isinstance(existing["subscribed_at"], str)
                    else existing["subscribed_at"]
                ),
                is_active=True,
            )

        # Create fresh subscription
        sub_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        await db.newsletter_subscribers.insert_one({
            "id":            sub_id,
            "email":         email,
            "name":          subscription.name,
            "language":      subscription.language,
            "subscribed_at": now.isoformat(),
            "is_active":     True,
        })
        return NewsletterResponse(
            id=sub_id, email=email, name=subscription.name,
            language=subscription.language, subscribed_at=now, is_active=True,
        )

    @router.post("/newsletter/unsubscribe")
    async def unsubscribe_newsletter(email: str):
        """Unsubscribe from the newsletter."""
        result = await db.newsletter_subscribers.update_one(
            {"email": email.lower()},
            {"$set": {
                "is_active":       False,
                "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Email non trovata")
        return {"success": True, "message": "Disiscrizione completata"}

    @router.get("/admin/newsletter/subscribers")
    async def list_newsletter_subscribers(
        active_only: bool = True,
        _admin: dict = Depends(get_admin_user),
    ):
        """List newsletter subscribers (admin only)."""
        query = {"is_active": True} if active_only else {}
        subscribers = await db.newsletter_subscribers.find(query, {"_id": 0}).to_list(10000)
        return {"subscribers": subscribers, "count": len(subscribers)}

    return router
