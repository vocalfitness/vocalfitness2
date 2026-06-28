/**
 * Phoneme catalogue — full English IPA inventory for both varieties.
 *
 *   • UK RP (BBC English) — Wells (1982), Cruttenden (2014):  44 segments
 *   • US GA (PBS English) — Ladefoged & Johnson (2011):       43 segments
 *
 * The two inventories overlap on 42 segments. The standard differences are
 * the LOT vowel (/ɒ/ in RP — merged into /ɑ/ in GA) and the realisation of
 * the centring diphthongs (RP /ɪə eə ʊə/ → GA r-coloured /ɪr ɛr ʊr/).
 *
 * Each entry is structured for academic rigour and consistent rendering
 * across the LMS:
 *   id          stable slug used in URLs (e.g. /lms/phoneme/<id>)
 *   ipa         primary IPA symbol (RP-base, the canonical pedagogical form)
 *   ipaUS       GA-specific symbol when it differs from `ipa`
 *   ipaUK       RP-specific symbol when it differs from `ipa` (rare)
 *   subtitle    Wells' standard lexical set keyword (FLEECE, TRAP, …)
 *   group       'vowel' | 'diphthong' | 'consonant'
 *   subgroup    finer phonetic class (short-monophthong, plosive, fricative…)
 *   manner      consonants only: place + manner of articulation
 *   words       three high-frequency example words
 *   access      'free' | 'premium'
 *   status      'published' | 'upcoming'
 *   dialectScope 'both' | 'RP-only' | 'GA-only'
 *
 * The Library page renders every entry; the PhonemeCardPage only resolves
 * when status === 'published' and the matching object exists in
 * /data/phonemes.js (so we can grow the published set incrementally without
 * touching the catalogue layout).
 */

