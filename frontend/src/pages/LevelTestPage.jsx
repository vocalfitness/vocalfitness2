import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Camera, CameraOff, Sparkles, Lock,
  Volume2, Award, Target, Check, Mail, ChevronRight,
} from 'lucide-react';
import { getLevelTestContent, LEVEL_TEST_SEGMENTS } from '../data/levelTestContent';
import { BACKEND_URL } from '../lib/backend';
import {
  AURAL_QUESTION, ISOLATED_TARGETS, PHRASE_TARGET,
  evaluateAural, demoVerdict,
} from '../lib/levelTestEngine';
import JarvisOrb from '../components/levelTest/JarvisOrb';
import MockRecorder from '../components/levelTest/MockRecorder';

const STEPS = ['welcome', 'mirror', 'aural', 'isolated', 'phrase', 'partial', 'gate', 'verdict'];

export default function LevelTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const content = getLevelTestContent('it');
  const S = content.steps;

  const initialStep = Math.max(0, STEPS.indexOf(searchParams.get('step')));
  const [stepIdx, setStepIdx] = useState(initialStep);
  const [speaking, setSpeaking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [auralPick, setAuralPick] = useState(null);
  const [lead, setLead] = useState({ email: '', segment: '', cefr: '' });
  const [consent, setConsent] = useState({ privacy: false, marketing: false });
  const [scores, setScores] = useState({ isolated: {}, phrase: null });
  const [isoIdx, setIsoIdx] = useState(0);

  // SINGLE SOURCE OF TRUTH for the verdict: the backend /verdict endpoint.
  // Both 'partial' (teaser band) and 'verdict' (full detail) read the SAME
  // object fetched once — the email gate only UNLOCKS detail, it never
  // recomputes. This eliminates any partial↔complete divergence at the root.
  const reviewMode = STEPS.indexOf(searchParams.get('step')) >= 0;
  const [verdict, setVerdict] = useState(reviewMode ? demoVerdict() : null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const speakTimer = useRef(null);

  const stepKey = STEPS[stepIdx];
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  // Mock Jarvis "speaking" pulse on each step that has a jarvis line.
  useEffect(() => {
    if (S[stepKey]?.jarvis) {
      setSpeaking(true);
      clearTimeout(speakTimer.current);
      speakTimer.current = setTimeout(() => setSpeaking(false), 2600);
    }
    return () => clearTimeout(speakTimer.current);
  }, [stepIdx]); // eslint-disable-line

  // Fetch the aggregated verdict from the backend when the user reaches the
  // teaser/verdict. Built from the 3 isolated takes (incl. A1-capped wrong
  // words) + the phrase's LEXICAL accuracy (Whisper, weight 0.4).
  useEffect(() => {
    if (reviewMode) return;
    if (stepKey !== 'partial' && stepKey !== 'verdict') return;
    const iso = ISOLATED_TARGETS
      .map((t) => scores.isolated[t.ipa])
      .filter((r) => r && r.target_score != null)
      .map((r) => ({
        ipa: r.phoneme_ipa,
        label: (ISOLATED_TARGETS.find((t) => t.ipa === r.phoneme_ipa) || {}).label || r.phoneme_ipa,
        target_score: r.target_score,
        lexical_ok: r.lexical?.status !== 'wrong',
        by_dialect: {
          RP: r.by_dialect?.RP?.composite_score ?? null,
          AmE: r.by_dialect?.AmE?.composite_score ?? null,
        },
      }));
    if (iso.length < ISOLATED_TARGETS.length) return; // wait for all 3 valid takes
    let cancelled = false;
    setVerdictLoading(true);
    (async () => {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/level-test/verdict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isolated: iso, phrase_score: scores.phrase?.phrase_score ?? null }),
        });
        const data = await resp.json();
        if (!cancelled && resp.ok) setVerdict(data);
      } catch (e) {
        /* keep previous verdict; the UI shows the loading/placeholder state */
      } finally {
        if (!cancelled) setVerdictLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stepKey, scores.isolated, scores.phrase, reviewMode]); // eslint-disable-line

  const go = (n) => setStepIdx((i) => Math.min(Math.max(i + n, 0), STEPS.length - 1));
  const jumpTo = (key) => setStepIdx(STEPS.indexOf(key));

  const branch = LEVEL_TEST_SEGMENTS.find((s) => s.value === lead.segment)?.branch || 'A';

  const handleGateSubmit = () => {
    // The verdict is already derived from the 3 isolated phonemes. The gate
    // ONLY unlocks the detailed view — it does NOT recompute or add measures.
    jumpTo('verdict');
  };

  const replayJarvis = () => {
    setSpeaking(true);
    clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => setSpeaking(false), 2600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 overflow-x-hidden flex flex-col">
      <style>{`
        @keyframes ltStepIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .lt-step { animation: ltStepIn 0.45s cubic-bezier(0.22,1,0.36,1); }
        @keyframes ltScan { 0% { transform: translateY(-100%); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(1400%); opacity: 0; } }
        .lt-scanline { position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent); animation: ltScan 4s linear infinite; }
        @keyframes ltGrid { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes ltBar { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
      `}</style>

      {/* Ambient grid backdrop */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/85 border-b border-cyan-500/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            data-testid="lt-home-link"
            className="text-[11px] uppercase tracking-widest font-bold text-cyan-300/70 hover:text-orange-300 transition-colors"
          >
            {content.meta.brand}
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {stepIdx + 1} / {STEPS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-800" data-testid="lt-progress">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-500"
            style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(251,146,60,0.5)' }}
          />
        </div>
      </nav>

      {/* Step body */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-14 relative z-10">
        <div key={stepKey} className="lt-step w-full max-w-2xl mx-auto text-center" data-testid={`lt-step-${stepKey}`}>

          {/* ============ WELCOME ============ */}
          {stepKey === 'welcome' && (
            <>
              <p className="text-[11px] uppercase tracking-[0.3em] text-orange-400 font-bold mb-6">{S.welcome.kicker}</p>
              <JarvisOrb speaking={speaking} onReplay={replayJarvis} />
              <h1 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                {S.welcome.heading}
              </h1>
              <p className="mt-6 text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl mx-auto">
                {S.welcome.jarvis.text}
              </p>
              <button
                onClick={() => go(1)}
                data-testid="lt-start-btn"
                className="mt-10 inline-flex items-center gap-3 px-10 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105 shadow-[0_0_32px_rgba(251,146,60,0.55)]"
              >
                {S.welcome.cta} <ArrowRight size={18} />
              </button>
              <p className="mt-4 text-xs text-slate-500">{S.welcome.note}</p>
            </>
          )}

          {/* ============ MIRROR ============ */}
          {stepKey === 'mirror' && (
            <>
              <StepHeader title={S.mirror.title} jarvis={S.mirror.jarvis.text} speaking={speaking} onReplay={replayJarvis} />
              <div className="relative mx-auto mt-8 w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-slate-900/60 flex items-center justify-center">
                <div className="lt-scanline" />
                {cameraOn ? (
                  <div className="flex flex-col items-center gap-3 text-cyan-300/80">
                    <Camera size={44} className="drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                    <span className="text-[11px] uppercase tracking-widest font-bold">Anteprima specchio (demo)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <CameraOff size={44} />
                    <span className="text-[11px] uppercase tracking-widest font-bold">Telecamera spenta</span>
                  </div>
                )}
                {/* corner ticks */}
                {['top-3 left-3','top-3 right-3','bottom-3 left-3','bottom-3 right-3'].map((p) => (
                  <span key={p} className={`absolute ${p} w-4 h-4 border-orange-400/70`} style={{ borderTopWidth: p.includes('top') ? 2 : 0, borderBottomWidth: p.includes('bottom') ? 2 : 0, borderLeftWidth: p.includes('left') ? 2 : 0, borderRightWidth: p.includes('right') ? 2 : 0 }} />
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 max-w-md mx-auto">{S.mirror.privacy}</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => { setCameraOn(true); }}
                  data-testid="lt-camera-enable"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 shadow-[0_0_28px_rgba(251,146,60,0.5)]"
                >
                  <Camera size={17} /> {S.mirror.enableCta}
                </button>
                <button
                  onClick={() => go(1)}
                  data-testid="lt-camera-skip"
                  className="text-xs uppercase tracking-widest font-bold text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {S.mirror.skipCta}
                </button>
              </div>
            </>
          )}

          {/* ============ AURAL ============ */}
          {stepKey === 'aural' && (
            <>
              <StepHeader title={S.aural.title} jarvis={S.aural.jarvis.text} speaking={speaking} onReplay={replayJarvis} />
              <button
                onClick={replayJarvis}
                data-testid="lt-aural-play"
                className="mt-8 inline-flex items-center gap-3 px-7 py-4 rounded-full bg-slate-900/80 border border-cyan-500/40 hover:border-orange-400 text-cyan-100 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105"
              >
                <Volume2 size={18} /> {S.aural.replay} <span className="text-[10px] text-slate-500 normal-case">(demo)</span>
              </button>
              <p className="mt-8 text-sm text-slate-300 font-semibold">{S.aural.prompt}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 max-w-md mx-auto">
                {[
                  { ipa: AURAL_QUESTION.ipaA, word: AURAL_QUESTION.wordA },
                  { ipa: AURAL_QUESTION.ipaB, word: AURAL_QUESTION.wordB },
                ].map((opt) => {
                  const sel = auralPick === opt.ipa;
                  return (
                    <button
                      key={opt.ipa}
                      onClick={() => setAuralPick(opt.ipa)}
                      data-testid={`lt-aural-option-${opt.ipa}`}
                      className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                        sel
                          ? 'border-orange-400 bg-orange-500/10 shadow-[0_0_24px_rgba(251,146,60,0.35)] scale-105'
                          : 'border-cyan-500/25 bg-slate-900/50 hover:border-cyan-400/70'
                      }`}
                    >
                      <div className={`font-mono text-3xl ${sel ? 'text-orange-400' : 'text-cyan-200'}`}>/{opt.ipa}/</div>
                      <div className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-bold">{opt.word}</div>
                    </button>
                  );
                })}
              </div>
              {auralPick && (
                <p className="mt-6 text-xs uppercase tracking-widest font-bold text-emerald-400" data-testid="lt-aural-feedback">
                  {evaluateAural(auralPick).correct ? 'Orecchio allenato ✓ (demo)' : 'Ci lavoreremo insieme (demo)'}
                </p>
              )}
            </>
          )}

          {/* ============ ISOLATED (3 phonemes = core of verdict) ============ */}
          {stepKey === 'isolated' && (() => {
            const targets = ISOLATED_TARGETS;
            const doneCount = Object.keys(scores.isolated).length;
            const current = targets[Math.min(isoIdx, targets.length - 1)];
            const currentDone = !!scores.isolated[current.ipa];
            const allDone = doneCount >= targets.length;
            return (
              <>
                <StepHeader title={S.isolated.title} jarvis={S.isolated.jarvis.text} speaking={speaking} onReplay={replayJarvis} />

                {/* progress dots for the 3 target vowels */}
                <div className="mt-6 flex items-center justify-center gap-3" data-testid="lt-isolated-progress">
                  {targets.map((t, i) => {
                    const scored = !!scores.isolated[t.ipa];
                    const isCur = i === isoIdx && !allDone;
                    return (
                      <div key={t.ipa} className="flex flex-col items-center gap-1">
                        <span className={`font-mono text-lg transition-colors ${scored ? 'text-emerald-400' : isCur ? 'text-orange-400' : 'text-slate-600'}`}>/{t.ipa}/</span>
                        <span className={`w-8 h-1 rounded-full transition-colors ${scored ? 'bg-emerald-400' : isCur ? 'bg-orange-400' : 'bg-slate-700'}`} />
                        <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">{t.label}</span>
                      </div>
                    );
                  })}
                </div>

                {!allDone ? (
                  <div className="mt-8">
                    {/* Clear instruction (mitigates wrong-word sabotage): the
                        big word to say + the target vowel + how to pronounce it. */}
                    <div className="max-w-md mx-auto mb-6 rounded-2xl border border-orange-500/25 bg-slate-900/50 px-6 py-5" data-testid="lt-isolated-prompt">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70 font-bold mb-2">Pronuncia la parola</p>
                      <div className="text-4xl sm:text-5xl font-black text-white leading-none">{current.word}</div>
                      <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                        <span className="text-orange-400 font-mono text-xl drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">/{current.ipa}/</span>
                        <span className="text-slate-400">{current.hint}</span>
                      </div>
                    </div>
                    <MockRecorder
                      key={current.ipa}
                      label={`Pronuncia ${current.label}`}
                      target={`/${current.ipa}/`}
                      phonemeIpa={current.ipa}
                      expected={current.word}
                      kind="word"
                      dialect="RP"
                      testid="lt-isolated-recorder"
                      onDone={(r) => {
                        // Store the take if it produced a score — INCLUDING a
                        // wrong-word take (backend caps it at A1). A wrong word
                        // is a valid, low result: it must COUNT, not be dropped.
                        if (r && r.target_score != null) {
                          setScores((s) => ({ ...s, isolated: { ...s.isolated, [current.ipa]: r } }));
                        }
                      }}
                      onError={() => {
                        // Rejected (422) or failed take → this phoneme is NOT
                        // acquired. Remove any previous score so it can never
                        // enter the verdict and the flow blocks until a valid take.
                        setScores((s) => {
                          if (!s.isolated[current.ipa]) return s;
                          const next = { ...s.isolated };
                          delete next[current.ipa];
                          return { ...s, isolated: next };
                        });
                      }}
                    />
                    {currentDone && isoIdx < targets.length - 1 && (
                      <button
                        onClick={() => setIsoIdx((i) => i + 1)}
                        data-testid="lt-isolated-next-phoneme"
                        className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 shadow-[0_0_28px_rgba(251,146,60,0.5)]"
                      >
                        Prossimo suono <ArrowRight size={17} />
                      </button>
                    )}
                    {currentDone && isoIdx === targets.length - 1 && (
                      <p className="mt-6 text-xs uppercase tracking-widest font-bold text-emerald-400">Tutti e 3 i suoni acquisiti ✓ — premi Avanti</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-8 text-sm uppercase tracking-widest font-bold text-emerald-400" data-testid="lt-isolated-complete">Tutti e 3 i suoni acquisiti ✓</p>
                )}
              </>
            );
          })()}

          {/* ============ PHRASE ============ */}
          {stepKey === 'phrase' && (
            <>
              <StepHeader title={S.phrase.title} jarvis={S.phrase.jarvis.text} speaking={speaking} onReplay={replayJarvis} />
              <div className="mt-6 max-w-md mx-auto px-6 py-4 rounded-xl bg-slate-900/60 border border-cyan-500/20">
                <p className="text-lg text-cyan-100 font-medium leading-relaxed">"{PHRASE_TARGET.text}"</p>
              </div>
              <div className="mt-8">
                <MockRecorder
                  label="Leggi la frase"
                  target={`/${PHRASE_TARGET.keyPhoneme}/`}
                  phonemeIpa={PHRASE_TARGET.keyPhoneme}
                  expected={PHRASE_TARGET.text}
                  kind="phrase"
                  testid="lt-phrase-recorder"
                  onDone={(r) => {
                    // Phrase = LEXICAL accuracy via Whisper (weight 0.4 in the
                    // backend verdict), NOT acoustic quality. Read with an
                    // Italian accent → poor transcription → lower band.
                    if (r && r.kind === 'phrase') {
                      setScores((s) => ({ ...s, phrase: r }));
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* ============ PARTIAL ============ */}
          {stepKey === 'partial' && (
            <>
              <p className="text-[11px] uppercase tracking-[0.3em] text-orange-400 font-bold mb-6">{S.partial.title}</p>
              <JarvisOrb speaking={speaking} onReplay={replayJarvis} />
              <h2 className="mt-8 text-2xl sm:text-3xl font-black">{S.partial.teaserHeading}</h2>
              <p className="mt-5 text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl mx-auto">{S.partial.jarvis.text}</p>

              {/* Teaser: the REAL band (same verdict object), detail locked */}
              <div className="relative mt-8 max-w-md mx-auto rounded-2xl border border-cyan-500/20 bg-slate-900/50 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Livello Vocal Fitness</span>
                  <span className="text-3xl font-black text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.5)]" data-testid="lt-partial-band">
                    {verdict ? verdict.cefr.band : (verdictLoading ? '…' : '—')}
                  </span>
                </div>
                <div className="relative">
                  <div className="blur-sm select-none pointer-events-none space-y-2">
                    <div className="h-3 rounded-full bg-slate-700/60" />
                    <div className="h-3 rounded-full bg-slate-700/60 w-4/5" />
                    <div className="h-3 rounded-full bg-slate-700/60 w-3/5" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="text-orange-400/80" size={26} />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">Sblocca il dettaglio: accento AmE/RP e i 3 suoni su cui lavorare.</p>
              </div>

              <button
                onClick={() => go(1)}
                data-testid="lt-unlock-btn"
                className="mt-8 inline-flex items-center gap-3 px-10 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 shadow-[0_0_32px_rgba(251,146,60,0.55)]"
              >
                <Sparkles size={18} /> {S.partial.unlockCta}
              </button>
            </>
          )}

          {/* ============ GATE ============ */}
          {stepKey === 'gate' && (
            <>
              <StepHeader title={S.gate.title} jarvis={S.gate.jarvis.text} speaking={speaking} onReplay={replayJarvis} />
              <div className="mt-8 max-w-md mx-auto text-left space-y-5">
                <Field label={S.gate.emailLabel}>
                  <input
                    type="email"
                    value={lead.email}
                    onChange={(e) => setLead({ ...lead, email: e.target.value })}
                    placeholder={S.gate.emailPlaceholder}
                    data-testid="lt-gate-email"
                    className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/25 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-orange-400 transition-colors"
                  />
                </Field>
                <Field label={S.gate.segmentQuestion}>
                  <select
                    value={lead.segment}
                    onChange={(e) => setLead({ ...lead, segment: e.target.value })}
                    data-testid="lt-gate-segment"
                    className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/25 rounded-lg text-white focus:outline-none focus:border-orange-400 transition-colors"
                  >
                    <option value="">—</option>
                    {LEVEL_TEST_SEGMENTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label={S.gate.cefrQuestion}>
                  <select
                    value={lead.cefr}
                    onChange={(e) => setLead({ ...lead, cefr: e.target.value })}
                    data-testid="lt-gate-cefr"
                    className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/25 rounded-lg text-white focus:outline-none focus:border-orange-400 transition-colors"
                  >
                    {S.gate.cefrOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-start gap-3 text-xs text-slate-400 cursor-pointer" data-testid="lt-consent-privacy-label">
                  <input
                    type="checkbox"
                    checked={consent.privacy}
                    onChange={(e) => setConsent({ ...consent, privacy: e.target.checked })}
                    data-testid="lt-consent-privacy"
                    className="mt-0.5 accent-orange-500 w-4 h-4"
                  />
                  <span>{S.gate.consentPrivacy}</span>
                </label>
                <label className="flex items-start gap-3 text-xs text-slate-400 cursor-pointer" data-testid="lt-consent-marketing-label">
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                    data-testid="lt-consent-marketing"
                    className="mt-0.5 accent-orange-500 w-4 h-4"
                  />
                  <span>{S.gate.consentMarketing}</span>
                </label>
                <button
                  onClick={handleGateSubmit}
                  disabled={!lead.email || !lead.segment || !consent.privacy}
                  data-testid="lt-gate-submit"
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-[1.02] shadow-[0_0_28px_rgba(251,146,60,0.5)]"
                >
                  <Mail size={17} /> {S.gate.submitCta}
                </button>
              </div>
            </>
          )}

          {/* ============ VERDICT ============ */}
          {stepKey === 'verdict' && verdict && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/15 border border-orange-400/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,146,60,0.4)]">
                <Award className="text-orange-400" size={30} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">{S.verdict.title}</h2>

              {/* Score + band */}
              <div className="mt-8 max-w-md mx-auto rounded-2xl border border-cyan-500/25 bg-slate-900/60 p-6" data-testid="lt-verdict-score">
                <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">{S.verdict.cefrLabelPrefix}</div>
                <div className="mt-1 flex items-end justify-center gap-3">
                  <span className="text-5xl font-black text-orange-400 drop-shadow-[0_0_16px_rgba(251,146,60,0.5)]">{verdict.cefr.band}</span>
                  <span className="text-lg text-cyan-200 font-bold mb-1">{verdict.scorePercent}/100</span>
                </div>
              </div>

              {/* Bidialect */}
              <div className="mt-6 max-w-md mx-auto rounded-2xl border border-cyan-500/25 bg-slate-900/60 p-6 text-left" data-testid="lt-verdict-bidialect">
                <div className="text-sm font-bold text-cyan-100 mb-4">{S.verdict.bidialectHeading}</div>
                {[
                  { flag: '🇺🇸', label: 'Americano (AmE)', val: verdict.bidialect.ame },
                  { flag: '🇬🇧', label: 'Britannico (RP)', val: verdict.bidialect.rp },
                ].map((d) => (
                  <div key={d.label} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>{d.flag} {d.label}</span>
                      <span className="font-bold text-orange-400">{d.val != null ? `${d.val}%` : '—'}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700" style={{ width: `${d.val || 0}%` }} />
                    </div>
                  </div>
                ))}
                {verdict.bidialect.insufficient && (
                  <p className="text-[11px] text-slate-500 mt-1" data-testid="lt-verdict-bidialect-insufficient">
                    Dati insufficienti per un confronto AmE/RP affidabile (servono almeno 2 suoni pronunciati correttamente).
                  </p>
                )}
              </div>

              {/* Focus phonemes */}
              <div className="mt-6 max-w-md mx-auto text-left" data-testid="lt-verdict-focus">
                <div className="text-sm font-bold text-cyan-100 mb-3">{S.verdict.focusHeading}</div>
                <div className="space-y-2">
                  {verdict.focus.map((p) => (
                    <div key={p.ipa} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-cyan-500/20">
                      <span className="font-mono text-xl text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]">/{p.ipa}/</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-widest font-bold text-cyan-200">{p.label}</span>
                          <span className="text-xs font-bold text-orange-400">{p.score != null ? `${Math.round(p.score)}/100` : '—'}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {p.wrong_word
                            ? 'Parola non riconosciuta — riprova pronunciando la parola giusta'
                            : 'Suono da allenare per primo'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branch routing */}
              {branch === 'B' ? (
                <div className="mt-8 max-w-md mx-auto rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-500/10 to-slate-900/60 p-6 text-left" data-testid="lt-branch-b">
                  <h3 className="text-lg font-black text-white">{S.verdict.branchB.heading}</h3>
                  <p className="mt-2 text-sm text-slate-300">{S.verdict.branchB.body}</p>
                  <button
                    data-testid="lt-branch-b-submit"
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-[1.02] shadow-[0_0_28px_rgba(251,146,60,0.5)]"
                  >
                    {S.verdict.branchB.cta} <ChevronRight size={17} />
                  </button>
                </div>
              ) : (
                <div className="mt-8 max-w-md mx-auto rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-500/10 to-slate-900/60 p-6 text-left" data-testid="lt-branch-a">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <Target size={18} /><h3 className="text-lg font-black text-white">{S.verdict.branchA.heading}</h3>
                  </div>
                  <p className="text-sm text-slate-300">{S.verdict.branchA.body}</p>
                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-2xl font-black text-white">{S.verdict.branchA.priceMonthly}</span>
                    <span className="text-sm text-slate-400">/ {S.verdict.branchA.priceYearly}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full">{S.verdict.branchA.yearlyBadge}</span>
                  </div>
                  <p className="mt-3 text-xs text-emerald-400 font-semibold flex items-center gap-1.5"><Check size={14} /> {S.verdict.branchA.freeNote}</p>
                  <button
                    onClick={() => navigate('/lms/phonemes')}
                    data-testid="lt-branch-a-cta"
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-[1.02] shadow-[0_0_28px_rgba(251,146,60,0.5)]"
                  >
                    {S.verdict.branchA.cta} <ChevronRight size={17} />
                  </button>
                </div>
              )}

              <p className="mt-8 text-[11px] text-slate-600 max-w-md mx-auto leading-relaxed">{content.meta.disclaimer}</p>
            </>
          )}

          {stepKey === 'verdict' && !verdict && (
            <div className="py-20 text-center text-slate-400" data-testid="lt-verdict-loading">
              <div className="text-sm uppercase tracking-widest font-bold">Sto calcolando il tuo verdetto…</div>
            </div>
          )}
        </div>
      </main>

      {/* Footer nav (hidden on welcome & verdict) */}
      {stepKey !== 'welcome' && stepKey !== 'verdict' && (
        <footer className="sticky bottom-0 z-40 backdrop-blur-md bg-slate-950/85 border-t border-cyan-500/15">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => go(-1)}
              data-testid="lt-back-btn"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft size={16} /> Indietro
            </button>
            {stepKey !== 'gate' && stepKey !== 'partial' && (
              <button
                onClick={() => go(1)}
                disabled={(stepKey === 'aural' && !auralPick) || (stepKey === 'isolated' && Object.keys(scores.isolated).length < 3)}
                data-testid="lt-next-btn"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-cyan-500/20 border border-cyan-400/50 hover:border-orange-400 hover:bg-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-100 font-bold uppercase tracking-wider text-xs transition-all"
              >
                Avanti <ArrowRight size={16} />
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

// ---- small inline helpers ----------------------------------------------
const StepHeader = ({ title, jarvis, speaking, onReplay }) => (
  <>
    <p className="text-[11px] uppercase tracking-[0.3em] text-orange-400 font-bold mb-6">{title}</p>
    <JarvisOrb speaking={speaking} size={104} onReplay={onReplay} />
    <p className="mt-6 text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl mx-auto">{jarvis}</p>
  </>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-widest font-bold text-cyan-300/70 mb-2">{label}</label>
    {children}
  </div>
);
