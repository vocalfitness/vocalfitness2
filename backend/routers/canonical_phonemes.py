"""Canonical Phoneme Inventory — Phase A of the phoneme system rebuild.

Provides the *locked, backend-owned* reference inventory that phoneme
cards should be linked to (rather than each card storing its own hand-typed
articulatory features).

Contents:
* ``ensure_canonical_seed(db)``   — idempotent seed of the ``canonical_phonemes``
  collection. Data is hard-coded below (source of truth) matching the two
  ``canonical_data/*.md`` files in this repo.
* ``GET /canonical/phonemes``     — public read; ``?dialect=GenAm|RP&kind=vowel|consonant|diphthong``
* ``GET /canonical/phonemes/{ipa}?dialect=`` — single lookup by IPA symbol

Design decisions
----------------
1. **Dialect is a first-class field, never "both"**. Where GenAm and RP
   share a phoneme with identical features (e.g. /iː/, /uː/), two separate
   rows exist — one per dialect. This lets Part 2/#1 of the brief hold:
   canonical inventory tables per-dialect, distinct entries where realizations
   differ (/ɒ/ vs /ɑː/, RP /ɜː/ vs GenAm /ɝ/, RP centring diphthongs).
2. **Frequency values are relative rank only** (``frequency_rank`` int).
   No fabricated percentages. Consumers rendering the frequency chart should
   show rank-based bar heights and MUST strip any superlative language
   ("most common", "rarest") from card copy until real corpus data lands.
3. **Consonants are shared inventory** — one identical row per dialect for
   each of the 24 English consonants. Realization/allophony differences
   (flapping, rhoticity, /l/ darkness, glottalling) live in
   ``dialect_notes`` array on affected entries.
4. **Height/backness/etc. use standard IPA controlled vocabulary**
   (Close / Near-close / Close-mid / Mid / Open-mid / Near-open / Open).
   These string literals are what the admin dropdowns must accept — do
   NOT free-type variants like "Near-high" (bug #4).
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException


# --------------------------------------------------------------------------- #
# CONTROLLED VOCABULARY — enforced by admin dropdowns
# --------------------------------------------------------------------------- #
HEIGHT_TERMS   = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"]
BACKNESS_TERMS = ["Front", "Central", "Back", "Central/Back", "Back (unrounded)"]
ROUNDING_TERMS = ["Unrounded", "Rounded", "Moderate", "Unrounded (r-colored)"]
TENSENESS_TERMS = ["Tense", "Lax", "Tense/Lax varies"]
MANNER_TERMS   = ["Plosive", "Affricate", "Fricative", "Nasal",
                  "Lateral approximant", "Approximant"]
PLACE_TERMS    = ["Bilabial", "Labiodental", "Dental", "Alveolar",
                  "Post-alveolar", "Palatal", "Velar", "Glottal", "Labial-velar"]
VOICING_TERMS  = ["Voiceless", "Voiced"]
# Facial muscle activation levels — strict enum used in phoneme card CMS.
ACTIVATION_TERMS = ["HIGH", "MODERATE", "LOW"]


# --------------------------------------------------------------------------- #
# SEED DATA — Vowels (per-dialect rows)
# --------------------------------------------------------------------------- #
_VOWEL_ROWS = [
    # ---- GenAm monophthongs ----
    {"ipa": "iː", "lexical_set": "FLEECE",  "height": "Close",     "backness": "Front",   "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long",   "frequency_rank": 1},
    {"ipa": "ɪ",  "lexical_set": "KIT",     "height": "Near-close","backness": "Front",   "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short",  "frequency_rank": 2},
    {"ipa": "ɛ",  "lexical_set": "DRESS",   "height": "Open-mid",  "backness": "Front",   "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short",  "frequency_rank": 5},
    {"ipa": "æ",  "lexical_set": "TRAP",    "height": "Near-open", "backness": "Front",   "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short (lengthens pre-voiced)", "frequency_rank": 4},
    {"ipa": "ʌ",  "lexical_set": "STRUT",   "height": "Open-mid",  "backness": "Back",    "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short",  "frequency_rank": 6},
    {"ipa": "ə",  "lexical_set": "SCHWA",   "height": "Mid",       "backness": "Central", "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Very short", "frequency_rank": 3},
    {"ipa": "ɚ",  "lexical_set": "NURSE-r", "height": "Mid",       "backness": "Central", "rounding": "Unrounded (r-colored)", "tenseness": "Tense/Lax varies", "duration": "Short–long", "frequency_rank": 7, "notes": "R-colored schwa — rhotic. Never mark 'near identical to RP /ɜː/'."},
    {"ipa": "ʊ",  "lexical_set": "FOOT",    "height": "Near-close","backness": "Back",    "rounding": "Moderate",  "tenseness": "Lax",   "duration": "Short",  "frequency_rank": 9},
    {"ipa": "uː", "lexical_set": "GOOSE",   "height": "Close",     "backness": "Back",    "rounding": "Rounded",   "tenseness": "Tense", "duration": "Long",   "frequency_rank": 8},
    {"ipa": "ɑː", "lexical_set": "PALM/LOT (merged)", "height": "Open", "backness": "Back", "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long", "frequency_rank": 10, "notes": "GenAm merges historical LOT into PALM (cot-caught merger affects THOUGHT further)."},
    {"ipa": "ɔː", "lexical_set": "THOUGHT (dialect-variable)", "height": "Open-mid", "backness": "Back", "rounding": "Rounded", "tenseness": "Tense", "duration": "Long", "frequency_rank": None, "notes": "Many GenAm speakers merge with /ɑː/ (cot-caught merger)."},
    # ---- GenAm diphthongs ----
    {"ipa": "eɪ", "lexical_set": "FACE",   "kind_hint": "diphthong", "frequency_rank": 11, "notes": "Mid front → near-close front (glide toward /ɪ/)."},
    {"ipa": "aɪ", "lexical_set": "PRICE",  "kind_hint": "diphthong", "frequency_rank": 12, "notes": "Open central → near-close front."},
    {"ipa": "ɔɪ", "lexical_set": "CHOICE", "kind_hint": "diphthong", "frequency_rank": 15, "notes": "Open-mid back rounded → near-close front (rarest diphthong)."},
    {"ipa": "aʊ", "lexical_set": "MOUTH",  "kind_hint": "diphthong", "frequency_rank": 14, "notes": "Open central → near-close back rounded."},
    {"ipa": "oʊ", "lexical_set": "GOAT",   "kind_hint": "diphthong", "frequency_rank": 13, "notes": "GenAm /oʊ/ starts back-rounded, glide to /ʊ/. RP cognate /əʊ/ starts central."},
]

# RP monophthongs — where they differ meaningfully from GenAm they get their own row.
_VOWEL_ROWS_RP = [
    {"ipa": "iː", "lexical_set": "FLEECE",  "height": "Close",     "backness": "Front",         "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long",  "frequency_rank": 1},
    {"ipa": "ɪ",  "lexical_set": "KIT",     "height": "Near-close","backness": "Front",         "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short", "frequency_rank": 2},
    {"ipa": "e",  "lexical_set": "DRESS",   "height": "Open-mid",  "backness": "Front",         "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short", "frequency_rank": 5, "notes": "RP DRESS is transcribed /e/ (not /ɛ/) — cardinal vowel realization."},
    {"ipa": "æ",  "lexical_set": "TRAP",    "height": "Near-open", "backness": "Front",         "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short", "frequency_rank": 6},
    {"ipa": "ʌ",  "lexical_set": "STRUT",   "height": "Open-mid",  "backness": "Central/Back",  "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Short", "frequency_rank": 7},
    {"ipa": "ə",  "lexical_set": "SCHWA",   "height": "Mid",       "backness": "Central",       "rounding": "Unrounded", "tenseness": "Lax",   "duration": "Very short", "frequency_rank": 3},
    {"ipa": "ɜː", "lexical_set": "NURSE",   "height": "Mid",       "backness": "Central",       "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long",  "frequency_rank": 4, "notes": "Pure non-rhotic long monophthong. Never mark identical to GenAm /ɝ/ — realizations differ."},
    {"ipa": "ʊ",  "lexical_set": "FOOT",    "height": "Near-close","backness": "Back",          "rounding": "Moderate",  "tenseness": "Lax",   "duration": "Short", "frequency_rank": 12},
    {"ipa": "uː", "lexical_set": "GOOSE",   "height": "Close",     "backness": "Back",          "rounding": "Rounded",   "tenseness": "Tense", "duration": "Long",  "frequency_rank": 11},
    {"ipa": "ɑː", "lexical_set": "PALM/START", "height": "Open",   "backness": "Back",          "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long",  "frequency_rank": 9},
    {"ipa": "ɒ",  "lexical_set": "LOT",     "height": "Open",      "backness": "Back",          "rounding": "Rounded",   "tenseness": "Lax",   "duration": "Short", "frequency_rank": 8, "notes": "Distinct from GenAm — RP keeps LOT/PALM split; GenAm merges them into /ɑː/."},
    {"ipa": "ɔː", "lexical_set": "THOUGHT/NORTH/FORCE", "height": "Open-mid", "backness": "Back", "rounding": "Rounded", "tenseness": "Tense", "duration": "Long", "frequency_rank": 10},
    # ---- RP diphthongs (closing) ----
    {"ipa": "eɪ", "lexical_set": "FACE",   "kind_hint": "diphthong", "frequency_rank": 11},
    {"ipa": "aɪ", "lexical_set": "PRICE",  "kind_hint": "diphthong", "frequency_rank": 12},
    {"ipa": "ɔɪ", "lexical_set": "CHOICE", "kind_hint": "diphthong", "frequency_rank": 15, "notes": "Rarest diphthong."},
    {"ipa": "aʊ", "lexical_set": "MOUTH",  "kind_hint": "diphthong", "frequency_rank": 14},
    {"ipa": "əʊ", "lexical_set": "GOAT",   "kind_hint": "diphthong", "frequency_rank": 13, "notes": "RP GOAT starts central (unlike GenAm /oʊ/ which starts back-rounded)."},
    # ---- RP centring diphthongs (no GenAm equivalent — GenAm uses rhotic sequences) ----
    {"ipa": "ɪə", "lexical_set": "NEAR",   "kind_hint": "diphthong", "frequency_rank": None, "notes": "RP-only: near-close front → schwa. GenAm equivalent is rhotic /ɪr/ (not a diphthong at all)."},
    {"ipa": "eə", "lexical_set": "SQUARE", "kind_hint": "diphthong", "frequency_rank": None, "notes": "RP-only: open-mid front → schwa. GenAm equivalent is rhotic /ɛr/."},
    {"ipa": "ʊə", "lexical_set": "CURE",   "kind_hint": "diphthong", "frequency_rank": None, "notes": "RP-only: near-close back → schwa. Increasingly merges with /ɔː/ in modern RP; GenAm equivalent is rhotic /ʊr/."},
]

# --------------------------------------------------------------------------- #
# SEED DATA — Consonants (shared inventory: 24 phonemes, identical fields per dialect)
# --------------------------------------------------------------------------- #
# ``dialect_notes`` captures realization differences (allophony) without
# creating separate rows — this matches Part 2 of the brief.
_CONSONANT_ROWS = [
    {"ipa": "p",  "example": "pie",         "manner": "Plosive",     "place": "Bilabial",       "voicing": "Voiceless", "frequency_rank": 15},
    {"ipa": "b",  "example": "buy",         "manner": "Plosive",     "place": "Bilabial",       "voicing": "Voiced",    "frequency_rank": 17},
    {"ipa": "t",  "example": "tie",         "manner": "Plosive",     "place": "Alveolar",       "voicing": "Voiceless", "frequency_rank": 2,
        "dialect_notes": {"GenAm": "Intervocalic /t/ frequently flapped to [ɾ] (butter, city).",
                          "RP":    "Retains [t]; glottal-stop [ʔ] common in informal RP/Estuary before consonants/word-finally."}},
    {"ipa": "d",  "example": "die",         "manner": "Plosive",     "place": "Alveolar",       "voicing": "Voiced",    "frequency_rank": 6},
    {"ipa": "k",  "example": "kite",        "manner": "Plosive",     "place": "Velar",          "voicing": "Voiceless", "frequency_rank": 8},
    {"ipa": "g",  "example": "guy",         "manner": "Plosive",     "place": "Velar",          "voicing": "Voiced",    "frequency_rank": 16},
    {"ipa": "tʃ", "example": "chip",        "manner": "Affricate",   "place": "Post-alveolar",  "voicing": "Voiceless", "frequency_rank": 21},
    {"ipa": "dʒ", "example": "gyp/judge",   "manner": "Affricate",   "place": "Post-alveolar",  "voicing": "Voiced",    "frequency_rank": 20},
    {"ipa": "f",  "example": "fine",        "manner": "Fricative",   "place": "Labiodental",    "voicing": "Voiceless", "frequency_rank": 11},
    {"ipa": "v",  "example": "vine",        "manner": "Fricative",   "place": "Labiodental",    "voicing": "Voiced",    "frequency_rank": 13},
    {"ipa": "θ",  "example": "thin",        "manner": "Fricative",   "place": "Dental",         "voicing": "Voiceless", "frequency_rank": 19, "notes": "Rare cross-linguistically; frequent English function-word use."},
    {"ipa": "ð",  "example": "this",        "manner": "Fricative",   "place": "Dental",         "voicing": "Voiced",    "frequency_rank": 4,  "notes": "High rank due to function words (the, this, that, there)."},
    {"ipa": "s",  "example": "sip",         "manner": "Fricative",   "place": "Alveolar",       "voicing": "Voiceless", "frequency_rank": 3},
    {"ipa": "z",  "example": "zip",         "manner": "Fricative",   "place": "Alveolar",       "voicing": "Voiced",    "frequency_rank": 9},
    {"ipa": "ʃ",  "example": "ship",        "manner": "Fricative",   "place": "Post-alveolar",  "voicing": "Voiceless", "frequency_rank": 18},
    {"ipa": "ʒ",  "example": "vision",      "manner": "Fricative",   "place": "Post-alveolar",  "voicing": "Voiced",    "frequency_rank": 24, "notes": "Rarest English consonant."},
    {"ipa": "h",  "example": "high",        "manner": "Fricative",   "place": "Glottal",        "voicing": "Voiceless", "frequency_rank": 10},
    {"ipa": "m",  "example": "my",          "manner": "Nasal",       "place": "Bilabial",       "voicing": "Voiced",    "frequency_rank": 5},
    {"ipa": "n",  "example": "nigh",        "manner": "Nasal",       "place": "Alveolar",       "voicing": "Voiced",    "frequency_rank": 1,  "notes": "Most frequent English consonant."},
    {"ipa": "ŋ",  "example": "sing",        "manner": "Nasal",       "place": "Velar",          "voicing": "Voiced",    "frequency_rank": 14},
    {"ipa": "l",  "example": "lie",         "manner": "Lateral approximant", "place": "Alveolar", "voicing": "Voiced",  "frequency_rank": 7,
        "dialect_notes": {"GenAm": "'Dark L' [ɫ] in most positions.",
                          "RP":    "Clear [l] syllable-initially, dark [ɫ] syllable-finally."}},
    {"ipa": "ɹ",  "example": "rye",         "manner": "Approximant", "place": "Post-alveolar",  "voicing": "Voiced",    "frequency_rank": 12,
        "dialect_notes": {"GenAm": "Rhotic: postvocalic /r/ always pronounced (START, NORTH, letter).",
                          "RP":    "Non-rhotic: postvocalic /r/ silent unless followed by a vowel."}},
    {"ipa": "j",  "example": "yes",         "manner": "Approximant", "place": "Palatal",        "voicing": "Voiced",    "frequency_rank": 22},
    {"ipa": "w",  "example": "wine",        "manner": "Approximant", "place": "Labial-velar",   "voicing": "Voiced",    "frequency_rank": 23},
]


def _build_seed_docs() -> list[dict]:
    """Materialise the full seed list — one row per (dialect, ipa) pair."""
    docs = []
    # Vowels
    for row in _VOWEL_ROWS:
        kind = row.get("kind_hint", "vowel")
        docs.append({**{k: v for k, v in row.items() if k != "kind_hint"},
                     "dialect": "GenAm", "kind": kind})
    for row in _VOWEL_ROWS_RP:
        kind = row.get("kind_hint", "vowel")
        docs.append({**{k: v for k, v in row.items() if k != "kind_hint"},
                     "dialect": "RP", "kind": kind})
    # Consonants: one identical row per dialect
    for row in _CONSONANT_ROWS:
        for dialect in ("GenAm", "RP"):
            docs.append({**row, "dialect": dialect, "kind": "consonant"})
    return docs


async def ensure_canonical_seed(db) -> dict:
    """Idempotent seed of the ``canonical_phonemes`` collection.

    Ensures a unique index on ``(dialect, ipa)`` and upserts every seed row.
    Safe to call at every startup: existing rows are updated in place;
    rows that no longer exist in the seed are NOT deleted (defensive —
    if an operator has added a real corpus percentage manually, we don't
    nuke it).
    """
    # Ensure unique index
    await db.canonical_phonemes.create_index(
        [("dialect", 1), ("ipa", 1)], unique=True, name="dialect_ipa_unique",
    )

    seed = _build_seed_docs()
    upserted = 0
    for doc in seed:
        await db.canonical_phonemes.update_one(
            {"dialect": doc["dialect"], "ipa": doc["ipa"]},
            {"$set": doc, "$setOnInsert": {"seeded": True}},
            upsert=True,
        )
        upserted += 1

    total = await db.canonical_phonemes.count_documents({})
    return {"upserted": upserted, "total": total}


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_canonical_phonemes_router(db) -> APIRouter:
    router = APIRouter()

    @router.get("/canonical/phonemes")
    async def list_canonical(
        dialect: Optional[str] = None,   # "GenAm" | "RP"
        kind: Optional[str] = None,      # "vowel" | "diphthong" | "consonant"
    ):
        """Public read of the canonical inventory.

        Consumers (frequency chart, autofill, admin dropdowns) call this
        to render the locked inventory scoped to the card's dialect.
        """
        q: dict = {}
        if dialect:
            if dialect not in ("GenAm", "RP"):
                raise HTTPException(status_code=400, detail="dialect must be GenAm or RP")
            q["dialect"] = dialect
        if kind:
            if kind not in ("vowel", "diphthong", "consonant"):
                raise HTTPException(status_code=400, detail="kind must be vowel, diphthong or consonant")
            q["kind"] = kind
        docs = await db.canonical_phonemes.find(q, {"_id": 0}).to_list(1000)
        # Sort by frequency_rank when present (None sorts last)
        docs.sort(key=lambda d: (d.get("frequency_rank") is None, d.get("frequency_rank") or 999))
        return {
            "count": len(docs),
            "items": docs,
            "controlled_vocabulary": {
                "height":     HEIGHT_TERMS,
                "backness":   BACKNESS_TERMS,
                "rounding":   ROUNDING_TERMS,
                "tenseness":  TENSENESS_TERMS,
                "manner":     MANNER_TERMS,
                "place":      PLACE_TERMS,
                "voicing":    VOICING_TERMS,
                "activation": ACTIVATION_TERMS,
            },
        }

    @router.get("/canonical/phonemes/{ipa}")
    async def get_canonical_phoneme(ipa: str, dialect: str):
        """Single lookup by (dialect, ipa). Used by autofill (Phase D)."""
        if dialect not in ("GenAm", "RP"):
            raise HTTPException(status_code=400, detail="dialect must be GenAm or RP")
        doc = await db.canonical_phonemes.find_one(
            {"dialect": dialect, "ipa": ipa}, {"_id": 0},
        )
        if not doc:
            raise HTTPException(status_code=404, detail=f"Canonical phoneme not found: {dialect}/{ipa}")
        return doc

    return router
