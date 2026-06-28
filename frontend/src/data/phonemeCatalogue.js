/**
 * Phoneme catalogue + access policy — single source of truth for the LMS.
 *
 * Each entry is one IPA phoneme card the platform plans to offer:
 *   - status:  'published' (data lives in /data/phonemes.js) or 'upcoming'
 *   - group:   'vowel' | 'diphthong' | 'consonant'
 *   - access:  'free' = public lead magnet, no login required
 *              'premium' = logged-in user with role ≠ 'lead' required
 *
 * The Library page renders this catalogue, the PhonemeCardPage uses it to
 * enforce the paywall, and (eventually) the Admin CMS will mutate it.
 */
export const PHONEME_CATALOGUE = [
  // ----------------------- VOWELS ---------------------------------
  { id: 'u-foot',   status: 'published', group: 'vowel', subtitle: 'FOOT',    words: ['put', 'look', 'good'],        access: 'free'    },
  { id: 'i-fleece', status: 'published', group: 'vowel', subtitle: 'FLEECE',  words: ['see', 'tree', 'three'],       access: 'premium' },
  { id: 'i-kit',    status: 'upcoming',  group: 'vowel', ipa: 'ɪ',  subtitle: 'KIT',     words: ['ship', 'sit', 'fish'],        access: 'premium' },
  { id: 'e-dress',  status: 'upcoming',  group: 'vowel', ipa: 'e',  subtitle: 'DRESS',   words: ['bed', 'pen', 'help'],         access: 'premium' },
  { id: 'ae-trap',  status: 'upcoming',  group: 'vowel', ipa: 'æ',  subtitle: 'TRAP',    words: ['cat', 'man', 'apple'],        access: 'premium' },
  { id: 'a-father', status: 'upcoming',  group: 'vowel', ipa: 'ɑː', subtitle: 'FATHER',  words: ['car', 'father', 'palm'],      access: 'premium' },
  { id: 'o-thought',status: 'upcoming',  group: 'vowel', ipa: 'ɔː', subtitle: 'THOUGHT', words: ['saw', 'thought', 'door'],     access: 'premium' },
  { id: 'u-goose',  status: 'upcoming',  group: 'vowel', ipa: 'uː', subtitle: 'GOOSE',   words: ['two', 'food', 'blue'],        access: 'premium' },
  { id: 'ah-strut', status: 'upcoming',  group: 'vowel', ipa: 'ʌ',  subtitle: 'STRUT',   words: ['cup', 'love', 'come'],        access: 'premium' },
  { id: 'er-nurse', status: 'upcoming',  group: 'vowel', ipa: 'ɜːr',subtitle: 'NURSE',   words: ['bird', 'word', 'work'],       access: 'premium' },
  { id: 'schwa',    status: 'upcoming',  group: 'vowel', ipa: 'ə',  subtitle: 'COMMA',   words: ['about', 'sofa', 'around'],    access: 'premium' },

  // ----------------------- DIPHTHONGS -----------------------------
  { id: 'ay-price', status: 'upcoming', group: 'diphthong', ipa: 'aɪ', subtitle: 'PRICE', words: ['time', 'right', 'my'],  access: 'premium' },
  { id: 'ow-mouth', status: 'upcoming', group: 'diphthong', ipa: 'aʊ', subtitle: 'MOUTH', words: ['now', 'house', 'down'], access: 'premium' },
  { id: 'oy-choice',status: 'upcoming', group: 'diphthong', ipa: 'ɔɪ', subtitle: 'CHOICE',words: ['boy', 'voice', 'join'], access: 'premium' },

  // ----------------------- CONSONANTS -----------------------------
  { id: 'th-think', status: 'upcoming', group: 'consonant', ipa: 'θ', subtitle: 'THINK',  words: ['think', 'three', 'bath'],     access: 'premium' },
  { id: 'th-this',  status: 'upcoming', group: 'consonant', ipa: 'ð', subtitle: 'THIS',   words: ['this', 'mother', 'breathe'],  access: 'premium' },
  { id: 's-sip',    status: 'upcoming', group: 'consonant', ipa: 's', subtitle: 'SIP',    words: ['see', 'sun', 'price'],        access: 'premium' },
  { id: 'r-red',    status: 'upcoming', group: 'consonant', ipa: 'r', subtitle: 'RED',    words: ['red', 'tree', 'around'],      access: 'premium' },
  { id: 'l-light',  status: 'upcoming', group: 'consonant', ipa: 'l', subtitle: 'LIGHT',  words: ['light', 'love', 'full'],      access: 'premium' },
  { id: 'w-wet',    status: 'upcoming', group: 'consonant', ipa: 'w', subtitle: 'WET',    words: ['wet', 'one', 'quick'],        access: 'premium' },
];

/** Roles that count as "premium" — i.e. allowed to consume the full LMS. */
export const PREMIUM_ROLES = new Set(['client', 'collaborator', 'editor', 'manager', 'admin']);

/**
 * @param {object|null} user — auth context user, may be null when anonymous
 * @returns {boolean} true if the user has premium LMS access
 */
export const hasPremiumAccess = (user) => Boolean(user && PREMIUM_ROLES.has(user.role));

/**
 * Look up a catalogue entry. Returns null if the id is unknown.
 */
export const getCatalogueEntry = (id) => PHONEME_CATALOGUE.find((e) => e.id === id) || null;

/**
 * Should this card be visible to the given user? Combines the access policy
 * with the auth state. Anonymous/lead users only see `access: 'free'` cards.
 */
export const canAccessCard = (cardId, user) => {
  const entry = getCatalogueEntry(cardId);
  if (!entry) return true; // unknown id → let downstream 404 handle it
  if (entry.access === 'free') return true;
  return hasPremiumAccess(user);
};
