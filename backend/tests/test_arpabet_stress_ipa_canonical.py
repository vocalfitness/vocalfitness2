"""
CANONICAL · ARPAbet stress-digit → IPA rendering (Feb 2026)
============================================================

Regression suite for the schwa/STRUT + ɚ/ɝ disambiguation bug reported
on production 08/02/2026:

    "About" was pronounced /ʌbaʊt/ instead of the correct /əbaʊt/.

Root cause: ``_arpabet_pron_to_ipa`` was stress-blind and mapped every
AH → ʌ and every ER → ɝ, corrupting every reduced-vowel word in the
lexicon and every multisyllabic mnemonic transcription.

These tests enforce the Ladefoged / CMUdict canonical:
    AH0 → ə   ·  AH1/2 → ʌ
    ER0 → ɚ   ·  ER1/2 → ɝ

If any of these break, the lexicon + mnemonic engines will regenerate
incorrect IPA for schwa/STRUT/NURSE cards. Do NOT relax these tests
without user sign-off.
"""
from __future__ import annotations

import pytest


# --------------------------------------------------------------------- #
# Layer 1 — phone-level canonical (pure lookup, no CMUdict dependency)
# --------------------------------------------------------------------- #

@pytest.mark.parametrize("phone,expected", [
    # schwa / STRUT
    ("AH0", "ə"),
    ("AH1", "ʌ"),
    ("AH2", "ʌ"),
    # r-colored schwa / NURSE
    ("ER0", "ɚ"),
    ("ER1", "ɝ"),
    ("ER2", "ɝ"),
    # Stress-invariant vowels — digit must NOT change the IPA
    ("AA0", "ɑ"),  ("AA1", "ɑ"),  ("AA2", "ɑ"),
    ("IH0", "ɪ"),  ("IH1", "ɪ"),
    ("IY0", "iː"), ("IY1", "iː"),
    ("UH0", "ʊ"),  ("UH1", "ʊ"),
    ("UW0", "uː"), ("UW1", "uː"),
    ("AE0", "æ"),  ("AE1", "æ"),
    ("EH0", "ɛ"),  ("EH1", "ɛ"),
    ("AO0", "ɔ"),  ("AO1", "ɔ"),
    # Consonants — no stress digit, plain mapping
    ("K",   "k"), ("B",  "b"), ("HH", "h"), ("NG", "ŋ"),
    ("SH",  "ʃ"), ("ZH", "ʒ"), ("TH", "θ"), ("DH", "ð"),
    ("CH",  "tʃ"), ("JH", "dʒ"),
])
def test_stress_aware_phone_canonical(phone, expected):
    from routers.phoneme_lexicon_rule import _arpabet_phone_to_ipa
    assert _arpabet_phone_to_ipa(phone) == expected, (
        f"CANONICAL VIOLATION: {phone} must map to '{expected}' — "
        f"got '{_arpabet_phone_to_ipa(phone)}'. See phoneme_lexicon_rule."
        f"_STRESS_AWARE_IPA and the CANONICAL comment block."
    )


# --------------------------------------------------------------------- #
# Layer 2 — word-level canonical (requires CMUdict, but is deterministic)
# --------------------------------------------------------------------- #

# Words that MUST render with schwa (ə) in unstressed syllables.
# If any of these regress to /ʌ/, the schwa card is corrupted.
_SCHWA_WORDS = {
    "about":     "əbaʊt",
    "again":     "əɡɛn",
    "away":      "əweɪ",
    "until":     "əntɪl",
    "today":     "tədeɪ",
    "support":   "səpɔɹt",
    "national":  "næʃənəl",
    "person":    "pɝsən",
    "company":   "kʌmpəniː",
    "government": "ɡʌvɚmənt",   # both schwa (AH0) AND r-schwa (ER0)
    "another":   "ənʌðɚ",        # schwa initial + r-schwa final
}

