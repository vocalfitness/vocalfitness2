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
import re

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
    spellings: List[Dict[str, Any]] = Field(default_factory=list)
    frequencyChart: List[Dict[str, Any]] = Field(default_factory=list)
    features: List[Dict[str, Any]] = Field(default_factory=list)
    knobs: List[Dict[str, Any]] = Field(default_factory=list)
    exampleSentences: List[Dict[str, Any]] = Field(default_factory=list)
    facialMuscles: List[Dict[str, Any]] = Field(default_factory=list)
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
        target = await db.canonical_phonemes.find_one(
            {"dialect": dialect_val, "ipa": ipa},
            {"_id": 0, "ipa": 1, "frequency_rank": 1},
        )
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
    """
    if dialect not in ("GenAm", "RP"):
        raise HTTPException(status_code=400, detail="dialect deve essere 'GenAm' o 'RP'")
    if not ipa:
        raise HTTPException(status_code=400, detail="ipa obbligatorio")

    doc = await db.canonical_phonemes.find_one(
        {"dialect": dialect, "ipa": ipa}, {"_id": 0},
    )
    if not doc:
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
_ACTIVATION_ENUM = {"HIGH", "MODERATE", "LOW"}
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
            row = await db.canonical_phonemes.find_one({"dialect": cd, "ipa": card_ipa}, {"_id": 0})
            if row:
                canonical_docs[cd] = row
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
# Router factory (so we can inject the shared db + admin dependency)
# --------------------------------------------------------------------------- #
def build_phoneme_cards_router(db, get_admin_user):
    """
    Build and return the APIRouter.

    ``db`` is the motor database instance from server.py.
    ``get_admin_user`` is the existing FastAPI dependency that
    enforces role == "admin".
    """

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

    # ------------------------------------------------------------------ #
    # PUBLIC — read only, published only
    # ------------------------------------------------------------------ #
    @router.get("/phonemes", response_model=List[PhonemeCardSummary])
    async def public_list():
        docs = await coll.find({"published": True}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(1000)
        return [_summarise(d) for d in docs]

    @router.get("/phonemes/{card_id}", response_model=PhonemeCardResponse)
    async def public_get(card_id: str):
        doc = await coll.find_one({"id": card_id, "published": True}, {"_id": 0})
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

    return {"inserted": inserted, "skipped": skipped, "patched": patched}
