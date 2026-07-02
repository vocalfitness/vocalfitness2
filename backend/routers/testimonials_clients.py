"""Testimonials & Clients — public REST endpoints.

Two simple domains fetched by the marketing homepage and about page:

* ``GET  /testimonials`` — with ``language`` / ``featured`` filters
* ``POST /testimonials`` — admin form (create)
* ``GET  /clients``      — with ``featured`` filter
* ``POST /clients``      — admin form (create)

Models are defined inline (small dataclass-like Pydantic models) to keep
this router independent from ``server.py``. If a shared ``models/`` module
gets introduced later, we can import them from there instead.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class TestimonialCreate(BaseModel):
    text: str
    author: str
    role: str
    company: str = ""
    location: str = ""
    language: str = "en"
    featured: bool = False


class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author: str
    role: str
    company: str = ""
    location: str = ""
    language: str = "en"
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClientCreate(BaseModel):
    name: str
    logo_url: str
    website: str = ""
    sector: str = ""
    featured: bool = False


class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo_url: str
    website: str = ""
    sector: str = ""
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_testimonials_clients_router(db) -> APIRouter:
    router = APIRouter()

    @router.get("/testimonials")
    async def get_testimonials(
        language: Optional[str] = None,
        featured: Optional[bool] = None,
    ):
        """Get all testimonials with optional language and featured filters."""
        query = {}
        if language:
            query["language"] = language
        if featured is not None:
            query["featured"] = featured
        testimonials = await db.testimonials.find(query, {"_id": 0}).to_list(1000)
        for t in testimonials:
            if isinstance(t.get("created_at"), str):
                t["created_at"] = datetime.fromisoformat(t["created_at"])
        return {"testimonials": testimonials}

    @router.post("/testimonials", response_model=Testimonial, status_code=201)
    async def create_testimonial(payload: TestimonialCreate):
        """Create a new testimonial."""
        testimonial = Testimonial(**payload.model_dump())
        doc = testimonial.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.testimonials.insert_one(doc)
        return testimonial

    @router.get("/clients")
    async def get_clients(featured: Optional[bool] = None):
        """Get all client companies with optional featured filter."""
        query = {}
        if featured is not None:
            query["featured"] = featured
        clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
        for c in clients:
            if isinstance(c.get("created_at"), str):
                c["created_at"] = datetime.fromisoformat(c["created_at"])
        return {"clients": clients}

    @router.post("/clients", response_model=Client, status_code=201)
    async def create_client(payload: ClientCreate):
        """Create a new client company."""
        client = Client(**payload.model_dump())
        doc = client.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.clients.insert_one(doc)
        return client

    return router
