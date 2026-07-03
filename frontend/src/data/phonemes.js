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

  /**
   * Optional YouTube video lesson by Prof. Steve Dapper.
   * When present, the PhonemeCardPage renders a cinematic player container.
   * At the end of the video, a hard upsell overlay invites the user to
   * subscribe / register to unlock the full lesson.
   */
  videoLesson: {
    id: '0-aau56RM9I',
    title: 'L\'arte del fonema /ʊ/ — anteprima della video-lezione',
  },

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
    { name: 'Buccinator',        activation: 'MODERATE', detail: 'cheek tension' },
    { name: 'Zygomaticus major', activation: 'LOW',      detail: 'minimal upward pull' },
    { name: 'Masseter',          activation: 'MODERATE', detail: 'jaw set in near-close position' },
    { name: 'Mentalis',          activation: 'LOW',      detail: 'chin almost passive' },
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
    { label: 'Near-close', tooltip: 'The tongue body rises high in the mouth but does not fully close (which would produce /uː/). Standard IPA height term.' },
    { label: 'Relaxed',   tooltip: 'The lips and tongue stay loose — no muscular tension. Compare /uː/ where the tongue is tense.' },
    { label: 'Back',      tooltip: 'The tongue body is positioned toward the back of the mouth, near the velum.' },
    { label: 'Monophthong', tooltip: 'A single, stable vowel quality — no glide. The articulators hold position throughout.' },
  ],

  /**
   * Educational fun-fact shown in the Lab section.
   */
  funFact: {
    headline: 'Statistical curiosity',
    body: 'The /ʊ/ sound occurs in a relatively small closed-class of English words — mastering it is a strong differentiator in spoken performance.',
  },

  /**
   * Top 30 most common /ʊ/ words in American English (frequency-ranked).
   * Each entry: word + standard IPA transcription (American English).
   */
  commonWords: [
    { w: 'look',      ipa: '/lʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3qx2ms12_look.wav' },
    { w: 'good',      ipa: '/ɡʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/4aifney4_good.wav' },
    { w: 'would',     ipa: '/wʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/0vwilyct_would.wav' },
    { w: 'could',     ipa: '/kʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/qsu5hl0v_could.wav' },
    { w: 'should',    ipa: '/ʃʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/otep2n5x_should.wav' },
    { w: 'put',       ipa: '/pʊt/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/8kxj1rsc_put.wav' },
    { w: 'woman',     ipa: '/ˈwʊmən/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/t7fdx5x1_woman.wav' },
    { w: 'took',      ipa: '/tʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/22j9y6jq_took.wav' },
    { w: 'book',      ipa: '/bʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/hc0wzyd4_book.wav' },
    { w: 'pull',      ipa: '/pʊl/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/47g95f83_pull.wav' },
    { w: 'full',      ipa: '/fʊl/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/etnn7m6y_full.wav' },
    { w: 'push',      ipa: '/pʊʃ/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/f2qnsea0_push.wav' },
    { w: 'cook',      ipa: '/kʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/48kgdqeq_cook.wav' },
    { w: 'foot',      ipa: '/fʊt/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3xe7j2vy_foot.wav' },
    { w: 'wood',      ipa: '/wʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/fb9oc5dv_wood.wav' },
    { w: 'bullet',    ipa: '/ˈbʊlɪt/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/g00d96d7_bullet.wav' },
    { w: 'hook',      ipa: '/hʊk/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/y9v77i7n_hook.wav' },
    { w: 'sugar',     ipa: '/ˈʃʊɡər/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/2vgik3v8_sugar.wav' },
    { w: 'wolf',      ipa: '/wʊlf/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ou1z65qd_wolf.wav' },
    { w: 'stood',     ipa: '/stʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/bt88m9pq_stood.wav' },
    { w: 'bull',      ipa: '/bʊl/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vocf1qt1_bull.wav' },
    { w: 'cookie',    ipa: '/ˈkʊki/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vi0gjij8_cookie.wav' },
    { w: 'fulfill',   ipa: '/fʊlˈfɪl/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/bkwzln7e_fulfill.wav' },
    { w: 'fully',     ipa: '/ˈfʊli/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/9nvk6vaz_fully.wav' },
    { w: 'childhood', ipa: '/ˈtʃaɪldhʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/gb3juoe3_childhood.wav' },
    { w: 'bush',      ipa: '/bʊʃ/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ilx8zkea_bush.wav' },
    { w: 'footstep',  ipa: '/ˈfʊtstɛp/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/bpw8t79f_footstep.wav' },
    { w: 'bully',     ipa: '/ˈbʊli/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/4iswqknj_bully.wav' },
    { w: 'hood',      ipa: '/hʊd/', audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/cwz94d06_hood.wav' },
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
    audio: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/9ynxlorx_mnemonic_phrase.wav',
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
 * Phoneme card data — /iː/ (FLEECE)
 * Second test card to validate the audio pipeline via ElevenLabs voice clone
 * of Professor Steve Dapper (voice_id: mIrm7gNC...). All audio assets were
 * generated programmatically — see /app/backend/tests/generate_phoneme_audio_i_fleece.py.
 *
 * NOTE: side-view / front-view / articulatory images currently reuse the
 *       /ʊ/ placeholders. Phase 2 of the LMS (Admin CMS) will let the
 *       editor upload /iː/-specific sagittal images.
 */
export const PHONEME_I_FLEECE = {
  id: 'i-fleece',
  ipa: 'iː',
  displayIpa: '/iː/',
  category: 'vowel',
  subcategory: 'long-tense',
  examples: ['FLEECE', 'SEE', 'TREE'],
  dialects: ['AmE', 'RP'],
  dialectNote: 'near identical AmE and RP — slightly more diphthongal in some RP speakers',

  assets: {
    // Placeholder: reuses the generic side-view from /ʊ/. To be replaced
    // with an /iː/-specific sagittal in LMS Phase 2.
    sideView:       'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/0jy5a427__%CA%8A_%20Foot%20anatomy%2016_9_navy.png',
    frontView:      'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/5pyhoxyr_Front%20_%CA%8A_%20Foot%20AmE.png',
    frontViewClean: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/jhm9rhll_Front%20_%CA%8A_%20Foot%20AmE%20%28cropped%29.png',
    articulatory:   'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/ga780377_%CA%8A%20Foot%20Dapper.png',
  },

  /**
   * Hotspots on the side-view image. Coordinates approximate the /iː/
   * articulation (forward + high tongue body, spread lips, raised velum).
   */
  hotspots: [
    { id: 'alveolar-ridge', x: 39.2, y: 41.6, label: 'Alveolar ridge',
      title: 'Alveolar ridge', role: 'Passive — proximity only',
      detail: 'The bony bump behind the upper teeth. For /iː/, the blade and front of the tongue rise very close to the alveolar ridge and the front of the hard palate — but they do NOT make contact. That proximity (and the resulting narrow channel) gives /iː/ its bright, high-frequency timbre.',
      anatomy: 'Bony protrusion of the maxilla, posterior to the upper incisors.' },
    { id: 'hard-palate', x: 43.7, y: 46.1, label: 'Hard palate',
      title: 'Hard palate — narrow channel above the blade', role: 'Passive — primary resonance corridor',
      detail: 'For /iː/, the front of the tongue is RAISED toward the front of the hard palate, creating a narrow resonance channel. This is the formant 2 (F2) maximum among English vowels — the reason /iː/ sounds the brightest.',
      anatomy: 'Anterior portion of the palate, bony substrate.' },
    { id: 'apex-passive', x: 40.6, y: 54.4, label: 'Apex (tongue tip)',
      title: 'Apex — relaxed behind lower front teeth', role: 'Tongue tip: low, free',
      detail: 'The tip of the tongue rests gently behind the lower front teeth — passive. For /iː/, the work is done by the blade and dorsum, not the tip.',
      anatomy: 'Tongue apex — anterior-most portion.' },
    { id: 'blade-front-high', x: 43.0, y: 50.0, label: 'Blade (lamina)',
      title: 'Blade — FORWARD and HIGH', role: 'Lamina: pushed forward, raised toward the palate',
      detail: 'KEY ARTICULATOR for /iː/. The blade is pushed FORWARD and raised HIGH toward the hard palate. Compare to /ʊ/ where the blade is pulled BACK. The narrow channel between blade and palate is what gives /iː/ its characteristic bright, frontal acoustic signature.',
      anatomy: 'Lamina linguae — flat portion of the tongue behind the apex.',
      kineticCue: 'Imagine smiling and pushing the front of your tongue up toward the back of your upper teeth.' },
    { id: 'dorsum-front-close', x: 45.0, y: 58.0, label: 'Dorsum',
      title: 'Dorsum — front, close, tense', role: 'Tongue body: front-high, TENSE, advanced',
      detail: 'The dorsum sits FORWARD and HIGH — close-front position. Crucially, the muscle is TENSE (active longitudinal contraction), not lax. This is why /iː/ is longer and "sharper" than its lax cousin /ɪ/ in "ship".',
      anatomy: 'Dorsum linguae — main body/crest of the tongue.',
      kineticCue: 'Tongue body advances toward the front teeth with active muscular grip.' },
    { id: 'lip-spread', x: 36.8, y: 67.2, label: 'Lip spreading',
      title: 'Lip spreading — UNROUNDED, slight smile', role: 'Risorius + zygomaticus: lateral pull',
      detail: 'The lips are SPREAD horizontally, as if in a slight smile — completely UNROUNDED. Compare to /ʊ/ where the lips are moderately rounded and protruded. Lip spreading widens the front cavity and boosts F2, reinforcing the bright /iː/ timbre.',
      anatomy: 'Risorius and zygomaticus muscles.',
      kineticCue: 'Soft horizontal "ee" smile — lips long and thin, not pursed.' },
    { id: 'velum-raised', x: 52.0, y: 52.5, label: 'Velum',
      title: 'Velum (soft palate) — RAISED', role: 'Nasal port closed',
      detail: 'The velum is RAISED, sealing the nasal cavity. All airflow exits through the mouth — /iː/ is a pure ORAL vowel.',
      anatomy: 'Velum palatinum — muscular flap at the back of the palate.' },
    { id: 'pharynx-narrow', x: 54.2, y: 64.1, label: 'Pharynx',
      title: 'Pharynx — slightly narrowed', role: 'Throat: narrowed by tongue advancement',
      detail: 'Because the tongue body is pulled FORWARD, the pharyngeal cavity is slightly narrowed. This is the inverse of /ʊ/, where the back tongue leaves the pharynx neutral-to-wide.',
      anatomy: 'Pharyngeal cavity — region from the velum down to the larynx.' },
    { id: 'larynx-voiced', x: 51.5, y: 76.7, label: 'Larynx / Glottis',
      title: 'Larynx / Glottis — VOICED, tense', role: 'Vocal folds vibrating with extra adductor tension',
      detail: 'The vocal folds vibrate (all vowels are voiced). For /iː/ specifically, there is slightly more adductor tension than for /ʊ/, contributing to the brighter spectral profile.',
      anatomy: 'Larynx — vocal folds within.',
      kineticCue: 'Place hand on throat — feel the steady, slightly bright vibration.' },
  ],

  spellings: [
    { letters: 'ee',    percent: 32, examples: 'see, three, sleep' },
    { letters: 'ea',    percent: 28, examples: 'read, eat, team' },
    { letters: 'e',     percent: 16, examples: 'me, he, evening' },
    { letters: 'ie/ei', percent: 12, examples: 'believe, piece, receive' },
    { letters: 'i (in loans)', percent: 8, examples: 'machine, police' },
    { letters: 'other', percent: 4,  examples: 'key, quay, people' },
  ],

  /**
   * Frequency in English among front/close vowels.
   * The orange (active) bar is /iː/.
   */
  frequencyChart: [
    { ipa: 'iː', height: 92, active: true  },  // ← THIS phoneme
    { ipa: 'ɪ',  height: 95, active: false },
    { ipa: 'e',  height: 70, active: false },
    { ipa: 'ɛ',  height: 80, active: false },
    { ipa: 'æ',  height: 75, active: false },
    { ipa: 'ə',  height: 50, active: false },
    { ipa: 'ʊ',  height: 62, active: false },
    { ipa: 'uː', height: 55, active: false },
    { ipa: 'ɑː', height: 60, active: false },
  ],

  features: [
    { label: 'Height',        value: 'Close' },
    { label: 'Backness',      value: 'Front' },
    { label: 'Rounding',      value: 'Unrounded (spread)' },
    { label: 'Voicing',       value: 'Voiced' },
    { label: 'Manner',        value: 'Pure monophthong' },
    { label: 'Jaw',           value: 'close' },
    { label: 'Contrast',      value: '/iː/ vs /ɪ/: longer, tenser, more peripheral' },
    { label: 'Minimal pairs', value: 'sheep/ship, feet/fit, leave/live' },
    { label: 'Duration',      value: 'long' },
    { label: 'Airflow',       value: 'continuous' },
    { label: 'Note',          value: 'highest F2 of all English vowels' },
  ],

  knobs: [
    { id: 'advancement', label: 'ADVANCEMENT', value: 95, valueLabel: 'front', highlight: true },
    { id: 'tenseness',   label: 'TENSENESS',   value: 90, valueLabel: 'tense' },
    { id: 'height',      label: 'HEIGHT',      value: 95, valueLabel: 'close', highlight: true },
    { id: 'roundness',   label: 'ROUNDNESS',   value: 5,  valueLabel: 'unrounded (spread)' },
  ],

  exampleSentences: [
    { text: 'See the green tree.',             highlights: ['See', 'green', 'tree'] },
    { text: 'She needs to eat each week.',     highlights: ['She', 'needs', 'eat', 'each', 'week'] },
    { text: 'Three sheep sleep in the field.', highlights: ['Three', 'sheep', 'sleep', 'field'] },
  ],

  facialMuscles: [
    { name: 'Risorius',          activation: 'HIGH',     detail: 'lateral lip retraction (smile)' },
    { name: 'Zygomaticus major', activation: 'MODERATE', detail: 'upward-outward pull at the corners' },
    { name: 'Orbicularis oris',  activation: 'LOW',      detail: 'no rounding, lips spread thin' },
    { name: 'Buccinator',        activation: 'MODERATE', detail: 'cheek tension supporting the smile' },
    { name: 'Masseter',          activation: 'HIGH',     detail: 'jaw held in close position' },
    { name: 'Mentalis',          activation: 'LOW',      detail: 'chin passive' },
  ],

  /**
   * Vowel chart: x = front (0) → back (100), y = close (0) → open (100).
   * /iː/ sits in the upper-left corner of the trapezoid.
   */
  vowelChartPosition: { x: 5, y: 5 },

  classification: [
    { label: 'Close',     tooltip: 'The tongue body rises as high as it can without producing friction — the closest English vowel.' },
    { label: 'Front',     tooltip: 'The tongue body is positioned at the front of the mouth, under the hard palate.' },
    { label: 'Tense',     tooltip: 'Active longitudinal muscular contraction — the tongue body is "stretched" toward its target. Contrast with the lax /ɪ/ in "ship".' },
    { label: 'Unrounded', tooltip: 'The lips are spread horizontally (slight smile) — no rounding or protrusion.' },
    { label: 'Long',      tooltip: 'Phonologically long — typically held about 60% longer than its lax counterpart /ɪ/ in similar contexts.' },
    { label: 'Monophthong', tooltip: 'A single stable vowel quality — though some speakers add a slight off-glide [iː → ɪi].' },
  ],

  funFact: {
    headline: 'Highest second formant',
    body: 'Among all English vowels, /iː/ has the highest F2 (second formant, ≈ 2300 Hz in adult males) — which is why it sounds the "brightest" and is the most distinctive across telephone-quality audio. Skilled speakers exploit this for clarity in long-distance or noisy environments.',
  },

  commonWords: [
    { w: 'see',      ipa: '/siː/',      audio: '/api/uploads/elevenlabs/i_fleece_see_v2_mIrm7gNC_1782656195.mp3' },
    { w: 'me',       ipa: '/miː/',      audio: '/api/uploads/elevenlabs/i_fleece_me_v2_mIrm7gNC_1782656196.mp3' },
    { w: 'he',       ipa: '/hiː/',      audio: '/api/uploads/elevenlabs/i_fleece_he_v2_mIrm7gNC_1782656197.mp3' },
    { w: 'we',       ipa: '/wiː/',      audio: '/api/uploads/elevenlabs/i_fleece_we_v2_mIrm7gNC_1782656199.mp3' },
    { w: 'she',      ipa: '/ʃiː/',      audio: '/api/uploads/elevenlabs/i_fleece_she_v2_mIrm7gNC_1782656200.mp3' },
    { w: 'tree',     ipa: '/triː/',     audio: '/api/uploads/elevenlabs/i_fleece_tree_v2_mIrm7gNC_1782656201.mp3' },
    { w: 'three',    ipa: '/θriː/',     audio: '/api/uploads/elevenlabs/i_fleece_three_v2_mIrm7gNC_1782656203.mp3' },
    { w: 'free',     ipa: '/friː/',     audio: '/api/uploads/elevenlabs/i_fleece_free_v2_mIrm7gNC_1782656204.mp3' },
    { w: 'need',     ipa: '/niːd/',     audio: '/api/uploads/elevenlabs/i_fleece_need_v2_mIrm7gNC_1782656206.mp3' },
    { w: 'feel',     ipa: '/fiːl/',     audio: '/api/uploads/elevenlabs/i_fleece_feel_v2_mIrm7gNC_1782656207.mp3' },
    { w: 'week',     ipa: '/wiːk/',     audio: '/api/uploads/elevenlabs/i_fleece_week_v2_mIrm7gNC_1782656208.mp3' },
    { w: 'sleep',    ipa: '/sliːp/',    audio: '/api/uploads/elevenlabs/i_fleece_sleep_v2_mIrm7gNC_1782656209.mp3' },
    { w: 'green',    ipa: '/ɡriːn/',    audio: '/api/uploads/elevenlabs/i_fleece_green_v2_mIrm7gNC_1782656211.mp3' },
    { w: 'street',   ipa: '/striːt/',   audio: '/api/uploads/elevenlabs/i_fleece_street_v2_mIrm7gNC_1782656212.mp3' },
    { w: 'read',     ipa: '/riːd/',     audio: '/api/uploads/elevenlabs/i_fleece_read_v2_mIrm7gNC_1782656213.mp3' },
    { w: 'keep',     ipa: '/kiːp/',     audio: '/api/uploads/elevenlabs/i_fleece_keep_v2_mIrm7gNC_1782656215.mp3' },
    { w: 'agree',    ipa: '/əˈɡriː/',   audio: '/api/uploads/elevenlabs/i_fleece_agree_v2_mIrm7gNC_1782656216.mp3' },
    { w: 'between',  ipa: '/bɪˈtwiːn/', audio: '/api/uploads/elevenlabs/i_fleece_between_v2_mIrm7gNC_1782656217.mp3' },
    { w: 'complete', ipa: '/kəmˈpliːt/',audio: '/api/uploads/elevenlabs/i_fleece_complete_v2_mIrm7gNC_1782656218.mp3' },
    { w: 'machine',  ipa: '/məˈʃiːn/',  audio: '/api/uploads/elevenlabs/i_fleece_machine_v2_mIrm7gNC_1782656220.mp3' },
    { w: 'believe',  ipa: '/bɪˈliːv/',  audio: '/api/uploads/elevenlabs/i_fleece_believe_v2_mIrm7gNC_1782656221.mp3' },
    { w: 'teach',    ipa: '/tiːtʃ/',    audio: '/api/uploads/elevenlabs/i_fleece_teach_v2_mIrm7gNC_1782656222.mp3' },
    { w: 'easy',     ipa: '/ˈiːzi/',    audio: '/api/uploads/elevenlabs/i_fleece_easy_v2_mIrm7gNC_1782656224.mp3' },
    { w: 'people',   ipa: '/ˈpiːpəl/',  audio: '/api/uploads/elevenlabs/i_fleece_people_v2_mIrm7gNC_1782656225.mp3' },
    { w: 'eat',      ipa: '/iːt/',      audio: '/api/uploads/elevenlabs/i_fleece_eat_v2_mIrm7gNC_1782656226.mp3' },
    { w: 'each',     ipa: '/iːtʃ/',     audio: '/api/uploads/elevenlabs/i_fleece_each_v2_mIrm7gNC_1782656227.mp3' },
    { w: 'team',     ipa: '/tiːm/',     audio: '/api/uploads/elevenlabs/i_fleece_team_v2_mIrm7gNC_1782656229.mp3' },
    { w: 'piece',    ipa: '/piːs/',     audio: '/api/uploads/elevenlabs/i_fleece_piece_v2_mIrm7gNC_1782656230.mp3' },
    { w: 'evening',  ipa: '/ˈiːvnɪŋ/',  audio: '/api/uploads/elevenlabs/i_fleece_evening_v2_mIrm7gNC_1782656232.mp3' },
    { w: 'season',   ipa: '/ˈsiːzən/',  audio: '/api/uploads/elevenlabs/i_fleece_season_v2_mIrm7gNC_1782656233.mp3' },
  ],

  mnemonic: {
    phrase: 'He sees three sheep eat green leaves easily.',
    highlights: ['He', 'sees', 'three', 'sheep', 'eat', 'green', 'leaves', 'easily'],
    note: 'Repeat slowly five times. On every /iː/, push the front of the tongue forward and high toward the hard palate, and stretch the lips into a thin horizontal smile — no rounding.',
    audio: '/api/uploads/elevenlabs/mnemonic_i_fleece_v3_mIrm7gNC_1782662703.mp3',
  },

  pronunciationGuide: {
    headline: 'Vocal Fitness articulatory protocol',
    steps: [
      { label: 'Jaw',     body: 'Close the jaw to the close position — molars almost touching but with a hair of space, no pressure.' },
      { label: 'Lips',    body: 'Spread the lips horizontally as if in a slight smile. Thin, long, never pursed.' },
      { label: 'Tongue',  body: 'Push the front of the tongue FORWARD and HIGH, toward the front of the hard palate. The body of the tongue is TENSE — actively stretched.' },
      { label: 'Apex',    body: 'Let the tongue tip rest behind the lower front teeth — passive.' },
      { label: 'Voicing', body: 'Engage the vocal folds. Place fingers on the larynx — feel a steady, bright vibration.' },
      { label: 'Velum',   body: 'Keep the soft palate raised. /iː/ is a pure oral vowel.' },
      { label: 'Duration', body: 'Hold the vowel longer than its lax cousin /ɪ/ — roughly 60% longer in similar contexts.' },
    ],
  },

  audio: {
    AmE: {
      isolated: '/api/uploads/elevenlabs/i_fleece_isolated_v3_mIrm7gNC_1782662697.mp3',
      examples: [
        '/api/uploads/elevenlabs/see_the_green_tree_v3_mIrm7gNC_1782662698.mp3',
        '/api/uploads/elevenlabs/she_needs_to_eat_v3_mIrm7gNC_1782662700.mp3',
        '/api/uploads/elevenlabs/three_sheep_sleep_v3_mIrm7gNC_1782662701.mp3',
      ],
    },
    RP: {
      isolated: '/api/uploads/elevenlabs/i_fleece_isolated_v3_mIrm7gNC_1782662697.mp3',
      examples: [
        '/api/uploads/elevenlabs/see_the_green_tree_v3_mIrm7gNC_1782662698.mp3',
        '/api/uploads/elevenlabs/she_needs_to_eat_v3_mIrm7gNC_1782662700.mp3',
        '/api/uploads/elevenlabs/three_sheep_sleep_v3_mIrm7gNC_1782662701.mp3',
      ],
    },
  },
};

/**
 * Library export (extend with future phonemes).
 */
export const PHONEMES = {
  'u-foot':   PHONEME_U_FOOT,
  'i-fleece': PHONEME_I_FLEECE,
};
