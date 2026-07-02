"""
Uploads — file upload / delete / serve router.

Endpoints:

* ``POST   /admin/upload``                       — main file upload (video,
  audio, PDF, image). Enforces per-file + total-storage caps, saves to
  ``UPLOADS_DIR`` and mirrors to Emergent Object Storage. Auto-generates a
  thumbnail for videos and PDFs (YouTube URL support lives in the
  URL-thumbnail endpoint below).
* ``DELETE /admin/upload/{filename}``            — remove a single file
  with path-traversal protection.
* ``POST   /admin/thumbnail/upload``             — upload a custom
  thumbnail image, auto-resized to 480px.
* ``POST   /admin/thumbnail/generate-from-url``  — return the YouTube /
  Google-Drive derived thumbnail URL without touching disk.
* ``GET    /admin/storage/stats``                — dashboard usage stats.
* ``GET    /uploads/{file_path:path}``           — public file serve with
  Emergent-storage fallback (writes back on hit for next-request speed).

All ``/admin/*`` endpoints require the shared ``get_admin_user`` dependency
injected via the factory.
"""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from PIL import Image
from pydantic import BaseModel

from utils.storage import (
    ALLOWED_EXTENSIONS,
    THUMBNAILS_DIR,
    UPLOAD_MAX_FILE_SIZE,
    UPLOAD_MAX_TOTAL_STORAGE,
    UPLOADS_DIR,
    auto_generate_thumbnail,
    format_size,
    get_total_storage_used,
    get_youtube_thumbnail,
)

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class ThumbnailFromURLRequest(BaseModel):
    url: str
    content_type: str = ""


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_uploads_router(
    get_admin_user: Callable,
    emergent_put: Callable[[str, bytes, str], bool],
    emergent_get: Callable[[str], Optional[tuple]],
    guess_mime: Callable[[str], str],
) -> APIRouter:
    """Assemble the uploads APIRouter.

    Parameters
    ----------
    get_admin_user:
        Shared FastAPI dependency (role == "admin").
    emergent_put / emergent_get / guess_mime:
        The three ``storage_helper`` callables (kept out of this module to
        avoid a hard dependency on ``server.py`` internals).
    """

    router = APIRouter()

    # ---- storage stats --------------------------------------------------- #
    @router.get("/admin/storage/stats")
    async def get_storage_stats(_admin: dict = Depends(get_admin_user)):
        """Get storage statistics (admin only)."""
        total_used = get_total_storage_used()
        file_count = len(list(UPLOADS_DIR.iterdir())) if UPLOADS_DIR.exists() else 0
        return {
            "total_used_bytes":       total_used,
            "total_used_formatted":   format_size(total_used),
            "max_storage_bytes":      UPLOAD_MAX_TOTAL_STORAGE,
            "max_storage_formatted":  format_size(UPLOAD_MAX_TOTAL_STORAGE),
            "usage_percentage":       round((total_used / UPLOAD_MAX_TOTAL_STORAGE) * 100, 1),
            "remaining_bytes":        UPLOAD_MAX_TOTAL_STORAGE - total_used,
            "remaining_formatted":    format_size(UPLOAD_MAX_TOTAL_STORAGE - total_used),
            "file_count":             file_count,
            "max_file_size_bytes":    UPLOAD_MAX_FILE_SIZE,
            "max_file_size_formatted": format_size(UPLOAD_MAX_FILE_SIZE),
        }

    # ---- upload file ----------------------------------------------------- #
    @router.post("/admin/upload")
    async def upload_file(
        file: UploadFile = File(...),
        _admin: dict = Depends(get_admin_user),
    ):
        """Upload a file for member content (admin only)."""
        # Check total storage before upload
        current_storage = get_total_storage_used()
        if current_storage >= UPLOAD_MAX_TOTAL_STORAGE:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Spazio di archiviazione esaurito. "
                    f"Usati: {format_size(current_storage)} / {format_size(UPLOAD_MAX_TOTAL_STORAGE)}. "
                    f"Elimina alcuni file prima di caricarne altri."
                ),
            )

        file_ext = Path(file.filename).suffix.lower()
        file_type = None
        for ftype, extensions in ALLOWED_EXTENSIONS.items():
            if file_ext in extensions:
                file_type = ftype
                break
        if not file_type:
            allowed = [e for exts in ALLOWED_EXTENSIONS.values() for e in exts]
            raise HTTPException(
                status_code=400,
                detail=f"Tipo file non supportato. Estensioni permesse: {', '.join(allowed)}",
            )

        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"{unique_id}_{file.filename.replace(' ', '_')}"
        file_path = UPLOADS_DIR / safe_filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore nel salvataggio del file: {str(e)}")

        file_size = file_path.stat().st_size
        if file_size > UPLOAD_MAX_FILE_SIZE:
            file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File troppo grande ({format_size(file_size)}). "
                    f"Massimo consentito: {format_size(UPLOAD_MAX_FILE_SIZE)}"
                ),
            )

        new_total = current_storage + file_size
        if new_total > UPLOAD_MAX_TOTAL_STORAGE:
            file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Upload rifiutato: supererebbe il limite di storage. "
                    f"Spazio rimanente: {format_size(UPLOAD_MAX_TOTAL_STORAGE - current_storage)}"
                ),
            )

        file_url = f"/api/uploads/{safe_filename}"

        # Mirror to Emergent Object Storage (survives container restarts)
        try:
            with open(file_path, "rb") as fh:
                emergent_put(safe_filename, fh.read(), guess_mime(safe_filename))
        except Exception as e:
            logger.warning(f"Emergent storage put failed for {safe_filename}: {e}")

        thumbnail_url = auto_generate_thumbnail(file_path, content_type=file_type)

        return {
            "success":            True,
            "filename":           safe_filename,
            "original_filename":  file.filename,
            "file_type":          file_type,
            "file_size":          file_size,
            "file_size_formatted": format_size(file_size),
            "url":                file_url,
            "thumbnail_url":      thumbnail_url or "",
            "storage_used":       format_size(new_total),
            "storage_remaining":  format_size(UPLOAD_MAX_TOTAL_STORAGE - new_total),
        }

    # ---- delete file ----------------------------------------------------- #
    @router.delete("/admin/upload/{filename}")
    async def delete_uploaded_file(filename: str, _admin: dict = Depends(get_admin_user)):
        """Delete an uploaded file (admin only)."""
        file_path = UPLOADS_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File non trovato")
        # Security check - prevent path traversal
        if file_path.resolve().parent != UPLOADS_DIR.resolve():
            raise HTTPException(status_code=400, detail="Percorso file non valido")
        try:
            file_path.unlink()
            return {"success": True, "message": "File eliminato con successo"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore nell'eliminazione: {str(e)}")

    # ---- upload custom thumbnail ---------------------------------------- #
    @router.post("/admin/thumbnail/upload")
    async def upload_custom_thumbnail(
        file: UploadFile = File(...),
        _admin: dict = Depends(get_admin_user),
    ):
        """Upload a custom thumbnail image (admin only)."""
        file_ext = Path(file.filename).suffix.lower()
        allowed_img = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
        if file_ext not in allowed_img:
            raise HTTPException(status_code=400, detail=f"Solo immagini: {', '.join(allowed_img)}")

        unique_id = str(uuid.uuid4())[:8]
        safe_name = f"thumb_custom_{unique_id}{file_ext}"
        thumb_path = THUMBNAILS_DIR / safe_name

        try:
            with open(thumb_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            # Resize to standard thumbnail size
            img = Image.open(thumb_path)
            img.thumbnail((480, 480), Image.LANCZOS)
            img.save(str(thumb_path), quality=85)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

        return {
            "success": True,
            "thumbnail_url": f"/api/uploads/thumbnails/{safe_name}",
        }

    # ---- thumbnail from URL --------------------------------------------- #
    @router.post("/admin/thumbnail/generate-from-url")
    async def generate_thumbnail_from_url(
        request: ThumbnailFromURLRequest,
        _admin: dict = Depends(get_admin_user),
    ):
        """Auto-generate a thumbnail from a URL (YouTube, Google Drive, …)."""
        import re
        url = request.url
        yt_thumb = get_youtube_thumbnail(url)
        if yt_thumb:
            return {"success": True, "thumbnail_url": yt_thumb}
        # Google Drive thumbnail
        drive_match = re.search(r"drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)", url)
        if drive_match:
            file_id = drive_match.group(1)
            return {
                "success": True,
                "thumbnail_url": f"https://drive.google.com/thumbnail?id={file_id}&sz=w480",
            }
        return {
            "success": False,
            "thumbnail_url": "",
            "message": "Nessuna anteprima disponibile per questo URL",
        }

    # ---- public serve (with Emergent-storage fallback) ------------------ #
    @router.get("/uploads/{file_path:path}")
    async def serve_uploaded_file(file_path: str):
        """Serve an uploaded file with persistent-storage fallback.

        Strategy:
          1. If present on local disk → ``FileResponse`` (sendfile, zero-copy).
          2. Else fetch from Emergent Object Storage and stream bytes back.
          3. On hit from storage, write a local copy back to
             ``/app/backend/uploads`` so subsequent requests are served
             from disk.
        """
        # Disallow path traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid path")

        local_path = UPLOADS_DIR / file_path
        if local_path.exists() and local_path.is_file():
            return FileResponse(str(local_path), media_type=guess_mime(local_path.name))

        # Local miss → fetch from Emergent storage
        obj = emergent_get(file_path)
        if obj is None:
            raise HTTPException(status_code=404, detail="File not found")
        data, content_type = obj

        # Best-effort: write back to local disk so next request is fast
        # (also handles subdirectory uploads like uploads/thumbnails/…)
        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(data)
        except Exception as e:
            logger.warning(f"Failed to cache fetched object locally: {e}")

        return Response(content=data, media_type=content_type or guess_mime(file_path))

    return router
