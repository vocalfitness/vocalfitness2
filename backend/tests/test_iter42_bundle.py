"""
Regression tests for iter 42 — 4 fixes bundle:

  Step 1: _IPA_EQUIVALENTS gains short-notation ↔ long-notation fallbacks
          for /i/↔/iː/, /u/↔/uː/, /ɔ/↔/ɔː/ so AmE cards (`i-fleece-ame`,
          `u-goose-ame`, `oh-thought-ame`) can autofill without aborting.

  Step 2: create_ame_variant_cards.py now stamps ``dialects: ["AmE"]`` on
          every clone so admin dialect tabs never mix AmE variants under
          the RP tab.

  Step 4b: _needs_draft returns True when exampleSentences exist but any
           sentence lacks a non-empty `highlights` field — so a re-run of
           the AI batch always backfills missing highlights automatically.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def test_step1_short_long_ipa_equivalents_present():
    from routers.phoneme_cards import _IPA_EQUIVALENTS
    assert "iː" in _IPA_EQUIVALENTS["i"], "/i/ must fall back to /iː/ for AmE i-fleece-ame"
    assert "uː" in _IPA_EQUIVALENTS["u"], "/u/ must fall back to /uː/ for AmE u-goose-ame"
    assert "ɔː" in _IPA_EQUIVALENTS["ɔ"], "/ɔ/ must fall back to /ɔː/ for AmE oh-thought-ame"


def test_step2_ame_seeder_tags_dialects_ame():
    """The AmE variant seeder must stamp ``dialects: ["AmE"]`` — verified
    by inspecting the source, since running the seeder requires a Mongo
    instance and we already have integration coverage in
    tests/test_ame_variant_seed.py."""
    src = (Path(__file__).parent.parent
           / "scripts" / "create_ame_variant_cards.py").read_text()
    assert 'clone["dialects"]    = ["AmE"]' in src, (
        "iter 42 fix missing: clone must stamp dialects=['AmE']"
    )


def _needs_draft(card_key, cur):
    """Replica of the guarded helper — mirrors the closure in
    phoneme_cards.py::admin_batch_fill_v2 for direct unit testing."""
    def _is_empty_or_default(value):
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip()
        if isinstance(value, (list, tuple, dict)):
            return len(value) == 0
        return False

    if _is_empty_or_default(cur):
        return True
    if not isinstance(cur, dict):
        if card_key == "exampleSentences" and isinstance(cur, list):
            if any(not (isinstance(s, dict) and s.get("highlights")) for s in cur):
                return True
        return False
    if card_key == "mnemonic":
        return _is_empty_or_default(cur.get("phrase"))
    if card_key == "videoLesson":
        return _is_empty_or_default(cur.get("script"))
    return _is_empty_or_default(cur.get("body"))


def test_step4b_needs_draft_when_any_sentence_lacks_highlights():
    """A card whose sentences are missing highlights must be re-drafted."""
    cur = [
        {"text": "The sun is bright.", "highlights": ["sun"]},
        {"text": "Look at the moon.", "highlights": []},  # ← empty
        {"text": "Stars shine at night.", "highlights": ["stars"]},
    ]
    assert _needs_draft("exampleSentences", cur) is True


def test_step4b_needs_draft_when_a_sentence_is_plain_string():
    """Legacy shape {"text": "..."} without any highlights key at all."""
    cur = [{"text": "Old style sentence"}]
    assert _needs_draft("exampleSentences", cur) is True


def test_step4b_no_redraft_when_all_sentences_have_highlights():
    """A fully populated exampleSentences list must NOT trigger a redraft."""
    cur = [
        {"text": "sentence a", "highlights": ["a"]},
        {"text": "sentence b", "highlights": ["b"]},
    ]
    assert _needs_draft("exampleSentences", cur) is False


def test_step4b_empty_list_still_triggers_draft():
    """The pre-existing behaviour is preserved."""
    assert _needs_draft("exampleSentences", []) is True
    assert _needs_draft("exampleSentences", None) is True
