# Pronunciation Protocol §3.5 — Canonical (v1.0)

**Purpose**: deterministic composition of the "Vocal Fitness articulatory
protocol" 6-step guide for each phoneme card. Mirrors the authored form
on `/ʊ/` (u-foot) and generalises it across all 44 phonemes using their
canonical features (place, manner, voicing / height, backness, rounding,
tenseness).

**Scientific basis**:
- IPA descriptor system (place × manner × voicing for consonants;
  height × backness × rounding × tenseness for vowels).
- Ladefoged & Johnson, *A Course in Phonetics* (7th ed.) — articulatory
  descriptions for jaw aperture, tongue position, lip rounding, velum
  state, laryngeal setting.
- Chomsky & Halle, *The Sound Pattern of English* (1968) — feature-based
  underlying representation.
- Roach, *English Phonetics and Phonology* (RP reference).
- Ladefoged, *Vowels and Consonants* (GenAm reference).
- Vocal Fitness method (Prof S. Dapper) — the 6-step pedagogical framing
  (Jaw / Lips / Tongue / Apex / Voicing / Velum) is the trademarked
  didactic sequence used across the app.

**Never LLM-authored**: same contract as §3.1 / §3.4. LLM refinement is
allowed on the ``body`` free-form paragraph (kept as-is if AI-drafted),
but the 6 steps are RULE-BASED and re-emitted on every save unless the
card is flagged ``pronunciation_locked=true`` (protects u-foot etc.).

---

## §3.5 · Output shape

```
{
  "headline":    "Vocal Fitness articulatory protocol",   // fixed
  "steps": [
    { "label": "Jaw",     "body": "…", "labelLocalized": {it,en}, "bodyLocalized": {it,en} },
    { "label": "Lips",    …},
    { "label": "Tongue",  …},
    { "label": "Apex",    …},
    { "label": "Voicing", …},
    { "label": "Velum",   …}
  ],
  "body":        "<AI-drafted paragraph OR rule-composed summary>",
  "grounded_on": ["height","backness","rounding","voicing", …],
  "confidence":  1.0
}
```

The 6 labels ALWAYS appear in this order (matches u-foot). Each ``body``
is a short imperative sentence (~1-2 lines) telling the learner what to
DO with that articulator.

---

## §3.5.1 · Jaw aperture rule

| Kind      | Trigger                        | Aperture         | English body                                                                                        |
|-----------|--------------------------------|------------------|-----------------------------------------------------------------------------------------------------|
| Vowel     | height = close / near-close    | ≈ 1 finger       | "Open the mouth slightly — about one finger of vertical space between the molars."                  |
| Vowel     | height = close-mid / mid       | ≈ 1.5 fingers    | "Open the mouth moderately — about one and a half fingers between the molars."                     |
| Vowel     | height = open-mid / near-open  | ≈ 2 fingers      | "Open the mouth wide — about two fingers between the molars."                                       |
| Vowel     | height = open                  | ≈ 2.5 fingers    | "Open the mouth fully — about two and a half fingers, jaw dropped and relaxed."                     |
| Consonant | place = bilabial (m/b/p)       | almost closed    | "Bring the jaw to a near-neutral, closed position — the lips do the work."                          |
| Consonant | place = labiodental (f/v)      | slightly open    | "Keep the jaw slightly open so the upper teeth can rest lightly on the lower lip."                  |
| Consonant | place ∈ {dental, alveolar}     | 1 finger         | "Keep the jaw at neutral, about one finger of space. The tongue reaches upward — the jaw doesn't."  |
| Consonant | place ∈ {postalveolar,palatal} | 1 finger         | "Keep the jaw relaxed at neutral, about one finger of space."                                       |
| Consonant | place ∈ {velar,labial-velar}   | small aperture   | "Keep the jaw close to neutral. The tongue back does the work — the jaw stays out of the way."      |
| Consonant | place = glottal                | free             | "Jaw is passive and free — the sound is produced at the vocal folds, well below the tongue."        |

## §3.5.2 · Lips rule

Reads the canonical ``rounding`` enum (vowels) or infers from place
(consonants: /w/ = strong-rounded; /r/ = slight-rounded; labial primary
places dictate lip state).

| Rounding bucket | English body                                                                                                     |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| unrounded       | "Lips relaxed and neutral — neither rounded nor spread."                                                          |
| slight          | "Lips lightly rounded — a soft natural shape, no protrusion."                                                     |
| moderate        | "Round the lips moderately. No tension. Imagine a soft, relaxed \"oo\" shape — not pursed, not spread."           |
| strong          | "Round and protrude the lips strongly. Compact opening pushed forward."                                            |
| bilabial-closure | (m/b/p) "Bring the lips together for a full closure — evenly, without tension."                                  |
| labiodental      | (f/v)   "Rest the upper front teeth lightly against the lower lip — no biting, gentle contact."                  |

## §3.5.3 · Tongue (dorsum / body) rule

