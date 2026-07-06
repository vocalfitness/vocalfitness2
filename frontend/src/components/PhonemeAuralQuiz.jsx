import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ear, Volume2, Check, X, RefreshCw, Sparkles, Pause } from 'lucide-react';
import { PHONEME_CATALOGUE, getIpaForDialect } from '../data/phonemeCatalogue';
import { pickDialectAudio } from '../lib/pickDialectAudio';

/**
 * PhonemeAuralQuiz — listen-and-identify drill for auditory discrimination.
 *
 * Pedagogy: minimal-pair training is the single most-effective technique for
 * perceptual category formation in L2 phonetics. The quiz plays one randomly
 * selected commonWords sample from the host phoneme card and offers three
 * IPA buttons — one correct + two perceptually-confusable distractors taken
 * from the catalogue. Score persists in component state.
 *
 * Confusion sets are explicit (not heuristic) because acoustic similarity is
 * not always derivable from IPA features alone — e.g. /θ/ confuses with /f/
 * (similar high-frequency noise) more than with /ð/ (same place, different
 * voicing).
 */
const CONFUSION_PAIRS = {
  'i-fleece': ['i-kit', 'ei-face'],        // sheep/ship/shape
  'u-foot':   ['u-goose', 'ah-strut'],     // full/fool/cup
  'i-kit':    ['i-fleece', 'e-dress'],
  'e-dress':  ['ae-trap', 'i-kit'],
  'ae-trap':  ['e-dress', 'ah-strut'],
  'ah-strut': ['o-lot', 'a-palm'],
  'o-lot':    ['ah-strut', 'o-thought'],
  'th-thin':  ['f-fan', 's-sip'],
  'dh-this':  ['v-van', 'z-zip'],
  'r-red':    ['l-light', 'w-wet'],
  'l-light':  ['r-red', 'n-nun'],
  'sh-ship':  ['s-sip', 'ch-church'],
  'v-van':    ['b-bin', 'f-fan'],
  'b-bin':    ['v-van', 'p-pen'],
  'p-pen':    ['b-bin', 'f-fan'],
};

const FALLBACK_DISTRACTORS = ['i-kit', 'ae-trap', 'u-goose'];

