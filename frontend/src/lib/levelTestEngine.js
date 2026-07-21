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

// ---- ISOLATED phoneme target -------------------------------------------
export const ISOLATED_TARGET = { ipa: 'iː', hint: 'come in "sheep"' };

// ---- PHRASE target ------------------------------------------------------
export const PHRASE_TARGET = {
  text: 'Please keep the green sheep asleep.',
  keyPhoneme: 'iː',
};

// ---- MOCK evaluators (M2 swaps these) -----------------------------------
export function evaluateAural(selected) {
  return { correct: selected === AURAL_QUESTION.correct };
}

// Returns a mock formant-style score 0..100 for the isolated phoneme.
export function evaluatePhoneme() {
  return { score: 61, ipa: ISOLATED_TARGET.ipa };
}

// Returns a mock phrase evaluation.
export function evaluatePhrase() {
  return { score: 58, keyPhoneme: PHRASE_TARGET.keyPhoneme };
}

/**
 * Aggregates everything into the partial + full verdict.
 * MOCK: fixed but plausible numbers so the layout is reviewable.
 */
export function computeVerdict() {
  return {
    scorePercent: 62,
    cefrBand: 'B1',
    // How close the accent leans to each standard (0..100).
    bidialect: { ame: 54, rp: 71 },
    // The three phonemes to work on first (mock).
    focusPhonemes: [
      { ipa: 'iː', label: 'FLEECE', note: 'vocale non abbastanza lunga e tesa' },
      { ipa: 'ʊ', label: 'FOOT', note: 'confusa con /uː/' },
      { ipa: 'θ', label: 'THINK', note: 'resa come /t/ o /f/' },
    ],
  };
}
