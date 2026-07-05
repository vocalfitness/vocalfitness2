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
        return [_summarise(d) for d in docs]

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

    return {"inserted": inserted, "skipped": skipped, "patched": patched}
