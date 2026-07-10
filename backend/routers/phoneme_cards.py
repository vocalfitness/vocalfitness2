"""
Phoneme Cards CMS — REST API router.

Backing store: MongoDB collection ``phoneme_cards`` (documents keyed by
the string ``id`` field, e.g. ``"u-foot"``).

Design notes
------------
The Pydantic surface intentionally keeps deeply nested pedagogical
fields (hotspots, spellings, audio, common words, mnemonic, guide, …)
as free-form ``Dict[str, Any]`` / ``List[Dict[str, Any]]``. Reasons:

* Admins routinely change the *shape* of card content (add hotspots,
  swap dialect audio, tweak mnemonic notes) — a rigid schema would
  force a backend release every time.
* The frontend already owns the render contract for these blobs.
* The top-level fields we *do* validate (id, ipa, category, published)
  are the ones the admin list view and the public library filter on,
  so validating them here still catches the most common typos.

Auth: all mutation endpoints and the admin list require
``get_admin_user`` (role == "admin"). The public endpoints are open
but only return ``published == True`` documents.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json as json_mod
import logging
import os
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")


class PhonemeCardBase(BaseModel):
    """Shared fields between create + update."""

    ipa: str = Field(..., description="Bare IPA symbol, e.g. 'ʊ' or 'iː'")
    displayIpa: str = Field(..., description="With slashes, e.g. '/ʊ/'")
    category: str = Field(..., description="'vowel' | 'consonant' | 'diphthong'")
    subcategory: Optional[str] = None
    examples: List[str] = Field(default_factory=list)
    dialects: List[str] = Field(default_factory=lambda: ["AmE", "RP"])
    dialectNote: str = ""

    # Deep pedagogical payload — free-form on purpose (see module docstring)
    assets: Dict[str, Any] = Field(default_factory=dict)
    hotspots: List[Dict[str, Any]] = Field(default_factory=list)
    # §3.4 · When true, the deterministic hotspot engine skips this card —
    # used to protect manually curated reference cards (u-foot, i-fleece).
    hotspots_locked: bool = False
    # §3.2/§3.3 · When true, the deterministic lexicon engine (commonWords +
    # spellings) skips this card — protects manually curated reference cards.
    lexicon_locked: bool = False
    # §3.5 · When true, the deterministic pronunciation protocol engine
    # skips this card — protects manually curated reference cards (u-foot).
    pronunciation_locked: bool = False
    # §3.6 · When true, the mnemonic inline-IPA rewriter skips this card —
    # protects manually curated mnemonic prose.
    mnemonic_locked: bool = False
    spellings: List[Dict[str, Any]] = Field(default_factory=list)
    frequencyChart: List[Dict[str, Any]] = Field(default_factory=list)
    features: List[Dict[str, Any]] = Field(default_factory=list)
    knobs: List[Dict[str, Any]] = Field(default_factory=list)
    exampleSentences: List[Dict[str, Any]] = Field(default_factory=list)
    facialMuscles: List[Dict[str, Any]] = Field(default_factory=list)
    # §3.2 DERIVED overlay bundle — auto-populated at save from the
    # canonical inventory. See ``anatomical_overlay.compute_overlay``.
    anatomicalLabels: List[str] = Field(default_factory=list)
    airflowArrows: List[Dict[str, Any]] = Field(default_factory=list)
    voicing: str = ""
    vowelChartPosition: Dict[str, Any] = Field(default_factory=dict)
    classification: List[Dict[str, Any]] = Field(default_factory=list)
    funFact: Optional[Dict[str, Any]] = None
    commonWords: List[Dict[str, Any]] = Field(default_factory=list)
    mnemonic: Dict[str, Any] = Field(default_factory=dict)
    pronunciationGuide: Dict[str, Any] = Field(default_factory=dict)
    audio: Dict[str, Any] = Field(default_factory=dict)
    videoLesson: Optional[Dict[str, Any]] = None

    # CMS meta
    published: bool = False
    order: int = 100


class PhonemeCardCreate(PhonemeCardBase):
    id: str = Field(..., description="URL slug, e.g. 'u-foot' — lowercase alnum + hyphens")


class PhonemeCardUpdate(BaseModel):
    """All fields optional so partial updates are trivial."""

    ipa: Optional[str] = None
    displayIpa: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    examples: Optional[List[str]] = None
    dialects: Optional[List[str]] = None
    dialectNote: Optional[str] = None
    assets: Optional[Dict[str, Any]] = None
    hotspots: Optional[List[Dict[str, Any]]] = None
    hotspots_locked: Optional[bool] = None
    lexicon_locked: Optional[bool] = None
    pronunciation_locked: Optional[bool] = None
    spellings: Optional[List[Dict[str, Any]]] = None
    frequencyChart: Optional[List[Dict[str, Any]]] = None
    features: Optional[List[Dict[str, Any]]] = None
    knobs: Optional[List[Dict[str, Any]]] = None
    exampleSentences: Optional[List[Dict[str, Any]]] = None
    facialMuscles: Optional[List[Dict[str, Any]]] = None
    vowelChartPosition: Optional[Dict[str, Any]] = None
    classification: Optional[List[Dict[str, Any]]] = None
    funFact: Optional[Dict[str, Any]] = None
    commonWords: Optional[List[Dict[str, Any]]] = None
    mnemonic: Optional[Dict[str, Any]] = None
    pronunciationGuide: Optional[Dict[str, Any]] = None
    audio: Optional[Dict[str, Any]] = None
    videoLesson: Optional[Dict[str, Any]] = None
    published: Optional[bool] = None
    order: Optional[int] = None


class PhonemeCardSummary(BaseModel):
    """Lightweight projection for list views."""

    id: str
    ipa: str
    displayIpa: str
    category: str
    subcategory: Optional[str] = None
    examples: List[str] = []
    published: bool = False
    order: int = 100
    hasAudio: bool = False
    hasVideoLesson: bool = False
    hotspotCount: int = 0
    commonWordCount: int = 0
    updatedAt: Optional[str] = None
    createdAt: Optional[str] = None
    # Phase E badge — populated only by admin_list, omitted elsewhere
    readinessScore: Optional[int] = None
    readinessReady: Optional[bool] = None
    readinessFailCount: Optional[int] = None


class PhonemeCardResponse(PhonemeCardBase):
    id: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _validate_id(card_id: str) -> None:
    if not _ID_RE.match(card_id or ""):
        raise HTTPException(
            status_code=400,
            detail="ID non valido. Usa solo lettere minuscole, cifre e trattini (es: 'u-foot').",
        )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _summarise(doc: dict) -> PhonemeCardSummary:
    audio = doc.get("audio") or {}
    has_audio = False
    if isinstance(audio, dict):
        for v in audio.values():
            if isinstance(v, dict) and v.get("isolated"):
                has_audio = True
                break

    return PhonemeCardSummary(
        id=doc["id"],
        ipa=doc.get("ipa", ""),
        displayIpa=doc.get("displayIpa", ""),
        category=doc.get("category", "vowel"),
        subcategory=doc.get("subcategory"),
        examples=doc.get("examples", []) or [],
        published=bool(doc.get("published", False)),
        order=int(doc.get("order", 100)),
        hasAudio=has_audio,
        hasVideoLesson=bool((doc.get("videoLesson") or {}).get("id")),
        hotspotCount=len(doc.get("hotspots", []) or []),
        commonWordCount=len(doc.get("commonWords", []) or []),
        updatedAt=doc.get("updatedAt"),
        createdAt=doc.get("createdAt"),
    )


def _to_response(doc: dict) -> PhonemeCardResponse:
    # Strip Mongo internals
    return PhonemeCardResponse(**{k: v for k, v in doc.items() if k != "_id"})


# --------------------------------------------------------------------------- #
# Phase C — Frequency Chart computed from canonical inventory (read-only)
# --------------------------------------------------------------------------- #
async def compute_frequency_chart(
    db,
    ipa: str,
    category: str,
    dialects: List[str] | None = None,
    n: int = 9,
) -> List[Dict[str, Any]]:
    """
    Compute the frequency chart bars from the canonical inventory.

    Returns the top-N phonemes of the same kind (vowel/consonant/diphthong) for
    the card's dialect, ranked by ``frequency_rank`` ASC (most frequent first).
    The requested ``ipa`` is always included and marked ``active: True``. Bar
    heights are linearly normalised from rank 1 (100) to rank max (30) so the
    chart is visually meaningful without fabricating percentages.

    This function is the single source of truth for the chart — the stored
    ``frequencyChart`` field in Mongo is ignored on read (Phase C lockdown).
    """
    if category not in ("vowel", "consonant", "diphthong"):
        return []

    # Pick the card's dialect with explicit precedence:
    #   GenAm wins if present (default American), else RP if present, else GenAm.
    if dialects and "GenAm" in dialects:
        dialect_val = "GenAm"
    elif dialects and "AmE" in dialects:
        dialect_val = "GenAm"  # AmE is the label used on cards for GenAm
    elif dialects and "RP" in dialects:
        dialect_val = "RP"
    else:
        dialect_val = "GenAm"

    docs = await db.canonical_phonemes.find(
        {"dialect": dialect_val, "kind": category, "frequency_rank": {"$ne": None}},
        {"_id": 0, "ipa": 1, "frequency_rank": 1},
    ).to_list(100)
    docs.sort(key=lambda d: d.get("frequency_rank") or 999)

    top = docs[:n]

    # Force-include the target ipa if outside top-N (swap in for the last slot)
    if ipa and not any(d["ipa"] == ipa for d in top):
        target = None
        for candidate in _ipa_equivalents(ipa):
            target = await db.canonical_phonemes.find_one(
                {"dialect": dialect_val, "ipa": candidate},
                {"_id": 0, "ipa": 1, "frequency_rank": 1},
            )
            if target:
                break
        if target:
            top = top[:-1] + [target] if top else [target]

    if not top:
        return []

    ranks = [d.get("frequency_rank") or 999 for d in top]
    max_rank = max(ranks)
    min_rank = min(ranks)
    span = max(1, max_rank - min_rank)
    min_h, max_h = 30, 100
    bars: List[Dict[str, Any]] = []
    for d in top:
        rank = d.get("frequency_rank") or max_rank
        # Invert: highest rank number → shortest bar
        height = int(min_h + (max_h - min_h) * (1 - (rank - min_rank) / span))
        bars.append({"ipa": d["ipa"], "height": height, "active": d["ipa"] == ipa})
    return bars


async def _inject_computed_chart(db, doc: dict) -> dict:
    """Overwrite the stored ``frequencyChart`` with the canonical-computed one."""
    try:
        doc["frequencyChart"] = await compute_frequency_chart(
            db,
            ipa=doc.get("ipa", ""),
            category=doc.get("category", "vowel"),
            dialects=doc.get("dialects") or [],
        )
    except Exception:  # noqa: BLE001 — never break the read path
        # keep whatever is in Mongo as fallback
        pass
    return doc


# --------------------------------------------------------------------------- #
# Phase D — Deterministic autofill from canonical inventory
# --------------------------------------------------------------------------- #
# Maps standard IPA height / backness / rounding / tenseness terms to the
# knob values (0-100) used by the visual editor. NO percentages are
# fabricated — these are pedagogical scale positions, not corpus data.
_HEIGHT_TO_KNOB = {
    "Close": 95, "Near-close": 80, "Close-mid": 65,
    "Mid": 50, "Open-mid": 35, "Near-open": 20, "Open": 5,
}
_BACKNESS_TO_KNOB = {
    "Front": 95, "Central": 50, "Back": 5,
    "Central/Back": 25, "Back (unrounded)": 10,
}
_ROUNDING_TO_KNOB = {
    "Unrounded": 5, "Unrounded (r-colored)": 15,
    "Moderate": 50, "Rounded": 95,
}
_TENSENESS_TO_KNOB = {
    "Tense": 90, "Lax": 20, "Tense/Lax varies": 50,
}
# Height → Y coordinate (0=top=close, 100=bottom=open) on the vowel chart svg
_HEIGHT_TO_Y = {
    "Close": 5, "Near-close": 22, "Close-mid": 35,
    "Mid": 50, "Open-mid": 65, "Near-open": 82, "Open": 95,
}
# Backness → X coordinate (0=left=front, 100=right=back)
_BACKNESS_TO_X = {
    "Front": 5, "Central": 50, "Back": 95,
    "Central/Back": 70, "Back (unrounded)": 90,
}


# Common IPA equivalences seen in pedagogical vs strict transcriptions.
# When looking up a symbol in canonical, we try each equivalent form in order.
_IPA_EQUIVALENTS: Dict[str, List[str]] = {
    "r":  ["r",  "ɹ"],   # ASCII 'r' vs IPA turned-r (both used for English rhotic)
    "ɹ":  ["ɹ",  "r"],
    "g":  ["g",  "ɡ"],   # ASCII 'g' (0x67) vs IPA opentail-g (0x261) — visually identical
    "ɡ":  ["ɡ",  "g"],
    ":":  ["ː", ":"],    # ASCII colon length mark vs IPA triangular colon
    "ː":  ["ː", ":"],
    # Italian LMS convention: DRESS written as /e/ but canonical inventory
    # uses /ɛ/ (open-mid). Same for FACE /eɪ/ vs /ɛɪ/ etc.
    "e":  ["e",  "ɛ"],
    "ɛ":  ["ɛ",  "e"],
    # LOT-PALM merger — /ɒ/ is RP-only; in GenAm it merges into the
    # long back vowel written /ɑː/ (or /ɑ/ without the length mark in
    # some transcription systems). Add both forms so AI drafting on a
    # /ɒ/ card for the GenAm dialect can fall back to either of the
    # canonical rows and never abort with "non presente nell'inventario".
    "ɒ":  ["ɒ",  "ɑ",  "ɑː"],
    "ɑ":  ["ɑ",  "ɑː", "ɒ"],
    "ɑː": ["ɑː", "ɑ",  "ɒ"],
}


def _ipa_equivalents(ipa: str) -> List[str]:
    """Return an ordered list of canonical-lookup candidates for a card IPA symbol.

    Also handles compound symbols like 'iː' (2 chars) where only the length mark
    differs between conventions: 'i:' ↔ 'iː'.
    """
    if not ipa:
        return []
    candidates = [ipa]
    # Whole-symbol replacements from the map
    if ipa in _IPA_EQUIVALENTS:
        for alt in _IPA_EQUIVALENTS[ipa]:
            if alt not in candidates:
                candidates.append(alt)
    # Substitute ':' ↔ 'ː' anywhere in the string (length mark drift)
    if ":" in ipa:
        alt = ipa.replace(":", "ː")
        if alt not in candidates:
            candidates.append(alt)
    if "ː" in ipa:
        alt = ipa.replace("ː", ":")
        if alt not in candidates:
            candidates.append(alt)
    return candidates


# --------------------------------------------------------------------------- #
# §3.1 Facial-muscle rule wiring (DERIVED — non-LLM, per Spec §1)
# --------------------------------------------------------------------------- #
async def _resolve_canonical_kind(db, ipa: str, category: str) -> str:
    """Best-effort ``kind`` lookup for the §3.1 muscle rule.

    Order: 1) canonical_phonemes row matching any IPA equivalent (any dialect)
           2) fallback to the card's own ``category`` field
           3) ``"vowel"`` as last-resort so the rule never crashes.
    """
    for cand in _ipa_equivalents(ipa):
        row = await db.canonical_phonemes.find_one({"ipa": cand}, {"_id": 0, "kind": 1})
        if row and row.get("kind"):
            return row["kind"]
    if category in ("vowel", "consonant", "diphthong"):
        return category
    return "vowel"


async def apply_muscle_rule_to_doc(db, doc: dict) -> List[Dict[str, str]]:
    """Compute and write the 5-muscle DERIVED list into ``doc`` in place.

    Uses the §3.1 mapping from ``phoneme_batch_v2.compose_facial_muscles``.
    The card's ``facialMuscles`` value is *always* overwritten — Spec §1
    forbids LLM/user authoring for this field. Values use the long enum
    (HIGH / MODERATE / LOW) to match the frontend dropdown and the
    ``_ACTIVATION_ENUM`` readiness check.

    Returns the muscle list that was written (for callers that also want
    to persist it via ``update_one``).
    """
    from .phoneme_batch_v2 import compose_facial_muscles  # local import → no cycle
    ipa = (doc.get("ipa") or "").strip()
    if not ipa:
        return doc.get("facialMuscles") or []
    kind = await _resolve_canonical_kind(db, ipa, doc.get("category", "vowel"))
    muscles = compose_facial_muscles(ipa, kind)
    doc["facialMuscles"] = muscles
    return muscles


async def apply_overlay_rule_to_doc(db, doc: dict) -> Dict[str, Any]:
    """Compute and write the DERIVED overlay bundle (§3.2) into ``doc``.

    Populates ``anatomicalLabels``, ``airflowArrows`` and ``voicing``
    from the matching ``canonical_phonemes`` row. Like §3.1 this field
    is ALWAYS overwritten on save — the canonical inventory is the
    single source of truth for what to render on the sagittal view.
    """
    from .anatomical_overlay import compute_overlay
    ipa = (doc.get("ipa") or "").strip()
    if not ipa:
        return {}
    canonical = None
    for cand in _ipa_equivalents(ipa):
        canonical = await db.canonical_phonemes.find_one({"ipa": cand}, {"_id": 0})
        if canonical:
            break
    if not canonical:
        canonical = {"kind": doc.get("category", "vowel"), "manner": "", "place": "", "voicing": "Voiceless"}
    bundle = compute_overlay(canonical)
    doc["anatomicalLabels"] = bundle["anatomicalLabels"]
    doc["airflowArrows"]    = bundle["airflowArrows"]
    doc["voicing"]          = bundle["voicing"]
    return bundle


async def apply_hotspot_rule_to_doc(db, doc: dict) -> List[Dict[str, Any]]:
    """Compute and write the DERIVED hotspot list (§3.4) into ``doc``.

    Uses ``phoneme_hotspot_rule.generate_hotspots_for_canonical`` — a fully
    deterministic engine keyed on the phoneme's canonical features (height,
    backness, rounding, tenseness for vowels; place, manner, voicing for
    consonants). Bilingual IT/EN localised copy is included on every hotspot.

    ⚠️ Idempotency contract: cards flagged ``hotspots_locked=true`` are
    NEVER touched — this preserves manually curated hotspots on the
    reference cards (u-foot, i-fleece). For all other cards the field is
    overwritten on every create/update/batch-fill call.

    Returns the hotspot list that was written (or the preserved list if
    the card is locked / IPA missing / canonical row not found).
    """
    from .phoneme_hotspot_rule import generate_hotspots_for_canonical
    if doc.get("hotspots_locked"):
        return doc.get("hotspots") or []
    ipa = (doc.get("ipa") or "").strip()
    if not ipa:
        return doc.get("hotspots") or []
    canonical = None
    for cand in _ipa_equivalents(ipa):
        canonical = await db.canonical_phonemes.find_one({"ipa": cand}, {"_id": 0})
        if canonical:
            break
    if not canonical:
        # No canonical row → keep whatever the doc has (do not blank it out).
        return doc.get("hotspots") or []
    hotspots = generate_hotspots_for_canonical(ipa, canonical)
    doc["hotspots"] = hotspots
    return hotspots


async def apply_pronunciation_rule_to_doc(db, doc: dict, preserve_body: bool = True) -> Dict[str, Any]:
    """§3.5 · Compose the 6-step "Vocal Fitness articulatory protocol"
    from canonical features (height/backness/rounding for vowels;
    place/manner/voicing for consonants).

    Behaviour:
      • ``pronunciation_locked=true`` → skip (protects manually curated
        cards like u-foot).
      • ``preserve_body=True`` (default) → keep any pre-existing
        ``pronunciationGuide.body`` paragraph (AI-drafted or authored).
        The engine only rewrites ``headline`` + ``steps`` + metadata.

    Returns the composed guide dict that was written (or the existing
    guide if locked / IPA missing).
    """
    if doc.get("pronunciation_locked"):
        return doc.get("pronunciationGuide") or {}
    ipa = (doc.get("ipa") or "").strip()
    if not ipa:
        return doc.get("pronunciationGuide") or {}
    canonical = None
    for cand in _ipa_equivalents(ipa):
        canonical = await db.canonical_phonemes.find_one({"ipa": cand}, {"_id": 0})
        if canonical:
            break
    if not canonical:
        return doc.get("pronunciationGuide") or {}

    from .phoneme_pronunciation_rule import generate_pronunciation_protocol
    fresh = generate_pronunciation_protocol(ipa, canonical)

    existing = doc.get("pronunciationGuide") or {}
    if preserve_body and (existing.get("body") or "").strip():
        fresh["body"] = existing["body"]
    doc["pronunciationGuide"] = fresh
    return fresh


async def apply_lexicon_rule_to_doc(db, doc: dict, preserve_audio: bool = True) -> Dict[str, list]:
    """§3.2/§3.3 · Compute commonWords + spellings from cmudict + wordfreq.

    Behaviour:
      • Deterministic — data-sourced, never LLM-authored.
      • ``lexicon_locked=true`` on the card → skipped (preserves manual
        curation on reference cards like u-foot).
      • ``preserve_audio=True`` (default) → when overwriting commonWords,
        pre-existing ``audioAmE`` / ``audioRP`` URLs are merged onto the
        matching word entries so we don't lose ElevenLabs generations.

    Returns the ``{commonWords, spellings}`` bundle that was written (or
    the existing bundle if the card is locked / IPA missing).
    """
    if doc.get("lexicon_locked"):
        return {"commonWords": doc.get("commonWords") or [],
                "spellings":   doc.get("spellings") or []}
    ipa = (doc.get("ipa") or "").strip()
    if not ipa:
        return {"commonWords": doc.get("commonWords") or [],
                "spellings":   doc.get("spellings") or []}

    from .phoneme_lexicon_rule import generate_lexicon_for_canonical
    bundle = generate_lexicon_for_canonical(ipa, max_words=30)
    common = bundle["commonWords"]
    spellings = bundle["spellings"]

    if preserve_audio:
        old_by_word = {(w.get("w") or "").lower(): w for w in (doc.get("commonWords") or [])}
        for entry in common:
            prev = old_by_word.get((entry.get("w") or "").lower())
            if not prev:
                continue
            if prev.get("audioAmE"):
                entry["audioAmE"] = prev.get("audioAmE")
            if prev.get("audioRP"):
                entry["audioRP"] = prev.get("audioRP")

    doc["commonWords"] = common
    doc["spellings"]   = spellings
    return {"commonWords": common, "spellings": spellings}



def _compose_autofill_for_vowel(canonical: dict) -> Dict[str, Any]:
    """Given a canonical vowel/diphthong row, return features/knobs/classification/vowelChartPosition."""
    height    = canonical.get("height")
    backness  = canonical.get("backness")
    rounding  = canonical.get("rounding")
    tenseness = canonical.get("tenseness")
    duration  = canonical.get("duration")
    lexset    = canonical.get("lexical_set") or ""
    kind      = canonical.get("kind", "vowel")

    features: List[Dict[str, str]] = []
    if height:
        features.append({"label": "Height",    "value": height})
    if backness:
        features.append({"label": "Backness",  "value": backness})
    if rounding:
        features.append({"label": "Rounding",  "value": rounding})
    if tenseness:
        features.append({"label": "Tenseness", "value": tenseness})
    if duration:
        features.append({"label": "Duration",  "value": duration})
    features.append({"label": "Voicing", "value": "Voiced"})  # all vowels
    features.append({"label": "Manner",  "value": "Diphthong" if kind == "diphthong" else "Pure monophthong"})
    if lexset:
        features.append({"label": "Lexical set", "value": lexset})

    knobs: List[Dict[str, Any]] = []
    if backness in _BACKNESS_TO_KNOB:
        knobs.append({"id": "advancement", "label": "ADVANCEMENT",
                      "value": _BACKNESS_TO_KNOB[backness],
                      "valueLabel": backness.lower(), "highlight": False})
    if tenseness in _TENSENESS_TO_KNOB:
        knobs.append({"id": "tenseness", "label": "TENSENESS",
                      "value": _TENSENESS_TO_KNOB[tenseness],
                      "valueLabel": tenseness.lower(), "highlight": False})
    if height in _HEIGHT_TO_KNOB:
        knobs.append({"id": "height", "label": "HEIGHT",
                      "value": _HEIGHT_TO_KNOB[height],
                      "valueLabel": height, "highlight": True})
    if rounding in _ROUNDING_TO_KNOB:
        knobs.append({"id": "roundness", "label": "ROUNDNESS",
                      "value": _ROUNDING_TO_KNOB[rounding],
                      "valueLabel": rounding.lower(), "highlight": False})

    classification: List[Dict[str, str]] = []
    if height:
        classification.append({"label": height,
                               "tooltip": f"Height (tongue elevation): standard IPA term '{height}'."})
    if backness:
        classification.append({"label": backness,
                               "tooltip": f"Backness (tongue advancement): '{backness}'."})
    if rounding:
        classification.append({"label": rounding,
                               "tooltip": f"Lip posture: '{rounding}'."})
    if tenseness:
        classification.append({"label": tenseness,
                               "tooltip": f"Muscular set: '{tenseness}'."})
    classification.append({
        "label": "Diphthong" if kind == "diphthong" else "Monophthong",
        "tooltip": ("Two-part vowel with a glide between two qualities."
                    if kind == "diphthong"
                    else "A single, stable vowel quality — no glide."),
    })

    vowel_chart_position: Dict[str, int] = {}
    if height in _HEIGHT_TO_Y and backness in _BACKNESS_TO_X:
        vowel_chart_position = {"x": _BACKNESS_TO_X[backness], "y": _HEIGHT_TO_Y[height]}

    return {
        "features": features,
        "knobs": knobs,
        "classification": classification,
        "vowelChartPosition": vowel_chart_position,
    }


def _compose_autofill_for_consonant(canonical: dict) -> Dict[str, Any]:
    """Given a canonical consonant row, return features/knobs/classification.

    Consonants don't populate `vowelChartPosition` (returned empty)."""
    manner  = canonical.get("manner")
    place   = canonical.get("place")
    voicing = canonical.get("voicing")

    features: List[Dict[str, str]] = []
    if voicing:
        features.append({"label": "Voicing", "value": voicing})
    if place:
        features.append({"label": "Place",   "value": place})
    if manner:
        features.append({"label": "Manner",  "value": manner})

    classification: List[Dict[str, str]] = []
    if voicing:
        classification.append({"label": voicing, "tooltip": f"Laryngeal setting: '{voicing}'."})
    if place:
        classification.append({"label": place, "tooltip": f"Place of articulation: '{place}'."})
    if manner:
        classification.append({"label": manner, "tooltip": f"Manner of articulation: '{manner}'."})

    # Consonants do not use the 4-knob vowel model; return no knobs by design.
    return {
        "features": features,
        "knobs": [],
        "classification": classification,
        "vowelChartPosition": {},
    }


