"""
Dialect-tag repair migration (iter 42) — safe to run on every backend boot.

Both a callable ``ensure_dialect_tags(db)`` (invoked from
``ensure_phoneme_seed`` at startup) and a CLI entry point
(``python3 scripts/fix_dialect_tags.py``) for manual runs.

See the top-of-file docstring in the original one-shot for the rationale.
Idempotent: ``$set`` overwrites with the same value if already correct;
we still return a structured summary so the caller can log the delta.
"""
import asyncio
import os
import sys
from pathlib import Path
from typing import Dict

sys.path.insert(0, str(Path(__file__).parent.parent))


# RP-only cards: the source cards that got split into an AmE variant.
# Keeping the list here (not in phoneme_cards.py) so the migration can be
# read/updated without touching the main router file.
_RP_ONLY_IDS = [
    "e-dress",     # → epsilon-dress-ame /ɛ/
    "er-nurse",    # → er-nurse-ame /ɝ/
    "o-lot",       # → ah-palm-ame /ɑ/ (LOT-PALM merger)
    "ou-goat",     # → ou-goat-ame /oʊ/
    "a-palm",      # → ah-palm-ame /ɑ/
    "o-thought",   # → oh-thought-ame /ɔ/
]


async def ensure_dialect_tags(db) -> Dict[str, int]:
    """Idempotent tag repair — call from backend startup.

    Returns {"ame_modified": N, "rp_modified": N} so the caller can log
    the delta on each boot. On a fully-migrated DB both values are 0.
    """
    r_ame = await db.phoneme_cards.update_many(
        {"id": {"$regex": "-ame$"}, "dialects": {"$ne": ["AmE"]}},
        {"$set": {"dialects": ["AmE"]}},
    )
    r_rp = await db.phoneme_cards.update_many(
        {"id": {"$in": _RP_ONLY_IDS}, "dialects": {"$ne": ["RP"]}},
        {"$set": {"dialects": ["RP"]}},
    )
    return {
        "ame_modified": r_ame.modified_count,
        "rp_modified":  r_rp.modified_count,
    }


async def _main_cli() -> None:
    from dotenv import load_dotenv  # noqa: WPS433
    from motor.motor_asyncio import AsyncIOMotorClient  # noqa: WPS433

    load_dotenv(Path(__file__).parent.parent / ".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    result = await ensure_dialect_tags(db)
    print(f"  ✅ AmE cards tagged: modified={result['ame_modified']}")
    print(f"  ✅ RP-only cards tagged: modified={result['rp_modified']}")
    print()
    print(f"Migration complete. Total rows touched: "
          f"{result['ame_modified'] + result['rp_modified']}")
    client.close()


if __name__ == "__main__":
    asyncio.run(_main_cli())