export const PHONEME_CATALOGUE = [
  // ====================================================================
  // VOWELS — 12 MONOPHTHONGS (RP) / 11 (GA, /ɒ/ merged into /ɑ/)
  // ====================================================================

  // -- Short monophthongs ---------------------------------------------
  { id: 'i-kit',     status: 'upcoming',  group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'ɪ', subtitle: 'KIT',
    words: ['ship', 'sit', 'fish'],
    description: 'near-close near-front lax unrounded',
    access: 'premium', dialectScope: 'both' },

  { id: 'e-dress',   status: 'upcoming',  group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'e', ipaUS: 'ɛ', subtitle: 'DRESS',
    words: ['bed', 'pen', 'help'],
    description: 'open-mid front unrounded',
    access: 'premium', dialectScope: 'both' },

  { id: 'ae-trap',   status: 'upcoming',  group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'æ', subtitle: 'TRAP',
    words: ['cat', 'man', 'apple'],
    description: 'near-open front unrounded',
    access: 'premium', dialectScope: 'both' },

  { id: 'ah-strut',  status: 'upcoming',  group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'ʌ', subtitle: 'STRUT',
    words: ['cup', 'love', 'mud'],
    description: 'open-mid back unrounded',
    access: 'premium', dialectScope: 'both' },

  { id: 'o-lot',     status: 'upcoming',  group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'ɒ', ipaUS: 'ɑ', subtitle: 'LOT',
    words: ['hot', 'job', 'box'],
    description: 'open back rounded (RP) — merged with /ɑ/ PALM in General American',
    access: 'premium', dialectScope: 'both', mergedInUS: true },

  { id: 'u-foot',    status: 'published', group: 'vowel', subgroup: 'short-monophthong',
    ipa: 'ʊ', subtitle: 'FOOT',
    words: ['put', 'look', 'good'],
    description: 'near-close near-back rounded',
    access: 'free',    dialectScope: 'both' },

  { id: 'schwa',     status: 'upcoming',  group: 'vowel', subgroup: 'reduced-monophthong',
    ipa: 'ə', subtitle: 'COMMA',
    words: ['about', 'sofa', 'banana'],
    description: 'mid central reduced — the most frequent vowel in English',
    access: 'premium', dialectScope: 'both' },

  // -- Long monophthongs ----------------------------------------------
  { id: 'i-fleece',  status: 'published', group: 'vowel', subgroup: 'long-monophthong',
    ipa: 'iː', subtitle: 'FLEECE',
    words: ['see', 'tree', 'three'],
    description: 'close front tense unrounded · highest F2 of all English vowels',
    access: 'premium', dialectScope: 'both' },

  { id: 'a-palm',    status: 'upcoming',  group: 'vowel', subgroup: 'long-monophthong',
    ipa: 'ɑː', ipaUS: 'ɑ', subtitle: 'PALM',
    words: ['car', 'father', 'palm'],
    description: 'open back unrounded long',
    access: 'premium', dialectScope: 'both' },

  { id: 'o-thought', status: 'upcoming',  group: 'vowel', subgroup: 'long-monophthong',
    ipa: 'ɔː', ipaUS: 'ɔ', subtitle: 'THOUGHT',
    words: ['saw', 'thought', 'door'],
    description: 'open-mid back rounded long (subject to cot-caught merger in many GA varieties)',
    access: 'premium', dialectScope: 'both' },

  { id: 'u-goose',   status: 'upcoming',  group: 'vowel', subgroup: 'long-monophthong',
    ipa: 'uː', ipaUS: 'u', subtitle: 'GOOSE',
    words: ['two', 'food', 'blue'],
    description: 'close back tense rounded long',
    access: 'premium', dialectScope: 'both' },

  { id: 'er-nurse',  status: 'upcoming',  group: 'vowel', subgroup: 'long-monophthong',
    ipa: 'ɜː', ipaUS: 'ɝ', subtitle: 'NURSE',
    words: ['bird', 'word', 'work'],
    description: 'open-mid central long unrounded — r-coloured in GA',
    access: 'premium', dialectScope: 'both' },

  // ====================================================================
  // DIPHTHONGS — 5 CLOSING + 3 CENTRING (RP) / 5 + 3 r-coloured (GA)
  // ====================================================================

  { id: 'ei-face',   status: 'upcoming', group: 'diphthong', subgroup: 'closing-fronting',
    ipa: 'eɪ', subtitle: 'FACE',
    words: ['face', 'day', 'late'],
    description: 'closing fronting diphthong',
    access: 'premium', dialectScope: 'both' },

  { id: 'ai-price',  status: 'upcoming', group: 'diphthong', subgroup: 'closing-fronting',
    ipa: 'aɪ', subtitle: 'PRICE',
    words: ['time', 'right', 'my'],
    description: 'wide closing fronting diphthong',
    access: 'premium', dialectScope: 'both' },

  { id: 'oi-choice', status: 'upcoming', group: 'diphthong', subgroup: 'closing-fronting',
    ipa: 'ɔɪ', subtitle: 'CHOICE',
    words: ['boy', 'voice', 'join'],
    description: 'closing fronting diphthong from a back nucleus',
    access: 'premium', dialectScope: 'both' },

  { id: 'au-mouth',  status: 'upcoming', group: 'diphthong', subgroup: 'closing-backing',
    ipa: 'aʊ', subtitle: 'MOUTH',
    words: ['now', 'house', 'down'],
    description: 'wide closing backing diphthong',
    access: 'premium', dialectScope: 'both' },

  { id: 'ou-goat',   status: 'upcoming', group: 'diphthong', subgroup: 'closing-backing',
    ipa: 'əʊ', ipaUS: 'oʊ', subtitle: 'GOAT',
    words: ['go', 'no', 'boat'],
    description: 'closing backing diphthong — central onset in RP, back onset in GA',
    access: 'premium', dialectScope: 'both' },

  { id: 'ie-near',   status: 'upcoming', group: 'diphthong', subgroup: 'centring',
    ipa: 'ɪə', ipaUS: 'ɪr', subtitle: 'NEAR',
    words: ['near', 'here', 'beer'],
    description: 'centring diphthong (RP) · r-coloured in GA',
    access: 'premium', dialectScope: 'both' },

  { id: 'ee-square', status: 'upcoming', group: 'diphthong', subgroup: 'centring',
    ipa: 'eə', ipaUS: 'ɛr', subtitle: 'SQUARE',
    words: ['square', 'hair', 'care'],
    description: 'centring diphthong (RP, often monophthongised to /ɛː/) · r-coloured in GA',
    access: 'premium', dialectScope: 'both' },

  { id: 'ue-cure',   status: 'upcoming', group: 'diphthong', subgroup: 'centring',
    ipa: 'ʊə', ipaUS: 'ʊr', subtitle: 'CURE',
    words: ['cure', 'tour', 'pure'],
    description: 'centring diphthong (RP, declining; often merged with /ɔː/) · r-coloured in GA',
    access: 'premium', dialectScope: 'both' },

  // ====================================================================
  // CONSONANTS — 24 (identical inventory between RP and GA)
  // ====================================================================

  // -- Plosives -------------------------------------------------------
  { id: 'p-pen',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 'p', subtitle: 'PEN',  manner: 'voiceless bilabial plosive',
    words: ['pen', 'top', 'happy'],
    access: 'premium', dialectScope: 'both' },
  { id: 'b-bin',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 'b', subtitle: 'BIN',  manner: 'voiced bilabial plosive',
    words: ['bin', 'rib', 'baby'],
    access: 'premium', dialectScope: 'both' },
  { id: 't-ten',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 't', subtitle: 'TEN',  manner: 'voiceless alveolar plosive (often flapped intervocally in GA)',
    words: ['ten', 'sit', 'butter'],
    access: 'premium', dialectScope: 'both' },
  { id: 'd-din',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 'd', subtitle: 'DIN',  manner: 'voiced alveolar plosive',
    words: ['din', 'bad', 'ladder'],
    access: 'premium', dialectScope: 'both' },
  { id: 'k-cat',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 'k', subtitle: 'CAT',  manner: 'voiceless velar plosive',
    words: ['cat', 'back', 'picnic'],
    access: 'premium', dialectScope: 'both' },
  { id: 'g-get',  status: 'upcoming', group: 'consonant', subgroup: 'plosive',
    ipa: 'ɡ', subtitle: 'GET',  manner: 'voiced velar plosive',
    words: ['get', 'big', 'eager'],
    access: 'premium', dialectScope: 'both' },

  // -- Affricates -----------------------------------------------------
  { id: 'ch-church', status: 'upcoming', group: 'consonant', subgroup: 'affricate',
    ipa: 'tʃ', subtitle: 'CHURCH', manner: 'voiceless post-alveolar affricate',
    words: ['church', 'watch', 'nature'],
    access: 'premium', dialectScope: 'both' },
  { id: 'j-judge',   status: 'upcoming', group: 'consonant', subgroup: 'affricate',
    ipa: 'dʒ', subtitle: 'JUDGE', manner: 'voiced post-alveolar affricate',
    words: ['judge', 'age', 'soldier'],
    access: 'premium', dialectScope: 'both' },

  // -- Fricatives -----------------------------------------------------
  { id: 'f-fan',     status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'f', subtitle: 'FAN', manner: 'voiceless labiodental fricative',
    words: ['fan', 'off', 'photo'],
    access: 'premium', dialectScope: 'both' },
  { id: 'v-van',     status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'v', subtitle: 'VAN', manner: 'voiced labiodental fricative',
    words: ['van', 'save', 'every'],
    access: 'premium', dialectScope: 'both' },
  { id: 'th-thin',   status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'θ', subtitle: 'THIN', manner: 'voiceless dental fricative',
    words: ['think', 'three', 'bath'],
    access: 'premium', dialectScope: 'both' },
  { id: 'dh-this',   status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'ð', subtitle: 'THIS', manner: 'voiced dental fricative',
    words: ['this', 'mother', 'breathe'],
    access: 'premium', dialectScope: 'both' },
  { id: 's-sip',     status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 's', subtitle: 'SIP', manner: 'voiceless alveolar fricative',
    words: ['see', 'sun', 'price'],
    access: 'premium', dialectScope: 'both' },
  { id: 'z-zip',     status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'z', subtitle: 'ZIP', manner: 'voiced alveolar fricative',
    words: ['zoo', 'rose', 'please'],
    access: 'premium', dialectScope: 'both' },
  { id: 'sh-ship',   status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'ʃ', subtitle: 'SHIP', manner: 'voiceless post-alveolar fricative',
    words: ['ship', 'fish', 'nation'],
    access: 'premium', dialectScope: 'both' },
  { id: 'zh-vision', status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'ʒ', subtitle: 'VISION', manner: 'voiced post-alveolar fricative',
    words: ['vision', 'leisure', 'beige'],
    access: 'premium', dialectScope: 'both' },
  { id: 'h-hat',     status: 'upcoming', group: 'consonant', subgroup: 'fricative',
    ipa: 'h', subtitle: 'HAT', manner: 'voiceless glottal fricative',
    words: ['hat', 'hope', 'behind'],
    access: 'premium', dialectScope: 'both' },

  // -- Nasals ---------------------------------------------------------
  { id: 'm-man',  status: 'upcoming', group: 'consonant', subgroup: 'nasal',
    ipa: 'm', subtitle: 'MAN', manner: 'voiced bilabial nasal',
    words: ['man', 'summer', 'time'],
    access: 'premium', dialectScope: 'both' },
  { id: 'n-nun',  status: 'upcoming', group: 'consonant', subgroup: 'nasal',
    ipa: 'n', subtitle: 'NUN', manner: 'voiced alveolar nasal',
    words: ['nun', 'sun', 'dinner'],
    access: 'premium', dialectScope: 'both' },
  { id: 'ng-sing',status: 'upcoming', group: 'consonant', subgroup: 'nasal',
    ipa: 'ŋ', subtitle: 'SING', manner: 'voiced velar nasal — never word-initial',
    words: ['sing', 'finger', 'long'],
    access: 'premium', dialectScope: 'both' },

  // -- Approximants ---------------------------------------------------
  { id: 'l-light', status: 'upcoming', group: 'consonant', subgroup: 'approximant',
    ipa: 'l', subtitle: 'LIGHT', manner: 'voiced alveolar lateral approximant (clear [l] onset, dark [ɫ] coda)',
    words: ['light', 'love', 'full'],
    access: 'premium', dialectScope: 'both' },
  { id: 'r-red',   status: 'upcoming', group: 'consonant', subgroup: 'approximant',
    ipa: 'r', subtitle: 'RED', manner: 'voiced post-alveolar approximant [ɹ] · non-rhotic in RP coda',
    words: ['red', 'very', 'around'],
    access: 'premium', dialectScope: 'both' },
  { id: 'y-yes',   status: 'upcoming', group: 'consonant', subgroup: 'approximant',
    ipa: 'j', subtitle: 'YES', manner: 'voiced palatal approximant',
    words: ['yes', 'beauty', 'music'],
    access: 'premium', dialectScope: 'both' },
  { id: 'w-wet',   status: 'upcoming', group: 'consonant', subgroup: 'approximant',
    ipa: 'w', subtitle: 'WET', manner: 'voiced labio-velar approximant',
    words: ['wet', 'away', 'queen'],
    access: 'premium', dialectScope: 'both' },
];

