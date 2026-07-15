"""
exampleSentences highlights backfill (iter 42) — safe to run on every boot.

Both a callable ``ensure_es_highlights_backfill(db)`` for backend startup
and a CLI entry point for manual runs.

The function walks every phoneme card, and for any card whose
``exampleSentences`` contain a sentence lacking a non-empty ``highlights``
list, recomputes the highlights deterministically from ``commonWords``
(same tokeniser used by the live ``_es()`` drafter).

Idempotent: cards where every sentence already has non-empty highlights
are skipped without any DB write. No LLM calls.
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


def _sentence_needs_highlights(s) -> bool:
    return not (isinstance(s, dict) and s.get("highlights"))


async def ensure_es_highlights_backfill(db) -> Dict[str, int]:
    """Idempotent backfill of exampleSentences.highlights on every card.

    Returns {"touched": N, "skipped": N, "empty": N} so the caller can
    log the delta on each boot. On a fully-backfilled DB touched=0.
    """
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

        common_words = [
            (w or {}).get("w", "").lower().strip()
            for w in (doc.get("commonWords") or [])
            if isinstance(w, dict) and (w or {}).get("w")
        ]

        # Compute the target shape once, then diff. This lets us skip
        # writes when either (a) every sentence already carries the
        # correct highlights list, or (b) the recomputed highlights
        # happen to match the existing (possibly empty) value — which is
        # legitimate when the LLM sentence text simply doesn't overlap
        # with the top-N commonWords for that phoneme.
        target: List[Dict] = []
        changed = False
        for s in es_raw:
            if isinstance(s, str):
                text, hl_existing = s, None
                base: Dict = {}
            elif isinstance(s, dict):
                text = s.get("text", "")
                hl_existing = s.get("highlights")
                base = dict(s)
            else:
                continue

            # If highlights key already present (even if empty), we don't
            # overwrite — the drafter is the source of truth once it has
            # run for that sentence. Only backfill sentences with a
            # completely missing highlights key.
            if hl_existing is None:
                computed = _compute_highlights(text, common_words)
                target.append({**base, "text": text, "highlights": computed})
                changed = True
            else:
                target.append({**base, "text": text, "highlights": hl_existing})

        if not changed:
            skipped += 1
            continue

        await db.phoneme_cards.update_one(
            {"id": doc["id"]},
            {"$set": {"exampleSentences": target}},
        )
        touched += 1

    return {"touched": touched, "skipped": skipped, "empty": empty}


async def _main_cli() -> None:
    from dotenv import load_dotenv  # noqa: WPS433
    from motor.motor_asyncio import AsyncIOMotorClient  # noqa: WPS433

    load_dotenv(Path(__file__).parent.parent / ".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    result = await ensure_es_highlights_backfill(db)
    print(
        f"Backfill complete. "
        f"touched={result['touched']} · "
        f"already-ok={result['skipped']} · "
        f"empty-es={result['empty']}"
    )
    client.close()


if __name__ == "__main__":
    asyncio.run(_main_cli())