Reads ``height`` × ``backness`` for vowels (24 buckets), and ``place`` for
consonants (8 base places).

| Vowel (H,B) example              | English body                                                                                          |
|----------------------------------|-------------------------------------------------------------------------------------------------------|
| close, back  (u/ʊ)               | "Pull the body of the tongue back toward the throat. Raise the dorsum high but do NOT touch the velum." |
| close, front (i/ɪ)               | "Raise the tongue body high and forward, close to the hard palate — but leave a small gap."           |
| mid, central (ə/ɜː)              | "Keep the tongue body in a neutral central position — the resting shape."                             |
| open, back   (ɑː/ɒ)              | "Lower the tongue body and pull it slightly back. Wide throat, low tongue."                            |
| open, front  (æ)                 | "Lower the tongue body and push it forward. Feel space between the tongue back and the pharynx wall." |

| Consonant (place)                | English body                                                                                          |
|----------------------------------|-------------------------------------------------------------------------------------------------------|
| bilabial                         | "Tongue is passive and relaxed. The action is at the lips."                                            |
| labiodental                      | "Tongue is passive. The lower lip and upper teeth form the constriction."                              |
| dental (θ/ð)                     | "Bring the tongue tip forward, touching the back of the upper teeth or peeking through them slightly."|
| alveolar (t/d/n/s/z/l)           | "Place the tongue tip or blade on the alveolar ridge — the bony bump just behind the upper teeth."     |
| postalveolar (ʃ/ʒ/tʃ/dʒ)         | "Raise the tongue blade toward the area just behind the alveolar ridge. Sides braced against upper molars." |
| palatal (j)                      | "Raise the tongue body high toward the hard palate, similar to the vowel /i/ but with more approach." |
| velar (k/g/ŋ)                    | "Raise the back of the tongue to make contact (or close approach) with the soft palate."               |
| labial-velar (w)                 | "Round the lips strongly AND raise the tongue back toward the velum — two constrictions at once."       |
| glottal (h)                      | "Tongue stays in the position of the following vowel — the sound is produced by the vocal folds."      |

## §3.5.4 · Apex (tongue tip) rule

| Kind      | Trigger                                | English body                                                                                    |
|-----------|-----------------------------------------|-------------------------------------------------------------------------------------------------|
| Vowel     | backness = front                       | "Let the tongue tip rest lightly near the lower front teeth — passive."                          |
| Vowel     | backness = central                     | "Tongue tip is passive, in a neutral low position."                                              |
| Vowel     | backness = back                        | "Leave the tongue tip low, behind the lower front teeth. Passive, never pressed against anything." |
| Consonant | place ∈ {dental, alveolar, postalveolar}| "The apex is ACTIVE — it makes the constriction."                                                |
| Consonant | place ∈ {bilabial, labiodental, velar,glottal, labial-velar} | "Apex is passive and low, behind the lower front teeth."                     |
| Consonant | place = palatal (j)                    | "Apex low; the tongue blade is the articulator."                                                 |
| Consonant | manner = lateral (l)                   | "Apex ACTIVE on the alveolar ridge. In American syllable-final /l/ the tongue back also retracts (dark L)." |

## §3.5.5 · Voicing rule

| Voicing              | English body                                                                                                            |
|----------------------|-------------------------------------------------------------------------------------------------------------------------|
| voiced (all vowels)  | "Engage the vocal folds. Place your fingers on your larynx — you should feel a steady, low-frequency vibration."         |
| voiced (consonant)   | "Vocal folds vibrate for the full duration of the sound. Test with fingers on the throat."                                |
| voiceless            | "Vocal folds do NOT vibrate — silent airflow only. No throat buzz."                                                      |
| voiceless aspirated  | (p/t/k initial stressed) "Vocal folds do not vibrate, and there is an audible puff of breath /h/ after the release."     |

## §3.5.6 · Velum rule

| State  | English body                                                                                             |
|--------|----------------------------------------------------------------------------------------------------------|
| RAISED | "Keep the soft palate raised. All airflow exits through the mouth. This is an oral sound."                |
| LOWERED| (m/n/ŋ) "Lower the soft palate to open the nasal port. Airflow resonates through the nose."             |

---

## §3.5.7 · Italian localisation

Every step provides `labelLocalized: {it, en}` and `bodyLocalized: {it, en}`
so the frontend can render either language. The Italian translations use
standard Italian phonetics terminology (Canepari, Marotta, Grassi) and
the same imperative teaching tone as the English source.

## §3.5.8 · Idempotency & locking

Same contract as §3.4 hotspots. Card flag ``pronunciation_locked=true``
freezes the engine; the field is otherwise recomputed on:
  • admin_create
  • admin_update (unless `pronunciationGuide` is in the PATCH body →
    auto-lock, mirroring the hotspot behaviour)
  • ensure_phoneme_seed startup backfill
  • batch/regenerate-derived
