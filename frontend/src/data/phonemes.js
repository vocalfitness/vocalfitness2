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
    sideView:       'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/0jy5a427__%CA%8A_%20Foot%20anatomy%2016_9_navy.png',
    frontView:      'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/5pyhoxyr_Front%20_%CA%8A_%20Foot%20AmE.png',
    frontViewClean: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/jhm9rhll_Front%20_%CA%8A_%20Foot%20AmE%20%28cropped%29.png',
    articulatory:   'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ga780377_%CA%8A%20Foot%20Dapper.png',
  },

  /**
   * Hotspots on the clean side-view image (1:1 ratio).
   * x, y are percentages on the FULL image. Coordinates align with the dots
   * on the existing callout lines so visual anchoring stays consistent.
   */
  hotspots: [
    { id: 'alveolar-ridge', x: 39.2, y: 41.6, label: 'Alveolar ridge',
      title: 'Alveolar ridge', role: 'Passive — not engaged',
      detail: 'The bony bump just behind the upper teeth. For /ʊ/, the tongue does NOT touch the alveolar ridge: the apex stays low and relaxed. The ridge becomes the active articulation site for /t/, /d/, /n/, /l/, /s/, /z/ — but here it remains passive.',
      anatomy: 'Bony protrusion of the maxilla, posterior to the upper incisors.' },
    { id: 'hard-palate', x: 43.7, y: 46.1, label: 'Hard palate',
      title: 'Hard palate', role: 'Passive — overhead vault',
      detail: 'The dome of bone forming the roof of the mouth. For /ʊ/, the back of the tongue rises toward the rear of the palate (toward the velum) but does NOT make contact. The palatal vault acts as a resonance chamber that shapes the dark, rounded quality of this vowel.',
      anatomy: 'Anterior portion of the palate, bony substrate.' },
    { id: 'apex-passive', x: 40.6, y: 54.4, label: 'Apex (tongue tip)',
      title: 'Apex — passive, behind lower front teeth', role: 'Tongue tip: low, free, not touching',
      detail: 'The very tip of the tongue stays LOW and RELAXED behind the lower front teeth. It is not pressed against any surface. This passive apex is a hallmark of back vowels like /ʊ/ — completely different from /t/, /d/, /n/, /l/ where the apex is the active articulator.',
      anatomy: 'Tongue apex — anterior-most portion.' },
    { id: 'blade-back', x: 43.0, y: 56.8, label: 'Blade (lamina)',
      title: 'Blade — back, high', role: 'Lamina: pulled back and raised',
      detail: 'The blade (the flat surface just behind the apex) is pulled BACK toward the throat and slightly RAISED. This is what gives /ʊ/ its "back" quality. Compare to /iː/ where the blade is FORWARD and high.',
      anatomy: 'Lamina linguae — flat portion of the tongue behind the apex.' },
    { id: 'dorsum-near-close', x: 47.3, y: 64.1, label: 'Dorsum',
      title: 'Dorsum — back, near-close, raised toward velum', role: 'Tongue body: high-back, lax, retracted',
      detail: 'The MAIN articulator for /ʊ/. The dorsum (the body/crest of the tongue) rises toward the back of the mouth (the velum) in a NEAR-CLOSE position — high, but not fully closed (that would be /uː/). The body is LAX, not tense.',
      anatomy: 'Dorsum linguae — main body/crest of the tongue.',
      kineticCue: 'Imagine your tongue body settling backward and slightly upward, relaxed.' },
    { id: 'lip-rounding', x: 36.8, y: 67.2, label: 'Lip rounding',
      title: 'Lip rounding — MODERATE', role: 'Orbicularis oris: moderate activation',
      detail: 'The lips are MODERATELY rounded — not tightly pursed (that would be /uː/), not spread (that would be /iː/). The orbicularis oris muscle is engaged but relaxed. Slight protrusion. This rounding contributes to the dark, hollow timbre of /ʊ/.',
      anatomy: 'Orbicularis oris muscle.',
      kineticCue: 'Soft "oo" shape — relaxed, not pressed.' },
    { id: 'velum-raised', x: 52.0, y: 52.5, label: 'Velum',
      title: 'Velum (soft palate) — RAISED', role: 'Nasal port closed',
      detail: 'The velum (soft palate) is RAISED, closing the nasal port. This means airflow exits ENTIRELY through the mouth — /ʊ/ is an ORAL vowel, not nasal. Compare to /m/, /n/, /ŋ/ where the velum is lowered.',
      anatomy: 'Velum palatinum — muscular flap at the back of the palate.' },
    { id: 'pharynx-neutral', x: 54.2, y: 64.1, label: 'Pharynx',
      title: 'Pharynx — neutral / moderately wide', role: 'Throat: relaxed, moderately wide',
      detail: 'The pharynx (throat cavity) is in a NEUTRAL position — moderately wide, neither constricted nor expanded. This contributes to the relaxed quality of /ʊ/. Contrast with /ɑː/ where the pharynx is wide and open.',
      anatomy: 'Pharyngeal cavity — region from the velum down to the larynx.' },
    { id: 'larynx-voiced', x: 51.5, y: 76.7, label: 'Larynx / Glottis',
      title: 'Larynx / Glottis — VOICED', role: 'Vocal folds vibrating',
      detail: 'The vocal folds are vibrating, producing voicing. All vowels are voiced by default. You can verify by placing your fingers on your throat — you will feel the vibration.',
      anatomy: 'Larynx — vocal folds within.',
      kineticCue: 'Place hand on throat — feel the vibration.' },
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
   * Phonetic classification (linguist-friendly badges).
   */
  classification: [
    { label: 'Near-high', tooltip: 'The tongue body rises high in the mouth but does not fully close (which would produce /uː/).' },
    { label: 'Relaxed',   tooltip: 'The lips and tongue stay loose — no muscular tension. Compare /uː/ where the tongue is tense.' },
    { label: 'Back',      tooltip: 'The tongue body is positioned toward the back of the mouth, near the velum.' },
    { label: 'Monophthong', tooltip: 'A single, stable vowel quality — no glide. The articulators hold position throughout.' },
  ],

  /**
   * Educational fun-fact shown in the Lab section.
   */
  funFact: {
    headline: 'Statistical curiosity',
    body: 'The /ʊ/ sound is the least common vowel in American English — which paradoxically makes mastering it a strong differentiator in spoken performance.',
  },

  /**
   * Top 30 most common /ʊ/ words in American English (frequency-ranked).
   * Each entry: word + standard IPA transcription (American English).
   */
  commonWords: [
    { w: 'look',      ipa: '/lʊk/' },
    { w: 'good',      ipa: '/ɡʊd/' },
    { w: 'would',     ipa: '/wʊd/' },
    { w: 'could',     ipa: '/kʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/qsu5hl0v_could.wav' },
    { w: 'should',    ipa: '/ʃʊd/' },
    { w: 'put',       ipa: '/pʊt/' },
    { w: 'woman',     ipa: '/ˈwʊmən/' },
    { w: 'took',      ipa: '/tʊk/' },
    { w: 'book',      ipa: '/bʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/hc0wzyd4_book.wav' },
    { w: 'pull',      ipa: '/pʊl/' },
    { w: 'full',      ipa: '/fʊl/' },
    { w: 'push',      ipa: '/pʊʃ/' },
    { w: 'cook',      ipa: '/kʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/48kgdqeq_cook.wav' },
    { w: 'foot',      ipa: '/fʊt/' },
    { w: 'wood',      ipa: '/wʊd/' },
    { w: 'bullet',    ipa: '/ˈbʊlɪt/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/g00d96d7_bullet.wav' },
    { w: 'hook',      ipa: '/hʊk/' },
    { w: 'sugar',     ipa: '/ˈʃʊɡər/' },
    { w: 'wolf',      ipa: '/wʊlf/' },
    { w: 'stood',     ipa: '/stʊd/' },
    { w: 'bull',      ipa: '/bʊl/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vocf1qt1_bull.wav' },
    { w: 'cookie',    ipa: '/ˈkʊki/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vi0gjij8_cookie.wav' },
    { w: 'fulfill',   ipa: '/fʊlˈfɪl/' },
    { w: 'fully',     ipa: '/ˈfʊli/' },
    { w: 'childhood', ipa: '/ˈtʃaɪldhʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/gb3juoe3_childhood.wav' },
    { w: 'bush',      ipa: '/bʊʃ/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ilx8zkea_bush.wav' },
    { w: 'footstep',  ipa: '/ˈfʊtstɛp/' },
    { w: 'bully',     ipa: '/ˈbʊli/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/4iswqknj_bully.wav' },
    { w: 'hood',      ipa: '/hʊd/' },
    { w: 'crook',     ipa: '/krʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/08ch2b2g_crook.wav' },
  ],

  /**
   * Vocal Fitness mnemonic phrase — imperative motor-cue construction.
   * Densely loaded with /ʊ/ to reinforce oral motor memory.
   */
  mnemonic: {
    phrase: 'Pull the wool, push the hood, put the foot.',
    highlights: ['pull', 'wool', 'push', 'hood', 'put', 'foot'],
    note: 'Repeat slowly five times as a motor sequence. Feel the back of the tongue rise toward the velum on every /ʊ/, and the lips round moderately.',
    audio: null,
  },

  /**
   * Pronunciation guide — Vocal Fitness articulatory instructions.
   */
  pronunciationGuide: {
    headline: 'Vocal Fitness articulatory protocol',
    steps: [
      { label: 'Jaw',    body: 'Open the mouth slightly — about one finger of vertical space between the molars.' },
      { label: 'Lips',   body: 'Round the lips moderately. No tension. Imagine a soft, relaxed "oo" shape — not pursed, not spread.' },
      { label: 'Tongue', body: 'Pull the body of the tongue back toward the throat. Raise the dorsum high but DO NOT make contact with the velum.' },
      { label: 'Apex',   body: 'Leave the tongue tip low, behind the lower front teeth. Passive, never pressed against any surface.' },
      { label: 'Voicing', body: 'Engage the vocal folds. Place your fingers on your larynx — you should feel a steady, low-frequency vibration.' },
      { label: 'Velum',  body: 'Keep the soft palate raised. All airflow exits through the mouth. /ʊ/ is an oral vowel.' },
    ],
  },

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
