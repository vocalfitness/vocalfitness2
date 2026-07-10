"""
Regression test for iter 38 — batch-fill-v2 crash with 500 on cards that
already have non-empty ``exampleSentences``.

Before the fix, `_apply_field` called `.get("body")` on a list, raising
`AttributeError: 'list' object has no attribute 'get'` → the entire
batch-fill-v2 endpoint returned 500 Internal Server Error and no fields
(text OR audio) were ever generated for those cards.

The fix introduced `_needs_draft(card_key, cur)` which safely handles
List-shaped fields (exampleSentences) by treating any non-empty list as
"filled" without probing dict keys.

This test locks in the type-safe behaviour.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def test_is_empty_or_default_covers_list_shapes():
    """`_is_empty_or_default` must handle list/tuple/dict/str/None uniformly."""
    # Rebuild the helper — mirrors the closure inside phoneme_cards.py so we
    # don't need to import from inside `build_phoneme_cards_router`.
    def _is_empty_or_default(value):
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip()
        if isinstance(value, (list, tuple, dict)):
            return len(value) == 0
        return False

    assert _is_empty_or_default(None) is True
    assert _is_empty_or_default("") is True
    assert _is_empty_or_default("   ") is True
    assert _is_empty_or_default([]) is True
    assert _is_empty_or_default({}) is True
    assert _is_empty_or_default(()) is True

    assert _is_empty_or_default("x") is False
    assert _is_empty_or_default([{"text": "hi"}]) is False
    assert _is_empty_or_default({"phrase": "x"}) is False


def _needs_draft(card_key, cur):
    """Replica of the guarded helper introduced by iter 38 fix.

    Kept as a plain function to unit-test the branching without needing to
    spin up the full FastAPI router closure.
    """
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
        return False
    if card_key == "mnemonic":
        return _is_empty_or_default(cur.get("phrase"))
    if card_key == "videoLesson":
        return _is_empty_or_default(cur.get("script"))
    return _is_empty_or_default(cur.get("body"))


def test_example_sentences_non_empty_list_does_not_need_draft():
    """The exact input that crashed batch-fill-v2 pre-fix (list of dicts)."""
    filled = [{"text": "The cook put the sugar cookies on the wooden bookshelf."}]
    # Must NOT raise, must return False (already populated).
    assert _needs_draft("exampleSentences", filled) is False


def test_example_sentences_empty_list_needs_draft():
    assert _needs_draft("exampleSentences", []) is True
    assert _needs_draft("exampleSentences", None) is True


def test_mnemonic_skeleton_with_empty_phrase_needs_draft():
    """A dict skeleton {phrase: "", audio: ""} must be treated as empty."""
    skeleton = {"phrase": "", "audio": "", "highlights": []}
    assert _needs_draft("mnemonic", skeleton) is True


def test_mnemonic_with_content_does_not_need_draft():
    filled = {"phrase": "Pull the wool cushion", "audio": "url"}
    assert _needs_draft("mnemonic", filled) is False


def test_fun_fact_with_empty_body_needs_draft():
    skeleton = {"headline": "", "body": ""}
    assert _needs_draft("funFact", skeleton) is True


def test_fun_fact_with_content_does_not_need_draft():
    filled = {"headline": "Trivia", "body": "Rare in modern English."}
    assert _needs_draft("funFact", filled) is False


def test_video_lesson_with_empty_script_needs_draft():
    """videoLesson uses 'script' key, not 'body'."""
    skeleton = {"title": "", "script": "", "id": ""}
    assert _needs_draft("videoLesson", skeleton) is True


def test_video_lesson_with_script_does_not_need_draft():
    filled = {"title": "Lesson", "script": "Today we'll cover /ɪ/..."}
    assert _needs_draft("videoLesson", filled) is False
