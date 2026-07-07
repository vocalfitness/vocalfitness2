# Hotspot Rule §3.4 — Canonical (v1.0)

**Purpose**: deterministic composition of anatomical hotspots for the phoneme
card sagittal overlay. Each phoneme surfaces ONLY the anatomical regions
that are pedagogically relevant for its specific articulation, mirroring
`§3.1 Muscle Rule` (never LLM-authored — rule-based lookup).

**Reference model**: `/ʊ/` (u-foot) with its 9 authored hotspots. This spec
generalises the pattern across all 44 phonemes of the VocalFitness
inventory (RP + GenAm).

## Coordinate system

All hotspots use percentage-based coordinates on the standard sagittal
image (16:9, right-facing head). Values are `x∈[0,100]`, `y∈[0,100]`,
one decimal.

Anchors calibrated on the u-foot reference image:
- Upper lip: ~34, 55
- Alveolar ridge: 39, 42
- Hard palate crown: 44, 46
- Velum: 52, 53
- Pharyngeal wall (posterior): 60, 65
- Tongue tip (rest): 40, 55
- Tongue blade (rest): 43, 58
- Tongue dorsum (rest centre): 48, 63
- Tongue root: 55, 68
- Larynx / glottis: 51, 77

Deviations from rest are computed by the rule tables below.

---

## Hotspot slots (7 fixed slots per vowel · 5 for consonant, plus place-specific)

Each phoneme surfaces a subset of these slots based on its features. The
`role` and `detail` templates below can be refined by an LLM pass for
tone/localisation, but the STRUCTURE (which slots + which value) is
deterministic and never LLM-authored.

### VOWEL slots (7 baseline)
1. **apex** — tongue tip position (function of `backness`)
2. **blade** — lamina position (function of `height` + `backness`)
3. **dorsum** — main articulator, tongue body (function of `height` +
   `backness` + `tenseness`) — always marked as the primary hotspot
4. **lips** — rounding (function of `rounding` enum)
5. **velum** — always RAISED for oral vowels; LOWERED for nasalised (none in EN inventory)
6. **pharynx** — width (function of `tongue_root` / RP-neutral / retracted for /ɑː/, /ɔː/)
7. **larynx** — always VOICED for vowels

Plus 2 passive landmarks for orientation:
- **alveolar-ridge** — always shown for orientation (passive on vowels)
- **hard-palate** — always shown for orientation (passive on vowels)

Total: **9 hotspots per vowel** (matches u-foot).

### CONSONANT slots (5-7 depending on manner)
1. **primary-constriction** — WHERE the constriction is (place-specific
   coordinates: bilabial/labiodental/dental/alveolar/postalveolar/
   palatal/velar/glottal)
2. **manner-marker** — HOW (closure/friction gap/approximation/tap/nasal
   port)
3. **velum** — RAISED for oral / LOWERED for nasal
4. **larynx** — VOICED / VOICELESS + (aspirated for /p, t, k/ initial in stressed syllables)
5. **lips** — position (spread/neutral/rounded — /w/, /r/ have rounding)

Optional slots (added when relevant):
6. **tongue-body-shape** — for laterals (/l/ dark-L retracted) and
   approximants (/r/ retroflex or bunched)
7. **airflow-note** — for fricatives (turbulent) / affricates (stop→release)

Total: **5-7 hotspots per consonant**.

---

## §3.4.1 · Vowel rule tables

### apex position × backness
| backness | x | y | title | role |
|---|---|---|---|---|
| front | 40.6 | 51.2 | "Apex — raised toward alveolar ridge" | "Tongue tip: raised, front" |
| central | 40.6 | 53.8 | "Apex — neutral" | "Tongue tip: neutral" |
| back | 40.6 | 54.4 | "Apex — passive, behind lower front teeth" | "Tongue tip: low, free, not touching" |

