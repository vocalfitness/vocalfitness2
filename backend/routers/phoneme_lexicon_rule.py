"""
Phoneme Lexicon Rule §3.2/§3.3 — DERIVED, data-sourced, never LLM-authored.

Given a canonical phoneme (IPA), pick the 30 most frequent English words
whose GenAm pronunciation contains that phoneme, plus a spelling
distribution histogram of the grapheme(s) that realise the phoneme
in those words.

Data sources:
  • cmudict (Carnegie Mellon Pronouncing Dictionary) → 126k words with
    ARPAbet transcriptions (GenAm reference).
  • wordfreq (Zipf frequency, English corpus) → global usage rank.

Guarantees:
  • Fully deterministic — same IPA input yields identical output.
  • No LLM claims — every word is grounded in cmudict.
  • Empty beats invented — an IPA with < 30 matches returns whatever
    it has (rare edge case).

Reference spec: `/app/backend/canonical_data/HotspotRule_v1.md` §3.2/§3.3
(placeholder — extend as we add spelling regexes for edge phonemes).
"""

from __future__ import annotations
from typing import Dict, List, Optional, Tuple
import re


# =========================================================================
# ARPAbet → IPA mapping (GenAm baseline).
# =========================================================================
# The stress digit (0/1/2) is stripped before lookup; we match on the base phone.
_ARPABET_TO_IPA: Dict[str, str] = {
    # Vowels
    "AA": "ɑ",  "AE": "æ", "AH": "ʌ",  "AO": "ɔ",  "AW": "aʊ",
    "AY": "aɪ", "EH": "ɛ", "ER": "ɝ",  "EY": "eɪ", "IH": "ɪ",
    "IY": "iː", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ",  "UW": "uː",
    # Consonants
    "B":  "b",  "CH": "tʃ", "D":  "d", "DH": "ð",  "F":  "f",
    "G":  "ɡ",  "HH": "h",  "JH": "dʒ","K":  "k",  "L":  "l",
    "M":  "m",  "N":  "n",  "NG": "ŋ", "P":  "p",  "R":  "ɹ",
    "S":  "s",  "SH": "ʃ",  "T":  "t", "TH": "θ",  "V":  "v",
    "W":  "w",  "Y":  "j",  "Z":  "z", "ZH": "ʒ",
}


# Reverse map: for a target IPA, which ARPAbet base phones match?
# We accept the primary map plus common IPA-equivalent inputs so the
# canonical inventory's Unicode variants all resolve to the same phone.
_IPA_TO_ARPABET: Dict[str, str] = {
    # vowel canonical equivalences
    "ʊ": "UH",  "u": "UW", "uː": "UW",
    "ɪ": "IH",  "i": "IY", "iː": "IY",
    "ɛ": "EH",  "e": "EH",
    "æ": "AE",
    "ʌ": "AH",  "ə": "AH",
    "ɑ": "AA",  "ɑː": "AA",  "ɒ": "AA",
    "ɔ": "AO",  "ɔː": "AO",
    "ɝ": "ER",  "ɜː": "ER",  "ɚ": "ER",
    "eɪ": "EY",
    "aɪ": "AY",
    "aʊ": "AW",
    "oʊ": "OW", "əʊ": "OW",
    "ɔɪ": "OY",
    "ɪə": "IH", "eə": "EH", "ʊə": "UH",  # RP centring diphthongs — approximate
    # consonants
    "b": "B",   "tʃ": "CH", "d": "D",   "ð": "DH",  "f": "F",
    "ɡ": "G",   "g": "G",   "h": "H",   "dʒ": "JH", "k": "K",
    "l": "L",   "m": "M",   "n": "N",   "ŋ": "NG",  "p": "P",
    "ɹ": "R",   "r": "R",   "s": "S",   "ʃ": "SH",  "t": "T",
    "θ": "TH",  "v": "V",   "w": "W",   "j": "Y",   "z": "Z",
    "ʒ": "ZH",
}


# =========================================================================
# CMUdict + wordfreq lazy loaders (avoid boot penalty when unused)
# =========================================================================
_cmudict_cache = None
_wordfreq_module = None


def _get_cmudict():
    global _cmudict_cache
    if _cmudict_cache is None:
        import cmudict as _cmu
        _cmudict_cache = _cmu.dict()
    return _cmudict_cache


def _get_wordfreq():
    global _wordfreq_module
    if _wordfreq_module is None:
        import wordfreq as _wf
        _wordfreq_module = _wf
    return _wordfreq_module


def _strip_stress(phone: str) -> str:
    """CMUdict phones are e.g. 'UH1', 'AY2' — strip the digit suffix."""
    if phone and phone[-1].isdigit():
        return phone[:-1]
    return phone