/** Roles that count as "premium" — i.e. allowed to consume the full LMS. */
export const PREMIUM_ROLES = new Set(['client', 'collaborator', 'editor', 'manager', 'admin']);

/** @param {object|null} user — auth context user */
export const hasPremiumAccess = (user) => Boolean(user && PREMIUM_ROLES.has(user.role));

/** Lookup helper. Returns null if the id is unknown. */
export const getCatalogueEntry = (id) => PHONEME_CATALOGUE.find((e) => e.id === id) || null;

/** Combined access policy + auth check. */
export const canAccessCard = (cardId, user) => {
  const entry = getCatalogueEntry(cardId);
  if (!entry) return true;
  if (entry.access === 'free') return true;
  return hasPremiumAccess(user);
};

/**
 * Resolve the IPA symbol shown to the visitor for a given dialect.
 *   dialect ∈ { 'AmE' (US), 'RP' (UK) }
 */
export const getIpaForDialect = (entry, dialect) => {
  if (!entry) return '';
  if (dialect === 'AmE' && entry.ipaUS) return entry.ipaUS;
  if (dialect === 'RP'  && entry.ipaUK) return entry.ipaUK;
  return entry.ipa;
};

/**
 * Compute per-dialect totals for the inventory bar in the Library header.
 * RP = every entry except those scoped GA-only; symmetric for GA.
 */
export const getInventoryTotals = () => {
  const total    = PHONEME_CATALOGUE.length;
  const rpOnly   = PHONEME_CATALOGUE.filter(e => e.dialectScope === 'RP-only').length;
  const gaOnly   = PHONEME_CATALOGUE.filter(e => e.dialectScope === 'GA-only').length;
  const mergedUS = PHONEME_CATALOGUE.filter(e => e.mergedInUS).length;
  const mergedUK = PHONEME_CATALOGUE.filter(e => e.mergedInUK).length;
  return {
    total,
    // RP inventory = full catalogue minus GA-only entries minus segments
    //                pedagogically merged in RP (none in our current set).
    rp: total - gaOnly - mergedUK,
    // GA inventory = full catalogue minus RP-only entries minus the
    //                segments that have merged with another in GA (LOT→PALM).
    ga: total - rpOnly - mergedUS,
    published: PHONEME_CATALOGUE.filter(e => e.status === 'published').length,
    upcoming:  PHONEME_CATALOGUE.filter(e => e.status === 'upcoming').length,
  };
};