# Words that MUST render with STRUT (ʌ) in stressed syllables.
_STRUT_WORDS = {
    "cup":     "kʌp",
    "love":    "lʌv",
    "money":   "mʌniː",
    "young":   "jʌŋ",
    "flood":   "flʌd",
    "tough":   "tʌf",
    "judge":   "dʒʌdʒ",
}

# Words that MUST render with NURSE (ɝ) on stressed syllables.
_NURSE_WORDS = {
    "bird":  "bɝd",
    "word":  "wɝd",
    "term":  "tɝm",
    "nurse": "nɝs",
}

# Words that MUST render with r-colored schwa (ɚ) on final unstressed
# syllable.
_R_SCHWA_WORDS = {
    "under":   "ʌndɚ",
    "father":  "fɑðɚ",
    "doctor":  "dɑktɚ",
    "better":  "bɛtɚ",
    "pattern": "pætɚn",
}


@pytest.mark.parametrize("word,expected", sorted(_SCHWA_WORDS.items()))
def test_schwa_words_never_render_as_strut(word, expected):
    """The schwa card and multisyllabic mnemonics MUST use /ə/ in
    unstressed syllables. This is the exact bug the user reported."""
    from routers.phoneme_lexicon_rule import word_to_ipa
    got = word_to_ipa(word)
    assert got == expected, (
        f"'{word}' rendered as /{got}/ but canonical is /{expected}/. "
        f"If /ʌ/ appears where /ə/ should be, the AH-stress mapping "
        f"regressed — see _STRESS_AWARE_IPA."
    )
    assert "ʌ" not in got or "ʌ" in expected, (
        f"'{word}' contains /ʌ/ but shouldn't — schwa/STRUT confusion."
    )


@pytest.mark.parametrize("word,expected", sorted(_STRUT_WORDS.items()))
def test_strut_words_render_as_strut(word, expected):
    from routers.phoneme_lexicon_rule import word_to_ipa
    got = word_to_ipa(word)
    assert got == expected, f"'{word}' → /{got}/, expected /{expected}/"


@pytest.mark.parametrize("word,expected", sorted(_NURSE_WORDS.items()))
def test_nurse_words_render_as_er_stressed(word, expected):
    from routers.phoneme_lexicon_rule import word_to_ipa
    got = word_to_ipa(word)
    assert got == expected, (
        f"'{word}' → /{got}/, expected /{expected}/ (ɝ = stressed NURSE)"
    )


@pytest.mark.parametrize("word,expected", sorted(_R_SCHWA_WORDS.items()))
def test_r_schwa_words_render_as_er_unstressed(word, expected):
    from routers.phoneme_lexicon_rule import word_to_ipa
    got = word_to_ipa(word)
    assert got == expected, (
        f"'{word}' → /{got}/, expected /{expected}/ (ɚ = unstressed r-schwa)"
    )


# --------------------------------------------------------------------- #
# Layer 3 — end-to-end: the schwa lexicon must not contain STRUT words
# --------------------------------------------------------------------- #

def test_schwa_lexicon_top30_all_contain_schwa_not_strut():
    """The /ə/ card's top-30 common words must ALL contain schwa in
    their IPA transcription, and NONE of them should render an /ʌ/
    where the phoneme target is schwa (this was the user's specific
    complaint on 08/02/2026)."""
    from routers.phoneme_lexicon_rule import generate_lexicon_for_canonical
    bundle = generate_lexicon_for_canonical(target_ipa="ə", max_words=30)
    words = bundle["commonWords"]
    assert len(words) >= 20, f"schwa lexicon returned only {len(words)} words"
    for entry in words:
        ipa = entry["ipa"]
        w = entry["w"]
        assert "ə" in ipa, (
            f"schwa lexicon word '{w}' → {ipa} has no /ə/ — filter broken"
        )
        # Every canonical schwa word MUST contain the schwa symbol; the
        # presence of ʌ is only permitted when the word is polysyllabic
        # AND has a stressed STRUT elsewhere (e.g. "another" = ə + ʌ + ɚ).
        # We DON'T ban ʌ outright — we simply require ə to be present.
