"""
AmE variant card seeder · idempotent
====================================

Duplicates the RP source card, patches id/ipa/displayName/title, and
clears the audio slots (so ElevenLabs regenerates with the correct IPA
next time the Prof runs the batch runner). All auto-flags that would
overwrite manual content (hotspots_locked, lexicon_locked,
pronunciation_locked, mnemonic_locked) are RESET to False on the clone
so the Prof can re-generate derived data from the new IPA.

Cards created (idempotent — skips if the target id already exists):

    /ɛ/  AmE DRESS            clone from e-dress   → epsilon-dress-ame
    /ɑ/  AmE PALM/LOT         clone from a-palm    → ah-palm-ame
    /ɔ/  AmE THOUGHT/CLOTH    clone from o-thought → oh-thought-ame
    /ɝ/  AmE NURSE            clone from er-nurse  → er-nurse-ame
    /ɚ/  AmE letter           clone from schwa     → schwar-letter-ame
    /oʊ/ AmE GOAT             clone from ou-goat   → ou-goat-ame
    /i/  AmE FLEECE           clone from i-fleece  → i-fleece-ame
    /u/  AmE GOOSE            clone from u-goose   → u-goose-ame

Two entry points:

  1. Backend startup (production auto-migration):
     `from scripts.create_ame_variant_cards import ensure_ame_variant_cards`
     `await ensure_ame_variant_cards(db)` — called from ensure_phoneme_seed().

  2. Manual CLI:
     `python3 scripts/create_ame_variant_cards.py` — for local one-off runs.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))


# (source_rp_id, new_id, new_ipa, new_display, new_title)
AME_VARIANTS = [
    ("e-dress",   "epsilon-dress-ame", "ɛ",   "DRESS (AmE)",         "DRESS (AmE) · /ɛ/"),
    ("a-palm",    "ah-palm-ame",       "ɑ",   "PALM/LOT (AmE)",      "PALM/LOT (AmE) · /ɑ/"),
    ("o-thought", "oh-thought-ame",    "ɔ",   "THOUGHT/CLOTH (AmE)", "THOUGHT/CLOTH (AmE) · /ɔ/"),
    ("er-nurse",  "er-nurse-ame",      "ɝ",   "NURSE (AmE)",         "NURSE (AmE) · /ɝ/"),
    ("schwa",     "schwar-letter-ame", "ɚ",   "letter (AmE r-schwa)","letter (AmE) · /ɚ/"),
    ("ou-goat",   "ou-goat-ame",       "oʊ",  "GOAT (AmE)",          "GOAT (AmE) · /oʊ/"),
    ("i-fleece",  "i-fleece-ame",      "i",   "FLEECE (AmE)",        "FLEECE (AmE) · /i/"),
    ("u-goose",   "u-goose-ame",       "u",   "GOOSE (AmE)",         "GOOSE (AmE) · /u/"),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip_audio(doc: dict) -> dict:
    """Zero out every audio slot so the cloned card doesn't inherit the
    RP-flavored recordings — those would pronounce the wrong sound."""
    d = dict(doc)
    audio = dict(d.get("audio") or {})
    for dial in ("AmE", "RP"):
        entry = dict(audio.get(dial) or {})
        entry["isolated"] = ""
        entry["examples"] = [""] * len(entry.get("examples") or [])
        audio[dial] = entry
    d["audio"] = audio
    mn = dict(d.get("mnemonic") or {})
    mn["audio"] = ""
    mn["audioAmE"] = ""
    mn["audioRP"] = ""
    d["mnemonic"] = mn
    common = [dict(w) for w in (d.get("commonWords") or [])]
    for w in common:
        w["audioAmE"] = ""
        w["audioRP"]  = ""
        w["audio"]    = ""
    d["commonWords"] = common
    return d


def _reset_locks(doc: dict) -> dict:
    d = dict(doc)
    for k in ("hotspots_locked", "lexicon_locked",
              "pronunciation_locked", "mnemonic_locked"):
        d[k] = False
    return d


async def ensure_ame_variant_cards(db) -> Dict[str, List[str]]:
    """
    Idempotent seed of the 8 AmE-specific phoneme cards.

    Called from ensure_phoneme_seed() on backend startup. Safe to run
    on every boot: cards that already exist are left untouched, and no
    audio URLs are ever overwritten. Missing source cards are skipped
    (logged) — the RP seed must run first (guaranteed by call order in
    ensure_phoneme_seed).

    Returns {"created": [...ids...], "skipped": [...ids...], "missing_src": [...src_ids...]}
    for structured logging by the caller.
    """
    coll = db["phoneme_cards"]
    created: List[str] = []
    skipped: List[str] = []
    missing_src: List[str] = []

    for src_id, new_id, new_ipa, new_disp, new_title in AME_VARIANTS:
        if await coll.find_one({"id": new_id}, {"_id": 0, "id": 1}):
            skipped.append(new_id)
            continue
        src = await coll.find_one({"id": src_id}, {"_id": 0})
        if not src:
            missing_src.append(src_id)
            continue
        clone = _strip_audio(_reset_locks(src))
        clone["id"]          = new_id
        clone["dialects"]    = ["AmE"]     # tag AmE-only so admin dialect tab (iter 41) filters correctly
        clone["ipa"]         = new_ipa
        clone["displayName"] = new_disp
        clone["title"]       = new_title
        clone["published"]   = False       # draft until the Prof reviews
        clone["order"]       = int(src.get("order", 100)) + 100
        clone["createdAt"]   = _now_iso()
        clone["updatedAt"]   = _now_iso()
        clone["createdBy"]   = "migration:create_ame_variant_cards"
        clone["updatedBy"]   = "migration:create_ame_variant_cards"
        await coll.insert_one(clone)
        created.append(new_id)

    return {"created": created, "skipped": skipped, "missing_src": missing_src}


async def _main_cli() -> None:
    """Entry point when invoked as `python3 scripts/create_ame_variant_cards.py`."""
    from dotenv import load_dotenv  # noqa: WPS433
    from motor.motor_asyncio import AsyncIOMotorClient  # noqa: WPS433

    load_dotenv(Path(__file__).parent.parent / ".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    result = await ensure_ame_variant_cards(db)

    for cid in result["created"]:
        print(f"  ✅ created · {cid}")
    for cid in result["skipped"]:
        print(f"  ⏭  skip    · {cid} (already exists)")
    for src in result["missing_src"]:
        print(f"  ⚠  missing source · {src}")
    print()
    print(
        f"Summary: created={len(result['created'])} · "
        f"skipped={len(result['skipped'])} · "
        f"missing_src={len(result['missing_src'])}"
    )
    client.close()


if __name__ == "__main__":
    asyncio.run(_main_cli())
