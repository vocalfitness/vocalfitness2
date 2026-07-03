# Canonical Phoneme Inventory — General American (GenAm) & Received Pronunciation (RP)

**Purpose:** This is the locked reference dataset described in Part 2 of the
Emergent build prompt. Every phoneme card should pull its `features`,
`knobs`, `classification`, and `frequencyChart` values from this table —
never hand-typed per card.

**Sourcing note (read before handing to Emergent):** The articulatory
classifications below (height, backness, rounding, tenseness, voicing,
manner) are standard, uncontested IPA phonetics — sourced from Ladefoged &
Johnson's *A Course in Phonetics* and Wells' *Accents of English*, the two
most-cited references in English phonology. These are safe to treat as
ground truth.

**Frequency values are a different matter.** I have NOT filled in precise
frequency-of-use percentages, because doing so from memory would be exactly
the kind of invented statistic you're trying to eliminate. Real per-phoneme
frequency data exists in corpora like the **CELEX lexical database**, the
**British National Corpus**, or the **Buckeye Speech Corpus** (for GenAm
conversational speech) — I've left a `frequencyRank` (relative ordering
only, which is well-established and stable across studies) instead of a
fabricated percentage. Before this goes live, either (a) license/query one
of those corpora for real numbers, or (b) keep the chart as relative rank
only and drop the "Xth most common" superlative claims from card copy
entirely — that alone would have prevented the "2nd most common back vowel"
contradiction you ran into.

---

## GENERAL AMERICAN (GenAm) — Monophthongs

| IPA | Lexical Set (Wells) | Height | Backness | Rounding | Tense/Lax | Duration | Frequency Rank* |
|---|---|---|---|---|---|---|---|
| iː | FLEECE | Close | Front | Unrounded | Tense | Long | 1 |
| ɪ | KIT | Near-close | Front | Unrounded | Lax | Short | 2 |
| eɪ** | FACE | — (diphthong) | — | — | — | — | — |
| ɛ | DRESS | Open-mid | Front | Unrounded | Lax | Short | 5 |
| æ | TRAP | Near-open | Front | Unrounded | Lax | Short (lengthens pre-voiced) | 4 |
| ʌ | STRUT | Open-mid | Back (unrounded) | Unrounded | Lax | Short | 6 |
| ə | comma/SCHWA | Mid | Central | Unrounded | Lax | Very short | 3 (most frequent overall, unstressed) |
| ɚ / ɝ | NURSE (GenAm, rhotic) | Mid | Central | Unrounded (r-colored) | Tense/Lax varies | Short–long | 7 |
| ʊ | FOOT | Near-close | Back | Moderate | Lax | Short | 9 (least frequent full vowel) |
| uː | GOOSE | Close | Back | Rounded | Tense | Long | 8 |
| ɑː | PALM / LOT (merged in GenAm) | Open | Back | Unrounded | Tense | Long | 10 |
| ɔː | THOUGHT (many GenAm speakers merge with ɑː — cot-caught merger) | Open-mid | Back | Rounded | Tense | Long | — (dialect-variable) |

\* Relative rank only (1 = most frequent), not a percentage — verify against a real corpus before publishing exact numbers.
\** GenAm treats FACE and GOAT as diphthongs (see below), not the pure monophthongs found in some other dialects.

## GENERAL AMERICAN — Diphthongs

| IPA | Lexical Set | Glide direction | Notes |
|---|---|---|---|
| eɪ | FACE | Close-mid front → near-close front | |
| aɪ | PRICE | Open central → near-close front | |
| ɔɪ | CHOICE | Open-mid back rounded → near-close front | Rarest diphthong in English |
| aʊ | MOUTH | Open central → near-close back rounded | |
| oʊ | GOAT | Close-mid back rounded → near-close back rounded | GenAm goal glides back; RP is closer to /əʊ/ |

## GENERAL AMERICAN — R-colored vowels (a genuinely distinct GenAm feature)

| IPA | Lexical Set | Notes |
|---|---|---|
| ɝː | NURSE (stressed) | Rhotic, mid-central, one of the most acoustically distinct GenAm vowels — no RP equivalent as a monophthong |
| ɚ | letter, computER (unstressed) | Rhotic schwa |
| ɑːr, ɔːr, ɪr, ɛr, ʊr | starRT, NORTH/FORCE, NEAR, SQUARE, CURE equivalents | GenAm keeps postvocalic /r/ throughout (rhotic accent) |

---

## RECEIVED PRONUNCIATION (RP) — Monophthongs