### blade position × (height, backness)
| height | backness | x | y | title |
|---|---|---|---|---|
| close/near-close | front | 41 | 52 | "Blade — front, high" |
| close/near-close | back | 43 | 56.8 | "Blade — back, high" |
| close/near-close | central | 42 | 55 | "Blade — central, high" |
| close-mid/mid | front | 41.5 | 55 | "Blade — front, mid" |
| close-mid/mid | back | 43 | 60 | "Blade — back, mid" |
| close-mid/mid | central | 42 | 57.5 | "Blade — central, mid" |
| open-mid/near-open/open | front | 41.5 | 60 | "Blade — front, low" |
| open-mid/near-open/open | back | 43.5 | 63 | "Blade — back, low" |
| open-mid/near-open/open | central | 42.5 | 61.5 | "Blade — central, low" |

### dorsum position × (height, backness, tenseness)
| height | backness | x | y | qualifier |
|---|---|---|---|---|
| close | front | 46 | 59 | "close, raised toward palate" |
| close | back | 47.3 | 60 | "close, raised toward velum" |
| near-close | front | 46.5 | 61 | "near-close, high" |
| near-close | back | 47.3 | 64.1 | "near-close, raised toward velum" |
| close-mid | front | 47 | 63 | "close-mid, mid-high" |
| close-mid | back | 48 | 66 | "close-mid, mid-high back" |
| mid | central | 48 | 65 | "mid, central" |
| open-mid | front | 48 | 67 | "open-mid, mid-low front" |
| open-mid | back | 49 | 69 | "open-mid, mid-low back" |
| near-open | front | 48.5 | 69 | "near-open, low-mid front" |
| open | front | 49 | 71 | "open, low front" |
| open | back | 50 | 71 | "open, low back" |

Tenseness suffix appended to role: "TENSE" → adds "· tense body" · "LAX"
→ adds "· lax, retracted".

### lip rounding × rounding enum
| rounding | title | activation | notes |
|---|---|---|---|
| unrounded | "Lip rounding — NONE / spread" | "Orbicularis oris: relaxed" | zygomaticus MAY be active for close-front (see §3.1) |
| slight | "Lip rounding — SLIGHT" | "Orbicularis oris: light activation" | typical of /ɔː/ RP, /ə/ |
| moderate | "Lip rounding — MODERATE" | "Orbicularis oris: moderate activation" | /ʊ/, /ɔ/ AmE |
| strong | "Lip rounding — STRONG (protruded)" | "Orbicularis oris: strong activation, protrusion" | /uː/, /w/ |

### velum (always RAISED for oral vowels)
- x: 52, y: 52.5
- title: "Velum (soft palate) — RAISED"
- role: "Nasal port closed"

### pharynx × tongue_root / dialect
- default: `neutral` at (54.2, 64.1) — "Pharynx — neutral / moderately wide"
- retracted (for low-back vowels /ɑː/, /ɔː/): (55, 66) — "Pharynx — wide"
- advanced (rare, tense high-front /iː/): (53, 63) — "Pharynx — slightly advanced"

### larynx (always VOICED for vowels)
- x: 51.5, y: 76.7
- title: "Larynx / Glottis — VOICED"

### passive landmarks (always shown on vowels)
- alveolar-ridge: (39.2, 41.6) — "Passive — not engaged"
- hard-palate: (43.7, 46.1) — "Passive — overhead vault"

---

## §3.4.2 · Consonant rule tables

### primary-constriction × place (x, y coordinates + label)
| place | x | y | label | active articulator |
|---|---|---|---|---|
| bilabial | 32 | 57 | "Both lips (bilabial closure)" | upper + lower lip |
| labiodental | 33 | 60 | "Lower lip against upper teeth" | lower lip + upper incisors |
| dental | 38 | 55 | "Tongue tip against upper teeth" | apex + upper incisors |
| alveolar | 39 | 52 | "Tongue tip/blade against alveolar ridge" | apex/lamina + alveolar ridge |
| postalveolar | 43 | 50 | "Tongue blade against post-alveolar area" | lamina + post-alveolar |
| palatal | 47 | 54 | "Tongue body against hard palate" | dorsum + hard palate |
| velar | 51 | 58 | "Tongue back against velum" | dorsum back + velum |
| glottal | 52 | 74 | "Glottis (vocal folds)" | vocal folds |

