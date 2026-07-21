/**
 * Level Test — engine layer (M1 = MOCK).
 *
 * These functions are the REPLACEABLE interface between the UI (LevelTestPage)
 * and the real evaluation backend that arrives in M2. In M1 every function
 * returns deterministic-ish stubbed data so the 8-step flow is fully navigable
 * without any API / microphone / camera dependency.
 *
 * M2 will swap the bodies (real ElevenLabs clips, Parselmouth formant scoring,
 * lead persistence) WITHOUT touching the UI — the shapes below are the contract.
 */

// ---- AURAL step: minimal-pair listening quiz (mock clips = null) ----------
export const AURAL_QUESTION = {
  ipaA: 'ɪ',
  ipaB: 'iː',
  wordA: 'ship',
  wordB: 'sheep',
  // In M2 this becomes a pre-generated ElevenLabs clip URL; null = stub.
  audio: null,
  // The "correct" answer the mock plays.
  correct: 'iː',
  prompt: 'ship / sheep',
};

// ---- ISOLATED phoneme targets (v2 = core of the verdict: 3 vowels) --------
// LAW /ɔː/, BIRD /ɜː/, TRAP /æ/ — references verified RP + AmE (AmE /ɜː/→/ɝ/
// rhotic, lowered F3). `word` is sent to Whisper as the expected lexical target.
export const ISOLATED_TARGETS = [
  { ipa: 'ɔː', label: 'LAW',  word: 'law',  hint: 'la vocale lunga e arrotondata di "law"',
    teach: 'Arrotonda bene le labbra e abbassa la mandibola: /ɔː/ è lungo e cupo, non la "o" italiana di "no". Pensa a un "oooo" spinto indietro in gola.' },
  { ipa: 'ɜː', label: 'BIRD', word: 'bird', hint: 'la vocale centrale lunga di "bird"',
    teach: 'Bocca rilassata, lingua al centro, nessun arrotondamento: /ɜː/ è un suono neutro e lungo. Non dire "berd" né "bird" all\'italiana — è a metà, come un lungo "eeuh".' },
  { ipa: 'æ',  label: 'TRAP', word: 'cat',  hint: 'la vocale aperta di "cat"',
    teach: 'Apri la bocca in orizzontale come in un sorriso ampio: /æ/ è più aperto della "e" italiana. Abbassa la lingua e allarga, non chiudere verso "cet".' },
];

// ---- PHRASE target ------------------------------------------------------
// Covers the 3 target vowels: tall/wall /ɔː/, bird /ɜː/, sat /æ/. In v2 the
// phrase is scored by Whisper for LEXICAL accuracy (weight 0.4), not acoustics.
export const PHRASE_TARGET = {
  text: 'The tall bird sat on the wall.',
  keyPhoneme: 'ɔː',
};

// ---- MOCK evaluators (M2 swaps these) -----------------------------------
export function evaluateAural(selected) {
  return { correct: selected === AURAL_QUESTION.correct };
}

// Returns a mock formant-style score 0..100 for the isolated phoneme.
export function evaluatePhoneme() {
  return { score: 61, ipa: ISOLATED_TARGETS[0].ipa };
}

// PHRASE (v1): experiential only — NO scoring on a whole phrase (the formant
// engine has no forced alignment; that's Charsiu = v2). The user reads, records
// and hears themselves; the verdict score comes from the ISOLATED phoneme(s).
// This stub stays as the replaceable interface for the v2 aligned scorer.
export function evaluatePhrase() {
  return { experience: true, keyPhoneme: PHRASE_TARGET.keyPhoneme };
}

// ---- CEFR mapping (mirrors backend _cefr_band thresholds) ---------------
function cefrFromComposite(c) {
  if (c >= 90) return { band: 'C1–C2', label: 'Articolazione molto chiara e precisa' };
  if (c >= 75) return { band: 'B2', label: 'Pronuncia chiara e naturale' };
  if (c >= 60) return { band: 'B1', label: 'Generalmente intelligibile' };
  if (c >= 45) return { band: 'A2', label: 'Intelligibile con qualche sforzo' };
  return { band: 'A1', label: 'Pronuncia da consolidare' };
}

const _labelOf = (ipa) => (ISOLATED_TARGETS.find((t) => t.ipa === ipa) || {}).label || ipa;

// Worst-scoring formant hint from the best-dialect result of a phoneme.
function _worstHint(r) {
  const best = r.by_dialect && r.by_dialect[r.best_dialect];
  const pf = (best && best.per_formant) || [];
  if (!pf.length) return 'da allenare';
  const worst = pf.reduce((a, b) => (b.score < a.score ? b : a));
  return worst.hint || 'da allenare';
}

/**
 * REAL verdict built from the 3 isolated phoneme scores (v1). Each score is a
 * response from /api/level-test/score: {by_dialect:{RP,AmE}, best_dialect,
 * composite_score, cefr}. NO phrase scoring (Charsiu = v2).
 */
export function computeVerdict(isolatedScores) {
  const entries = Object.entries(isolatedScores || {}).filter(([, r]) => r && r.composite_score != null);
  if (!entries.length) return null;

  const bests = entries.map(([, r]) => r.composite_score);
  const overall = Math.round(bests.reduce((a, b) => a + b, 0) / bests.length);
  const band = cefrFromComposite(overall);

  const rpVals = entries.map(([, r]) => r.by_dialect?.RP?.composite_score).filter((v) => v != null);
  const ameVals = entries.map(([, r]) => r.by_dialect?.AmE?.composite_score).filter((v) => v != null);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

  const focusPhonemes = entries
    .map(([ipa, r]) => ({ ipa, label: _labelOf(ipa), score: r.composite_score, note: _worstHint(r) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    scorePercent: overall,
    cefrBand: band.band,
    cefrLabel: band.label,
    bidialect: { ame: avg(ameVals), rp: avg(rpVals) },
    focusPhonemes,
  };
}

// Demo verdict for deep-link review (?step=verdict) when no real scores exist.
// Mirrors the backend /verdict response shape (SINGLE SOURCE OF TRUTH in real flow).
export function demoVerdict() {
  return {
    scorePercent: 62,
    cefr: { band: 'B1', label: 'Generalmente intelligibile' },
    iso_mean: 62,
    phrase_score: 70,
    bidialect: { ame: 54, rp: 71, insufficient: false },
    focus: [
      { ipa: 'ɜː', label: 'BIRD', score: 48, wrong_word: false },
      { ipa: 'æ',  label: 'TRAP', score: 61, wrong_word: false },
      { ipa: 'ɔː', label: 'LAW',  score: 72, wrong_word: false },
    ],
  };
}
