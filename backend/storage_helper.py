"""
Emergent Object Storage helper for VocalFitness.

Persistent file storage that survives container restarts/redeploys.
Used as a backup-source for /api/uploads/{filename} static files:
  - On upload: write to BOTH local disk (fast serve) AND Emergent storage (persistent)
  - On download: try local disk first, fallback to fetching from Emergent storage

This avoids any DB migration: existing URLs (/api/uploads/<safe_filename>) keep working.
"""
import os
import logging
import requests
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "vocalfitness"

_storage_key: Optional[str] = None


def _emergent_key() -> Optional[str]:
    return os.environ.get("EMERGENT_LLM_KEY")


def init_storage() -> Optional[str]:
    """Initialize the storage session. Returns a reusable storage_key.

    Safe to call multiple times — caches the key after first success.
    Returns None if EMERGENT_LLM_KEY is missing or init fails.
    """
    global _storage_key
    if _storage_key:
        return _storage_key
    key = _emergent_key()
    if not key:
        logger.warning("EMERGENT_LLM_KEY not set — Emergent Object Storage disabled.")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": key},
            timeout=30,
        )
        resp.raise_for_status()
        _storage_key = resp.json().get("storage_key")
        logger.info("Emergent Object Storage initialized.")
        return _storage_key
    except Exception as e:
        logger.error(f"Emergent storage init failed: {e}")
        return None


def _reset_key():
    global _storage_key
    _storage_key = None


def _path_for(filename: str) -> str:
    """Build a stable, app-prefixed path. No leading slash."""
    return f"{APP_NAME}/uploads/{filename.lstrip('/')}"


def put_object(filename: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
    """Upload bytes to Emergent storage at vocalfitness/uploads/<filename>.
    Returns True on success, False on failure (so callers can decide to continue).
    """
    key = init_storage()
    if not key:
        return False
    path = _path_for(filename)
    for attempt in range(2):
        try:
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data,
                timeout=180,
            )
            if resp.status_code == 403 and attempt == 0:
                # storage_key expired — refresh and retry once
                _reset_key()
                key = init_storage()
                if not key:
                    return False
                continue
            if resp.status_code == 409:
                # Object already exists at that path — treat as success (idempotent)
                logger.info(f"Object {path} already exists (409) — keeping existing.")
                return True
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"put_object failed for {path}: {e}")
            return False
    return False


def get_object(filename: str) -> Optional[Tuple[bytes, str]]:
    """Fetch (bytes, content_type) from Emergent storage by filename.
    Returns None if not found or storage unavailable.
    """
    key = init_storage()
    if not key:
        return None
    path = _path_for(filename)
    for attempt in range(2):
        try:
            resp = requests.get(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key},
                timeout=120,
            )
            if resp.status_code == 403 and attempt == 0:
                _reset_key()
                key = init_storage()
                if not key:
                    return None
                continue
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
        except Exception as e:
            logger.error(f"get_object failed for {path}: {e}")
            return None
    return None


_EXT_MIME = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
    "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
    "avi": "video/x-msvideo", "mkv": "video/x-matroska",
    "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
    "m4a": "audio/mp4", "aac": "audio/aac",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "zip": "application/zip", "json": "application/json",
    "csv": "text/csv", "txt": "text/plain", "md": "text/markdown",
}


def guess_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _EXT_MIME.get(ext, "application/octet-stream")
