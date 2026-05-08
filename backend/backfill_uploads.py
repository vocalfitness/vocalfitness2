"""
One-shot back-fill: push all existing files from /app/backend/uploads/ to
Emergent Object Storage so they survive future container restarts.

Run with:  cd /app/backend && python backfill_uploads.py
"""
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env so EMERGENT_LLM_KEY is available
load_dotenv(Path(__file__).parent / ".env")

from storage_helper import init_storage, put_object, guess_content_type

UPLOADS = Path(__file__).parent / "uploads"


def main() -> int:
    if not init_storage():
        print("ERROR: Could not initialize Emergent Object Storage. EMERGENT_LLM_KEY missing?", file=sys.stderr)
        return 1

    files = []
    for p in UPLOADS.rglob("*"):
        if p.is_file():
            rel = p.relative_to(UPLOADS).as_posix()
            files.append((rel, p))

    print(f"Found {len(files)} files to back-fill.")
    ok, fail = 0, 0
    for rel, p in files:
        size = p.stat().st_size
        try:
            data = p.read_bytes()
        except Exception as e:
            print(f"  [SKIP] {rel}  ({e})")
            fail += 1
            continue
        success = put_object(rel, data, guess_content_type(p.name))
        status = "OK  " if success else "FAIL"
        print(f"  [{status}] {rel}  ({size} B)")
        if success:
            ok += 1
        else:
            fail += 1

    print(f"\nDone. {ok} uploaded, {fail} failed.")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
