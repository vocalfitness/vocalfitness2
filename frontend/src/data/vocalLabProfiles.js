/**
 * Vocal Lab phoneme profiles — data-driven configuration matrix consumed
 * by VocalLabEngine.loadPhoneme(). Each profile is a self-contained JSON
 * payload that fully describes a phoneme: glottal source parameters,
 * tract shape (parametric or explicit array), constrictions, velum,
 * friction, and optional ElevenLabs voice-clone reference.
 *
 * ``label`` and ``description`` are bilingual dicts of shape ``{it, en}``
 * — consumed by the VocalLabEmbed via the ``pickLang`` helper hooked to
 * the shared ``LanguageContext``.
 *
 * Adding a new phoneme = adding a new entry here. No engine changes
 * required.
 */

export const VOCAL_LAB_PROFILES = {

  // ─── /ʊ/ FOOT (lax close-mid back rounded vowel) ──────────────
  'u-foot': {
    id: 'u-foot',
    ipa: '/ʊ/',
    label: {
      it: 'FOOT — vocale posteriore semi-arrotondata',
      en: 'FOOT — lax rounded back vowel',
    },
    description: {
      it: 'Vocale posteriore alta, lassa, con moderato arrotondamento delle labbra. La lingua si solleva verso il velo palatino nella parte posteriore; la mandibola resta parzialmente chiusa. Prodotta senza tensione muscolare marcata.',
      en: 'High back lax vowel with moderate lip rounding. The tongue body raises toward the soft palate posteriorly; the jaw is only partially closed. Produced without marked muscular tension.',
    },
    f0: 130,
    voicing: 1.0,
    tenseness: 0.55,
    friction: 0.0,
    velum: 0.0,
    pharynx: 2.4,
    oral: 1.4,
    lipAperture: 0.85,
    constrictions: [
      { index: 26, area: 0.45, spread: 3.5 },   // tongue body raised back
      { index: 41, area: 0.55, spread: 2.0 },   // lip rounding
    ],
    // NB: il glottal source qui è la sintesi LF+aspirazione (Pink-Trombone style).
    // Il voice-clone ElevenLabs NON è adatto come glottal source perché contiene
    // onset consonantici/silenzi che generano il "loop di parole". Lo manteniamo
    // disponibile via `voiceClone.url` solo per esperimenti specifici.
  },

  // ─── /iː/ FLEECE (tense close front unrounded) ────────────────
  'i-fleece': {
    id: 'i-fleece',
    ipa: '/iː/',
    label: {
      it: 'FLEECE — vocale anteriore tesa',
      en: 'FLEECE — tense close front vowel',
    },
    description: {
      it: 'Vocale anteriore alta, tesa e lunga. La lingua è avanzata e sollevata verso il palato duro, le labbra sono stirate lateralmente (mai arrotondate). Attivazione moderata dello zigomatico maggiore che dà la forma "sorriso" tipica dell\'inglese.',
      en: 'High front tense long vowel. The tongue is fronted and raised toward the hard palate; the lips are spread laterally (never rounded). Moderate zygomatic major activation gives the characteristic English "smiling" shape.',
    },
    f0: 138,
    voicing: 1.0,
    tenseness: 0.85,
    friction: 0.0,
    velum: 0.0,
    pharynx: 2.6,
    oral: 1.1,
    lipAperture: 1.7,
    constrictions: [
      { index: 32, area: 0.35, spread: 2.8 },
    ],
  },

  // ─── /ɑː/ FATHER (open back unrounded) ────────────────────────
  'a-father': {
    id: 'a-father',
    ipa: '/ɑː/',
    label: {
      it: 'FATHER — vocale aperta posteriore',
      en: 'FATHER — open back vowel',
    },
    description: {
      it: 'Vocale aperta posteriore non arrotondata, lunga. La mandibola scende notevolmente, la lingua resta bassa e retratta. Faringe stretta, cavità orale ampia. Nessuna tensione labiale né arrotondamento.',
      en: 'Open back unrounded long vowel. The jaw drops considerably, the tongue stays low and retracted. Narrow pharynx, wide oral cavity. No labial tension nor rounding.',
    },
    f0: 125,
    voicing: 1.0,
    tenseness: 0.7,
    friction: 0.0,
    velum: 0.0,
    pharynx: 1.1,
    oral: 2.4,
    lipAperture: 1.8,
    constrictions: [
      { index: 6, area: 0.55, spread: 3.0 },
    ],
  },

  // ─── /s/ unvoiced alveolar fricative ──────────────────────────
  's-fric': {
    id: 's-fric',
    ipa: '/s/',
    label: {
      it: '/s/ — fricativa alveolare sorda',
      en: '/s/ — voiceless alveolar fricative',
    },
    description: {
      it: 'Consonante fricativa sorda alveolare. L\'apice della lingua si avvicina alla cresta alveolare formando un canale stretto; il flusso d\'aria genera turbolenza ad alta frequenza. Corde vocali NON vibrano.',
      en: 'Voiceless alveolar fricative. The tongue tip approaches the alveolar ridge forming a narrow channel; airflow generates high-frequency turbulence. The vocal folds do NOT vibrate.',
    },
    f0: 130,
    voicing: 0.0,
    tenseness: 0.6,
    friction: 1.0,
    velum: 0.0,
    pharynx: 2.0,
    oral: 1.6,
    lipAperture: 1.4,
    constrictionIndex: 34,
    constrictions: [
      { index: 34, area: 0.04, spread: 1.6 },
    ],
  },

  // ─── /m/ bilabial nasal ───────────────────────────────────────
  'm-nasal': {
    id: 'm-nasal',
    ipa: '/m/',
    label: {
      it: '/m/ — nasale bilabiale',
      en: '/m/ — bilabial nasal',
    },
    description: {
      it: 'Consonante nasale bilabiale sonora. Chiusura completa delle labbra (attivazione HIGH dell\'orbicolare della bocca) con velo palatino abbassato che devia il flusso d\'aria attraverso la cavità nasale. Le corde vocali vibrano.',
      en: 'Voiced bilabial nasal consonant. Complete lip closure (HIGH orbicularis oris activation) with lowered velum diverting airflow through the nasal cavity. The vocal folds vibrate.',
    },
    f0: 120,
    voicing: 1.0,
    tenseness: 0.5,
    friction: 0.0,
    velum: 0.95,
    pharynx: 2.0,
    oral: 1.4,
    lipAperture: 0.02,
    constrictions: [
      { index: 43, area: 0.02, spread: 1.4 },
    ],
  },
};

export const VOCAL_LAB_PROFILE_ORDER = [
  'u-foot', 'i-fleece', 'a-father', 's-fric', 'm-nasal',
];

export default VOCAL_LAB_PROFILES;
