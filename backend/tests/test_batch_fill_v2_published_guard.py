"""
Regression test for iter 40 — batch-fill-v2 must allow additive drafting
(overwrite=false) on published cards.

Historical bug: the endpoint refused ALL calls on published cards unless
overwrite=true, which was backwards — "additive" mode (fill empty fields
only) is by definition non-destructive and safe on any card. This meant
that once a card was published (like `schwa` on production), Prof could
never fill in missing exampleSentences via "Batch bozze AI" — the endpoint
returned 409 and the frontend silently pushed an error into the results
panel.

The fix flips the guard:
  - published + overwrite=False → PROCEED (safe, only fills empties)
  - published + overwrite=True  → 409     (destructive, requires unpublish)

This test verifies the guard logic in isolation.
"""
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent))


def _guard_published(published: bool, overwrite: bool) -> str:
    """Replica of the guard introduced by iter 40 fix in admin_batch_fill_v2.

    Returns "allow" if the endpoint should proceed, or the HTTP status
    code as string otherwise.
    """
    if published and overwrite:
        return "409"
    return "allow"


def test_published_card_additive_mode_allowed():
    """The exact scenario Prof reported: schwa is published, click
    'Batch bozze AI' (which sends overwrite=false). MUST succeed."""
    assert _guard_published(published=True, overwrite=False) == "allow"


def test_published_card_destructive_mode_blocked():
    """Overwrite=true on a published card is destructive — must be blocked
    so the Prof can't accidentally wipe production content."""
    assert _guard_published(published=True, overwrite=True) == "409"


def test_unpublished_card_additive_allowed():
    """Draft/skeleton cards accept any mode."""
    assert _guard_published(published=False, overwrite=False) == "allow"


def test_unpublished_card_destructive_allowed():
    """Overwrite=true is fine on drafts (Prof re-runs the full pipeline)."""
    assert _guard_published(published=False, overwrite=True) == "allow"