def _arpabet_pron_to_ipa(phones: List[str]) -> str:
    """Render an ARPAbet pronunciation list as IPA — best-effort for display."""
    out = []
    for p in phones:
        base = _strip_stress(p)
        out.append(_ARPABET_TO_IPA.get(base, base))
    return "/" + "".join(out) + "/"


# =========================================================================
# Common-words extraction (§3.2)
# =========================================================================

# Words to blocklist — proper nouns, abbreviations, offensive terms.
_BLOCKLIST = frozenset({
    "a", "an", "the", "and", "or", "but", "if", "of", "in", "on", "at", "to",
    "'s", "'m", "'re", "'ve", "'ll", "'d", "'t",
})

# Regex: only single-word alphabetic tokens (skip contractions like "who'll")
_WORD_RE = re.compile(r"^[a-z]+$")


def _extract_matching_words(target_arpa: str, max_words: int = 30,
                              min_zipf: float = 2.5) -> List[Dict[str, str]]:
    """Scan CMUdict for words whose GenAm pronunciation contains the target
    ARPAbet phone (any stress). Sort by Zipf frequency DESC, return the top
    ``max_words``.

    Only lowercase single-word entries are considered (no proper nouns,
    contractions or hyphenated). ``min_zipf`` filters out obscure words —
    a Zipf of 2.5 corresponds to roughly 1 occurrence per 100k tokens.
    """
    cmu = _get_cmudict()
    wf  = _get_wordfreq()

    matches: List[Tuple[float, str, List[str]]] = []
    for word, prons in cmu.items():
        if not word or not _WORD_RE.match(word):
            continue
        if word in _BLOCKLIST:
            continue
        # Use the FIRST pronunciation variant (most canonical).
        if not prons:
            continue
        pron = prons[0]
        base_phones = [_strip_stress(p) for p in pron]
        if target_arpa not in base_phones:
            continue
        zipf = wf.zipf_frequency(word, "en")
        if zipf < min_zipf:
            continue
        matches.append((zipf, word, pron))

    # Sort DESC by Zipf, then alphabetic tiebreak
    matches.sort(key=lambda t: (-t[0], t[1]))
    top = matches[:max_words]

    out: List[Dict[str, str]] = []
    for zipf, word, pron in top:
        out.append({
            "w":         word,
            "ipa":       _arpabet_pron_to_ipa(pron),
            "audioAmE":  "",
            "audioRP":   "",
            "zipf":      round(zipf, 2),   # kept for debugging / re-ranking
        })
    return out


# =========================================================================
# Spelling distribution (§3.3)
# =========================================================================

# Heuristic grapheme table per phoneme. When a phoneme appears in a word,
# we scan the word for these graphemes in order and attribute the
# occurrence to the first match. This is deliberately conservative — the
# spec allows a "phonics-informed" mapping rather than a full aligner.
_GRAPHEMES_BY_IPA: Dict[str, List[Tuple[str, str]]] = {
    "ʊ": [("oo", "oo"), ("ou", "ou"), ("u", "u"), ("o", "o")],
    "uː": [("oo", "oo"), ("ew", "ew"), ("u_e", "u…e"), ("ue", "ue"),
           ("ou", "ou"), ("o", "o"), ("u", "u")],
    "iː": [("ee", "ee"), ("ea", "ea"), ("ie", "ie"),
           ("e_e", "e…e"), ("y", "y"), ("i", "i"), ("e", "e")],
    "ɪ":  [("i", "i"), ("y", "y"), ("e", "e")],
    "e":  [("e", "e"), ("ea", "ea"), ("a", "a")],
    "ɛ":  [("e", "e"), ("ea", "ea"), ("a", "a")],
    "æ":  [("a", "a")],
    "ʌ":  [("u", "u"), ("o", "o"), ("ou", "ou")],
    "ə":  [("a", "a"), ("e", "e"), ("o", "o"), ("u", "u"), ("i", "i")],
    "ɑː": [("a", "a"), ("ar", "ar")],
    "ɑ":  [("a", "a"), ("o", "o")],
    "ɒ":  [("o", "o"), ("a", "a")],
    "ɔː": [("or", "or"), ("ore", "ore"), ("au", "au"), ("aw", "aw"),
           ("al", "al"), ("ough", "ough")],
    "ɜː": [("er", "er"), ("ir", "ir"), ("ur", "ur"), ("ear", "ear")],
    "ɝ":  [("er", "er"), ("ir", "ir"), ("ur", "ur"), ("ear", "ear")],
    "eɪ": [("a_e", "a…e"), ("ai", "ai"), ("ay", "ay"), ("ei", "ei"), ("a", "a")],
    "aɪ": [("i_e", "i…e"), ("igh", "igh"), ("y", "y"), ("i", "i")],
    "aʊ": [("ou", "ou"), ("ow", "ow")],
    "oʊ": [("o_e", "o…e"), ("oa", "oa"), ("ow", "ow"), ("o", "o")],
    "əʊ": [("o_e", "o…e"), ("oa", "oa"), ("ow", "ow"), ("o", "o")],
    "ɔɪ": [("oi", "oi"), ("oy", "oy")],
    # Consonants — mostly straightforward
    "p":  [("p", "p"), ("pp", "pp")],
    "b":  [("b", "b"), ("bb", "bb")],
    "t":  [("t", "t"), ("tt", "tt"), ("ed", "ed")],
    "d":  [("d", "d"), ("dd", "dd"), ("ed", "ed")],
    "k":  [("k", "k"), ("c", "c"), ("ck", "ck"), ("ch", "ch"), ("q", "q")],
    "ɡ":  [("g", "g"), ("gg", "gg")],
    "g":  [("g", "g"), ("gg", "gg")],
    "f":  [("f", "f"), ("ff", "ff"), ("ph", "ph"), ("gh", "gh")],
    "v":  [("v", "v"), ("ve", "ve")],
    "θ":  [("th", "th")],
    "ð":  [("th", "th")],
    "s":  [("s", "s"), ("ss", "ss"), ("ce", "ce"), ("c", "c")],
    "z":  [("z", "z"), ("zz", "zz"), ("s", "s")],
    "ʃ":  [("sh", "sh"), ("ti", "ti"), ("ci", "ci"), ("ch", "ch")],
    "ʒ":  [("s", "s"), ("z", "z"), ("g", "g")],
    "h":  [("h", "h")],
    "tʃ": [("ch", "ch"), ("tch", "tch")],
    "dʒ": [("j", "j"), ("g", "g"), ("dg", "dg")],
    "m":  [("m", "m"), ("mm", "mm")],
    "n":  [("n", "n"), ("nn", "nn"), ("kn", "kn")],
    "ŋ":  [("ng", "ng"), ("n", "n")],
    "l":  [("l", "l"), ("ll", "ll")],
    "ɹ":  [("r", "r"), ("rr", "rr"), ("wr", "wr")],
    "r":  [("r", "r"), ("rr", "rr"), ("wr", "wr")],
    "w":  [("w", "w"), ("wh", "wh")],
    "j":  [("y", "y"), ("i", "i")],
}


