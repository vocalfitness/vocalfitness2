# Canonical Phoneme Inventory — Phase 2: Consonants (GenAm & RP)

**Companion document to `canonical-phoneme-inventory.md` (vowels).** Same
sourcing standard applies: articulatory classifications below are
uncontested standard phonetics (Ladefoged & Johnson; Wells); frequency
values are relative rank only, not fabricated percentages — see the
sourcing note in the vowel document for why, and what to do about it.

As noted in the vowel doc, the **consonant inventory itself is almost
identical** between GenAm and RP — 24 consonant phonemes exist in both.
What differs is realization/allophony (flapping, glottalling, /l/
darkness, rhoticity), not which phonemes exist. That distinction should
shape how these are modeled in the CMS: one shared inventory table, plus
a small set of dialect-specific "realization notes" rather than two
separate consonant tables.

---

## Full Consonant Inventory (shared GenAm + RP)

| IPA | Example | Manner | Place | Voicing | Frequency Rank* |
|---|---|---|---|---|---|
| p | pie | Plosive | Bilabial | Voiceless | 15 |
| b | buy | Plosive | Bilabial | Voiced | 17 |
| t | tie | Plosive | Alveolar | Voiceless | 2 |
| d | die | Plosive | Alveolar | Voiced | 6 |
| k | kite | Plosive | Velar | Voiceless | 8 |
| g | guy | Plosive | Velar | Voiced | 16 |
| tʃ | chip | Affricate | Post-alveolar | Voiceless | 21 |
| dʒ | gyp / judge | Affricate | Post-alveolar | Voiced | 20 |
| f | fine | Fricative | Labiodental | Voiceless | 11 |
| v | vine | Fricative | Labiodental | Voiced | 13 |
| θ | thin | Fricative | Dental | Voiceless | 19 (rare cross-linguistically; frequent function-word use in English) |
| ð | this | Fricative | Dental | Voiced | 4 (high due to function words: the, this, that, there) |
| s | sip | Fricative | Alveolar | Voiceless | 3 |
| z | zip | Fricative | Alveolar | Voiced | 9 |
| ʃ | ship | Fricative | Post-alveolar | Voiceless | 18 |
| ʒ | vision | Fricative | Post-alveolar | Voiced | 24 (rarest English consonant) |
| h | high | Fricative | Glottal | Voiceless | 10 |
| m | my | Nasal | Bilabial | Voiced | 5 |
| n | nigh | Nasal | Alveolar | Voiced | 1 (most frequent English consonant) |
| ŋ | sing | Nasal | Velar | Voiced | 14 |
| l | lie | Lateral approximant | Alveolar | Voiced | 7 |
| r / ɹ | rye | Approximant | (Post-)alveolar | Voiced | 12 |
| j | yes | Approximant | Palatal | Voiced | 22 |
| w | wine | Approximant | Labial-velar | Voiced | 23 |

\* Relative rank only — same caveat as the vowel document: verify against
a real corpus (CELEX / BNC / Buckeye) before publishing as precise stats.
The general shape (nasals, alveolar stops/fricatives, and function-word
consonants like /ð/ ranking high; /ʒ/ ranking lowest) is well-supported
across multiple corpus studies and safe to treat as directionally correct
even before exact numbers are sourced.

---

## Dialect-specific realization notes (apply on top of the shared table)

These are NOT separate phonemes — they're allophonic/positional
differences that should be surfaced as a "Note dialetto" style flag on
the relevant consonant cards (/t/, /l/, /r/), the same field type
already used for vowels.

| Phoneme | GenAm behavior | RP behavior | Card implication |
|---|---|---|---|
| /t/ | Flapped to [ɾ] intervocalically ("butter," "city," "water") — sounds close to a /d/ or Spanish tap | Retains [tʰ]; glottal stop [ʔ] common informally, especially word-final or pre-consonant ("bottle," "not now") | Needs two audio references if you want to demonstrate both realizations — flapped GenAm /t/ audibly differs from RP [tʰ]/[ʔ] |
| /l/ | "Dark" [ɫ] (velarized) in nearly all positions | "Clear" [l] syllable-initially (e.g. "light"), "dark" [ɫ] syllable-finally (e.g. "feel") — a positional split RP has that GenAm doesn't | RP /l/ arguably needs to be treated as two allophones for teaching purposes; GenAm as one |
| /r/ | Always pronounced post-vocalically (rhotic) — see vowel doc's r-colored vowel section | Silent unless followed by a vowel (non-rhotic) — this is the source of RP's centring diphthongs (NEAR, SQUARE, CURE) | This is the single highest-impact consonant difference for Italian learners targeting one dialect vs. the other — worth its own dedicated teaching module, not just a card note |
| Glottal stop [ʔ] | Marginal (mainly before /n/, "button") | Increasingly common even in formal RP/Estuary contexts before consonants and word-finally | Worth flagging as a live sociolinguistic variable (RP is shifting), not a fixed rule |

---

## Minimal-pair note (relevant to Part 3 of the Emergent prompt — validated minimal pairs)

For consonant cards, the same validation logic requested for vowels
applies: a genuine minimal pair changes ONLY the target consonant, with
everything else — vowel, syllable count, stress — held constant. Good
examples the CMS can safely auto-suggest once phonemes are tagged:

- /θ/ vs /ð/: **thin/then**, **thigh/thy**
- /s/ vs /ʃ/: **sip/ship**, **sea/she**
- /tʃ/ vs /ʃ/: **chip/ship**
- /l/ vs /r/: **light/right**, **collect/correct** (a genuinely high-value pair for Italian learners, since /l/-/r/ confusion is not typically the issue — but /r/ realization itself is)
- /v/ vs /w/: **vine/wine** (classically difficult for some L1 backgrounds, though not typically Italian)

Avoid the earlier site's error pattern (foot/food) by running any
auto-suggested pair through a simple check: strip both words to their
phonemic transcription and confirm exactly one segment differs.

---

## What to hand Emergent

Same instructions as the vowel document: lock the manner/place/voicing
columns in as ground truth, treat frequency numbers as placeholder/rank-
only pending real corpus sourcing, and use the dialect-realization table
to drive the "Note dialetto" field content for /t/, /l/, and /r/ cards
specifically — these three are where GenAm/RP genuinely diverge and
where a generic "identical" note would be factually wrong.
