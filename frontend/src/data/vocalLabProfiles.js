/**
 * Vocal Lab phoneme profiles — data-driven configuration matrix consumed
 * by VocalLabEngine.loadPhoneme(). Each profile is a self-contained JSON
 * payload that fully describes a phoneme: glottal source parameters,
 * tract shape (parametric or explicit array), constrictions, velum,
 * friction, and optional ElevenLabs voice-clone reference.
 *
 * Adding a new phoneme = adding a new entry here. No engine changes
 * required.
 */

export const VOCAL_LAB_PROFILES = {

  // ─── /ʊ/ FOOT (lax close-mid back rounded vowel) ──────────────
  'u-foot': {
    id: 'u-foot',
    label: 'FOOT — vocale laterale arrotondata',
    ipa: '/ʊ/',
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
    // voiceClone: { url: '/lms/vocal-lab/samples/steve_loop.wav', refFreq: 118 },
  },

  // ─── /iː/ FLEECE (tense close front unrounded) ────────────────
  'i-fleece': {
    id: 'i-fleece',
    label: 'FLEECE — vocale anteriore tesa',
    ipa: '/iː/',
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
    label: 'FATHER — vocale aperta posteriore',
    ipa: '/ɑː/',
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
    label: '/s/ — fricativa alveolare sorda',
    ipa: '/s/',
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
    label: '/m/ — nasale bilabiale',
    ipa: '/m/',
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
