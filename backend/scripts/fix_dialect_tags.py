"""
One-time migration script (iter 42) — repair dialect tags on existing DB rows.

Rationale
---------
The AmE variant seeder (iter 36) originally cloned RP source cards without
overriding the ``dialects`` field, so both the RP source and the AmE
variant carried ``dialects: ["AmE", "RP"]``. Combined with the admin
dialect tabs added in iter 41, this made every phoneme appear **twice**
(once under 🇬🇧 RP, once under 🇺🇸 GenAm) — even though the AmE variant is
the correct instance for the GenAm student and the RP source is the
correct instance for the British student.

Fix
---
  • Every card whose ``id`` ends in ``-ame`` is AmE-only.
  • The 6 RP source cards that got split off (e-dress, er-nurse, o-lot,
    ou-goat, a-palm, o-thought) are RP-only.
  • Everything else keeps its existing scope.

Usage
-----
    cd /app/backend
    python3 scripts/fix_dialect_tags.py

Idempotent: safe to re-run — the ``$set`` operator overwrites the field
with the same value if it's already correct.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


async def _run() -> None:
    from dotenv import load_dotenv  # noqa: WPS433
    from motor.motor_asyncio import AsyncIOMotorClient  # noqa: WPS433

    load_dotenv(Path(__file__).parent.parent / ".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # AmE-only cards: id suffix "-ame"
    r_ame = await db.phoneme_cards.update_many(
        {"id": {"$regex": "-ame$"}},
        {"$set": {"dialects": ["AmE"]}},
    )
    print(
        f"  ✅ AmE cards tagged: matched={r_ame.matched_count} "
        f"modified={r_ame.modified_count}"
    )

    # RP-only cards: the 6 source cards that got split into an AmE variant.
    rp_only_ids = [
        "e-dress",     # → epsilon-dress-ame /ɛ/
        "er-nurse",    # → er-nurse-ame /ɝ/
        "o-lot",       # → ah-palm-ame /ɑ/ (LOT-PALM merger)
        "ou-goat",     # → ou-goat-ame /oʊ/
        "a-palm",      # → ah-palm-ame /ɑ/ (already covered by GenAm PALM)
        "o-thought",   # → oh-thought-ame /ɔ/
    ]
    r_rp = await db.phoneme_cards.update_many(
        {"id": {"$in": rp_only_ids}},
        {"$set": {"dialects": ["RP"]}},
    )
    print(
        f"  ✅ RP-only cards tagged: matched={r_rp.matched_count} "
        f"modified={r_rp.modified_count}"
    )

    print()
    print(f"Migration complete. Total rows touched: "
          f"{r_ame.modified_count + r_rp.modified_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(_run())
