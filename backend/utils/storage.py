"""
Storage & thumbnail utilities.

Shared helpers used by:
  * ``routers/uploads.py``          — file upload endpoints
  * ``server.py`` (content, popup)  — content thumbnail regeneration,
                                       popup media upload, DB stats

All paths derive from ``ROOT_DIR`` (``backend/``) so this module remains
self-contained: no imports from ``server.py`` (which would cause a cycle).
"""

from __future__ import annotations

import logging
import re
import subprocess
from pathlib import Path
from typing import Optional

from pdf2image import convert_from_path

# --------------------------------------------------------------------------- #
# Paths & config
# --------------------------------------------------------------------------- #
# ``utils/storage.py`` → parent = utils → parent.parent = backend
ROOT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR    = ROOT_DIR / "uploads"
THUMBNAILS_DIR = UPLOADS_DIR / "thumbnails"
UPLOADS_DIR.mkdir(exist_ok=True)
THUMBNAILS_DIR.mkdir(exist_ok=True)

# File-type allowlist and size limits (per-file + total account).
ALLOWED_EXTENSIONS = {
    "video": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
    "audio": [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
    "pdf":   [".pdf"],
    "image": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
}
UPLOAD_MAX_FILE_SIZE     = 100 * 1024 * 1024        # 100MB per file
UPLOAD_MAX_TOTAL_STORAGE = 2 * 1024 * 1024 * 1024   # 2GB total

# Thumbnail target (width x height) — small enough for grid views.
THUMB_MAX_SIZE = (480, 360)


# --------------------------------------------------------------------------- #
# Storage size helpers
# --------------------------------------------------------------------------- #
def get_total_storage_used() -> int:
    """Total bytes across every top-level file in ``UPLOADS_DIR``."""
    total = 0
    if UPLOADS_DIR.exists():
        for f in UPLOADS_DIR.iterdir():
            if f.is_file():
                total += f.stat().st_size
    return total


def format_size(size_bytes: float) -> str:
    """Format bytes → human-readable string (e.g. ``1.4 GB``)."""
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# --------------------------------------------------------------------------- #
# Thumbnail generation
# --------------------------------------------------------------------------- #
def generate_video_thumbnail(video_path: Path) -> Optional[str]:
    """Extract a frame from a video at 1s using ffmpeg. Returns the
    ``/api/uploads/thumbnails/…`` URL or ``None`` on failure."""
    try:
        thumb_name = f"thumb_{video_path.stem}.jpg"
        thumb_path = THUMBNAILS_DIR / thumb_name
        result = subprocess.run(
            [
                "ffmpeg", "-i", str(video_path), "-ss", "00:00:01", "-vframes", "1",
                "-vf", f"scale={THUMB_MAX_SIZE[0]}:-1", "-q:v", "3", "-y", str(thumb_path),
            ],
            capture_output=True, timeout=15,
        )
        if result.returncode == 0 and thumb_path.exists() and thumb_path.stat().st_size > 0:
            return f"/api/uploads/thumbnails/{thumb_name}"
    except Exception as e:
        logging.warning(f"Video thumbnail generation failed: {e}")
    return None


def generate_pdf_thumbnail(pdf_path: Path) -> Optional[str]:
    """Generate a thumbnail from the first page of a PDF."""
    try:
        images = convert_from_path(str(pdf_path), first_page=1, last_page=1, size=THUMB_MAX_SIZE)
        if images:
            thumb_name = f"thumb_{pdf_path.stem}.jpg"
            thumb_path = THUMBNAILS_DIR / thumb_name
            images[0].save(str(thumb_path), "JPEG", quality=80)
            return f"/api/uploads/thumbnails/{thumb_name}"
    except Exception as e:
        logging.warning(f"PDF thumbnail generation failed: {e}")
    return None


_YT_PATTERNS = [
    r"(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)",
    r"(?:youtu\.be\/)([a-zA-Z0-9_-]+)",
    r"(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)",
    r"(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)",
    r"(?:youtube\.com\/live\/)([a-zA-Z0-9_-]+)",
    r"(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)",
]


def get_youtube_thumbnail(url: str) -> Optional[str]:
    """Return the ``hqdefault`` YouTube thumbnail for any known URL shape."""
    for pattern in _YT_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return f"https://img.youtube.com/vi/{match.group(1)}/hqdefault.jpg"
    return None


def auto_generate_thumbnail(
    file_path: Path,
    content_url: str = "",
    content_type: str = "",
) -> Optional[str]:
    """Dispatcher: pick the right thumbnail strategy (YouTube URL → video
    frame → PDF page) or return ``None`` if nothing applies."""
    if content_url:
        yt_thumb = get_youtube_thumbnail(content_url)
        if yt_thumb:
            return yt_thumb

    if not file_path or not file_path.exists():
        return None

    ext = file_path.suffix.lower()
    video_exts = [".mp4", ".webm", ".mov", ".avi", ".mkv"]
    pdf_exts   = [".pdf"]

    if ext in video_exts or content_type == "video":
        return generate_video_thumbnail(file_path)
    if ext in pdf_exts or content_type == "pdf":
        return generate_pdf_thumbnail(file_path)
    return None