| IPA | Lexical Set | Height | Backness | Rounding | Tense/Lax | Duration | Frequency Rank* |
|---|---|---|---|---|---|---|---|
| iː | FLEECE | Close | Front | Unrounded | Tense | Long | 1 |
| ɪ | KIT | Near-close | Front | Unrounded | Lax | Short | 2 |
| e | DRESS | Open-mid | Front | Unrounded | Lax | Short | 5 |
| æ | TRAP | Near-open | Front | Unrounded | Lax | Short | 6 |
| ʌ | STRUT | Open-mid | Central/Back | Unrounded | Lax | Short | 7 |
| ɑː | PALM/START | Open | Back | Unrounded | Tense | Long | 9 |
| ɒ | LOT | Open | Back | Rounded | Lax | Short | 8 (distinct from GenAm — NOT merged with ɑː in RP) |
| ɔː | THOUGHT/NORTH/FORCE | Open-mid | Back | Rounded | Tense | Long | 10 |
| ʊ | FOOT | Near-close | Back | Moderate | Lax | Short | 12 (least frequent) |
| uː | GOOSE | Close | Back | Rounded | Tense | Long | 11 |
| ɜː | NURSE | Mid | Central | Unrounded | Tense | Long | 4 — non-rhotic, this is a pure long monophthong in RP, unlike GenAm's rhotic /ɝː/ |
| ə | comma/SCHWA | Mid | Central | Unrounded | Lax | Very short | 3 (most frequent overall) |

\* Relative rank only — same sourcing caveat as above.

**Key RP-vs-GenAm distinctions to encode as real dialect differences, not "near identical" defaults:**
- RP keeps **LOT (ɒ) and THOUGHT/PALM (ɔː/ɑː) distinct**; most GenAm speakers merge LOT into PALM (cot-caught merger affects THOUGHT further).
- RP's **NURSE (ɜː)** is a pure non-rhotic long monophthong; GenAm's NURSE (ɝː) is rhotic — these should never be marked "identical," even though they're historically the same lexical set.
- RP is **non-rhotic**: no postvocalic /r/ in START, NORTH, NURSE, letter, etc. — this generates RP's distinct **centring diphthongs** (below), which have no GenAm equivalent at all.

## RP — Diphthongs (including centring diphthongs unique to non-rhotic RP)

| IPA | Lexical Set | Glide direction | Notes |
|---|---|---|---|
| eɪ | FACE | Close-mid front → near-close front | |
| aɪ | PRICE | Open central → near-close front | |
| ɔɪ | CHOICE | Open-mid back rounded → near-close front | Rarest diphthong |
| aʊ | MOUTH | Open central → near-close back rounded | |
| əʊ | GOAT | Mid central → near-close back rounded | RP starts more central than GenAm's /oʊ/ |
| ɪə | NEAR | Near-close front → central (schwa) | **No GenAm monophthong/diphthong equivalent** — GenAm has rhotic /ɪr/ instead |
| eə | SQUARE | Open-mid front → central (schwa) | Same — GenAm equivalent is rhotic /ɛr/ |
| ʊə | CURE | Near-close back → central (schwa) | Increasingly merges with /ɔː/ in modern RP; GenAm equivalent is rhotic /ʊr/ |

---

## Consonants — shared inventory, dialect-specific behaviors

The consonant *inventory* (which phonemes exist) is almost entirely
identical between GenAm and RP — this is a vowel-and-rhoticity story, not
a consonant-inventory story. What differs is **realization/allophony**,
which is worth its own card-level flag rather than a separate consonant
table:

| Feature | GenAm | RP |
|---|---|---|
| Intervocalic /t/ | Frequently flapped to [ɾ] (e.g. "butter," "city") | Retains [t], or glottal-stops [ʔ] informally |
| Postvocalic /r/ | Always pronounced (rhotic) | Silent unless followed by a vowel (non-rhotic) |
| /l/ | "Dark L" [ɫ] in most positions | Clear [l] syllable-initially, dark [ɫ] syllable-finally |
| Glottal stop [ʔ] for /t/ | Rare, mostly before /n/ ("button") | Common in informal RP/Estuary before consonants and word-finally |

---

## What to hand Emergent

1. This table, as-is, for the articulatory/classification fields (height,
   backness, rounding, tenseness, duration, voicing) — safe to treat as
   ground truth and lock into dropdowns immediately.
2. A flag that **frequency percentages are placeholder/relative-rank only**
   until real corpus data is sourced — recommend they either integrate a
   real frequency dataset or strip precise-sounding superlative claims
   ("2nd most common," exact percentages) from generated card copy until
   then.
3. The **RP-vs-GenAm divergence list** (LOT/THOUGHT split, NURSE
   rhotic-vs-monophthong, centring diphthongs) as the explicit set of
   phonemes that must NOT be marked "near identical AmE and RP" — this
   directly fixes the dialect-note duplication/inaccuracy bug from the
   /ʊ/ card review.

Phonemes not addressed here (full consonant inventory as individual cards,
stress/prosody data, connected-speech phenomena) would be a logical Phase 2
if the site's Guida alla pronuncia / articulatory protocol content expands
that direction.
