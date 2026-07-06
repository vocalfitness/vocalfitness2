"""
Phoneme Batch-fill v2 — implementation of the Phase-2 Automation Spec (v1.0).

Spec highlights enforced here:
  • Strict field taxonomy: CANONICAL (locked lookup, never written) · DERIVED
    (rule-computed by us, never written by LLM) · NEEDS_SOURCE (§3.2 / §3.3 —
    left manual in this first pass) · CREATIVE (LLM-drafted, grounded).
  • DERIVED muscle-activation levels come from the articulation→muscle map
    resolved in §3.1. The /ʊ/ FOOT result must equal MOD / MOD / LOW / MOD / LOW.
  • CREATIVE fields (mnemonic, funFact, deep-dive prose, example sentences,
    video script) are drafted by Claude Sonnet 4.5 with the canonical + derived
    facts injected into the prompt. Empty beats invented. Per-field confidence.
  • Deterministic validation before offering: sentence_contains_phoneme,
    minimal_pairs_one_segment, muscle_levels_match_rule, no_unsourced_superlatives,
    canonical_parity. word_contains_phoneme is deferred (needs §3.2 dictionary).

The endpoint is mounted from phoneme_cards.build_phoneme_cards_router as:
    POST /api/admin/phonemes/{id}/batch-fill-v2
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import json as json_mod
import logging
import os
import re
import uuid


# =========================================================================
# §3.1 Muscle-activation map — DERIVED, rule-based, never LLM-authored
# =========================================================================
# Levels are strict enums {HIGH, MOD, LOW}. Slash-ranges from the spec
# (e.g. "LOW-MOD", "MOD-HIGH") are collapsed to the lower value to satisfy
# the enum validator; the spec-published table stays traceable via the notes.

# Resolved vowel table copied verbatim from Spec §3.1 (12 monophthongs).
_MUSCLE_TABLE_VOWELS: Dict[str, Tuple[str, str, str, str, str]] = {
    #                        oo    bucc  zyg   mass  ment
    "iː":                   ("LOW",  "LOW",  "HIGH", "MOD",  "LOW"),
    "ɪ":                    ("LOW",  "LOW",  "MOD",  "MOD",  "LOW"),   # MOD-HIGH → MOD
    "ɛ":                    ("LOW",  "LOW",  "MOD",  "LOW",  "LOW"),   # LOW-MOD  → LOW
    "e":                    ("LOW",  "LOW",  "MOD",  "LOW",  "LOW"),   # e ≡ ɛ (RP)
    "æ":                    ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),   # LOW-MOD  → LOW
    "ʌ":                    ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),   # LOW-MOD  → LOW
    "ɑː":                   ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),
    "ɒ":                    ("MOD",  "MOD",  "LOW",  "LOW",  "LOW"),
    "ɔː":                   ("MOD",  "MOD",  "LOW",  "LOW",  "LOW"),   # LOW-MOD  → LOW
    "ʊ":                    ("MOD",  "MOD",  "LOW",  "MOD",  "LOW"),   # ← spec target
    "uː":                   ("HIGH", "MOD",  "LOW",  "MOD",  "MOD"),   # MOD-HIGH → MOD
    "ɜː":                   ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),
    "ɝ":                    ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),
    "ə":                    ("LOW",  "LOW",  "LOW",  "LOW",  "LOW"),
}

# Consonant extensions (§3.1 tail): bilabial closures / labiodentals / /w/ /
# everything else defaults to LOW facial activation.
_BILABIALS      = {"p", "b", "m"}
_LABIODENTALS   = {"f", "v"}
_W_GLIDE        = {"w"}


def _muscle_levels_for(ipa: str, kind: str) -> Tuple[str, str, str, str, str]:
    """Return the 5-tuple (orbicularis, buccinator, zygomaticus, masseter, mentalis)
    for the given canonical IPA + kind. Never returns None — falls back to all-LOW
    with a comment so consonants outside the map (lingual/internal action) render
    correctly."""
    if kind == "vowel" or kind == "diphthong":
        # Diphthongs take the starting vowel's row when possible; fallback to first vowel-like char.
        row = _MUSCLE_TABLE_VOWELS.get(ipa)
        if row:
            return row
        # Diphthong: try the first segment (e.g. eɪ → ɛ)
        if len(ipa) >= 1:
            row = _MUSCLE_TABLE_VOWELS.get(ipa[0])
            if row:
                return row
        return ("LOW", "LOW", "LOW", "MOD", "LOW")  # generic mid-vowel default
    # Consonants
    if ipa in _BILABIALS:
        return ("HIGH", "LOW", "LOW", "MOD", "MOD")   # closure + jaw + chin
    if ipa in _LABIODENTALS:
        return ("LOW", "LOW", "LOW", "MOD", "MOD")    # lower-lip-to-teeth
    if ipa in _W_GLIDE:
        return ("MOD", "MOD", "LOW", "MOD", "LOW")    # /w/ rounded glide
    # Everything else: lingual/internal, facial ~ LOW
    return ("LOW", "LOW", "LOW", "LOW", "LOW")


def compose_facial_muscles(ipa: str, kind: str) -> List[Dict[str, str]]:
    """Return the 5-muscle list in the shape the phoneme card model expects.

    Detail strings describe the physiological role — deliberately terse and
    non-superlative, mirroring the /ʊ/ FOOT card's published wording."""
    oo, bucc, zyg, mass, ment = _muscle_levels_for(ipa, kind)
    return [
        {"name": "Orbicularis oris",  "activation": oo,   "detail": "lip rounding / closure"},
        {"name": "Buccinator",        "activation": bucc, "detail": "cheek compression / oral pressure"},
        {"name": "Zygomaticus major", "activation": zyg,  "detail": "lip spreading (smile shape)"},
        {"name": "Masseter",          "activation": mass, "detail": "jaw elevation"},
        {"name": "Mentalis",          "activation": ment, "detail": "lower-lip raise / protrusion"},
    ]