export const PhonemeAuralQuiz = ({ phoneme, dialect = 'AmE', testId }) => {
  const phonemeId = phoneme.id;
  const words = phoneme.commonWords || [];
  const audioRef = useRef(null);
  const [round, setRound]       = useState(0);
  const [score, setScore]       = useState({ ok: 0, total: 0 });
  const [picked, setPicked]     = useState(null);   // entry id user selected
  const [playing, setPlaying]   = useState(false);

  // --- Build a stable list of 2 distractors + the right answer --------
  const options = useMemo(() => {
    const distractorIds = CONFUSION_PAIRS[phonemeId] || FALLBACK_DISTRACTORS;
    const correct = PHONEME_CATALOGUE.find(e => e.id === phonemeId);
    const distractors = distractorIds
      .map(id => PHONEME_CATALOGUE.find(e => e.id === id))
      .filter(e => e && e.id !== phonemeId)
      .slice(0, 2);
    // Shuffle deterministic per round so the layout changes each new attempt
    const all = [correct, ...distractors].filter(Boolean);
    const seed = (round * 9301 + 49297) % 233280;
    const shuffled = [...all].sort((a, b) => {
      const ha = (a.id.charCodeAt(0) + seed) % 7;
      const hb = (b.id.charCodeAt(0) + seed) % 7;
      return ha - hb;
    });
    return shuffled;
  }, [phonemeId, round]);

  // --- Pick the word played for this round ----------------------------
  const currentWord = useMemo(() => {
    if (!words.length) return null;
    // Deterministic per round but rotates through all words
    return words[round % words.length];
  }, [words, round]);

  const playWord = async () => {
    const wordUrl = pickDialectAudio(currentWord, dialect);
    if (!wordUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(wordUrl);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
      audioRef.current.addEventListener('pause', () => setPlaying(false));
    } else {
      audioRef.current.src = wordUrl;
    }
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlaying(true);
    } catch (_) { setPlaying(false); }
  };

  // auto-play on each new round OR when the dialect flips (so the RP/US
  // switch takes effect immediately even if the user isn't advancing)
  useEffect(() => { if (currentWord) { playWord(); } }, [round, currentWord?.audio, currentWord?.audioAmE, currentWord?.audioRP, dialect]);

  // Cleanup
  useEffect(() => () => { try { audioRef.current?.pause(); } catch (_) { /* ignore */ } }, []);

  const handlePick = (entry) => {
    if (picked) return;
    setPicked(entry.id);
    setScore(s => ({ ok: s.ok + (entry.id === phonemeId ? 1 : 0), total: s.total + 1 }));
  };
  const nextRound = () => { setPicked(null); setRound(r => r + 1); };

  if (!currentWord) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 text-slate-400 text-sm">
        Quiz uditivo non disponibile per questa card (mancano gli esempi audio).
      </div>
    );
  }

  const accuracy = score.total === 0 ? 0 : Math.round((score.ok / score.total) * 100);

  return (
    <div
      className="relative rounded-3xl border border-orange-500/30 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-6 md:p-8 overflow-hidden"
      data-testid={testId}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(251,146,60,0.10) 0%, transparent 60%)' }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-orange-300 font-bold flex items-center gap-2">
              <Ear className="w-3.5 h-3.5" />
              Quiz Discriminazione Uditiva
            </p>
            <h3 className="mt-1 text-xl md:text-2xl font-black text-white leading-tight">
              Quale fonema hai sentito?
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Punteggio</p>
            <p className="text-2xl font-black text-white leading-none">
              {score.ok}<span className="text-slate-500 text-base">/{score.total}</span>
              {score.total >= 3 && (
                <span className={`ml-2 text-sm font-bold ${accuracy >= 75 ? 'text-emerald-300' : accuracy >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>
                  {accuracy}%
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={playWord}
          disabled={!pickDialectAudio(currentWord, dialect)}
          className={`w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 mb-5 ${
            playing
              ? 'bg-orange-500 text-slate-900 shadow-[0_0_30px_rgba(251,146,60,0.4)]'
              : 'bg-slate-800/80 text-cyan-200 border border-cyan-500/40 hover:bg-slate-700 hover:border-cyan-300'
          }`}
          data-testid="quiz-play"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          {playing ? 'Riproduzione in corso…' : 'Riascolta'}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="quiz-options">
          {options.map((opt) => {
            const ipa = getIpaForDialect(opt, dialect);
            const isCorrect = opt.id === phonemeId;
            const isPicked  = picked === opt.id;
            const reveal = !!picked;
            const tone = !reveal
              ? 'border-slate-700 hover:border-cyan-400 hover:bg-slate-800/60 cursor-pointer'
              : isCorrect
                ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/40'
                : isPicked
                  ? 'border-rose-400 bg-rose-500/15'
                  : 'border-slate-800 opacity-50';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePick(opt)}
                disabled={!!picked}
                data-testid={`quiz-option-${opt.id}`}
                className={`relative text-center p-5 rounded-2xl border-2 bg-slate-900/40 transition-all duration-300 ${tone}`}
              >
                <p className="text-4xl md:text-5xl font-black text-white leading-none mb-1.5">/{ipa}/</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{opt.subtitle}</p>
                {reveal && isCorrect && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-slate-900" strokeWidth={3} />
                  </span>
                )}
                {reveal && isPicked && !isCorrect && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 flex items-start gap-3" data-testid="quiz-feedback">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              picked === phonemeId ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
              {picked === phonemeId ? <Check className="w-5 h-5 text-slate-900" strokeWidth={3} /> : <X className="w-5 h-5 text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">
                {picked === phonemeId ? 'Corretto.' : 'Riprova.'}
                <span className="ml-2 font-normal text-slate-300">
                  La parola era <span className="font-mono text-cyan-200">{currentWord.w}</span>
                  {currentWord.ipa && <span className="ml-1 text-slate-400">{currentWord.ipa}</span>}
                </span>
              </p>
              <button
                type="button"
                onClick={nextRound}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 text-xs font-bold shadow hover:scale-[1.03] transition-transform"
                data-testid="quiz-next"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Prossima domanda
              </button>
            </div>
          </div>
        )}

        {score.total >= 5 && score.ok === score.total && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> Streak perfetto — orecchio fonetico in forma!
          </div>
        )}
      </div>
    </div>
  );
};

export default PhonemeAuralQuiz;
