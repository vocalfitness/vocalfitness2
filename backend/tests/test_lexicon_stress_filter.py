"""
Regression test for the lexicon rule §3.2/§3.3.

Guards against the bug reported by the user on 07/07/2026: the schwa
card /ə/ was populated with STRUT /ʌ/ words because both share the
CMU-dict ARPAbet base ``AH`` and stress was stripped before matching.

Every phoneme in the stress-sensitive set MUST return a top-8 list
that does NOT contain any of the top-8 items of the confusable cousin.
"""

import pytest

from routers.phoneme_lexicon_rule import generate_lexicon_for_canonical


# Historic-ground-truth expectations for the most common words per
# phoneme. If cmudict / wordfreq versions change, adapt the sets, but
# the disjointness invariant is the actual regression guard.
_EXPECTED_TOP = {
    "ə":  {"about", "people", "little", "another", "again", "against"},
    "ʌ":  {"one", "just", "up", "some", "us", "from"},
    "ɚ":  {"other", "after", "over", "never", "every"},
    "ɝ":  {"were", "her", "first", "work", "world"},
    "iː": {"be", "he", "we", "me", "she", "people", "see"},
    "ɪ":  {"is", "it", "with", "this", "his"},
    "uː": {"you", "do", "who", "new", "two"},
    "ʊ":  {"would", "good", "could", "should", "look"},
    "ɑː": {"was", "are", "not", "want", "got"},
    "ɔː": {"for", "your", "all", "more", "also"},
}


@pytest.mark.parametrize("ipa,expected_hits", list(_EXPECTED_TOP.items()))
def test_top_words_include_expected(ipa, expected_hits):
    """At least ONE of the expected canonical words must appear in the top-30."""
    r = generate_lexicon_for_canonical(ipa, max_words=30)
    got = {w["w"] for w in r["commonWords"]}
    hit = got & expected_hits
    assert hit, (
        f"/{ipa}/ top-30 has NO expected words. Got: {sorted(got)[:15]} "
        f"| Expected any of: {sorted(expected_hits)}"
    )


# Pairs that share the same ARPAbet base and MUST NOT overlap at the top.
_DISJOINT_PAIRS = [
    ("ə",  "ʌ"),    # both AH
    ("ɚ",  "ɝ"),    # both ER
    ("ɪ",  "iː"),   # IH vs IY  (both use fresh top-5 sanity)
    ("ʊ",  "uː"),   # UH vs UW
]


@pytest.mark.parametrize("ipa_a,ipa_b", _DISJOINT_PAIRS)
def test_stress_confusable_pairs_are_disjoint_at_top5(ipa_a, ipa_b):
    """The TOP-5 words of two IPAs that share the same ARPAbet base
    must not overlap — this is the exact class of bug that produced
    schwa=STRUT words in production."""
    a = generate_lexicon_for_canonical(ipa_a, max_words=8)
    b = generate_lexicon_for_canonical(ipa_b, max_words=8)
    top_a = {w["w"] for w in a["commonWords"][:5]}
    top_b = {w["w"] for w in b["commonWords"][:5]}
    overlap = top_a & top_b
    assert not overlap, (
        f"/{ipa_a}/ and /{ipa_b}/ share the same ARPAbet base but their "
        f"top-5 word lists overlap: {overlap}. "
        f"/{ipa_a}/={sorted(top_a)}  /{ipa_b}/={sorted(top_b)}"
    )


def test_schwa_does_not_return_strut_words():
    """Explicit sentinel for the user-reported bug (07/07/2026):
    /ə/ MUST NOT return 'from', 'one', 'just', 'up', 'us' — those are
    STRUT /ʌ/ words. Fully regression-proof."""
    r = generate_lexicon_for_canonical("ə", max_words=30)
    got = {w["w"] for w in r["commonWords"]}
    strut_forbidden = {"from", "one", "just", "up", "us"}
    intersection = got & strut_forbidden
    assert not intersection, (
        f"Schwa /ə/ leaked STRUT words: {intersection}. "
        f"The stress-filter is not applied correctly."
    )