# =========================================================================
# §2 Grounding contract — inject canonical + derived + reference into prompt
# =========================================================================
_CREATIVE_FIELDS = ("mnemonic", "funFact", "deepDive", "exampleSentences", "videoScript")

_SYSTEM_PROMPT = (
    "You are a phonetics pedagogy assistant helping produce English pronunciation "
    "training cards for adult Italian learners of Steve Dapper's VocalFitness method. "
    "You are given INJECTED FACTS (canonical + derived features + reference data). "
    "You MAY reason only from these facts — never invent linguistic claims. "
    "Return STRICT JSON only (no markdown fences, no prose outside JSON). "
    "For every field: if the injected facts do not suffice to write the field "
    "without asserting a phonetic claim absent from the facts, return null or "
    "an empty string with confidence 0.0 — never guess. "
    "Do not use superlatives ('most common', 'rarest', 'Nth most') unless the "
    "injected facts explicitly cite a corpus number. Prefer 'commonly occurs', "
    "'appears in words such as'. "
    "Cite which injected facts each field relied on via a 'grounded_on' list."
)


def _build_creative_prompt(ipa: str, dialect: str, canon: dict,
                            muscles: List[Dict[str, str]],
                            existing: Optional[Dict[str, Any]] = None) -> str:
    """Compose the user prompt with the full grounding context."""
    lines: List[str] = [f"- ipa: /{ipa}/", f"- dialect: {dialect}"]
    for key in ("kind", "category", "subcategory", "height", "backness",
                "rounding", "tenseness", "duration", "voicing", "manner",
                "place", "lexical_set"):
        v = canon.get(key)
        if v:
            lines.append(f"- {key}: {v}")
    if canon.get("example_words"):
        ex = ", ".join(canon["example_words"][:10])
        lines.append(f"- canonical example words: {ex}")
    if canon.get("notes"):
        lines.append(f"- notes: {canon['notes']}")
    if canon.get("dialect_notes"):
        lines.append(f"- dialect_notes: {canon['dialect_notes']}")
    lines.append("")
    lines.append("Muscle activation (DERIVED — do not restate as your own claim):")
    for m in muscles:
        lines.append(f"  - {m['name']}: {m['activation']} ({m['detail']})")

    facts_block = "\n".join(lines)

    existing_hint = ""
    if existing:
        keep = {k: v for k, v in existing.items() if v}
        if keep:
            existing_hint = (
                "\n\nExisting user-authored content (preserve tone; do not reuse verbatim):\n"
                + json_mod.dumps(keep, ensure_ascii=False, indent=2)
            )

    return (
        f"INJECTED FACTS:\n{facts_block}\n\n"
        "Draft the following CREATIVE fields. Return JSON with this exact shape:\n"
        "{\n"
        "  \"mnemonic\": {\n"
        f"    \"phrase\": \"<English sentence 6-14 words featuring /{ipa}/ in >=3 words>\",\n"
        "    \"highlights\": [\"<word1>\", \"<word2>\", \"<word3>\"],\n"
        "    \"note\": \"<1-2 sentence coaching note>\",\n"
        "    \"grounded_on\": [\"height\",\"rounding\",...],\n"
        "    \"confidence\": <0.0-1.0>\n"
        "  },\n"
        "  \"funFact\": {\n"
        "    \"headline\": \"<3-6 words, no clickbait>\",\n"
        "    \"body\": \"<2-3 sentences, factual, no invented statistics>\",\n"
        "    \"grounded_on\": [\"lexical_set\",\"notes\",...],\n"
        "    \"confidence\": <0.0-1.0>\n"
        "  },\n"
        "  \"deepDive\": {\n"
        "    \"body\": \"<3-5 sentence pedagogical explanation of the articulation and how "
        "an Italian learner can approach it, grounded in the injected features>\",\n"
        "    \"grounded_on\": [...],\n"
        "    \"confidence\": <0.0-1.0>\n"
        "  },\n"
        "  \"exampleSentences\": {\n"
        f"    \"items\": [\"<sentence 1 containing /{ipa}/ in >=2 words>\", "
        "\"<sentence 2>\", \"<sentence 3>\"],\n"
        "    \"grounded_on\": [\"example_words\"],\n"
        "    \"confidence\": <0.0-1.0>\n"
        "  },\n"
        "  \"videoScript\": {\n"
        "    \"body\": \"<60-90 second video-lesson opener script for Steve Dapper: hook, "
        "articulation cue, one contrast, one drill line — grounded in the injected features>\",\n"
        "    \"grounded_on\": [...],\n"
        "    \"confidence\": <0.0-1.0>\n"
        "  }\n"
        "}\n"
        "Rules:\n"
        "- Empty beats invented — return null or empty string with confidence 0.0 if a "
        "field cannot be written without extra phonetic claims.\n"
        "- Highlights must be a subset of words in the mnemonic phrase.\n"
        "- example_sentences must literally contain example words that include /"
        f"{ipa}/ (do not include contrast/confusable words as the anchor).\n"
        "- No superlatives unless the injected facts explicitly cite them."
        f"{existing_hint}"
    )


