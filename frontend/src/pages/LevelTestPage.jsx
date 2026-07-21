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
import IsolatedStep from '../components/levelTest/IsolatedStep';

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
  // Stable anonymous session id — the server keys first-cold/best + verdict on it.
  const [sessionId] = useState(() => `lt-${(typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`);

  // SINGLE SOURCE OF TRUTH for the verdict: the backend /verdict endpoint.
  // Both 'partial' (teaser band) and 'verdict' (full detail) read the SAME
  // object fetched once — the email gate only UNLOCKS detail, it never
  // recomputes. This eliminates any partial↔complete divergence at the root.
  const reviewMode = STEPS.indexOf(searchParams.get('step')) >= 0;
  const [verdict, setVerdict] = useState(reviewMode ? demoVerdict() : null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  // Prof. reference clips (audio-da-imitare), keyed by phoneme → {RP,AmE} URL.
  // Pulled from the resolver (SINGLE SOURCE: audio.{dialect}.wordExample) so a
  // re-recorded clip is followed automatically — never a hardcoded local copy.
  const [wordAudio, setWordAudio] = useState({});
  // Prof. frontal view per phoneme (assets.frontView) for the teachable moment.
  const [frontViews, setFrontViews] = useState({});
  const speakTimer = useRef(null);

  // Publication gate: fetch config; if the test is not published (approved by an
  // admin AND 6/6 clips ready) and we're not in admin preview (?step=), send the
  // public visitor to the home page. Draft-not-publish — never serve without audio.
  useEffect(() => {
    if (reviewMode) return; // admin/design preview bypasses the gate
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/level-test/config`);
        const cfg = await res.json();
        if (!cancelled && !cfg.published) navigate('/', { replace: true });
      } catch (e) {
        // Fail CLOSED: if we can't confirm publication (backend outage), send the
        // public visitor home — never risk serving the test without its audio.
        if (!cancelled) navigate('/', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [reviewMode, navigate]);

  // Load the Prof. reference clips once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/level-test/word-examples`);
        const data = await res.json();
        const map = {};
        const fv = {};
        (data.slots || []).forEach((s) => {
          map[s.phoneme] = map[s.phoneme] || {};
          map[s.phoneme][s.dialect] = s.url;
          // Teachable moment uses the RP card's frontal view (evaluated dialect).
          if (s.dialect === 'RP' && s.front_view) fv[s.phoneme] = s.front_view;
        });
        if (!cancelled) { setWordAudio(map); setFrontViews(fv); }
      } catch (e) { /* button will no-op if unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const playClip = (url) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    try { new Audio(full).play(); } catch (e) { /* ignore */ }
  };

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
    // Wait until all 3 phonemes have reached a DONE state (scores.isolated is
    // populated only when a phoneme is finalised by IsolatedStep).
    const doneCount = ISOLATED_TARGETS.filter((t) => scores.isolated[t.ipa]).length;
    if (doneCount < ISOLATED_TARGETS.length) return;
    let cancelled = false;
    setVerdictLoading(true);
    (async () => {
      try {
        // SERVER-TRUTH: the verdict is rebuilt from the BEST attempt per phoneme
        // stored server-side against this session — the client cannot inflate it.
        const resp = await fetch(`${BACKEND_URL}/api/level-test/verdict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, phrase_score: null }),
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
  }, [stepKey, scores.isolated, reviewMode]); // eslint-disable-line

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
          {stepKey === 'isolated' && (
            <>
              <StepHeader title={S.isolated.title} jarvis={S.isolated.jarvis.text} speaking={speaking} onReplay={replayJarvis} />
              <IsolatedStep
                sessionId={sessionId}
                targets={ISOLATED_TARGETS}
                wordAudio={wordAudio}
                frontViews={frontViews}
                playClip={playClip}
                onPhonemeDone={(ipa, migliore) => {
                  setScores((s) => ({ ...s, isolated: { ...s.isolated, [ipa]: migliore || { done: true } } }));
                }}
              />
            </>
          )}

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
                  onDone={() => {
                    // Phrase is EXPERIENTIAL only (V1): the user reads & records
                    // for the felt experience. It is NEVER part of the verdict —
                    // lexical accuracy can't measure accent (Whisper understands
                    // non-natives too well). True per-vowel phrase scoring = v3
                    // (Charsiu forced alignment).
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

              {/* BIRD bidialect divergence demo (hook): let the user HEAR the
                  RP non-rhotic vs US r-coloured contrast. Pulled from the
                  canonical resolver; renders only when both clips exist. */}
              {wordAudio['ɜː']?.RP && wordAudio['ɜː']?.AmE && (
                <div className="mt-6 max-w-md mx-auto rounded-2xl border border-cyan-500/25 bg-slate-900/50 p-5" data-testid="lt-bird-divergence">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-200 mb-1">Senti la differenza · BIRD</div>
                  <div className="text-xs text-slate-400 mb-3">Lo stesso suono, due mondi: il britannico non arrota la "r", l'americano sì.</div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => playClip(wordAudio['ɜː'].RP)} data-testid="lt-bird-rp"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25 hover:text-white font-bold text-sm transition-all">
                      <Volume2 size={16} /> 🇬🇧 Britannico
                    </button>
                    <button type="button" onClick={() => playClip(wordAudio['ɜː'].AmE)} data-testid="lt-bird-us"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-orange-500/15 border border-orange-400/40 text-orange-200 hover:bg-orange-500/25 hover:text-white font-bold text-sm transition-all">
                      <Volume2 size={16} /> 🇺🇸 Americano
                    </button>
                  </div>
                </div>
              )}

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