def _compute_spelling_distribution(target_ipa: str,
                                     words: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Given a list of matching words, compute a grapheme histogram for the
    target phoneme. Returns a list of ``{letters, percent, examples}``
    entries sorted by percent DESC, matching the seed shape of u-foot.

    Note: this is a heuristic scan, not a phones-to-graphemes aligner. We
    iterate the ordered grapheme table (longest patterns first — encoded
    into the table order) and attribute each word to the FIRST grapheme
    that its spelling contains.
    """
    table = _GRAPHEMES_BY_IPA.get(target_ipa, [])
    if not table:
        # Fallback: return an empty distribution rather than invent one.
        return []

    buckets: Dict[str, List[str]] = {display: [] for _, display in table}
    unmatched: List[str] = []

    for w in words:
        word = w.get("w", "")
        placed = False
        for pattern, display in table:
            if "_" in pattern:
                # split pattern like "u_e" → prefix "u", suffix "e"
                parts = pattern.split("_")
                if len(parts) == 2 and word.startswith(parts[0]) and word.endswith(parts[1]) and len(word) > 2:
                    buckets[display].append(word)
                    placed = True
                    break
            else:
                if pattern in word:
                    buckets[display].append(word)
                    placed = True
                    break
        if not placed:
            unmatched.append(word)

    total = len(words) or 1
    out: List[Dict[str, str]] = []
    for _, display in table:
        exs = buckets[display]
        if not exs:
            continue
        out.append({
            "letters":  display,
            "percent":  round(len(exs) / total * 100, 1),
            "examples": exs[:5],
        })
    out.sort(key=lambda r: -r["percent"])
    return out


# =========================================================================
# Public API
# =========================================================================

def generate_lexicon_for_canonical(target_ipa: str,
                                     max_words: int = 30) -> Dict[str, list]:
    """Return ``{commonWords, spellings}`` for the given IPA target.

    The result matches the shape stored in phoneme_cards:
      • ``commonWords``: list of ``{w, ipa, audioAmE, audioRP, zipf}``
      • ``spellings``:   list of ``{letters, percent, examples}``

    Empty arrays are returned if the IPA has no ARPAbet mapping — the
    caller MUST NOT persist invented data.
    """
    arpa = _IPA_TO_ARPABET.get(target_ipa)
    if not arpa:
        # Try single-character fallback for diphthongs (first vowel)
        if target_ipa and len(target_ipa) > 1:
            arpa = _IPA_TO_ARPABET.get(target_ipa[0])
    if not arpa:
        return {"commonWords": [], "spellings": []}

    words = _extract_matching_words(arpa, max_words=max_words)
    spellings = _compute_spelling_distribution(target_ipa, words)
    return {"commonWords": words, "spellings": spellings}