### manner-marker × manner
| manner | qualifier | detail |
|---|---|---|
| plosive | "Complete closure — air pressure builds — sudden release" | orlusion → burst |
| affricate | "Complete closure → controlled fricative release" | e.g. /tʃ/ /dʒ/ |
| fricative | "Narrow gap — turbulent airflow" | sustained hiss / buzz |
| nasal | "Complete oral closure + LOWERED velum → airflow through nose" | ONLY manner with lowered velum |
| approximant | "Close approximation — no turbulence" | /w/, /r/, /j/, /l/ |
| lateral | "Central closure + lateral airflow over tongue sides" | /l/ specifically |
| tap/flap | "Brief single contact" | e.g. AmE flap of /t/ |
| trill | "Rapid multiple contacts" | not in EN inventory |

### velum × nasal flag
- nasal (m, n, ŋ): velum LOWERED at (52, 56) — "Velum — LOWERED (nasal port OPEN)"
- oral: velum RAISED at (52, 52.5) — "Velum — RAISED (nasal port CLOSED)"

### larynx × voicing × aspiration
- voiceless unaspirated: (51.5, 76.7) — "Larynx — voiceless (vocal folds apart)"
- voiceless aspirated (initial /p, t, k/ stressed): (51.5, 76.7) + kineticCue "audible /h/-like puff after release"
- voiced: (51.5, 76.7) — "Larynx — VOICED (vocal folds vibrating)"

### lips × rounding (consonants)
- /w/: rounded, x=32, y=59 — "Lips — rounded, protruded"
- /r/ (AmE, RP): slight rounding, x=32, y=58 — "Lips — slight rounding"
- everything else: neutral, hidden unless bilabial/labiodental (already shown as primary)

### airflow-note (fricatives / affricates)
- x: 45, y: 51
- title: "Turbulent airflow" (fricative) / "Stop → controlled release" (affricate)

### tongue-body-shape (laterals, approximants /r/)
- lateral (/l/ light): x=42, y=54 — "Tongue tip up + sides down"
- lateral (/ɫ/ dark, AmE syllable-final): x=48, y=66 — "Tongue back retracted + tip up"
- retroflex /r/ (AmE): x=44, y=58 — "Tongue tip curled back"
- bunched /r/ (AmE alt): x=47, y=60 — "Tongue body bunched, tip low"
- palatal approx /j/: x=45, y=55 — "Tongue body raised toward palate"

---

## §3.4.3 · Composition order (rendering)

Hotspots are emitted in this canonical order (matches u-foot):
1. `alveolar-ridge` (vowels only, passive)
2. `hard-palate` (vowels only, passive)
3. `apex` (vowels) / `primary-constriction` (consonants)
4. `blade` (vowels)
5. `dorsum` (vowels) / `manner-marker` (consonants)
6. `lips` (all, when relevant)
7. `velum` (all)
8. `pharynx` (vowels)
9. `larynx` (all)
10. `tongue-body-shape` (consonants when relevant)
11. `airflow-note` (fricatives/affricates)

---

## §3.4.4 · Localisation contract

Every hotspot output SHALL carry `labelLocalized`, `titleLocalized`,
`roleLocalized`, `detailLocalized`, `anatomyLocalized` as `{it, en}` dicts.
The rule engine emits English + a template Italian translation from a
static translation table. An OPTIONAL LLM refinement pass (Claude Sonnet
4.5) may rewrite the Italian and English detail fields for pedagogical
tone — but MUST NOT alter coordinates, labels or roles.

## §3.4.5 · Idempotency contract

`generate_hotspots(ipa, dialect, canon)` is deterministic and idempotent:
same inputs → identical output. The engine NEVER preserves user-authored
hotspots; if the user has manually curated hotspots for a card (like
u-foot), a `hotspots_locked=true` flag on the card doc SHALL skip the
generator. Otherwise (`hotspots_locked=false` or unset), the generator
overwrites the field on every batch-fill-v2 run.
