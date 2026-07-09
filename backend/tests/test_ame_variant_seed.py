"""
Regression tests for the AmE-variant card auto-migration.

Guarantees that on backend startup:
  1. All 8 AmE dialect-specific cards are created if they don't exist.
  2. Existing cards are never touched (idempotent).
  3. Missing source RP cards are reported (not fatal).

Uses in-memory fake DB (same pattern as test_seed_admin.py) so no live
Mongo required. Run with: pytest backend/tests/test_ame_variant_seed.py -v
"""
import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.create_ame_variant_cards import (  # noqa: E402
    AME_VARIANTS,
    ensure_ame_variant_cards,
)


# ---------------------------------------------------------------------------
# In-memory fake Mongo collection — mimics only the methods used by
# ensure_ame_variant_cards: find_one, insert_one. No transactions, no cursor.
# ---------------------------------------------------------------------------
class FakeColl:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return dict(d)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))


class FakeDB:
    def __init__(self, cards=None):
        self.phoneme_cards = FakeColl(cards)

    def __getitem__(self, name):
        assert name == "phoneme_cards"
        return self.phoneme_cards


def _rp_sources_fixture():
    """Minimal RP source docs required by the 8 AmE variants."""
    src_ids = {v[0] for v in AME_VARIANTS}
    return [
        {
            "id": sid,
            "ipa": "x",
            "displayName": f"RP source {sid}",
            "title": f"{sid} (RP)",
            "category": "vowel",
            "published": True,
            "order": 10,
            "audio": {"AmE": {"isolated": "old-ame.mp3", "examples": ["a.mp3"]},
                      "RP":  {"isolated": "old-rp.mp3",  "examples": ["r.mp3"]}},
            "mnemonic": {"phrase": "keep-this", "audio": "mn.mp3"},
            "commonWords": [{"word": "keep", "audioAmE": "w.mp3", "audioRP": "w.mp3"}],
            "hotspots_locked": True,
            "lexicon_locked": True,
        }
        for sid in src_ids
    ]


def test_creates_all_eight_variants_on_empty_db():
    db = FakeDB(_rp_sources_fixture())
    result = asyncio.run(ensure_ame_variant_cards(db))
    assert len(result["created"]) == 8, f"Expected 8, got {result}"
    assert result["skipped"] == []
    assert result["missing_src"] == []
    for _src, new_id, ipa, _disp, _title in AME_VARIANTS:
        doc = asyncio.run(db.phoneme_cards.find_one({"id": new_id}))
        assert doc is not None, f"{new_id} missing after migration"
        assert doc["ipa"] == ipa
        assert doc["published"] is False, "clones must start as draft"


def test_idempotent_second_run_creates_nothing():
    db = FakeDB(_rp_sources_fixture())
    first = asyncio.run(ensure_ame_variant_cards(db))
    assert len(first["created"]) == 8
    second = asyncio.run(ensure_ame_variant_cards(db))
    assert second["created"] == []
    assert len(second["skipped"]) == 8
    assert second["missing_src"] == []


def test_clones_strip_all_audio_slots():
    db = FakeDB(_rp_sources_fixture())
    asyncio.run(ensure_ame_variant_cards(db))
    clone = asyncio.run(db.phoneme_cards.find_one({"id": "epsilon-dress-ame"}))
    assert clone["audio"]["AmE"]["isolated"] == ""
    assert clone["audio"]["RP"]["isolated"] == ""
    assert clone["mnemonic"]["audio"] == ""
    for w in clone["commonWords"]:
        assert w["audioAmE"] == "" and w["audioRP"] == ""


def test_clones_reset_locks():
    db = FakeDB(_rp_sources_fixture())
    asyncio.run(ensure_ame_variant_cards(db))
    clone = asyncio.run(db.phoneme_cards.find_one({"id": "epsilon-dress-ame"}))
    assert clone["hotspots_locked"] is False
    assert clone["lexicon_locked"] is False


def test_missing_source_is_reported_not_fatal():
    db = FakeDB([])  # no RP sources → all variants should report missing_src
    result = asyncio.run(ensure_ame_variant_cards(db))
    assert result["created"] == []
    assert len(result["missing_src"]) == 8


def test_new_ipa_and_display_are_patched_correctly():
    """The clone must inherit RP structure but with new IPA/displayName/title."""
    db = FakeDB(_rp_sources_fixture())
    asyncio.run(ensure_ame_variant_cards(db))
    epsilon = asyncio.run(db.phoneme_cards.find_one({"id": "epsilon-dress-ame"}))
    assert epsilon["ipa"] == "ɛ"
    assert epsilon["displayName"] == "DRESS (AmE)"
    assert epsilon["title"] == "DRESS (AmE) · /ɛ/"
    assert epsilon["createdBy"] == "migration:create_ame_variant_cards"