async def build_autofill_payload(db, ipa: str, dialect: str) -> Dict[str, Any]:
    """Fetch the canonical row for (dialect, ipa) and compose the autofill blob.

    Raises HTTPException 404 if the phoneme is not in the canonical inventory.
    Attempts common IPA equivalents (e.g. ASCII 'r' ↔ IPA 'ɹ', ASCII 'g' ↔ IPA 'ɡ',
    ':' ↔ 'ː') before giving up.
    """
    if dialect not in ("GenAm", "RP"):
        raise HTTPException(status_code=400, detail="dialect deve essere 'GenAm' o 'RP'")
    if not ipa:
        raise HTTPException(status_code=400, detail="ipa obbligatorio")

    for candidate in _ipa_equivalents(ipa):
        doc = await db.canonical_phonemes.find_one(
            {"dialect": dialect, "ipa": candidate}, {"_id": 0},
        )
        if doc:
            break
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Fonema '{ipa}' non presente nell'inventario canonical per dialetto {dialect}.",
        )

    kind = doc.get("kind", "vowel")
    if kind == "consonant":
        blob = _compose_autofill_for_consonant(doc)
    else:
        blob = _compose_autofill_for_vowel(doc)

    blob["source"] = {
        "canonical_ipa": ipa,
        "canonical_dialect": dialect,
        "canonical_kind": kind,
        "lexical_set": doc.get("lexical_set"),
        "notes": doc.get("notes"),
        "dialect_notes": doc.get("dialect_notes"),
    }
    return blob


# --------------------------------------------------------------------------- #
# Phase E — Readiness checklist (correctness + contradiction detection)
# --------------------------------------------------------------------------- #
_ACTIVATION_ENUM = {"HIGH", "MODERATE", "MOD", "LOW"}  # accept both spec-shorthand MOD and legacy MODERATE
_CARD_DIALECT_TO_CANONICAL = {"AmE": "GenAm", "GenAm": "GenAm", "RP": "RP"}
# Deprecated classification labels flagged by Phase B lockdown
_DEPRECATED_CLASSIFICATION_LABELS = {"Near-high", "High", "Low-mid", "High-mid"}
_CONTRAST_RE = re.compile(r"/\s*([^/\s]+?)\s*/\s*(?:vs|VS|Vs)\s*/\s*([^/\s]+?)\s*/")


def _check(key: str, category: str, status: str, message: str, severity: str = "info") -> Dict[str, Any]:
    """Build a check row. status ∈ {'pass','warn','fail','skip'}."""
    return {
        "key": key,
        "category": category,
        "status": status,
        "message": message,
        "severity": severity,
    }


def _normalise_feature_value(v: Optional[str]) -> str:
    """Lower-case and strip trailing parenthetical qualifiers.

    'Unrounded (spread)' → 'unrounded'. Used by parity comparisons so a
    schda that adds a pedagogical qualifier is still considered equivalent
    to the plain canonical term.
    """
    if not v:
        return ""
    core = re.sub(r"\s*\(.*?\)\s*", " ", v).strip()
    return core.lower()


