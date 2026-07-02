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

    @router.get("/admin/phonemes/{card_id}", response_model=PhonemeCardResponse)
    async def admin_get(card_id: str, admin: dict = Depends(get_admin_user)):
        doc = await coll.find_one({"id": card_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Fonema non trovato")
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
        doc["createdAt"] = now
        doc["updatedAt"] = now
        doc["createdBy"] = admin.get("username")
        doc["updatedBy"] = admin.get("username")

        await coll.insert_one(doc)
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

        if not update_fields:
            return _to_response(existing)

        update_fields["updatedAt"] = _now_iso()
        update_fields["updatedBy"] = admin.get("username")

        await coll.update_one({"id": card_id}, {"$set": update_fields})
        updated = await coll.find_one({"id": card_id}, {"_id": 0})
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

    return {"inserted": inserted, "skipped": skipped}
