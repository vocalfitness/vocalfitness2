/**
 * Phoneme card data — /ʊ/ (FOOT)
 * Single source of truth for the /ʊ/ phoneme card.
 * Future phonemes will be added as separate entries in the export below.
 */

export const PHONEME_U_FOOT = {
  id: 'u-foot',
  ipa: 'ʊ',
  displayIpa: '/ʊ/',
  category: 'vowel',
  subcategory: 'short-lax',
  examples: ['FOOT', 'BOOK', 'PUT'],
  dialects: ['AmE', 'RP'],
  dialectNote: 'near identical AmE and RP',

  assets: {
    sideView:       'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vznyakkp__%CA%8A_%20Foot%2016_9%20AmE.png',
    frontView:      'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/5pyhoxyr_Front%20_%CA%8A_%20Foot%20AmE.png',
    articulatory:   'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ga780377_%CA%8A%20Foot%20Dapper.png',
  },

  /**
   * Hotspots on the side-view image (main background).
   * x, y are percentages (0–100) on the FULL image — positions calibrated visually.
   * Anchors the existing baked-in labels so hover/click reveals deeper info.
   */
  hotspots: [
    {
      id: 'alveolar-ridge',
      x: 36, y: 34,
      label: 'Alveolar ridge',
      title: 'Alveolar ridge',
      role: 'Passive — not engaged',
      detail: 'The bony bump just behind the upper teeth. For /ʊ/, the tongue does NOT touch the alveolar ridge: the apex stays low and relaxed. The ridge becomes the active articulation site for /t/, /d/, /n/, /l/, /s/, /z/ — but here it remains passive.',
      anatomy: 'Bony protrusion of the maxilla, posterior to the upper incisors.',
    },
    {
      id: 'hard-palate',
      x: 41, y: 41,
      label: 'Hard palate',
      title: 'Hard palate',
      role: 'Passive — overhead vault',
      detail: 'The dome of bone forming the roof of the mouth. For /ʊ/, the back of the tongue rises toward the rear of the palate (toward the velum) but does NOT make contact. The palatal vault acts as a resonance chamber that shapes the dark, rounded quality of this vowel.',
      anatomy: 'Anterior portion of the palate, bony substrate.',
    },
    {
      id: 'apex-passive',
      x: 30, y: 60,
      label: 'Apex (tongue tip)',
      title: 'Apex — passive, lower front teeth',
      role: 'Tongue tip: low, free, not touching',
      detail: 'The very tip of the tongue stays LOW and RELAXED behind the lower front teeth. It is not pressed against any surface. This passive apex is a hallmark of back vowels like /ʊ/ — completely different from /t/, /d/, /n/, /l/ where the apex is the active articulator.',
      anatomy: 'Tongue apex — anterior-most portion.',
    },
    {
      id: 'blade-back',
      x: 39, y: 58,
      label: 'Blade (lamina)',
      title: 'Blade — back, high',
      role: 'Lamina: pulled back and raised',
      detail: 'The blade (the flat surface just behind the apex) is pulled BACK toward the throat and slightly RAISED. This is what gives /ʊ/ its "back" quality. Compare to /iː/ where the blade is FORWARD and high.',
      anatomy: 'Lamina linguae — flat portion of the tongue behind the apex.',
    },
    {
      id: 'dorsum-near-close',
      x: 47, y: 65,
      label: 'Dorsum',
      title: 'Dorsum — back, near-close, raised toward velum',
      role: 'Tongue body: high-back, lax, retracted',
      detail: 'The MAIN articulator for /ʊ/. The dorsum (the body/crest of the tongue) rises toward the back of the mouth (the velum) in a NEAR-CLOSE position — high, but not fully closed (that would be /uː/). The body is LAX, not tense.',
      anatomy: 'Dorsum linguae — main body/crest of the tongue.',
      kineticCue: 'Imagine your tongue body settling backward and slightly upward, relaxed.',
    },
    {
      id: 'lip-rounding',
      x: 28, y: 71,
      label: 'Lip rounding',
      title: 'Lip rounding — MODERATE',
      role: 'Orbicularis oris: moderate activation',
      detail: 'The lips are MODERATELY rounded — not tightly pursed (that would be /uː/), not spread (that would be /iː/). The orbicularis oris muscle is engaged but relaxed. Slight protrusion. This rounding contributes to the dark, hollow timbre of /ʊ/.',
      anatomy: 'Orbicularis oris muscle.',
      kineticCue: 'Soft "oo" shape — relaxed, not pressed.',
    },
    {
      id: 'velum-raised',
      x: 62, y: 40,
      label: 'Velum',
      title: 'Velum (soft palate) — RAISED',
      role: 'Nasal port closed',
      detail: 'The velum (soft palate) is RAISED, closing the nasal port. This means airflow exits ENTIRELY through the mouth — /ʊ/ is an ORAL vowel, not nasal. Compare to /m/, /n/, /ŋ/ where the velum is lowered.',
      anatomy: 'Velum palatinum — muscular flap at the back of the palate.',
    },
    {
      id: 'pharynx-neutral',
      x: 66, y: 58,
      label: 'Pharynx',
      title: 'Pharynx — neutral / moderately wide',
      role: 'Throat: relaxed, moderately wide',
      detail: 'The pharynx (throat cavity) is in a NEUTRAL position — moderately wide, neither constricted nor expanded. This contributes to the relaxed quality of /ʊ/. Contrast with /ɑː/ where the pharynx is wide and open.',
      anatomy: 'Pharyngeal cavity — region from the velum down to the larynx.',
    },
    {
      id: 'larynx-voiced',
      x: 50, y: 87,
      label: 'Larynx / Glottis',
      title: 'Larynx / Glottis — VOICED',
      role: 'Vocal folds vibrating',
      detail: 'The vocal folds are vibrating, producing voicing. All vowels are voiced by default. You can verify by placing your fingers on your throat — you will feel the vibration.',
      anatomy: 'Larynx — vocal folds within.',
      kineticCue: 'Place hand on throat — feel the vibration.',
    },
  ],

  /**
   * Spelling distribution in English orthography.
   */
  spellings: [
    { letters: 'oo',    percent: 60, examples: 'foot, book, look' },
    { letters: 'u',     percent: 30, examples: 'put, push, full' },
    { letters: 'ou',    percent: 8,  examples: 'could, would' },
    { letters: 'other', percent: 2,  examples: 'woman, wolf' },
  ],

  /**
   * Frequency in English among back/short vowels.
   * Each bar represents one phoneme; the orange (active) one is /ʊ/.
   */
  frequencyChart: [
    { ipa: 'ɪ',  height: 95, active: false },
    { ipa: 'ʊ',  height: 62, active: true  },  // ← THIS phoneme
    { ipa: 'ɛ',  height: 80, active: false },
    { ipa: 'e',  height: 70, active: false },
    { ipa: 'n',  height: 88, active: false },
    { ipa: 'ə',  height: 50, active: false },
    { ipa: 'o',  height: 65, active: false },
    { ipa: 'e',  height: 45, active: false },
    { ipa: 'uː', height: 55, active: false },
  ],

  /**
   * The 6 articulatory features summary.
   */
  features: [
    { label: 'Height',       value: 'Near-close' },
    { label: 'Backness',     value: 'Back' },
    { label: 'Rounding',     value: 'MODERATE' },
    { label: 'Voicing',      value: 'Voiced' },
    { label: 'Manner',       value: 'Pure monophthong' },
    { label: 'Jaw',          value: 'near-close' },
    { label: 'Contrast',     value: '/ʊ/ vs /uː/: shorter, laxer, less rounded' },
    { label: 'Minimal pairs', value: 'foot/food, look/Luke' },
    { label: 'Duration',     value: 'short' },
    { label: 'Airflow',      value: 'continuous' },
    { label: 'Note',         value: 'near identical AmE and RP' },
  ],

  /**
   * Articulatory knobs (gauges).
   */
  knobs: [
    { id: 'advancement', label: 'ADVANCEMENT', value: 20, valueLabel: 'back' },
    { id: 'tenseness',   label: 'TENSENESS',   value: 25, valueLabel: 'lax' },
    { id: 'height',      label: 'HEIGHT',      value: 80, valueLabel: 'near-close', highlight: true },
    { id: 'roundness',   label: 'ROUNDNESS',   value: 50, valueLabel: 'moderate' },
  ],

  /**
   * Example sentences (with the /ʊ/-bearing words highlighted in orange).
   */
  exampleSentences: [
    { text: 'Put the book down.',          highlights: ['Put', 'book'] },
    { text: 'Look at your foot.',           highlights: ['Look', 'foot'] },
    { text: '"Could you push?"',           highlights: ['Could', 'push'] },
  ],

  /**
   * Facial muscle activation (from the front-view modal).
   */
  facialMuscles: [
    { name: 'Orbicularis oris',  activation: 'MODERATE', detail: 'rounding' },
    { name: 'Buccinator',        activation: 'moderate', detail: 'cheek tension' },
    { name: 'Zygomaticus major', activation: 'LOW',      detail: 'minimal upward pull' },
    { name: 'Masseter',          activation: 'near-close', detail: 'jaw set in near-close position' },
    { name: 'Mentalis',          activation: 'minimal',  detail: 'chin almost passive' },
  ],

  /**
   * Vowel chart position (within the IPA trapezoid 0–100 in both axes).
   * x: front (0) → back (100); y: close (0) → open (100)
   */
  vowelChartPosition: { x: 80, y: 22 },

  /**
   * Audio sample URLs (AmE + RP, isolated + each example).
   * Phase 1: AmE only — /ʊ/ is "near identical" AmE/RP so RP reuses AmE for now.
   */
  audio: {
    AmE: {
      isolated: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/52c9efo5_u_singled_out.wav',
      examples: [
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ej28onls_put_the_book_down.wav',
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3imwgt72_look_at_your_foot.wav',
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/d7nzj8l3_could_you_push.wav',
      ],
    },
    RP: {
      isolated: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/52c9efo5_u_singled_out.wav',
      examples: [
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ej28onls_put_the_book_down.wav',
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3imwgt72_look_at_your_foot.wav',
        'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/d7nzj8l3_could_you_push.wav',
      ],
    },
  },
};

/**
 * Library export (extend with future phonemes).
 */
export const PHONEMES = {
  'u-foot': PHONEME_U_FOOT,
};
