"""
One-time backfill (iter 42) — populate ``highlights`` on existing
exampleSentences without regenerating the sentences themselves.

Rationale
---------
The iter 41 fix to ``_es()`` computes highlights deterministically from
``commonWords`` at draft time, but every card whose sentences were already
in the DB before that fix landed still carries plain ``{"text": "..."}``
dicts without a ``highlights`` field → the public card page renders them
as flat white text.

This script backfills those existing rows in-place, using the exact
tokenisation from ``_es()`` (see phoneme_cards.py lines 2492-2531):

    tokens = re.sub(r"[^\w']+$", "", t.lower()) for t in text.split()
    highlights = [t for t in tokens if t in commonWords]

Idempotent: cards whose sentences ALL already have a non-empty
``highlights`` list are skipped completely (no DB write). No LLM calls.
Original ``text`` is preserved verbatim.

Usage
-----
    cd /app/backend
    python3 scripts/backfill_es_highlights.py
"""
import asyncio
import os
import re
import sys
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))


def _compute_highlights(text: str, common_words: List[str]) -> List[str]:
    """Mirror of the tokeniser inside phoneme_cards.py::_es()."""
    if not text or not common_words:
        return []
    tokens = [re.sub(r"[^\w']+$", "", t.lower()) for t in text.split()]
    return [t for t in tokens if t in common_words]


def _sentence_needs_highlights(s: Dict) -> bool:
    """A sentence needs backfill if it lacks a non-empty highlights list."""
    return not (isinstance(s, dict) and s.get("highlights"))


async def _run() -> None:
    from dotenv import load_dotenv  # noqa: WPS433
    from motor.motor_asyncio import AsyncIOMotorClient  # noqa: WPS433

    load_dotenv(Path(__file__).parent.parent / ".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    touched = 0
    skipped = 0
    empty = 0

    async for doc in db.phoneme_cards.find(
        {},
        {"_id": 0, "id": 1, "exampleSentences": 1, "commonWords": 1},
    ):
        es_raw = doc.get("exampleSentences") or []
        if not es_raw:
            empty += 1
            continue

        # If every sentence already has non-empty highlights, skip entirely.
        needs_any = any(_sentence_needs_highlights(s) for s in es_raw)
        if not needs_any:
            skipped += 1
            continue

        common_words = [
            (w or {}).get("w", "").lower().strip()
            for w in (doc.get("commonWords") or [])
            if isinstance(w, dict) and (w or {}).get("w")
        ]

        new_es: List[Dict] = []
        for s in es_raw:
            # Support both plain-string legacy shape and dict shape.
            if isinstance(s, str):
                text = s
                hl_existing = None
            elif isinstance(s, dict):
                text = s.get("text", "")
                hl_existing = s.get("highlights")
            else:
                continue

            if hl_existing:
                # Sentence already has highlights → preserve as-is.
                new_es.append({**(s if isinstance(s, dict) else {"text": text}),
                               "text": text,
                               "highlights": hl_existing})
            else:
                new_es.append({
                    **(s if isinstance(s, dict) else {}),
                    "text": text,
                    "highlights": _compute_highlights(text, common_words),
                })

        await db.phoneme_cards.update_one(
            {"id": doc["id"]},
            {"$set": {"exampleSentences": new_es}},
        )
        touched += 1
        added = sum(len(s.get("highlights") or []) for s in new_es)
        print(f"  ✅ {doc['id']:<24} · {len(new_es)} sentences · {added} highlights computed")

    print()
    print(f"Backfill complete. touched={touched} · already-ok={skipped} · empty-es={empty}")
    client.close()


if __name__ == "__main__":
    asyncio.run(_run())