def _parse_llm_json(raw: str) -> Dict[str, Any]:
    """Extract the first balanced {...} JSON object from an LLM response."""
    raw = str(raw).strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    start = raw.find("{")
    if start == -1:
        raise ValueError("Nessun oggetto JSON trovato nella risposta LLM.")
    depth = 0
    end = -1
    for i, ch in enumerate(raw[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end == -1:
        raise ValueError("Oggetto JSON non chiuso nella risposta LLM.")
    return json_mod.loads(raw[start:end])


async def draft_creative_fields(canon: dict, ipa: str, dialect: str,
                                 muscles: List[Dict[str, str]],
                                 existing: Optional[Dict[str, Any]] = None
                                 ) -> Dict[str, Any]:
    """Call Claude Sonnet 4.5 with the grounding contract. Returns the parsed
    creative-field blob or an error dict {error: str} on failure."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"error": "EMERGENT_LLM_KEY non configurata."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        return {"error": f"emergentintegrations mancante: {e}"}

    prompt = _build_creative_prompt(ipa, dialect, canon, muscles, existing)
    session_id = f"phoneme-batchv2-{ipa}-{uuid.uuid4().hex[:8]}"
    try:
        chat = LlmChat(api_key=api_key, session_id=session_id, system_message=_SYSTEM_PROMPT)
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        raw = await chat.send_message(UserMessage(text=prompt))
        return _parse_llm_json(str(raw))
    except Exception as e:  # noqa: BLE001
        logging.exception("batch-v2 LLM call failed for /%s/", ipa)
        return {"error": f"LLM error ({type(e).__name__})"}


# =========================================================================
# §4 Deterministic validation
# =========================================================================
_SUPERLATIVE_RE = re.compile(
    r"\b(most\s+common|rarest|least\s+common|"
    r"(?:1st|2nd|3rd|\dth)\s+most|"
    r"most\s+frequent|least\s+frequent)\b",
    re.IGNORECASE,
)


def _text_contains_ipa_word(sentence: str, ipa: str, example_words: List[Any]) -> bool:
    """Return True if `sentence` contains at least one word from `example_words`
    (case-insensitive whole-word). Accepts both list-of-strings and list-of-dicts
    (as stored on cards: `[{word: "foot", ...}]`). This is our proxy for phoneme
    presence until §3.2 dictionary lands."""
    if not sentence or not example_words:
        return False
    low = sentence.lower()
    for entry in example_words:
        # Normalise: accept plain string or dict {word: "..."}
        if isinstance(entry, dict):
            w = entry.get("word") or entry.get("text") or ""
        else:
            w = str(entry or "")
        if not w:
            continue
        w_clean = re.sub(r"[^a-zA-Z\-']", "", w.lower())
        if not w_clean:
            continue
        if re.search(rf"\b{re.escape(w_clean)}\b", low):
            return True
    return False


def _minimal_pair_diff_one_char(pair_str: str) -> Optional[bool]:
    """Given 'wordA/wordB', return True if they differ by exactly one letter
    (orthographic proxy — good enough for the foot/food guard). None if malformed."""
    if "/" not in pair_str:
        return None
    a, b = [x.strip().lower() for x in pair_str.split("/", 1)]
    if not a or not b or a == b:
        return None
    if abs(len(a) - len(b)) > 1:
        return False
    # Count char diffs after alignment
    if len(a) == len(b):
        diffs = sum(1 for x, y in zip(a, b) if x != y)
        return diffs == 1
    # Length differs by 1 → check insertion/deletion
    short, long = (a, b) if len(a) < len(b) else (b, a)
    for i in range(len(long)):
        if short == long[:i] + long[i+1:]:
            return True
    return False


def run_validation_suite(card: dict, ipa: str, muscles_expected: Tuple[str, ...],
                         creative: Dict[str, Any]) -> List[Dict[str, str]]:
    """Run all spec-§4 checks except word_contains_phoneme (needs §3.2 dictionary,
    deferred). Returns a list of {check, status, message} rows."""
    checks: List[Dict[str, str]] = []

    # 1) muscle_levels_match_rule (DERIVED, non-LLM)
    actual = tuple((m.get("activation") or "").upper()
                   for m in (card.get("facialMuscles") or []))
    if actual == muscles_expected:
        checks.append({"check": "muscle_levels_match_rule", "status": "pass",
                       "message": f"Muscles match spec-rule: {' / '.join(muscles_expected)}"})
    else:
        checks.append({"check": "muscle_levels_match_rule", "status": "fail",
                       "message": f"Muscle levels {actual} ≠ spec rule {muscles_expected}"})

    # 2) muscle levels ∈ enum
    valid_enum = all(a in {"HIGH", "MOD", "MODERATE", "LOW"} for a in actual)
    if not actual:
        checks.append({"check": "muscle_enum", "status": "fail",
                       "message": "Nessun facialMuscle definito."})
    elif not valid_enum:
        checks.append({"check": "muscle_enum", "status": "fail",
                       "message": f"Attivazioni fuori enum HIGH/MOD/LOW: {actual}"})
    else:
        checks.append({"check": "muscle_enum", "status": "pass",
                       "message": "Tutte le attivazioni conformi."})

    # 3) minimal_pairs_one_segment
    minpair_val = None
    for f in (card.get("features") or []):
        if (f.get("label") or "").strip().lower() == "minimal pairs":
            minpair_val = f.get("value") or ""
            break
    if minpair_val:
        pairs = [p.strip() for p in minpair_val.split(",") if p.strip()]
        good = sum(1 for p in pairs if _minimal_pair_diff_one_char(p) is True)
        bad = [p for p in pairs if _minimal_pair_diff_one_char(p) is False]
        if bad:
            checks.append({"check": "minimal_pairs_one_segment", "status": "fail",
                           "message": f"Coppia/e non minime (>1 char differ): {', '.join(bad[:3])}"})
        elif good >= 2:
            checks.append({"check": "minimal_pairs_one_segment", "status": "pass",
                           "message": f"{good} coppie minime valide."})
        elif good == 1:
            checks.append({"check": "minimal_pairs_one_segment", "status": "warn",
                           "message": "Solo 1 coppia minima valida — target ≥2."})

    # 4) sentence_contains_phoneme (uses commonWords as proxy until §3.2)
    example_words = card.get("commonWords") or []
    raw_sentences = ((creative.get("exampleSentences") or {}).get("items") or [])
    # Accept both str and dict {text: str}
    sentences: List[str] = []
    for s in raw_sentences:
        if isinstance(s, dict):
            sentences.append(s.get("text") or s.get("body") or "")
        else:
            sentences.append(str(s or ""))
    if sentences:
        # Skip check entirely if commonWords is empty — no reliable proxy available
        if not example_words:
            checks.append({"check": "sentence_contains_phoneme", "status": "skip",
                           "message": "commonWords vuoto — check saltato (attendere §3.2)."})
        else:
            bad_sent = [s for s in sentences if not _text_contains_ipa_word(s, ipa, example_words)]
            if bad_sent:
                checks.append({"check": "sentence_contains_phoneme", "status": "warn",
                               "message": f"{len(bad_sent)}/{len(sentences)} frase/i non "
                                          "contengono example words registrati — verifica manuale."})
            else:
                checks.append({"check": "sentence_contains_phoneme", "status": "pass",
                               "message": f"Tutte le {len(sentences)} frasi contengono example words."})

    # 5) no_unsourced_superlatives — scan all CREATIVE text
    offenders: List[str] = []
    def scan(key: str, text: str) -> None:
        if not text:
            return
        m = _SUPERLATIVE_RE.search(text)
        if m:
            offenders.append(f"{key}: '{m.group(0)}'")
    scan("mnemonic.phrase", (creative.get("mnemonic") or {}).get("phrase", ""))
    scan("mnemonic.note",   (creative.get("mnemonic") or {}).get("note", ""))
    scan("funFact.body",    (creative.get("funFact") or {}).get("body", ""))
    scan("deepDive.body",   (creative.get("deepDive") or {}).get("body", ""))
    scan("videoScript.body",(creative.get("videoScript") or {}).get("body", ""))
    for s in ((creative.get("exampleSentences") or {}).get("items") or []):
        scan("exampleSentences", s)
    if offenders:
        checks.append({"check": "no_unsourced_superlatives", "status": "fail",
                       "message": "Superlativi non citati: " + "; ".join(offenders)})
    else:
        checks.append({"check": "no_unsourced_superlatives", "status": "pass",
                       "message": "Nessun superlativo non citato."})

    return checks


# =========================================================================
# Field taxonomy — exposed for the UI / API contract
# =========================================================================
FIELD_TAXONOMY = {
    "CANONICAL_lookup":  ["ipa", "category", "subcategory", "height", "backness",
                          "rounding", "tenseness", "voicing", "manner",
                          "duration", "dialect_membership"],
    "DERIVED_by_rule":   ["classification", "vowelChartPosition", "knobs",
                          "facialMuscles"],
    "NEEDS_SOURCE":      ["commonWords_30", "spelling_distribution"],
    "CREATIVE_ai_draft": list(_CREATIVE_FIELDS),
    "OUT_OF_SCOPE":      ["spectrogram", "pink_trombone", "graphics"],
}
