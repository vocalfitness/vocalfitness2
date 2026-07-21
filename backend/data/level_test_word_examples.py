"""Level Test — "audio-da-imitare" (word-example) canonical store.

M2.3 · Passo 2 (STRUTTURA ONLY — nessuna generazione ElevenLabs qui).

The Level Test shows an RP phoneme card and asks the user to IMITATE the target
WORD (not the abstract IPA). The reference clip is the Prof. pronouncing the WORD
("law"/"bird"/"cat"), one clip per DIALECT (RP + US), stored as the SINGLE SOURCE
OF TRUTH on the phoneme card itself — a NEW field ``audio.{dialect}.wordExample``
living alongside the existing isolated-phoneme clips, so lessons can reuse it too.

Each slot carries a dialect-specific ``ipa`` hint: the future admin generation
step will wrap the word in SSML ``<phoneme ph="…">`` so ONE cloned voice produces
a non-rhotic RP "bird" (bɜːd) vs an r-coloured US "bird" (bɝd) — they MUST sound
perceptibly different.

Slots start EMPTY (``url: ""``) → state "da_generare". Generation is a SEPARATE
milestone, executed only on explicit admin action.
"""
from __future__ import annotations

# Canonical mapping: (phoneme, dialect) → the card that carries that dialect,
# the WORD to say, and the dialect-specific IPA used for SSML at generation time.
LEVEL_TEST_WORD_EXAMPLES = [
    {"phoneme": "ɔː", "label": "LAW",  "word": "law",  "dialect": "RP",  "card_id": "o-thought",      "ipa": "lɔː"},
    {"phoneme": "ɔː", "label": "LAW",  "word": "law",  "dialect": "AmE", "card_id": "oh-thought-ame", "ipa": "lɔ"},
    {"phoneme": "ɜː", "label": "BIRD", "word": "bird", "dialect": "RP",  "card_id": "er-nurse",       "ipa": "bɜːd"},
    {"phoneme": "ɜː", "label": "BIRD", "word": "bird", "dialect": "AmE", "card_id": "er-nurse-ame",   "ipa": "bɝd"},
    {"phoneme": "æ",  "label": "TRAP", "word": "cat",  "dialect": "RP",  "card_id": "ae-trap",        "ipa": "kæt"},
    {"phoneme": "æ",  "label": "TRAP", "word": "cat",  "dialect": "AmE", "card_id": "ae-trap",        "ipa": "kæt"},
]


async def ensure_level_test_word_example_slots(db) -> dict:
    """Idempotent: ensure each of the 6 word-example slots exists on its card
    under ``audio.{dialect}.wordExample`` = {word, ipa, url}. Refreshes word/ipa
    (copy may be edited) but NEVER clobbers a populated ``url`` (a generated
    clip). Slots on cards that don't exist yet are reported as ``missing_card``."""
    created, refreshed, missing = 0, 0, []
    for slot in LEVEL_TEST_WORD_EXAMPLES:
        card = await db.phoneme_cards.find_one(
            {"id": slot["card_id"]}, {"_id": 0, "audio": 1}
        )
        if not card:
            missing.append(slot["card_id"])
            continue
        path = f"audio.{slot['dialect']}.wordExample"
        existing = ((card.get("audio") or {}).get(slot["dialect"]) or {}).get("wordExample") or {}
        url = existing.get("url", "")  # preserve any already-generated clip
        await db.phoneme_cards.update_one(
            {"id": slot["card_id"]},
            {"$set": {path: {"word": slot["word"], "ipa": slot["ipa"], "url": url}}},
        )
        if existing:
            refreshed += 1
        else:
            created += 1
    return {"created": created, "refreshed": refreshed, "missing_card": missing}


async def get_word_example_slots(db) -> list:
    """Resolver — the 6 slots with their live state, read from the canonical
    card store (single source of truth). ``state`` ∈ {ready, da_generare}."""
    out = []
    for slot in LEVEL_TEST_WORD_EXAMPLES:
        card = await db.phoneme_cards.find_one(
            {"id": slot["card_id"]}, {"_id": 0, "audio": 1}
        )
        we = {}
        if card:
            we = ((card.get("audio") or {}).get(slot["dialect"]) or {}).get("wordExample") or {}
        url = we.get("url", "")
        out.append({
            "phoneme": slot["phoneme"], "label": slot["label"], "word": slot["word"],
            "dialect": slot["dialect"], "card_id": slot["card_id"], "ipa": slot["ipa"],
            "url": url, "state": "ready" if url else "da_generare",
        })
    return out