def _get_feature(card: dict, label: str) -> Optional[str]:
    """Case-insensitive lookup of a feature.value by label."""
    for f in (card.get("features") or []):
        if (f.get("label") or "").strip().lower() == label.lower():
            return (f.get("value") or "").strip()
    return None


async def build_readiness_report(db, card: dict) -> Dict[str, Any]:
    """
    Return a structured readiness report for the given card doc.

    The report is deterministic and never mutates the card. It aggregates:
      - Canonical parity checks (category/kind, height/backness/rounding/…)
      - Enum lockdown checks (Phase B: activation, classification labels)
      - Contrast / minimal-pair sanity
      - Content completeness (audio, hotspots, commonWords, mnemonic, funFact)

    The overall `ready` boolean is true iff there are zero failing checks.
    `score` is a 0-100 heuristic based on pass ratio + severity weight.
    """
    checks: List[Dict[str, Any]] = []
    card_ipa = (card.get("ipa") or "").strip()
    card_category = (card.get("category") or "").strip().lower()
    card_dialects = card.get("dialects") or []

    # -------------------------------------------------------------- canonical
    canonical_docs: Dict[str, dict] = {}  # dialect(GenAm/RP) → row
    if not card_ipa:
        checks.append(_check("canonical.ipa", "canonical", "fail",
                             "Il simbolo IPA è vuoto.", "critical"))
    else:
        for d in card_dialects:
            cd = _CARD_DIALECT_TO_CANONICAL.get(d)
            if not cd:
                continue
            for candidate in _ipa_equivalents(card_ipa):
                row = await db.canonical_phonemes.find_one({"dialect": cd, "ipa": candidate}, {"_id": 0})
                if row:
                    canonical_docs[cd] = row
                    break
        if not canonical_docs:
            checks.append(_check(
                "canonical.match", "canonical", "fail",
                f"/{card_ipa}/ non trovato nell'inventario canonical per nessuno dei dialetti {card_dialects}.",
                "critical",
            ))
        else:
            checks.append(_check(
                "canonical.match", "canonical", "pass",
                f"/{card_ipa}/ presente in canonical: {', '.join(canonical_docs.keys())}.",
            ))

    # Prefer GenAm as the reference row when available
    ref_row = canonical_docs.get("GenAm") or canonical_docs.get("RP") or {}
    ref_kind = ref_row.get("kind")

    # -------------------------------------------------------------- category / kind
    if ref_kind:
        if ref_kind == card_category:
            checks.append(_check("canonical.category", "canonical", "pass",
                                 f"Category '{card_category}' coincide con canonical.kind '{ref_kind}'."))
        else:
            checks.append(_check(
                "canonical.category", "canonical", "fail",
                f"Category '{card_category}' non coincide con canonical.kind '{ref_kind}'.",
                "high",
            ))

    # -------------------------------------------------------------- feature parity (vowel/diphthong)
    if ref_kind in ("vowel", "diphthong") and ref_row:
        parity_map = [
            ("Height",    "height"),
            ("Backness",  "backness"),
            ("Rounding",  "rounding"),
            ("Tenseness", "tenseness"),
        ]
        for feature_label, canonical_field in parity_map:
            card_val = _get_feature(card, feature_label)
            canon_val = ref_row.get(canonical_field)
            if card_val is None or canon_val is None:
                continue  # missing on either side → skip (content check will catch)
            if _normalise_feature_value(card_val) == _normalise_feature_value(canon_val):
                checks.append(_check(
                    f"parity.{canonical_field}", "canonical", "pass",
                    f"Feature '{feature_label}' = '{card_val}' concorda con canonical.",
                ))
            else:
                checks.append(_check(
                    f"parity.{canonical_field}", "canonical", "fail",
                    f"Contraddizione: feature '{feature_label}' = '{card_val}' ma canonical dice '{canon_val}'.",
                    "high",
                ))
    elif ref_kind == "consonant" and ref_row:
        for feature_label, canonical_field in [("Voicing", "voicing"), ("Place", "place"), ("Manner", "manner")]:
            card_val = _get_feature(card, feature_label)
            canon_val = ref_row.get(canonical_field)
            if card_val is None or canon_val is None:
                continue
            if _normalise_feature_value(card_val) == _normalise_feature_value(canon_val):
                checks.append(_check(
                    f"parity.{canonical_field}", "canonical", "pass",
                    f"Feature '{feature_label}' = '{card_val}' concorda con canonical.",
                ))
            else:
                checks.append(_check(
                    f"parity.{canonical_field}", "canonical", "fail",
                    f"Contraddizione: feature '{feature_label}' = '{card_val}' ma canonical dice '{canon_val}'.",
                    "high",
                ))

    # -------------------------------------------------------------- enum lockdown
    bad_activation = [
        m for m in (card.get("facialMuscles") or [])
        if (m.get("activation") or "").upper() not in _ACTIVATION_ENUM
    ]
    if not (card.get("facialMuscles") or []):
        checks.append(_check("enum.activation", "enum", "warn",
                             "Nessun facialMuscle definito.", "low"))
    elif bad_activation:
        offenders = ", ".join(sorted({(m.get("activation") or "∅") for m in bad_activation}))
        checks.append(_check(
            "enum.activation", "enum", "fail",
            f"facialMuscles.activation fuori enum HIGH/MODERATE/LOW: {offenders}",
            "high",
        ))
    else:
        checks.append(_check("enum.activation", "enum", "pass",
                             "Tutte le attivazioni sono conformi all'enum HIGH/MODERATE/LOW."))

    deprecated_labels = [
        c.get("label") for c in (card.get("classification") or [])
        if c.get("label") in _DEPRECATED_CLASSIFICATION_LABELS
    ]
    if deprecated_labels:
        checks.append(_check(
            "enum.classification", "enum", "fail",
            f"Etichette di classification deprecate: {', '.join(deprecated_labels)}.",
            "high",
        ))
    else:
        checks.append(_check(
            "enum.classification", "enum", "pass",
            "Nessuna etichetta di classification deprecata.",
        ))

    # -------------------------------------------------------------- contrast / minimal-pair
    contrast_val = _get_feature(card, "Contrast")
    if contrast_val:
        m = _CONTRAST_RE.search(contrast_val)
        if not m:
            checks.append(_check(
                "contrast.format", "contrast", "warn",
                "Feature 'Contrast' non nel formato '/A/ vs /B/: ...' — impossibile validare.",
                "low",
            ))
        else:
            a, b = m.group(1), m.group(2)
            if card_ipa not in (a, b):
                checks.append(_check(
                    "contrast.self", "contrast", "fail",
                    f"La coppia '/{a}/ vs /{b}/' non contiene il fonema della card /{card_ipa}/.",
                    "high",
                ))
            else:
                # verify the OTHER symbol exists in canonical for the same dialect
                other = b if a == card_ipa else a
                found_other = False
                for cd in canonical_docs.keys():
                    r = await db.canonical_phonemes.find_one({"dialect": cd, "ipa": other}, {"_id": 0, "ipa": 1})
                    if r:
                        found_other = True
                        break
                if found_other:
                    checks.append(_check(
                        "contrast.pair", "contrast", "pass",
                        f"Coppia contrastiva /{card_ipa}/ vs /{other}/ verificata su canonical.",
                    ))
                else:
                    checks.append(_check(
                        "contrast.pair", "contrast", "fail",
                        f"Il fonema di confronto /{other}/ non esiste in canonical per {list(canonical_docs.keys())}.",
                        "high",
                    ))

    minpairs_val = _get_feature(card, "Minimal pairs")
    if minpairs_val:
        # Split on commas → each item should be 'wordA/wordB'
        bad_pairs: List[str] = []
        good_count = 0
        for raw in [p.strip() for p in minpairs_val.split(",") if p.strip()]:
            if "/" not in raw:
                bad_pairs.append(raw)
                continue
            a, b = [w.strip() for w in raw.split("/", 1)]
            if not a or not b or a == b:
                bad_pairs.append(raw)
                continue
            # Must differ in at least 1 letter but not by more than ~3 (proxy for single-phoneme diff)
            diff_len = abs(len(a) - len(b))
            if diff_len > 3:
                bad_pairs.append(raw)
                continue
            good_count += 1
        if bad_pairs:
            checks.append(_check(
                "minimal_pairs.format", "contrast", "warn",
                f"{len(bad_pairs)} coppia/e minime malformate: {', '.join(bad_pairs[:3])}",
                "medium",
            ))
        if good_count >= 2:
            checks.append(_check(
                "minimal_pairs.count", "contrast", "pass",
                f"{good_count} coppie minime plausibili.",
            ))
        elif good_count == 1:
            checks.append(_check(
                "minimal_pairs.count", "contrast", "warn",
                "Solo 1 coppia minima valida — ne servono almeno 2 per una buona scheda.",
                "medium",
            ))

    # -------------------------------------------------------------- content completeness
    audio = card.get("audio") or {}
    def _has_audio_for(d: str) -> bool:
        entry = audio.get(d)
        if not isinstance(entry, dict):
            return False
        # Any non-empty string value or non-empty list of URLs counts as "audio present"
        for v in entry.values():
            if isinstance(v, str) and v.strip():
                return True
            if isinstance(v, list) and any(isinstance(x, str) and x.strip() for x in v):
                return True
        return False

    audio_present = [d for d in card_dialects if _has_audio_for(d)]
    if not card_dialects:
        checks.append(_check("content.audio", "content", "warn", "Nessun dialetto dichiarato.", "medium"))
    elif len(audio_present) == len(card_dialects):
        checks.append(_check("content.audio", "content", "pass",
                             f"Audio presente per tutti i dialetti ({', '.join(audio_present)})."))
    elif audio_present:
        missing = [d for d in card_dialects if d not in audio_present]
        checks.append(_check(
            "content.audio", "content", "warn",
            f"Audio mancante per: {', '.join(missing)}.", "medium",
        ))
    else:
        checks.append(_check(
            "content.audio", "content", "fail",
            f"Nessun audio caricato per i dialetti {card_dialects}.",
            "high",
        ))

    hs_count = len(card.get("hotspots") or [])
    if hs_count >= 3:
        checks.append(_check("content.hotspots", "content", "pass",
                             f"{hs_count} hotspots definiti."))
    elif hs_count >= 1:
        checks.append(_check(
            "content.hotspots", "content", "warn",
            f"Solo {hs_count} hotspot(s) — ne servono almeno 3 per pubblicare.", "medium",
        ))
    else:
        checks.append(_check(
            "content.hotspots", "content", "fail",
            "Nessun hotspot definito.", "high",
        ))

    cw_count = len(card.get("commonWords") or [])
    if cw_count >= 6:
        checks.append(_check("content.commonWords", "content", "pass",
                             f"{cw_count} common words."))
    elif cw_count >= 3:
        checks.append(_check(
            "content.commonWords", "content", "warn",
            f"Solo {cw_count} common words — target ≥6.", "low",
        ))
    else:
        checks.append(_check(
            "content.commonWords", "content", "fail",
            f"Solo {cw_count} common words — target ≥6.", "medium",
        ))

    classification_count = len(card.get("classification") or [])
    if classification_count >= 3:
        checks.append(_check("content.classification", "content", "pass",
                             f"{classification_count} chip di classification."))
    else:
        checks.append(_check(
            "content.classification", "content", "warn",
            f"Solo {classification_count} chip di classification (target ≥3).", "low",
        ))

    mnemonic = card.get("mnemonic") or {}
    if mnemonic.get("text") or mnemonic.get("body") or mnemonic.get("phrase"):
        checks.append(_check("content.mnemonic", "content", "pass", "Mnemonic presente."))
    else:
        checks.append(_check(
            "content.mnemonic", "content", "warn",
            "Nessun mnemonic definito.", "low",
        ))

    fun_fact = card.get("funFact") or {}
    if fun_fact and (fun_fact.get("body") or fun_fact.get("text")):
        checks.append(_check("content.funFact", "content", "pass", "Fun fact presente."))
    else:
        checks.append(_check(
            "content.funFact", "content", "warn",
            "Nessun fun fact definito.", "low",
        ))

    # -------------------------------------------------------------- summary
    pass_n = sum(1 for c in checks if c["status"] == "pass")
    warn_n = sum(1 for c in checks if c["status"] == "warn")
    fail_n = sum(1 for c in checks if c["status"] == "fail")
    total  = max(1, len(checks))
    # Weighted score: pass=1.0, warn=0.5, fail=0.0
    score = int(round(100.0 * (pass_n + warn_n * 0.5) / total))
    ready = fail_n == 0

    return {
        "ready": ready,
        "score": score,
        "summary": {"pass": pass_n, "warn": warn_n, "fail": fail_n, "total": len(checks)},
        "checks": checks,
    }


# --------------------------------------------------------------------------- #
# Phase F — AI-assisted drafting (Claude Sonnet 4.5 via Emergent LLM Key)
# --------------------------------------------------------------------------- #
# Strict guardrails:
#   • ONLY narrative fields (mnemonic, funFact) — never structural/phonetic data
#   • Canonical row is passed as ground truth in the prompt — no hallucination
#   • Response is JSON-only, parsed & validated
#   • Preview-only endpoint — admin reviews and applies client-side
#   • Every draft carries a `confidence` float; low-confidence drafts are
#     rendered with a warning banner in the editor
_AI_DRAFT_ALLOWED_FIELDS = {"mnemonic", "funFact"}
_AI_DRAFT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
_AI_DRAFT_SYSTEM = (
    "You are a phonetics pedagogy assistant helping create English pronunciation "
    "training cards for adult learners of Steve Dapper's VocalFitness method. "
    "Return STRICT JSON only. No prose outside JSON. No markdown fences. "
    "Do not invent linguistic facts — use only the profile provided. "
    "Avoid superlative rankings like 'most common' or 'rarest' unless the profile "
    "explicitly cites a corpus. Prefer 'commonly occurs', 'appears in words such as'."
)


def _canonical_profile_lines(canon: dict, kind: str) -> str:
    """Format the canonical row as a bullet list for the LLM prompt."""
    lines: List[str] = [f"- Kind: {kind}"]
    for key in ("height", "backness", "rounding", "tenseness", "duration",
                "voicing", "manner", "place", "lexical_set"):
        v = canon.get(key)
        if v:
            lines.append(f"- {key.replace('_', ' ').title()}: {v}")
    if canon.get("example_words"):
        ex = ", ".join(canon["example_words"][:8])
        lines.append(f"- Example words (canonical): {ex}")
    if canon.get("notes"):
        lines.append(f"- Notes: {canon['notes']}")
    if canon.get("dialect_notes"):
        lines.append(f"- Dialect notes: {canon['dialect_notes']}")
    return "\n".join(lines)


