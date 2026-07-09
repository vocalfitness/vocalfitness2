"""
One-shot migration · Create 7 AmE-specific phoneme cards
========================================================

Duplicates the RP source card, patches id/ipa/displayName/title, and
clears the audio slots (so ElevenLabs regenerates with the correct IPA
next time the Prof runs the batch runner). All auto-flags that would
overwrite manual content (hotspots_locked, lexicon_locked,
pronunciation_locked, mnemonic_locked) are RESET to False on the clone
so the Prof can re-generate derived data from the new IPA.

Cards created (idempotent — skips if the target id already exists):

    /ɑ/  AmE PALM/LOT       clone from a-palm   → ah-palm-ame
    /ɔ/  AmE THOUGHT/CLOTH  clone from o-thought → oh-thought-ame
    /ɝ/  AmE NURSE          clone from er-nurse  → er-nurse-ame
    /ɚ/  AmE letter         clone from schwa     → schwar-letter-ame
    /oʊ/ AmE GOAT           clone from ou-goat   → ou-goat-ame
    /i/  AmE FLEECE         clone from i-fleece  → i-fleece-ame
    /u/  AmE GOOSE          clone from u-goose   → u-goose-ame

Run:  python3 scripts/create_ame_variant_cards.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


AME_VARIANTS = [
    # (source_rp_id, new_id, new_ipa, new_display, new_title)
    ("a-palm",    "ah-palm-ame",       "ɑ",   "PALM/LOT (AmE)",    "PALM/LOT (AmE) · /ɑ/"),
    ("o-thought", "oh-thought-ame",    "ɔ",   "THOUGHT/CLOTH (AmE)", "THOUGHT/CLOTH (AmE) · /ɔ/"),
    ("er-nurse",  "er-nurse-ame",      "ɝ",   "NURSE (AmE)",       "NURSE (AmE) · /ɝ/"),
    ("schwa",     "schwar-letter-ame", "ɚ",   "letter (AmE r-schwa)", "letter (AmE) · /ɚ/"),
    ("ou-goat",   "ou-goat-ame",       "oʊ",  "GOAT (AmE)",        "GOAT (AmE) · /oʊ/"),
    ("i-fleece",  "i-fleece-ame",      "i",   "FLEECE (AmE)",      "FLEECE (AmE) · /i/"),
    ("u-goose",   "u-goose-ame",       "u",   "GOOSE (AmE)",       "GOOSE (AmE) · /u/"),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_audio(doc: dict) -> dict:
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
    d["mnemonic"] = mn
    common = [dict(w) for w in (d.get("commonWords") or [])]
    for w in common:
        w["audioAmE"] = ""
        w["audioRP"]  = ""
        w["audio"]    = ""
    d["commonWords"] = common
    return d


def reset_locks(doc: dict) -> dict:
    d = dict(doc)
    for k in ("hotspots_locked", "lexicon_locked",
              "pronunciation_locked", "mnemonic_locked"):
        d[k] = False
    return d


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    coll = db["phoneme_cards"]

    created, skipped, missing_src = 0, 0, 0
    for src_id, new_id, new_ipa, new_disp, new_title in AME_VARIANTS:
        if await coll.find_one({"id": new_id}, {"_id": 0, "id": 1}):
            print(f"  ⏭  skip · {new_id} exists")
            skipped += 1
            continue
        src = await coll.find_one({"id": src_id}, {"_id": 0})
        if not src:
            print(f"  ⚠  source card '{src_id}' NOT FOUND — skipping")
            missing_src += 1
            continue
        clone = strip_audio(reset_locks(src))
        clone["id"]          = new_id
        clone["ipa"]         = new_ipa
        clone["displayName"] = new_disp
        clone["title"]       = new_title
        clone["published"]   = False       # draft until the Prof reviews
        clone["order"]       = int(src.get("order", 100)) + 100
        clone["createdAt"]   = now_iso()
        clone["updatedAt"]   = now_iso()
        clone["createdBy"]   = "migration:create_ame_variant_cards"
        clone["updatedBy"]   = "migration:create_ame_variant_cards"
        await coll.insert_one(clone)
        print(f"  ✅ created · {new_id} (IPA /{new_ipa}/) ← cloned from {src_id}")
        created += 1

    print()
    print(f"Summary: created={created} · skipped={skipped} · missing_src={missing_src}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
