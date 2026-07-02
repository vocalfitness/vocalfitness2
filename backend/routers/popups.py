"""Popup Messages — admin CRUD + member view/dismiss + media upload.

Endpoints:

* Admin:
  - ``POST   /admin/popups``                  — create
  - ``GET    /admin/popups``                  — list
  - ``GET    /admin/popups/stats``            — views/dismissals per popup
  - ``GET    /admin/popups/{id}``             — single
  - ``PUT    /admin/popups/{id}``             — update
  - ``DELETE /admin/popups/{id}``             — delete (cascade views + dismissals)
  - ``POST   /admin/popups/upload-media``     — upload audio/video media
* Member:
  - ``GET    /members/popups``                — active popups (respecting dismissals + targeting)
  - ``POST   /members/popups/{id}/view``      — record view
  - ``POST   /members/popups/{id}/dismiss``   — dismiss (don't show again)

The upload endpoint uses the same storage helpers as ``routers/uploads.py``
(get_total_storage_used, auto_generate_thumbnail, …) — imported directly
from ``utils.storage`` so this router stays self-contained.
"""

from __future__ import annotations

import logging
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict

from utils.storage import (
    UPLOAD_MAX_FILE_SIZE,
    UPLOAD_MAX_TOTAL_STORAGE,
    UPLOADS_DIR,
    auto_generate_thumbnail,
    format_size,
    get_total_storage_used,
)


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class PopupMessageCreate(BaseModel):
    title: str
    message_type: str                    # "text", "audio", "video"
    content: str = ""
    media_url: str = ""
    embed_code: str = ""
    target_users: List[str] = []
    is_active: bool = True
    button_text: str = ""
    button_url: str = ""
    thumbnail_url: str = ""


class PopupMessageUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = None
    message_type: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None
    embed_code: Optional[str] = None
    target_users: Optional[List[str]] = None
    is_active: Optional[bool] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_popups_router(
    db,
    get_admin_user: Callable,
    get_current_user: Callable,
    emergent_put: Callable[[str, bytes, str], bool],
    guess_mime: Callable[[str], str],
) -> APIRouter:
    router = APIRouter()

    # ---- ADMIN CRUD ---- #
    @router.post("/admin/popups")
    async def create_popup_message(
        popup: PopupMessageCreate,
        admin: dict = Depends(get_admin_user),
    ):
        """Create a new popup message (admin only)."""
        popup_doc = {
            "id":            str(uuid.uuid4()),
            "title":         popup.title,
            "message_type":  popup.message_type,
            "content":       popup.content,
            "media_url":     popup.media_url,
            "embed_code":    popup.embed_code,
            "target_users":  popup.target_users,
            "is_active":     popup.is_active,
            "button_text":   popup.button_text,
            "button_url":    popup.button_url,
            "thumbnail_url": popup.thumbnail_url,
            "created_by":    admin.get("username", "admin"),
            "created_at":    datetime.now(timezone.utc),
        }
        await db.popup_messages.insert_one(popup_doc)
        popup_doc.pop("_id", None)
        return popup_doc

    @router.get("/admin/popups")
    async def list_popup_messages(_admin: dict = Depends(get_admin_user)):
        """List all popup messages (admin only)."""
        return await db.popup_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

    @router.get("/admin/popups/stats")
    async def get_popup_stats(_admin: dict = Depends(get_admin_user)):
        """View/dismiss stats per popup message."""
        popups = await db.popup_messages.find(
            {}, {"_id": 0, "id": 1, "title": 1, "target_users": 1},
        ).to_list(500)
        total_clients = await db.users.count_documents({"role": "client"})
        stats = {}
        for p in popups:
            pid = p["id"]
            views = await db.popup_views.count_documents({"popup_id": pid})
            dismissals = await db.popup_dismissals.count_documents({"popup_id": pid})
            target_count = len(p.get("target_users", []))
            audience = target_count if target_count > 0 else total_clients
            stats[pid] = {
                "views":        views,
                "dismissals":   dismissals,
                "audience":     audience,
                "view_rate":    round((views / audience * 100), 1) if audience > 0 else 0,
                "dismiss_rate": round((dismissals / audience * 100), 1) if audience > 0 else 0,
            }
        return stats

    @router.get("/admin/popups/{popup_id}")
    async def get_popup_message(popup_id: str, _admin: dict = Depends(get_admin_user)):
        """Get a single popup message (admin only)."""
        popup = await db.popup_messages.find_one({"id": popup_id}, {"_id": 0})
        if not popup:
            raise HTTPException(status_code=404, detail="Messaggio popup non trovato")
        return popup

    @router.put("/admin/popups/{popup_id}")
    async def update_popup_message(
        popup_id: str,
        update: PopupMessageUpdate,
        _admin: dict = Depends(get_admin_user),
    ):
        """Update a popup message (admin only)."""
        existing = await db.popup_messages.find_one({"id": popup_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Messaggio popup non trovato")
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if update_data:
            await db.popup_messages.update_one({"id": popup_id}, {"$set": update_data})
        return await db.popup_messages.find_one({"id": popup_id}, {"_id": 0})

    @router.delete("/admin/popups/{popup_id}")
    async def delete_popup_message(popup_id: str, _admin: dict = Depends(get_admin_user)):
        """Delete a popup message (admin only). Cascades views + dismissals."""
        result = await db.popup_messages.delete_one({"id": popup_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Messaggio popup non trovato")
        await db.popup_dismissals.delete_many({"popup_id": popup_id})
        await db.popup_views.delete_many({"popup_id": popup_id})
        return {"message": "Messaggio popup eliminato con successo"}

    @router.post("/admin/popups/upload-media")
    async def upload_popup_media(
        file: UploadFile = File(...),
        _admin: dict = Depends(get_admin_user),
    ):
        """Upload media file for popup message (admin only)."""
        file_ext = Path(file.filename).suffix.lower()
        allowed = [".mp3", ".wav", ".ogg", ".m4a", ".aac",
                   ".mp4", ".webm", ".mov", ".avi", ".mkv"]
        if file_ext not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo file non supportato. Estensioni permesse: {', '.join(allowed)}",
            )

        current_storage = get_total_storage_used()
        if current_storage >= UPLOAD_MAX_TOTAL_STORAGE:
            raise HTTPException(status_code=400, detail="Spazio di archiviazione esaurito.")

        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"popup_{unique_id}_{file.filename.replace(' ', '_')}"
        file_path = UPLOADS_DIR / safe_filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")

        file_size = file_path.stat().st_size
        if file_size > UPLOAD_MAX_FILE_SIZE:
            file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File troppo grande ({format_size(file_size)}). "
                    f"Max: {format_size(UPLOAD_MAX_FILE_SIZE)}"
                ),
            )

        file_url = f"/api/uploads/{safe_filename}"
        audio_exts = [".mp3", ".wav", ".ogg", ".m4a", ".aac"]
        file_type = "audio" if file_ext in audio_exts else "video"

        # Persist to Emergent Object Storage (survives container restarts)
        try:
            with open(file_path, "rb") as fh:
                emergent_put(safe_filename, fh.read(), guess_mime(safe_filename))
        except Exception as e:
            logging.warning(f"Emergent storage put failed for {safe_filename}: {e}")

        thumbnail_url = auto_generate_thumbnail(file_path, content_type=file_type) or ""

        return {
            "success":             True,
            "filename":            safe_filename,
            "original_filename":   file.filename,
            "file_type":           file_type,
            "url":                 file_url,
            "thumbnail_url":       thumbnail_url,
            "file_size_formatted": format_size(file_size),
        }

    # ---- MEMBER endpoints ---- #
    @router.get("/members/popups")
    async def get_member_popups(current_user: dict = Depends(get_current_user)):
        """Get active popup messages for the current user (skips dismissed + honours targeting)."""
        user_id = current_user["id"]
        dismissed = await db.popup_dismissals.find(
            {"user_id": user_id}, {"_id": 0, "popup_id": 1},
        ).to_list(1000)
        dismissed_ids = {d["popup_id"] for d in dismissed}

        popups = await db.popup_messages.find(
            {"is_active": True}, {"_id": 0},
        ).sort("created_at", -1).to_list(100)

        result = []
        for p in popups:
            if p["id"] in dismissed_ids:
                continue
            targets = p.get("target_users", [])
            if not targets or user_id in targets:
                result.append(p)
        return result

    @router.post("/members/popups/{popup_id}/view")
    async def record_popup_view(popup_id: str, current_user: dict = Depends(get_current_user)):
        """Record that a user has viewed a popup."""
        user_id = current_user["id"]
        existing = await db.popup_views.find_one({"user_id": user_id, "popup_id": popup_id})
        if not existing:
            await db.popup_views.insert_one({
                "user_id":   user_id,
                "popup_id":  popup_id,
                "viewed_at": datetime.now(timezone.utc),
            })
        return {"message": "View registrata"}

    @router.post("/members/popups/{popup_id}/dismiss")
    async def dismiss_popup(popup_id: str, current_user: dict = Depends(get_current_user)):
        """Dismiss a popup for the current user (don't show again)."""
        user_id = current_user["id"]
        existing = await db.popup_dismissals.find_one({"user_id": user_id, "popup_id": popup_id})
        if not existing:
            await db.popup_dismissals.insert_one({
                "user_id":      user_id,
                "popup_id":     popup_id,
                "dismissed_at": datetime.now(timezone.utc),
            })
        return {"message": "Popup dismissato"}

    return router