def _build_ai_draft_prompt(ipa: str, dialect: str, canon: dict,
                            kind: str, fields: List[str],
                            existing: Optional[Dict[str, Any]] = None) -> str:
    """Compose the user-message body for the drafting LLM call."""
    shape_parts: List[str] = []
    if "mnemonic" in fields:
        shape_parts.append(
            '"mnemonic": {\n'
            '    "phrase": "<short English sentence 6-12 words featuring /'
            + ipa + '/ in AT LEAST 3 different words>",\n'
            '    "highlights": ["<word1>", "<word2>", "<word3>"],\n'
            '    "note": "<1-2 sentence coaching note for how to practice>",\n'
            '    "confidence": <float 0.0-1.0>\n'
            '  }'
        )
    if "funFact" in fields:
        shape_parts.append(
            '"funFact": {\n'
            '    "headline": "<3-6 word attention-grabbing title, no clickbait>",\n'
            '    "body": "<2-3 sentence pedagogical fact; factually verifiable; '
            'no invented statistics>",\n'
            '    "confidence": <float 0.0-1.0>\n'
            '  }'
        )
    shape = "{\n  " + ",\n  ".join(shape_parts) + "\n}"

    existing_hint = ""
    if existing:
        existing_hint = (
            "\nThe following fields are ALREADY populated (do NOT reuse them "
            "verbatim — produce something distinct):\n"
            + json_mod.dumps(existing, ensure_ascii=False, indent=2)
        )

    return (
        f"Generate draft pedagogical content for the English phoneme /{ipa}/ "
        f"in the {dialect} dialect.\n\n"
        f"Canonical linguistic profile:\n{_canonical_profile_lines(canon, kind)}\n\n"
        f"Fields to draft: {', '.join(fields)}\n\n"
        f"Return JSON matching this exact shape:\n{shape}\n\n"
        "Rules:\n"
        "- Use only phonetic terms present in the profile. Do NOT invent claims.\n"
        "- Highlights (if applicable) must be a subset of words in the phrase.\n"
        "- Set confidence 0.9+ only when certain. Use 0.5-0.7 for creative/subjective "
        "content. Set 0.0 to abstain and return null for that field."
        f"{existing_hint}"
    )


def _parse_llm_json(raw: str) -> Dict[str, Any]:
    """Extract the first {...} JSON object from an LLM response, tolerating fences."""
    raw = raw.strip()
    # Strip common markdown fences
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    # Extract the first balanced {...} block
    start = raw.find("{")
    if start == -1:
        raise ValueError("Nessun oggetto JSON trovato nella risposta LLM.")
    depth = 0
    end = -1
    for i, ch in enumerate(raw[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end == -1:
        raise ValueError("Oggetto JSON non chiuso nella risposta LLM.")
    return json_mod.loads(raw[start:end])


async def generate_ai_draft(db, card: dict, dialect: str,
                             fields: List[str]) -> Dict[str, Any]:
    """
    Call Claude Sonnet 4.5 via Emergent LLM Key and return parsed drafts.

    Raises HTTPException on setup / API / parse errors. This function never
    persists anything — it only returns a preview blob for the editor.
    """
    # ---- Validation
    fields = [f for f in fields if f in _AI_DRAFT_ALLOWED_FIELDS]
    if not fields:
        raise HTTPException(status_code=400,
                            detail=f"fields deve contenere almeno uno di {_AI_DRAFT_ALLOWED_FIELDS}")
    if dialect not in ("GenAm", "RP"):
        raise HTTPException(status_code=400, detail="dialect deve essere 'GenAm' o 'RP'")

    ipa = (card.get("ipa") or "").strip()
    if not ipa:
        raise HTTPException(status_code=400, detail="La card non ha un simbolo IPA valido.")

    canon = None
    for candidate in _ipa_equivalents(ipa):
        canon = await db.canonical_phonemes.find_one(
            {"dialect": dialect, "ipa": candidate}, {"_id": 0},
        )
        if canon:
            break
    if not canon:
        raise HTTPException(
            status_code=404,
            detail=f"/{ipa}/ non presente nell'inventario canonical per {dialect}. "
                   "Autofill non applicabile."
        )

    # ---- LLM setup
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata.")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise HTTPException(status_code=500,
                            detail=f"Libreria emergentintegrations non disponibile: {e}")

    kind = canon.get("kind", "vowel")
    existing = {
        f: card.get(f) for f in fields if card.get(f)  # pass current content so LLM produces something new
    } or None
    prompt = _build_ai_draft_prompt(ipa, dialect, canon, kind, fields, existing)

    session_id = f"phoneme-draft-{ipa}-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=_AI_DRAFT_SYSTEM,
    )
    chat.with_model(*_AI_DRAFT_MODEL)

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:  # noqa: BLE001 — bubble up as HTTP for the admin UI
        logging.exception("AI draft LLM call failed for /%s/", ipa)
        # Sanitised message — never leak SDK internals (api key excerpts, headers…) to the admin UI
        raise HTTPException(
            status_code=502,
            detail=f"Errore chiamata LLM ({type(e).__name__}): vedi log server per traceback.",
        )

    try:
        parsed = _parse_llm_json(str(raw))
    except (ValueError, json_mod.JSONDecodeError) as e:
        logging.warning("Failed to parse LLM JSON for /%s/: %s\nRaw: %s", ipa, e, raw)
        raise HTTPException(
            status_code=502,
            detail=f"Risposta LLM non parsabile come JSON: {e}",
        )

    # Filter to requested fields only; ensure minimum shape
    drafts: Dict[str, Any] = {}
    for f in fields:
        v = parsed.get(f)
        if isinstance(v, dict):
            drafts[f] = v

    return {
        "drafts": drafts,
        "model": f"{_AI_DRAFT_MODEL[0]}/{_AI_DRAFT_MODEL[1]}",
        "session_id": session_id,
        "dialect": dialect,
        "ipa": ipa,
        "generated_at": _now_iso(),
        "status": "bozza",
    }


# --------------------------------------------------------------------------- #
# Router factory (so we can inject the shared db + admin dependency)
# --------------------------------------------------------------------------- #
def build_phoneme_cards_router(db, get_admin_user, get_optional_admin_user=None):
    """
    Build and return the APIRouter.

    ``db`` is the motor database instance from server.py.
    ``get_admin_user`` is the existing FastAPI dependency that
    enforces role == "admin".
    ``get_optional_admin_user`` is a soft-auth dependency returning the
    admin dict when a valid admin JWT is supplied, or ``None`` otherwise.
    When omitted the public GET endpoint keeps its published-only
    behaviour (backwards compatibility).
    """
    # Fallback so callers that never pass the optional dep still work.
    if get_optional_admin_user is None:
        async def _no_admin() -> Optional[dict]:  # pragma: no cover
            return None
        get_optional_admin_user = _no_admin

    router = APIRouter()
    coll = db.phoneme_cards

    # ------------------------------------------------------------------ #
    # ADMIN — full CRUD
    # ------------------------------------------------------------------ #
    @router.get("/admin/phonemes", response_model=List[PhonemeCardSummary])
    async def admin_list(admin: dict = Depends(get_admin_user)):
        docs = await coll.find({}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(1000)
        summaries: List[PhonemeCardSummary] = []
        for d in docs:
            s = _summarise(d)
            # Phase E — augment with readiness score for the list badge
            try:
                report = await build_readiness_report(db, d)
                s.readinessScore = report["score"]
                s.readinessReady = report["ready"]
                s.readinessFailCount = report["summary"]["fail"]
            except Exception:  # noqa: BLE001 — never break the list on a bad card
                s.readinessScore = None
            summaries.append(s)
        return summaries

    # ------------------------------------------------------------------ #
    # Phase D — Deterministic autofill (no DB mutation, only preview payload)
    # ------------------------------------------------------------------ #
    @router.post("/admin/phonemes/autofill")
    async def admin_autofill(
        ipa: str,
        dialect: str,
        admin: dict = Depends(get_admin_user),
    ):
        """
        Return an autofill preview blob derived deterministically from the
        canonical inventory. The response is NOT persisted — the admin
        reviews and merges the returned fields client-side, then calls
        PUT /admin/phonemes/{id} to save. Zero LLM involvement.
        """
        return await build_autofill_payload(db, ipa=ipa, dialect=dialect)

    # ------------------------------------------------------------------ #
    # Phase E — Readiness checklist (correctness + contradiction detection)
    # ------------------------------------------------------------------ #
    @router.get("/admin/phonemes/{card_id}/readiness")
    async def admin_readiness(card_id: str, admin: dict = Depends(get_admin_user)):
        """
        Run the deterministic readiness suite against the current DB doc.
        Returns {ready, score, summary, checks[]} — pure diagnostics,
        no DB writes. See build_readiness_report() for the full check set.
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        return await build_readiness_report(db, doc)

    # ------------------------------------------------------------------ #
    # Phase F — AI-assisted drafting (Claude Sonnet 4.5, preview-only)
    # ------------------------------------------------------------------ #
    class AiDraftRequest(BaseModel):
        fields: List[str] = Field(default_factory=lambda: ["mnemonic", "funFact"])
        dialect: Optional[str] = None  # 'GenAm' | 'RP'; auto-detected if omitted

    @router.post("/admin/phonemes/{card_id}/ai-draft")
    async def admin_ai_draft(
        card_id: str,
        payload: AiDraftRequest,
        admin: dict = Depends(get_admin_user),
    ):
        """
        Generate draft narrative content (mnemonic, funFact) via Claude Sonnet 4.5.
        Preview-only: the returned drafts are NOT persisted. Every draft carries
        a confidence flag and status='bozza'.
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        # Auto-detect dialect if not explicitly requested
        dialect = payload.dialect
        if not dialect:
            ds = doc.get("dialects") or []
            if "AmE" in ds or "GenAm" in ds:
                dialect = "GenAm"
            elif "RP" in ds:
                dialect = "RP"
            else:
                dialect = "GenAm"

        return await generate_ai_draft(db, doc, dialect, payload.fields)

    # ------------------------------------------------------------------ #
    # Phase F+ — Batch-fill (Autofill + AI-draft + auto-save as bozza)
    # ------------------------------------------------------------------ #
    class BatchFillRequest(BaseModel):
        dialect: Optional[str] = None       # 'GenAm' | 'RP'; auto-detected if omitted
        include_ai: bool = True             # if False, only deterministic autofill
        overwrite: bool = False             # if True, overwrites even non-empty fields

    def _is_empty_or_default(value: Any) -> bool:
        """Return True if `value` is missing / '' / [] / {} / default skeleton content."""
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip()
        if isinstance(value, (list, tuple, dict)):
            return len(value) == 0
        return False

    @router.post("/admin/phonemes/{card_id}/batch-fill")
    async def admin_batch_fill(
        card_id: str,
        payload: BatchFillRequest,
        admin: dict = Depends(get_admin_user),
    ):
        """
        Combine deterministic autofill (canonical → features/knobs/classification/
        vowelChartPosition) with optional AI drafting (mnemonic/funFact) and PERSIST
        the merged result as bozza (published=false).

        SAFETY:
          • Refuses to run if the card is currently published (unless overwrite=true).
          • By default preserves any non-empty user-edited field (uses `overwrite` to force).
          • Frequency chart is untouched — always canonical-computed on read.
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        if doc.get("published") and not payload.overwrite:
            raise HTTPException(
                status_code=409,
                detail="La scheda è pubblicata — usa overwrite=true per forzare la sovrascrittura.",
            )

        ipa = (doc.get("ipa") or "").strip()
        if not ipa:
            raise HTTPException(status_code=400, detail="La card non ha un simbolo IPA valido.")

        # Auto-detect dialect with fallback: try preferred first, then the other
        preferred_dialect = payload.dialect
        candidate_dialects: List[str] = []
        if preferred_dialect:
            candidate_dialects.append(preferred_dialect)
        else:
            ds = doc.get("dialects") or []
            if "AmE" in ds or "GenAm" in ds:
                candidate_dialects.append("GenAm")
            if "RP" in ds and "RP" not in candidate_dialects:
                candidate_dialects.append("RP")
            if not candidate_dialects:
                candidate_dialects = ["GenAm", "RP"]
        # Ensure we try both dialects if the first misses in canonical
        for alt in ("GenAm", "RP"):
            if alt not in candidate_dialects:
                candidate_dialects.append(alt)

        applied: Dict[str, Any] = {"autofill": [], "ai": []}
        errors: List[str] = []
        autofill: Optional[Dict[str, Any]] = None
        dialect: Optional[str] = None
        last_err: Optional[str] = None

        # ---- 1) Deterministic autofill — try candidates until one succeeds
        for d in candidate_dialects:
            try:
                autofill = await build_autofill_payload(db, ipa=ipa, dialect=d)
                dialect = d
                break
            except HTTPException as e:
                last_err = f"{d}: {e.detail}"
                continue
        if not autofill or not dialect:
            raise HTTPException(
                status_code=404,
                detail=f"Autofill fallito su tutti i dialetti candidati ({', '.join(candidate_dialects)}): {last_err}",
            )

        update_fields: Dict[str, Any] = {}
        for key in ("features", "knobs", "classification", "vowelChartPosition"):
            new_val = autofill.get(key)
            if not new_val:
                continue
            cur_val = doc.get(key)
            if payload.overwrite or _is_empty_or_default(cur_val):
                update_fields[key] = new_val
                applied["autofill"].append(key)

        # ---- 2) AI drafting (optional, non-fatal on failure)
        ai_confidences: Dict[str, float] = {}
        if payload.include_ai:
            try:
                ai_result = await generate_ai_draft(db, doc, dialect, ["mnemonic", "funFact"])
                drafts = ai_result.get("drafts", {})

                if drafts.get("mnemonic"):
                    cur_m = doc.get("mnemonic") or {}
                    if payload.overwrite or _is_empty_or_default(cur_m.get("phrase")):
                        m = drafts["mnemonic"]
                        new_phrase = m.get("phrase") or cur_m.get("phrase", "")
                        # If phrase changes, ANY previously-recorded audio no longer matches → clear it
                        new_audio = cur_m.get("audio", "") if new_phrase == cur_m.get("phrase", "") else ""
                        update_fields["mnemonic"] = {
                            **cur_m,
                            "phrase":     new_phrase,
                            "highlights": m.get("highlights") or cur_m.get("highlights", []),
                            "note":       m.get("note")       or cur_m.get("note", ""),
                            "audio":      new_audio,
                        }
                        applied["ai"].append("mnemonic")
                        ai_confidences["mnemonic"] = float(m.get("confidence", 0.0))

                if drafts.get("funFact"):
                    cur_f = doc.get("funFact") or {}
                    if payload.overwrite or _is_empty_or_default(cur_f.get("body")):
                        f = drafts["funFact"]
                        update_fields["funFact"] = {
                            **cur_f,
                            "headline": f.get("headline") or cur_f.get("headline", ""),
                            "body":     f.get("body")     or cur_f.get("body", ""),
                        }
                        applied["ai"].append("funFact")
                        ai_confidences["funFact"] = float(f.get("confidence", 0.0))
            except HTTPException as e:
                errors.append(f"AI draft: {e.detail}")

        # ---- 3) Persist (published stays False for skeleton cards)
        if not update_fields:
            try:
                report = await build_readiness_report(db, doc)
                cur_score = report["score"]
            except Exception:  # noqa: BLE001
                cur_score = None
            return {
                "id": card_id,
                "applied": applied,
                "errors": errors,
                "ai_confidences": ai_confidences,
                "message": "Nessun campo modificato (già valorizzati o overwrite=false).",
                "readinessScore": cur_score,
                "dialect": dialect,
            }

        update_fields["updatedAt"] = _now_iso()
        update_fields["updatedBy"] = admin.get("username")
        # Never auto-publish
        update_fields["published"] = False

        await coll.update_one({"id": card_id}, {"$set": update_fields})

        # ---- 4) Return summary + fresh readiness score
        updated = await coll.find_one({"id": card_id}, {"_id": 0})
        try:
            report = await build_readiness_report(db, updated)
            readiness_score = report["score"]
        except Exception:  # noqa: BLE001
            readiness_score = None

        return {
            "id": card_id,
            "applied": applied,
            "errors": errors,
            "ai_confidences": ai_confidences,
            "readinessScore": readiness_score,
            "dialect": dialect,
            "message": (
                f"{len(applied['autofill'])} campi autofill + "
                f"{len(applied['ai'])} bozze AI applicati."
            ),
        }

    # ------------------------------------------------------------------ #
    # Phase 2 spec — Batch-fill v2 (taxonomy · muscle map · grounded LLM · validation)
    # ------------------------------------------------------------------ #
    class BatchFillV2Request(BaseModel):
        dialect: Optional[str] = None
        include_creative: bool = True   # if False, only DERIVED (muscle map + autofill)
        overwrite: bool = False

    @router.get("/admin/phonemes/taxonomy")
    async def admin_taxonomy(admin: dict = Depends(get_admin_user)):
        """Return the field taxonomy from the Phase-2 spec §1 for the UI badge system."""
        from .phoneme_batch_v2 import FIELD_TAXONOMY
        return FIELD_TAXONOMY

    @router.post("/admin/phonemes/batch/regenerate-derived")
    async def admin_batch_regenerate_derived(
        admin: dict = Depends(get_admin_user),
    ):
        """One-click bulk regeneration of ALL DERIVED fields across every
        card that is not flagged as locked.

        Runs, in order, for each card:
          §3.1 muscles (never LLM/user authored — always overwrite)
          §3.2 overlay bundle (anatomicalLabels + arrows + voicing)
          §3.4 hotspots (skipped when ``hotspots_locked=true``)
          §3.2/§3.3 lexicon (skipped when ``lexicon_locked=true``,
                              preserves audio URLs on surviving words)

        Idempotent. Never touches CREATIVE fields (mnemonic, funFact, etc.)
        or NEEDS_SOURCE fields (video). Returns per-card summary.
        """
        results = []
        skipped = 0
        errors = []
        async for card in coll.find({}, {"_id": 0}):
            cid = card.get("id")
            if not cid:
                skipped += 1
                continue
            entry: Dict[str, Any] = {"id": cid, "ipa": card.get("ipa"),
                                     "applied": [], "skipped": []}
            try:
                await apply_muscle_rule_to_doc(db, card)
                entry["applied"].append("muscles")
            except Exception as exc:  # noqa: BLE001
                entry["skipped"].append(f"muscles({type(exc).__name__})")

            try:
                overlay = await apply_overlay_rule_to_doc(db, card)
                card["anatomicalLabels"] = overlay["anatomicalLabels"]
                card["airflowArrows"]    = overlay["airflowArrows"]
                card["voicing"]          = overlay["voicing"]
                entry["applied"].append("overlay")
            except Exception as exc:  # noqa: BLE001
                entry["skipped"].append(f"overlay({type(exc).__name__})")

            if card.get("hotspots_locked"):
                entry["skipped"].append("hotspots(locked)")
            else:
                try:
                    await apply_hotspot_rule_to_doc(db, card)
                    entry["applied"].append("hotspots")
                except Exception as exc:  # noqa: BLE001
                    entry["skipped"].append(f"hotspots({type(exc).__name__})")

            if card.get("lexicon_locked"):
                entry["skipped"].append("lexicon(locked)")
            else:
                try:
                    await apply_lexicon_rule_to_doc(db, card, preserve_audio=True)
                    entry["applied"].append("lexicon")
                except Exception as exc:  # noqa: BLE001
                    entry["skipped"].append(f"lexicon({type(exc).__name__})")

            # §3.5 pronunciation protocol
            if card.get("pronunciation_locked"):
                entry["skipped"].append("pronunciation(locked)")
            else:
                try:
                    await apply_pronunciation_rule_to_doc(db, card, preserve_body=True)
                    entry["applied"].append("pronunciation")
                except Exception as exc:  # noqa: BLE001
                    entry["skipped"].append(f"pronunciation({type(exc).__name__})")

            # Persist the diff (all fields at once — atomic).
            await coll.update_one({"id": cid}, {"$set": {
                "facialMuscles":     card.get("facialMuscles") or [],
                "anatomicalLabels":  card.get("anatomicalLabels") or [],
                "airflowArrows":     card.get("airflowArrows") or [],
                "voicing":           card.get("voicing") or "",
                "hotspots":          card.get("hotspots") or [],
                "commonWords":       card.get("commonWords") or [],
                "spellings":         card.get("spellings") or [],
                "pronunciationGuide": card.get("pronunciationGuide") or {},
                "updatedAt":         _now_iso(),
                "updatedBy":         admin.get("username"),
            }})
            results.append(entry)

        return {
            "ok":       True,
            "processed": len(results),
            "skipped":  skipped,
            "errors":   errors,
            "results":  results,
        }

    # =====================================================================
    # §3.6 · Mnemonic Inline-IPA Rewriter — deterministic, CMUdict-grounded
    # =====================================================================
    # Rewrites each card's mnemonic phrase from plain prose into the
    # ``[word|/ipa/]`` bracket syntax so:
    #   • the frontend can render a Tooltip showing the IPA on hover
    #     while the surface spelling stays readable, and
    #   • the ElevenLabs SSML pipeline pronounces each annotated word
    #     via its exact IPA (see ``elevenlabs.synthesize_and_store``).
    #
    # STRICT RULES (Feb 2026):
    #   • IPA transcriptions come from CMUdict — never from the LLM.
    #   • Only words that ACTUALLY contain the card's target phoneme
    #     (with correct stress) are annotated; other words stay bare.
    #   • Words already annotated with ``[…|/…/]`` are preserved verbatim
    #     (idempotent — safe to re-run).
    #   • Cards flagged ``mnemonic_locked=true`` are skipped.
    #   • When the phrase changes, the previously-recorded mnemonic
    #     audio URL is cleared so the next audio batch regenerates
    #     with the new SSML.
    # =====================================================================
    _BRACKET_TOKEN_RE = re.compile(r'\[([^\|\]\r\n]{1,40})\|/([^/\r\n]{1,20})/\]')

    def _rewrite_mnemonic_phrase(phrase: str, target_ipa: str) -> tuple[str, list[str]]:
        """Deterministic rewrite of ``phrase`` using CMUdict.

        Returns ``(rewritten, annotated_surface_words)``. If nothing
        changes, ``rewritten == phrase``.
        """
        from .phoneme_lexicon_rule import word_to_ipa, word_contains_phoneme
        if not phrase or not target_ipa:
            return phrase, []

        # Walk the string preserving whitespace + punctuation. We tokenize
        # into (word|separator) runs so we can rebuild the string exactly.
        out: list[str] = []
        annotated: list[str] = []
        i = 0
        n = len(phrase)
        while i < n:
            # Preserve any existing bracket token verbatim (idempotency).
            m_br = _BRACKET_TOKEN_RE.match(phrase, i)
            if m_br:
                out.append(m_br.group(0))
                annotated.append(m_br.group(1))
                i = m_br.end()
                continue
            ch = phrase[i]
            if ch.isalpha() or ch == "'":
                j = i
                while j < n and (phrase[j].isalpha() or phrase[j] == "'"):
                    j += 1
                word = phrase[i:j]
                # Only annotate pure alphabetic words (no contractions).
                if word.isalpha() and word_contains_phoneme(word, target_ipa):
                    ipa = word_to_ipa(word)
                    if ipa:
                        out.append(f"[{word}|/{ipa}/]")
                        annotated.append(word)
                        i = j
                        continue
                out.append(word)
                i = j
            else:
                out.append(ch)
                i += 1
        return "".join(out), annotated

    class BatchRewriteMnemonicsRequest(BaseModel):
        overwrite_existing_brackets: bool = False   # if True, strip prior [w|/ipa/] tokens and re-annotate from scratch
        only_ids: Optional[List[str]] = None        # if provided, restrict to this subset

    @router.post("/admin/phonemes/batch/rewrite-mnemonics")
    async def admin_batch_rewrite_mnemonics(
        payload: BatchRewriteMnemonicsRequest = BatchRewriteMnemonicsRequest(),
        admin: dict = Depends(get_admin_user),
    ):
        """Bulk-annotate every card's ``mnemonic.phrase`` with
        ``[word|/ipa/]`` bracket tokens derived from CMUdict.

        Returns per-card summary: ``{id, ipa, before, after, annotated,
        changed, skipped_reason?}``.
        """
        query: Dict[str, Any] = {}
        if payload.only_ids:
            query["id"] = {"$in": payload.only_ids}

        results: List[Dict[str, Any]] = []
        changed = 0
        skipped = 0
        async for card in coll.find(query, {"_id": 0, "id": 1, "ipa": 1,
                                              "mnemonic": 1, "mnemonic_locked": 1}):
            cid = card.get("id")
            ipa = (card.get("ipa") or "").strip()
            mn  = card.get("mnemonic") or {}
            phrase = (mn.get("phrase") or "").strip()

            entry: Dict[str, Any] = {"id": cid, "ipa": ipa, "before": phrase,
                                      "after": phrase, "annotated": [],
                                      "changed": False}

            if card.get("mnemonic_locked"):
                entry["skipped_reason"] = "mnemonic_locked"
                results.append(entry)
                skipped += 1
                continue
            if not phrase:
                entry["skipped_reason"] = "empty_phrase"
                results.append(entry)
                skipped += 1
                continue
            if not ipa:
                entry["skipped_reason"] = "no_target_ipa"
                results.append(entry)
                skipped += 1
                continue

            source_phrase = phrase
            if payload.overwrite_existing_brackets:
                # Strip existing bracket tokens back to plain surface words
                # before re-annotating from scratch.
                source_phrase = _BRACKET_TOKEN_RE.sub(
                    lambda m: m.group(1), phrase,
                )

            new_phrase, annotated = _rewrite_mnemonic_phrase(source_phrase, ipa)
            entry["after"] = new_phrase
            entry["annotated"] = annotated

            if new_phrase != phrase:
                # Clear stale audio so the next batch regenerates with SSML.
                new_mn = {**mn, "phrase": new_phrase}
                # Only wipe audio when the surface prose (post-bracket)
                # actually changed — pure bracket additions don't change
                # what a human hears, but SSML tags DO change the audio
                # pipeline, so we clear anyway.
                new_mn["audio"] = ""
                await coll.update_one({"id": cid}, {"$set": {
                    "mnemonic": new_mn,
                    "updatedAt": _now_iso(),
                    "updatedBy": admin.get("username"),
                }})
                entry["changed"] = True
                changed += 1
            results.append(entry)

        return {
            "ok":        True,
            "processed": len(results),
            "changed":   changed,
            "skipped":   skipped,
            "results":   results,
        }


    # =====================================================================
    # §Phase-3.5 · Manual audio URL patcher — set a single clip's URL
    # =====================================================================
    # Lets the Audio Studio (and Admin Editor) paste a URL generated by
    # the Voice Lab (or uploaded manually) DIRECTLY into any of the ~29
    # audio slots of a card, without going through ElevenLabs. Used when
    # ElevenLabs cannot pronounce a stubborn word (e.g. "care" on the
    # /e/-DRESS card) — the Prof pre-records the sound in a better
    # provider or picks it from a scientific IPA repository and pastes
    # the URL here. Idempotent, single writes only.
    # =====================================================================
    class PatchAudioUrlRequest(BaseModel):
        key: str          # e.g. "isolated-AmE", "word-3-RP", "mnemonic", "example-AmE-0"
        url: str          # relative /api/uploads/… or absolute — accepted as-is

    @router.patch("/admin/phonemes/{card_id}/audio-url")
    async def admin_patch_audio_url(
        card_id: str,
        payload: PatchAudioUrlRequest,
        admin: dict = Depends(get_admin_user),
    ):
        """Manually set a single clip's URL — bypasses ElevenLabs.

        ``key`` uses the same taxonomy as ``batch-audio.only_keys``:
          • ``isolated-AmE`` / ``isolated-RP``
          • ``example-AmE-{i}`` / ``example-RP-{i}``
          • ``mnemonic``
          • ``word-{i}-AmE`` / ``word-{i}-RP``
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        key = payload.key.strip()
        url = payload.url.strip()

        # Route the URL to the right slot in the doc — same taxonomy as
        # _compute_card_audio_items to guarantee reversibility.
        work_audio    = dict(doc.get("audio") or {})
        work_mnemonic = dict(doc.get("mnemonic") or {})
        work_common   = [dict(w) for w in (doc.get("commonWords") or [])]
        set_ops: Dict[str, Any] = {"updatedAt": _now_iso(),
                                    "updatedBy": admin.get("username")}

        if key in ("isolated-AmE", "isolated-RP"):
            d = key.split("-")[1]
            entry = dict(work_audio.get(d) or {})
            entry["isolated"] = url
            work_audio[d] = entry
            set_ops["audio"] = work_audio
        elif key.startswith("example-"):
            try:
                _, d, idx_s = key.split("-")
                idx = int(idx_s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Chiave esempio non valida: {key}")
            entry = dict(work_audio.get(d) or {})
            arr = list(entry.get("examples") or [])
            while len(arr) <= idx:
                arr.append("")
            arr[idx] = url
            entry["examples"] = arr
            work_audio[d] = entry
            set_ops["audio"] = work_audio
        elif key == "mnemonic":
            work_mnemonic["audio"] = url
            set_ops["mnemonic"] = work_mnemonic
        elif key.startswith("word-"):
            try:
                _, idx_s, d = key.split("-")
                idx = int(idx_s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Chiave parola non valida: {key}")
            if d not in ("AmE", "RP"):
                raise HTTPException(status_code=400, detail=f"Dialetto non valido: {d}")
            while len(work_common) <= idx:
                work_common.append({})
            work_common[idx][f"audio{d}"] = url
            set_ops["commonWords"] = work_common
        else:
            raise HTTPException(status_code=400, detail=f"Chiave audio non riconosciuta: {key}")

        await coll.update_one({"id": card_id}, {"$set": set_ops})
        return {"ok": True, "card_id": card_id, "key": key, "url": url}


    # =====================================================================
    # §Phase-3 · Mass Audio Generation (ElevenLabs) — per-card runner
    # =====================================================================
    # Frontend drives a card-by-card loop so we get natural progress
    # granularity, keep individual HTTP requests short (~30s per card),
    # and can display per-card progress. Skips clips whose URL is already
    # populated → idempotent, safe to re-run without paying twice.
    # =====================================================================
    class BatchAudioRequest(BaseModel):
        voice_ame:     Optional[str] = None   # voice_id for AmE items
        voice_rp:      Optional[str] = None   # voice_id for RP items
        voice_default: Optional[str] = None   # voice_id for dialect-agnostic (mnemonic, words)
        stability:     float = 0.42
        similarity_boost: float = 0.88
        style:         float = 0.05
        use_speaker_boost: bool = True
        model_id:      str = "eleven_multilingual_v2"
        output_format: str = "mp3_44100_128"
        words_limit:   int = 30       # top-N common words to synthesise per dialect
        include_words_rp: bool = True # if False, words only get AmE audio
        overwrite:     bool = False   # if True, regenerate even if URL exists
        only_keys:     Optional[List[str]] = None  # if provided, only items with key in this list
        # Per-clip overrides applied when regenerating from Audio Studio:
        # ``text_override[key]`` swaps the item's text (e.g. custom mnemonic
        # phrase). ``ipa_override[key]`` forces SSML IPA wrapping with the
        # given phoneme (e.g. user types "/ʌ/" in the studio → we send
        # ``<phoneme alphabet="ipa" ph="ʌ">…</phoneme>`` to ElevenLabs).
        text_override: Optional[Dict[str, str]] = None
        ipa_override:  Optional[Dict[str, str]] = None

    def _compute_card_audio_items(card: dict, words_limit: int,
                                    include_words_rp: bool) -> List[dict]:
        """Return the list of audio items for a single card. Includes an
        ``ipa`` field per item — set on ``group='isolated'`` clips so the
        TTS pipeline wraps them in SSML for scientifically accurate IPA
        pronunciation (see ``synthesize_and_store``).
        """
        items: List[dict] = []
        display_ipa = card.get("displayIpa") or f"/{card.get('ipa','')}/"
        # For isolated clips we emit ONLY the pure phoneme; the SSML
        # wrapping in ``synthesize_and_store`` turns this into the exact
        # IPA sound instead of "the letter U" or an approximate spelling.
        ipa_symbol = (card.get("ipa") or "").strip()
        isolated_text = ipa_symbol or (display_ipa.strip("/") if display_ipa else "")

        audio = card.get("audio") or {}
        for dialect in ("AmE", "RP"):
            cur = ((audio.get(dialect) or {}).get("isolated") or "")
            items.append({
                "key": f"isolated-{dialect}", "group": "isolated",
                "dialect": dialect, "text": isolated_text,
                "current_url": cur,
                "path": ["audio", dialect, "isolated"],
                "filename_slug": f"{card.get('id','card')}_isolated_{dialect}",
                "ipa": ipa_symbol,
            })

        for i, ex in enumerate(card.get("exampleSentences") or []):
            txt = (ex or {}).get("text") or ""
            if not txt.strip():
                continue
            for dialect in ("AmE", "RP"):
                cur = (((audio.get(dialect) or {}).get("examples") or [])[i]
                       if i < len((audio.get(dialect) or {}).get("examples") or []) else "")
                items.append({
                    "key": f"example-{dialect}-{i}", "group": "examples",
                    "dialect": dialect, "text": txt, "current_url": cur,
                    "path": ["audio", dialect, "examples", i],
                    "filename_slug": f"{card.get('id','card')}_example_{dialect}_{i+1}",
                    "ipa": "",
                })

        mn = card.get("mnemonic") or {}
        if (mn.get("phrase") or "").strip():
            items.append({
                "key": "mnemonic", "group": "mnemonic", "dialect": "default",
                "text": mn.get("phrase"),
                "current_url": mn.get("audio") or mn.get("audioAmE") or "",
                "path": ["mnemonic", "audio"],
                "filename_slug": f"{card.get('id','card')}_mnemonic",
                "ipa": "",
            })

        # Common words — top N by list order (already zipf-sorted from lexicon)
        for i, w in enumerate((card.get("commonWords") or [])[:max(0, words_limit)]):
            word = (w or {}).get("w", "").strip()
            if not word:
                continue
            items.append({
                "key": f"word-{i}-AmE", "group": "words", "dialect": "AmE",
                "text": word,
                "current_url": (w.get("audioAmE") or w.get("audio") or ""),
                "path": ["commonWords", i, "audioAmE"],
                "filename_slug": f"{card.get('id','card')}_word_{re.sub(r'[^a-z0-9]+','_', word.lower())}_AmE",
                "ipa": "",
            })
            if include_words_rp:
                items.append({
                    "key": f"word-{i}-RP", "group": "words", "dialect": "RP",
                    "text": word,
                    "current_url": (w.get("audioRP") or ""),
                    "path": ["commonWords", i, "audioRP"],
                    "filename_slug": f"{card.get('id','card')}_word_{re.sub(r'[^a-z0-9]+','_', word.lower())}_RP",
                    "ipa": "",
                })
        return items

    @router.post("/admin/phonemes/{card_id}/batch-audio")
    async def admin_batch_audio(
        card_id: str,
        payload: BatchAudioRequest,
        admin: dict = Depends(get_admin_user),
    ):
        """§Phase-3 · Mass audio synthesis for a single card.

        Iterates all audio items (isolated + examples + mnemonic + top-N words)
        and calls ElevenLabs for each clip whose URL is empty (or all clips
        when ``overwrite=true``). Persists URLs into the card doc under the
        proper nested path. Returns per-item status so the frontend can
        display progress + a final error list.

        Errors on individual clips DO NOT abort the run — the pipeline
        continues (matches option E=c: "continue always, show errors at end").
        """
        from .elevenlabs import synthesize_and_store
        from storage_helper import put_object as _emergent_put
        from pathlib import Path as _Path

        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        voice_map = {
            "AmE":     (payload.voice_ame or "").strip(),
            "RP":      (payload.voice_rp or "").strip(),
            "default": (payload.voice_default or "").strip(),
        }
        items = _compute_card_audio_items(
            doc, payload.words_limit, payload.include_words_rp
        )
        # Filter by only_keys if provided (Audio Studio per-item regen).
        if payload.only_keys:
            wanted = set(payload.only_keys)
            items = [it for it in items if it["key"] in wanted]

        generated: List[str] = []
        skipped:   List[str] = []
        errors:    List[dict] = []
        # We accumulate changes into an IN-MEMORY working copy of the doc
        # and re-serialise the affected top-level fields at the end. This
        # avoids MongoDB's "dotted-key array-index creates a subdocument
        # instead of an array" trap when the field doesn't pre-exist as
        # an array on the doc.
        work = dict(doc)
        work_audio = dict(work.get("audio") or {})
        for d in ("AmE", "RP"):
            entry = dict(work_audio.get(d) or {})
            # Normalise "examples": accept legacy dict-with-numeric-keys shape
            ex_raw = entry.get("examples") or []
            if isinstance(ex_raw, dict):
                ex_raw = [ex_raw.get(str(k), "") for k in sorted(ex_raw.keys(), key=lambda s: int(s) if str(s).isdigit() else 0)]
            entry["examples"] = list(ex_raw)
            work_audio[d] = entry
        work_mnemonic = dict(work.get("mnemonic") or {})
        work_common   = [dict(w) for w in (work.get("commonWords") or [])]
        fields_touched = set()

        # ``uploads_dir`` fallback for local write on emergent storage failure
        uploads_dir = _Path("/app/backend/uploads")

        for it in items:
            if it["current_url"] and not payload.overwrite:
                skipped.append(it["key"])
                continue

            voice_id = voice_map.get(it["dialect"]) or voice_map.get("default")
            # Apply per-clip overrides if the caller provided them (Audio Studio).
            item_text = (payload.text_override or {}).get(it["key"]) if payload.text_override else None
            item_text = item_text if item_text is not None else it["text"]
            item_ipa  = (payload.ipa_override or {}).get(it["key"]) if payload.ipa_override else None
            if item_ipa is None:
                # Auto-detect: if the text is a bare /…/ IPA token, treat as isolated phoneme.
                stripped = (item_text or "").strip()
                if len(stripped) >= 3 and stripped.startswith("/") and stripped.endswith("/"):
                    item_ipa = stripped.strip("/").strip()
            # Fall back to the item's baked-in IPA hint (only set for isolated).
            item_ipa = item_ipa if item_ipa is not None else it.get("ipa") or None

            try:
                res = synthesize_and_store(
                    text=item_text,
                    voice_id=voice_id,
                    emergent_put=_emergent_put,
                    uploads_dir=uploads_dir,
                    stability=payload.stability,
                    similarity_boost=payload.similarity_boost,
                    style=payload.style,
                    use_speaker_boost=payload.use_speaker_boost,
                    model_id=payload.model_id,
                    output_format=payload.output_format,
                    filename_hint=it["filename_slug"],
                    ipa_phoneme=item_ipa,
                )
                rel_url = res["relative_url"]
                # Write into the in-memory doc at ``path`` — arrays are
                # preserved as arrays, dicts as dicts.
                path = it["path"]
                if path[0] == "audio":
                    dialect, kind = path[1], path[2]
                    dentry = work_audio[dialect]
                    if kind == "isolated":
                        dentry["isolated"] = rel_url
                    elif kind == "examples":
                        idx = path[3]
                        arr = dentry.get("examples") or []
                        while len(arr) <= idx:
                            arr.append("")
                        arr[idx] = rel_url
                        dentry["examples"] = arr
                    work_audio[dialect] = dentry
                    fields_touched.add("audio")
                elif path[0] == "mnemonic":
                    work_mnemonic["audio"] = rel_url
                    fields_touched.add("mnemonic")
                elif path[0] == "commonWords":
                    idx = path[1]
                    key = path[2]  # audioAmE or audioRP
                    while len(work_common) <= idx:
                        work_common.append({})
                    work_common[idx][key] = rel_url
                    fields_touched.add("commonWords")
                generated.append(it["key"])
            except Exception as exc:  # noqa: BLE001
                errors.append({
                    "key":   it["key"],
                    "text":  it["text"][:60],
                    "error": f"{type(exc).__name__}: {str(exc)[:200]}",
                })

        if fields_touched:
            set_ops: Dict[str, Any] = {
                "updatedAt": _now_iso(),
                "updatedBy": admin.get("username"),
            }
            if "audio" in fields_touched:
                set_ops["audio"] = work_audio
            if "mnemonic" in fields_touched:
                set_ops["mnemonic"] = work_mnemonic
            if "commonWords" in fields_touched:
                set_ops["commonWords"] = work_common
            await coll.update_one({"id": card_id}, {"$set": set_ops})

        return {
            "ok":         True,
            "card_id":    card_id,
            "total":      len(items),
            "generated":  generated,
            "skipped":    skipped,
            "errors":     errors,
        }




    @router.post("/admin/phonemes/{card_id}/generate-hotspots")
    async def admin_generate_hotspots(
        card_id: str,
        admin: dict = Depends(get_admin_user),
    ):
        """§3.4 — Regenerate hotspots for a single card from the canonical
        rule engine (`phoneme_hotspot_rule.generate_hotspots_for_canonical`).

        Behaviour:
          • If the card has ``hotspots_locked=true`` → 409 with the current
            hotspot list preserved. The admin must clear the lock explicitly
            (e.g. via the editor) before re-running.
          • Otherwise the hotspots are recomputed deterministically from the
            canonical row (height/backness/rounding/tenseness for vowels;
            place/manner/voicing for consonants) with bilingual IT/EN
            localised copy attached to every hotspot.
          • Response: ``{ ok, hotspots, count, locked }``.
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        if doc.get("hotspots_locked"):
            return {
                "ok": False,
                "locked": True,
                "hotspots": doc.get("hotspots") or [],
                "count":    len(doc.get("hotspots") or []),
                "message":  "Card protetta (hotspots_locked=true). Sblocca il flag prima di rigenerare.",
            }
        ipa = (doc.get("ipa") or "").strip()
        if not ipa:
            raise HTTPException(status_code=400, detail="La card non ha un simbolo IPA valido.")
        hotspots = await apply_hotspot_rule_to_doc(db, doc)
        await coll.update_one({"id": card_id}, {"$set": {
            "hotspots": hotspots,
            "updatedAt": _now_iso(),
            "updatedBy": admin.get("username"),
        }})
        return {
            "ok": True,
            "locked": False,
            "hotspots": hotspots,
            "count": len(hotspots),
        }


    @router.post("/admin/phonemes/{card_id}/generate-lexicon")
    async def admin_generate_lexicon(
        card_id: str,
        admin: dict = Depends(get_admin_user),
    ):
        """§3.2/§3.3 · Regenerate ``commonWords`` and ``spellings`` from
        cmudict + wordfreq. Preserves existing audio URLs on words that
        survive the refresh (matched by lowercase spelling).

        409 if the card is flagged ``lexicon_locked=true``.
        """
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        if doc.get("lexicon_locked"):
            return {
                "ok": False, "locked": True,
                "commonWords": doc.get("commonWords") or [],
                "spellings":   doc.get("spellings") or [],
                "message":     "Card protetta (lexicon_locked=true). Sblocca il flag prima di rigenerare.",
            }
        ipa = (doc.get("ipa") or "").strip()
        if not ipa:
            raise HTTPException(status_code=400, detail="La card non ha un simbolo IPA valido.")
        bundle = await apply_lexicon_rule_to_doc(db, doc, preserve_audio=True)
        await coll.update_one({"id": card_id}, {"$set": {
            "commonWords": bundle["commonWords"],
            "spellings":   bundle["spellings"],
            "updatedAt":   _now_iso(),
            "updatedBy":   admin.get("username"),
        }})
        return {
            "ok": True, "locked": False,
            "commonWords":      bundle["commonWords"],
            "spellings":        bundle["spellings"],
            "commonWords_count": len(bundle["commonWords"]),
            "spellings_count":   len(bundle["spellings"]),
        }



    @router.post("/admin/phonemes/{card_id}/batch-fill-v2")
    async def admin_batch_fill_v2(
        card_id: str,
        payload: BatchFillV2Request,
        admin: dict = Depends(get_admin_user),
    ):
        """
        Full-taxonomy batch-fill (Phase-2 spec v1.0):
          • CANONICAL — looked up (never written)
          • DERIVED   — computed by rule: features/knobs/classification/vowelChartPosition
                        via autofill + facialMuscles via §3.1 muscle map
          • NEEDS_SOURCE — commonWords / spelling_distribution left untouched
                           (§3.2, §3.3 deferred — first-pass scope)
          • CREATIVE  — LLM-drafted with grounding contract; per-field confidence;
                        empty beats invented
          • Validation — deterministic §4 suite (except word_contains_phoneme)
          • Persist as bozza (published=false), never auto-publish
        """
        from .phoneme_batch_v2 import (
            compose_facial_muscles, draft_creative_fields,
            run_validation_suite, _muscle_levels_for,
        )

        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        if doc.get("published") and not payload.overwrite:
            raise HTTPException(status_code=409,
                                detail="La scheda è pubblicata — usa overwrite=true per forzare.")
        ipa = (doc.get("ipa") or "").strip()
        if not ipa:
            raise HTTPException(status_code=400, detail="La card non ha un simbolo IPA valido.")

        # ---- Dialect candidate iteration (reuse Phase F+ logic)
        preferred = payload.dialect
        candidate_dialects: List[str] = []
        if preferred:
            candidate_dialects.append(preferred)
        else:
            ds = doc.get("dialects") or []
            if "AmE" in ds or "GenAm" in ds:
                candidate_dialects.append("GenAm")
            if "RP" in ds and "RP" not in candidate_dialects:
                candidate_dialects.append("RP")
        for alt in ("GenAm", "RP"):
            if alt not in candidate_dialects:
                candidate_dialects.append(alt)

        # ---- 1) CANONICAL lookup (never written)
        canon = None
        dialect = None
        last_err = None
        for d in candidate_dialects:
            for candidate in _ipa_equivalents(ipa):
                canon = await db.canonical_phonemes.find_one(
                    {"dialect": d, "ipa": candidate}, {"_id": 0},
                )
                if canon:
                    dialect = d
                    break
            if canon:
                break
            last_err = f"{d}: /{ipa}/ non trovato"
        if not canon or not dialect:
            raise HTTPException(status_code=404, detail=f"CANONICAL lookup fallito: {last_err}")

        applied = {"derived": [], "creative": []}
        errors: List[str] = []
        update_fields: Dict[str, Any] = {}

        # ---- 2) DERIVED — autofill (features/knobs/classification/vowelChartPosition)
        autofill = await build_autofill_payload(db, ipa=ipa, dialect=dialect)
        for key in ("features", "knobs", "classification", "vowelChartPosition"):
            new_val = autofill.get(key)
            if not new_val:
                continue
            cur = doc.get(key)
            if payload.overwrite or _is_empty_or_default(cur):
                update_fields[key] = new_val
                applied["derived"].append(key)

        # ---- 3) DERIVED — facial muscles from §3.1 (spec-locked rule)
        kind = canon.get("kind", "vowel")
        muscles_new = compose_facial_muscles(ipa, kind)
        # Muscle levels are DERIVED-by-rule → always overwrite (spec §1 forbids LLM authoring)
        update_fields["facialMuscles"] = muscles_new
        applied["derived"].append("facialMuscles")
        muscles_expected = _muscle_levels_for(ipa, kind)

        # ---- 3b) DERIVED — hotspots from §3.4 (spec-locked rule).
        # Skipped when the card is flagged ``hotspots_locked=true`` — protects
        # manually authored reference cards (u-foot, i-fleece).
        if not doc.get("hotspots_locked"):
            from .phoneme_hotspot_rule import generate_hotspots_for_canonical
            hotspots_new = generate_hotspots_for_canonical(ipa, canon)
            update_fields["hotspots"] = hotspots_new
            applied["derived"].append("hotspots")

        # ---- 3c) DERIVED — commonWords + spellings from §3.2/§3.3
        # (cmudict + wordfreq). Preserves existing audio URLs on surviving
        # words. Skipped when ``lexicon_locked=true``.
        if not doc.get("lexicon_locked"):
            lex_bundle = await apply_lexicon_rule_to_doc(db, dict(doc), preserve_audio=True)
            if lex_bundle["commonWords"]:
                update_fields["commonWords"] = lex_bundle["commonWords"]
                applied["derived"].append("commonWords")
            if lex_bundle["spellings"]:
                update_fields["spellings"] = lex_bundle["spellings"]
                applied["derived"].append("spellings")

        # ---- 4) CREATIVE — grounded LLM draft
        creative: Dict[str, Any] = {}
        ai_confidences: Dict[str, float] = {}
        if payload.include_creative:
            existing_creative = {
                "mnemonic":         (doc.get("mnemonic") or {}).get("phrase", ""),
                "funFact":          (doc.get("funFact") or {}).get("body", ""),
                "deepDive":         (doc.get("pronunciationGuide") or {}).get("body", ""),
                "exampleSentences": doc.get("exampleSentences") or [],
                "videoScript":      (doc.get("videoLesson") or {}).get("script", ""),
            }
            creative = await draft_creative_fields(canon, ipa, dialect, muscles_new, existing_creative)
            if creative.get("error"):
                errors.append(f"CREATIVE draft: {creative['error']}")
                creative = {}

            # Apply CREATIVE fields with grounding contract (empty beats invented).
            # Determines whether a field needs drafting: True if missing, empty,
            # or a dict-skeleton whose payload key ("phrase"/"body"/"script") is
            # blank. Handles List-shaped fields (exampleSentences) — a common
            # source of 500 Internal Server Error before iter 38 (`.get('body')`
            # on a list raised AttributeError → batch-fill-v2 aborted for every
            # card that already had ≥1 example sentence).
            def _needs_draft(card_key: str, cur: Any) -> bool:
                if _is_empty_or_default(cur):
                    return True
                if not isinstance(cur, dict):
                    # Non-empty list/tuple/str → considered filled.
                    return False
                if card_key == "mnemonic":
                    return _is_empty_or_default(cur.get("phrase"))
                if card_key == "videoLesson":
                    return _is_empty_or_default(cur.get("script"))
                # funFact + pronunciationGuide (deep-dive) use "body"
                return _is_empty_or_default(cur.get("body"))

            def _apply_field(card_key: str, spec_key: str, apply_fn):
                blob = creative.get(spec_key)
                if not isinstance(blob, dict):
                    return
                cur = doc.get(card_key)
                if payload.overwrite or _needs_draft(card_key, cur):
                    new_val = apply_fn(blob, cur or {})
                    if new_val is not None:
                        update_fields[card_key] = new_val
                        applied["creative"].append(spec_key)
                        conf = blob.get("confidence")
                        if isinstance(conf, (int, float)):
                            ai_confidences[spec_key] = float(conf)

            # mnemonic: preserve audio if phrase unchanged; clear otherwise
            def _mn(blob, cur):
                phrase = blob.get("phrase") or cur.get("phrase", "")
                if not phrase:
                    return None
                cur_phrase = cur.get("phrase", "")
                new_audio = cur.get("audio", "") if phrase == cur_phrase else ""
                return {
                    **cur,
                    "phrase": phrase,
                    "highlights": blob.get("highlights") or cur.get("highlights", []),
                    "note":       blob.get("note")       or cur.get("note", ""),
                    "audio":      new_audio,
                    "grounded_on": blob.get("grounded_on") or [],
                    "confidence":  blob.get("confidence"),
                }
            def _ff(blob, cur):
                body = blob.get("body")
                if not body:
                    return None
                return {**cur, "headline": blob.get("headline") or cur.get("headline", ""),
                        "body": body,
                        "grounded_on": blob.get("grounded_on") or [],
                        "confidence": blob.get("confidence")}
            def _dd(blob, cur):
                body = blob.get("body")
                if not body:
                    return None
                return {**cur, "body": body,
                        "grounded_on": blob.get("grounded_on") or [],
                        "confidence": blob.get("confidence")}
            def _es(blob, cur):
                items = blob.get("items") or []
                if not items:
                    return None
                # exampleSentences on the card is List[Dict] — wrap strings if needed
                return [
                    it if isinstance(it, dict) else {"text": it}
                    for it in items
                ]
            def _vs(blob, cur):
                body = blob.get("body")
                if not body:
                    return None
                return {**cur, "script": body,
                        "grounded_on": blob.get("grounded_on") or [],
                        "confidence": blob.get("confidence")}

            _apply_field("mnemonic",         "mnemonic",         _mn)
            _apply_field("funFact",          "funFact",          _ff)
            _apply_field("pronunciationGuide","deepDive",        _dd)
            _apply_field("exampleSentences", "exampleSentences", _es)
            _apply_field("videoLesson",      "videoScript",      _vs)

        # ---- 5) Persist (never auto-publish)
        if update_fields:
            update_fields["updatedAt"] = _now_iso()
            update_fields["updatedBy"] = admin.get("username")
            update_fields["published"] = False
            await coll.update_one({"id": card_id}, {"$set": update_fields})

        # ---- 6) Deterministic validation (§4)
        updated = await coll.find_one({"id": card_id}, {"_id": 0})
        validation = run_validation_suite(updated, ipa, muscles_expected, creative)

        # ---- 7) Rescore readiness
        try:
            report = await build_readiness_report(db, updated)
            readiness_score = report["score"]
        except Exception:  # noqa: BLE001
            readiness_score = None

        return {
            "id": card_id,
            "dialect": dialect,
            "applied": applied,
            "errors": errors,
            "ai_confidences": ai_confidences,
            "muscles_rule": {
                "orbicularis_oris":  muscles_expected[0],
                "buccinator":        muscles_expected[1],
                "zygomaticus_major": muscles_expected[2],
                "masseter":          muscles_expected[3],
                "mentalis":          muscles_expected[4],
            },
            "validation": validation,
            "readinessScore": readiness_score,
            "message": (
                f"{len(applied['derived'])} campi DERIVED + "
                f"{len(applied['creative'])} campi CREATIVE draftati "
                f"({sum(1 for c in validation if c['status']=='pass')}/{len(validation)} validation pass)."
            ),
        }

    @router.get("/admin/phonemes/{card_id}", response_model=PhonemeCardResponse)
    async def admin_get(card_id: str, admin: dict = Depends(get_admin_user)):
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        await _inject_computed_chart(db, doc)
        return _to_response(doc)

    @router.post("/admin/phonemes", response_model=PhonemeCardResponse, status_code=201)
    async def admin_create(payload: PhonemeCardCreate, admin: dict = Depends(get_admin_user)):
        _validate_id(payload.id)

        existing = await coll.find_one({"id": payload.id}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Un fonema con id='{payload.id}' esiste già. Scegli un id diverso.",
            )

        now = _now_iso()
        doc = payload.model_dump()
        # Phase C lockdown: ignore any client-supplied frequencyChart at create time.
        doc["frequencyChart"] = []
        # §3.1 lockdown: facialMuscles is DERIVED-by-rule (Spec §1). Always
        # overwrite whatever the payload provided so the field is deterministic
        # for every present and future card.
        await apply_muscle_rule_to_doc(db, doc)
        # §3.2 lockdown: anatomicalLabels + airflowArrows + voicing are
        # DERIVED from the canonical inventory (place / manner / kind).
        await apply_overlay_rule_to_doc(db, doc)
        # §3.4 lockdown: hotspot list is DERIVED from canonical features
        # (skipped when hotspots_locked=true — e.g. manually curated u-foot).
        await apply_hotspot_rule_to_doc(db, doc)
        # §3.2/§3.3 lockdown: commonWords + spellings are DERIVED from cmudict
        # + wordfreq (skipped when lexicon_locked=true).
        await apply_lexicon_rule_to_doc(db, doc, preserve_audio=True)
        # §3.5 lockdown: pronunciationGuide 6-step protocol from canonical
        # features (skipped when pronunciation_locked=true). Body paragraph
        # is preserved if present.
        await apply_pronunciation_rule_to_doc(db, doc, preserve_body=True)
        doc["createdAt"] = now
        doc["updatedAt"] = now
        doc["createdBy"] = admin.get("username")
        doc["updatedBy"] = admin.get("username")

        await coll.insert_one(doc)
        await _inject_computed_chart(db, doc)
        return _to_response(doc)

    @router.put("/admin/phonemes/{card_id}", response_model=PhonemeCardResponse)
    async def admin_update(
        card_id: str,
        payload: PhonemeCardUpdate,
        admin: dict = Depends(get_admin_user),
    ):
        existing = await coll.find_one({"id": card_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        update_fields = {
            k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None
        }
        # Allow explicit None for optional nullable fields (videoLesson / funFact)
        raw = payload.model_dump(exclude_unset=True)
        for nullable in ("videoLesson", "funFact", "subcategory"):
            if nullable in raw:
                update_fields[nullable] = raw[nullable]

        # Phase C lockdown: frequencyChart is computed server-side from the
        # canonical inventory. Silently drop any incoming value so legacy
        # editors / autofill drafts can't corrupt it.
        update_fields.pop("frequencyChart", None)

        # §3.1 lockdown: any admin edit that touches ``ipa``, ``category`` or
        # ``facialMuscles`` must re-derive the muscle list from the rule.
        # Cheaper to just always recompute — keeps the field authoritative.
        merged = {**existing, **update_fields}
        muscles_new = await apply_muscle_rule_to_doc(db, merged)
        update_fields["facialMuscles"] = muscles_new
        # §3.2 overlay bundle — same idempotent recompute on every update.
        overlay_new = await apply_overlay_rule_to_doc(db, merged)
        update_fields["anatomicalLabels"] = overlay_new["anatomicalLabels"]
        update_fields["airflowArrows"]    = overlay_new["airflowArrows"]
        update_fields["voicing"]          = overlay_new["voicing"]
        # §3.4 hotspots — recompute unless hotspots_locked=true (skipped inside helper).
        # 🔒 Fix 07/07/2026: if the PATCH body explicitly includes ``hotspots``
        # (admin manually placed / edited / cleared them), auto-lock the card
        # so the rule engine doesn't overwrite the manual work on next save.
        # The admin must explicitly toggle ``hotspots_locked=false`` to opt
        # back into auto-generation.
        admin_touched_hotspots = "hotspots" in raw or raw.get("hotspots_locked") is not None
        if admin_touched_hotspots:
            update_fields["hotspots_locked"] = True if "hotspots" in raw and update_fields.get("hotspots_locked") is not False else update_fields.get("hotspots_locked", True)
            merged["hotspots_locked"] = update_fields["hotspots_locked"]
        hotspots_new = await apply_hotspot_rule_to_doc(db, merged)
        if not merged.get("hotspots_locked"):
            update_fields["hotspots"] = hotspots_new

        # §3.5 pronunciation protocol — same auto-lock policy as hotspots.
        # If the admin explicitly PATCH-es ``pronunciationGuide`` (steps or
        # body edits), auto-lock the card so subsequent saves don't
        # overwrite the manual work. Otherwise recompute deterministically
        # from the canonical features + preserve any AI-drafted body.
        admin_touched_pron = "pronunciationGuide" in raw or raw.get("pronunciation_locked") is not None
        if admin_touched_pron:
            update_fields["pronunciation_locked"] = True if "pronunciationGuide" in raw and update_fields.get("pronunciation_locked") is not False else update_fields.get("pronunciation_locked", True)
            merged["pronunciation_locked"] = update_fields["pronunciation_locked"]
        pron_new = await apply_pronunciation_rule_to_doc(db, merged, preserve_body=True)
        if not merged.get("pronunciation_locked"):
            update_fields["pronunciationGuide"] = pron_new

        if not update_fields:
            existing_computed = dict(existing)
            await _inject_computed_chart(db, existing_computed)
            return _to_response(existing_computed)

        update_fields["updatedAt"] = _now_iso()
        update_fields["updatedBy"] = admin.get("username")

        await coll.update_one({"id": card_id}, {"$set": update_fields})
        updated = await coll.find_one({"id": card_id}, {"_id": 0})
        await _inject_computed_chart(db, updated)
        return _to_response(updated)

    @router.delete("/admin/phonemes/{card_id}")
    async def admin_delete(card_id: str, admin: dict = Depends(get_admin_user)):
        result = await coll.delete_one({"id": card_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
        return {"deleted": card_id}

    @router.post("/admin/phonemes/{card_id}/publish", response_model=PhonemeCardSummary)
    async def admin_toggle_publish(card_id: str, admin: dict = Depends(get_admin_user)):
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")

        new_state = not bool(doc.get("published", False))
        await coll.update_one(
            {"id": card_id},
            {"$set": {"published": new_state, "updatedAt": _now_iso(), "updatedBy": admin.get("username")}},
        )
        doc["published"] = new_state
        return _summarise(doc)

    @router.post("/admin/phonemes/{card_id}/duplicate", response_model=PhonemeCardResponse, status_code=201)
    async def admin_duplicate(card_id: str, admin: dict = Depends(get_admin_user)):
        src = await coll.find_one({"id": card_id}, {"_id": 0})
        if not src:
            raise HTTPException(status_code=404, detail="Fonema di origine non trovato")

        # Generate a unique copy id
        base = f"{card_id}-copy"
        new_id = base
        n = 1
        while await coll.find_one({"id": new_id}, {"_id": 0, "id": 1}):
            n += 1
            new_id = f"{base}-{n}"

        now = _now_iso()
        clone = dict(src)
        clone["id"] = new_id
        clone["published"] = False
        clone["order"] = int(src.get("order", 100)) + 1
        clone["createdAt"] = now
        clone["updatedAt"] = now
        clone["createdBy"] = admin.get("username")
        clone["updatedBy"] = admin.get("username")

        await coll.insert_one(clone)
        return _to_response(clone)

    @router.get("/canonical/anatomical-labels")
    async def get_canonical_anatomical_labels():
        """Return the 12 shared anatomical landmarks used by the overlay.

        Position-fixed on the standard Steve Dapper sagittal template.
        Cached client-side; refresh only when the template art changes.
        """
        from .anatomical_overlay import CANONICAL_ANATOMICAL_LABELS
        return {"labels": CANONICAL_ANATOMICAL_LABELS}

    # ------------------------------------------------------------------ #
    # PUBLIC — read only, published only (admin JWT reveals drafts too)
    # ------------------------------------------------------------------ #
    @router.get("/phonemes", response_model=List[PhonemeCardSummary])
    async def public_list():
        docs = await coll.find({"published": True}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(1000)
        return [_summarise(d) for d in docs]

    @router.get("/phonemes/{card_id}", response_model=PhonemeCardResponse)
    async def public_get(
        card_id: str,
        admin: Optional[dict] = Depends(get_optional_admin_user),
    ):
        # Authenticated admins can preview unpublished drafts. Anonymous
        # callers still only see published cards → 404 otherwise.
        query: Dict[str, Any] = {"id": card_id}
        if not admin:
            query["published"] = True
        doc = await coll.find_one(query, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato o non pubblicato")
        await _inject_computed_chart(db, doc)
        return _to_response(doc)

    return router


# --------------------------------------------------------------------------- #
# Idempotent seed (called from server.py startup)
# --------------------------------------------------------------------------- #
async def ensure_phoneme_seed(db) -> Dict[str, Any]:
    """
    Insert the two initial cards if they are not already present.

    Idempotent: never touches an existing document. Returns a summary dict
    for logging purposes.
    """
    from .phoneme_seed_data import SEED_PHONEMES  # local import to avoid cycles

    coll = db.phoneme_cards
    inserted: List[str] = []
    skipped: List[str] = []
    now = _now_iso()

    for seed in SEED_PHONEMES:
        existing = await coll.find_one({"id": seed["id"]}, {"_id": 0, "id": 1})
        if existing:
            skipped.append(seed["id"])
            continue

        doc = dict(seed)
        doc.setdefault("published", True)
        doc.setdefault("order", 100)
        doc["createdAt"] = now
        doc["updatedAt"] = now
        doc["createdBy"] = "system-seed"
        doc["updatedBy"] = "system-seed"

        await coll.insert_one(doc)
        inserted.append(seed["id"])

    # --- Phase B legacy correctness patch (idempotent) ---
    # Corrects deprecated free-text values that were seeded before Phase B locked
    # the controlled vocabularies. Only touches docs that still hold the exact
    # legacy string — user edits are preserved.
    patched: List[str] = []

    # 1) classification label "Near-high" → "Near-close" (u-foot)
    res1 = await coll.update_many(
        {"classification.label": "Near-high"},
        {"$set": {"classification.$[el].label": "Near-close",
                  "classification.$[el].tooltip": "The tongue body rises high in the mouth but does not fully close (which would produce /uː/). Standard IPA height term."}},
        array_filters=[{"el.label": "Near-high"}],
    )
    if res1.modified_count:
        patched.append(f"classification.Near-high×{res1.modified_count}")

    # 2) facialMuscles.activation → strict enum HIGH/MODERATE/LOW
    activation_map = {
        "moderate": "MODERATE",
        "near-close": "MODERATE",
        "close": "HIGH",
        "minimal": "LOW",
    }
    for bad, good in activation_map.items():
        res = await coll.update_many(
            {"facialMuscles.activation": bad},
            {"$set": {"facialMuscles.$[el].activation": good}},
            array_filters=[{"el.activation": bad}],
        )
        if res.modified_count:
            patched.append(f"activation.{bad}→{good}×{res.modified_count}")

    # 3) funFact "least common vowel" superlative removal
    res3 = await coll.update_many(
        {"funFact.body": {"$regex": r"least common vowel"}},
        {"$set": {"funFact.body": "The /ʊ/ sound occurs in a relatively small closed-class of English words — mastering it is a strong differentiator in spoken performance."}},
    )
    if res3.modified_count:
        patched.append(f"funFact.least-common×{res3.modified_count}")

    # 4) knobs where id='height' → capitalize valueLabel to canonical IPA form
    knob_map = {
        "close": "Close",
        "near-close": "Near-close",
        "close-mid": "Close-mid",
        "mid": "Mid",
        "open-mid": "Open-mid",
        "near-open": "Near-open",
        "open": "Open",
    }
    for bad, good in knob_map.items():
        res = await coll.update_many(
            {"knobs": {"$elemMatch": {"id": "height", "valueLabel": bad}}},
            {"$set": {"knobs.$[el].valueLabel": good}},
            array_filters=[{"el.id": "height", "el.valueLabel": bad}],
        )
        if res.modified_count:
            patched.append(f"knob.height.{bad}→{good}×{res.modified_count}")

    # 5) Phase E — normalise Rounding parenthetical qualifiers to match canonical
    #    e.g. "Unrounded (spread)" → "Unrounded"
    for bad, good in [("Unrounded (spread)", "Unrounded"),
                      ("Unrounded (r-colored)", "Unrounded"),
                      ("Rounded (protruded)", "Rounded")]:
        res = await coll.update_many(
            {"features": {"$elemMatch": {"label": "Rounding", "value": bad}}},
            {"$set": {"features.$[el].value": good}},
            array_filters=[{"el.label": "Rounding", "el.value": bad}],
        )
        if res.modified_count:
            patched.append(f"rounding.{bad}→{good}×{res.modified_count}")

    # 6) §3.1 muscle-rule backfill — recompute facialMuscles for every card
    #    from the deterministic vowel/consonant map. Idempotent: cards already
    #    matching the rule are updated with identical values (no user impact).
    muscle_fixed = 0
    async for card in coll.find({}, {"_id": 0, "id": 1, "ipa": 1, "category": 1, "facialMuscles": 1}):
        try:
            new_muscles = await apply_muscle_rule_to_doc(db, dict(card))
        except Exception:  # noqa: BLE001
            continue
        # Compare shape-independent (name+activation) — details are rule-fixed.
        old = card.get("facialMuscles") or []
        old_pairs = tuple((m.get("name", ""), (m.get("activation") or "").upper()) for m in old)
        new_pairs = tuple((m["name"], m["activation"]) for m in new_muscles)
        if old_pairs != new_pairs:
            await coll.update_one({"id": card["id"]}, {"$set": {"facialMuscles": new_muscles}})
            muscle_fixed += 1
    if muscle_fixed:
        patched.append(f"facialMuscles.§3.1×{muscle_fixed}")

    # 7) §3.2 overlay backfill — anatomicalLabels/airflowArrows/voicing
    #    derived from canonical_phonemes (place, manner, kind, voicing).
    overlay_fixed = 0
    async for card in coll.find({}, {"_id": 0, "id": 1, "ipa": 1, "category": 1,
                                     "anatomicalLabels": 1, "airflowArrows": 1, "voicing": 1}):
        try:
            new_bundle = await apply_overlay_rule_to_doc(db, dict(card))
        except Exception:  # noqa: BLE001
            continue
        old_labels = list(card.get("anatomicalLabels") or [])
        old_arrows = card.get("airflowArrows") or []
        old_voicing = card.get("voicing") or ""
        if (old_labels != new_bundle["anatomicalLabels"]
                or old_arrows != new_bundle["airflowArrows"]
                or old_voicing != new_bundle["voicing"]):
            await coll.update_one({"id": card["id"]}, {"$set": {
                "anatomicalLabels": new_bundle["anatomicalLabels"],
                "airflowArrows":    new_bundle["airflowArrows"],
                "voicing":          new_bundle["voicing"],
            }})
            overlay_fixed += 1
    if overlay_fixed:
        patched.append(f"overlay.§3.2×{overlay_fixed}")

    # 8) §3.4 hotspot backfill — regenerate hotspots for every card except
    #    those flagged ``hotspots_locked=true`` (manually curated cards
    #    like u-foot, i-fleece). Idempotent: unchanged cards get identical
    #    output and skip the write.
    hotspot_fixed = 0
    async for card in coll.find({}, {"_id": 0, "id": 1, "ipa": 1, "category": 1,
                                     "hotspots": 1, "hotspots_locked": 1}):
        if card.get("hotspots_locked"):
            continue
        try:
            new_hotspots = await apply_hotspot_rule_to_doc(db, dict(card))
        except Exception:  # noqa: BLE001
            continue
        old = card.get("hotspots") or []
        # Compare by id+coords tuple (detail localisation churn shouldn't
        # trigger writes unless the pedagogical structure changed).
        old_shape = tuple((h.get("id", ""), h.get("x"), h.get("y")) for h in old)
        new_shape = tuple((h.get("id", ""), h.get("x"), h.get("y")) for h in new_hotspots)
        if old_shape != new_shape or len(old) != len(new_hotspots):
            await coll.update_one({"id": card["id"]}, {"$set": {"hotspots": new_hotspots}})
            hotspot_fixed += 1
    if hotspot_fixed:
        patched.append(f"hotspots.§3.4×{hotspot_fixed}")

    # 9) §3.2/§3.3 lexicon backfill — commonWords + spellings from cmudict.
    #    Skipped when the card is flagged ``lexicon_locked=true``. Only
    #    fills cards whose commonWords are effectively empty (< 3) so we
    #    don't nuke manual curation on already-populated cards; ``audioAmE``/
    #    ``audioRP`` URLs are preserved for words that survive the refresh.
    lexicon_fixed = 0
    async for card in coll.find({}, {"_id": 0, "id": 1, "ipa": 1, "commonWords": 1,
                                     "spellings": 1, "lexicon_locked": 1}):
        if card.get("lexicon_locked"):
            continue
        current_words = card.get("commonWords") or []
        if len(current_words) >= 3:
            continue   # respect existing user-authored / prior batch output
        try:
            bundle = await apply_lexicon_rule_to_doc(db, dict(card), preserve_audio=True)
        except Exception:  # noqa: BLE001
            continue
        if not bundle["commonWords"]:
            continue
        await coll.update_one({"id": card["id"]}, {"$set": {
            "commonWords": bundle["commonWords"],
            "spellings":   bundle["spellings"],
        }})
        lexicon_fixed += 1
    if lexicon_fixed:
        patched.append(f"lexicon.§3.2×{lexicon_fixed}")

    # 10) §3.5 pronunciation protocol backfill — recompute the 6-step
    #     guide for every card except those flagged ``pronunciation_locked``.
    #     Preserves any pre-existing ``body`` paragraph (AI-drafted).
    #     Skips cards that already have >= 6 steps AND identical grounded_on
    #     signature (idempotent — avoids write churn on already-composed cards).
    pron_fixed = 0
    async for card in coll.find({}, {"_id": 0, "id": 1, "ipa": 1,
                                     "pronunciationGuide": 1,
                                     "pronunciation_locked": 1}):
        if card.get("pronunciation_locked"):
            continue
        try:
            fresh = await apply_pronunciation_rule_to_doc(db, dict(card), preserve_body=True)
        except Exception:  # noqa: BLE001
            continue
        if not fresh or not fresh.get("steps"):
            continue
        existing = card.get("pronunciationGuide") or {}
        existing_steps = existing.get("steps") or []
        # If existing has 6 steps already, only rewrite when the step
        # labels differ (schema drift) — spec change scenario.
        if len(existing_steps) == 6 and all(
            (existing_steps[i].get("label") == fresh["steps"][i]["label"])
            for i in range(6)
        ):
            continue
        await coll.update_one({"id": card["id"]}, {"$set": {
            "pronunciationGuide": fresh,
        }})
        pron_fixed += 1
    if pron_fixed:
        patched.append(f"pronunciation.§3.5×{pron_fixed}")

    # 11) AmE-variant migration — clone 8 dialect-divergent RP cards into
    #     their own independent AmE-specific entries (e.g. /ɛ/ epsilon-dress-ame,
    #     /ɚ/ schwar-letter-ame, /ɑ/ ah-palm-ame …). Idempotent: cards that
    #     already exist are left untouched, no audio is ever overwritten.
    #     This runs on every backend startup so a fresh production DB gets
    #     populated automatically without any manual script execution.
    try:
        from scripts.create_ame_variant_cards import ensure_ame_variant_cards
        ame_result = await ensure_ame_variant_cards(db)
        if ame_result["created"]:
            patched.append(f"ame-variants.created×{len(ame_result['created'])}")
        if ame_result["missing_src"]:
            patched.append(f"ame-variants.missing-src×{len(ame_result['missing_src'])}")
    except Exception as e:  # noqa: BLE001
        # Never fail the whole seed for the AmE migration — log and continue.
        patched.append(f"ame-variants.error:{type(e).__name__}")

    return {"inserted": inserted, "skipped": skipped, "patched": patched}
