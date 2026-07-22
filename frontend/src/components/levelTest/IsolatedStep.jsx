import React, { useState } from 'react';
import {
  ArrowRight, Volume2, Check, RotateCcw, MicOff, GraduationCap, Waves,
} from 'lucide-react';
import { BACKEND_URL } from '../../lib/backend';
import MockRecorder from './MockRecorder';

/**
 * IsolatedStep (M2.4b) — the 3 isolated vowels, with:
 *  - max 3 MEASURED attempts per phoneme (a 422 never consumes one),
 *  - "Errore-che-insegna" (teachable moment): wrong word OR score < soglia →
 *    Prof. frontal view (assets.frontView) + corrective RP instruction + RP
 *    audio + Riprova. Consumes an attempt.
 *  - "Non misurato" (422): gentle technical message → Riprova. NEVER shows the
 *    teachable coaching and NEVER consumes an attempt. These two are kept
 *    strictly separate, visually and logically.
 *  - Bidialectal LAW moment: ALWAYS after LAW is done (not score-gated) — RP↔US
 *    playback + the "prima/dopo" (primo_a_freddo → migliore). Experiential only.
 *
 * The server owns first-cold vs best; this component only drives the UI and
 * feeds each MEASURED take to POST /session/attempt.
 */
const LAW_IPA = 'ɔː';

export const IsolatedStep = ({
  sessionId, targets, wordAudio, frontViews, playClip, onPhonemeDone,
}) => {
  const [isoIdx, setIsoIdx] = useState(0);
  const [phase, setPhase] = useState('record');   // record|submitting|teach|unmeasured|done
  const [info, setInfo] = useState({});            // ipa -> {count,max_reached,teachable,primo_a_freddo,migliore}
  const [lastResult, setLastResult] = useState(null); // /score payload of the last measured take
  const [unmeasuredMsg, setUnmeasuredMsg] = useState('');
  const [takeKey, setTakeKey] = useState(0);       // remounts recorder on each retry
  const [submitError, setSubmitError] = useState('');
  const [heard, setHeard] = useState({});          // ipa -> user actually played the Prof RP model

  const current = targets[Math.min(isoIdx, targets.length - 1)];
  const curInfo = info[current.ipa] || { count: 0 };
  const isLast = isoIdx === targets.length - 1;
  const isLaw = current.ipa === LAW_IPA;
  const front = frontViews[current.ipa];

  // Play the Prof RP model AND record that the user actually listened — the
  // honest "prima→dopo" only appears if the model was truly heard.
  const playProf = (url) => { setHeard((h) => ({ ...h, [current.ipa]: true })); playClip(url); };

  const persistAttempt = async (data) => {
    setPhase('submitting');
    setSubmitError('');
    try {
      const resp = await fetch(`${BACKEND_URL}/api/level-test/session/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          phoneme_ipa: current.ipa,
          label: current.label,
          target_score: data.target_score,
          lexical_ok: data.lexical?.status !== 'wrong',
          lexical_status: data.lexical?.status || null,
          cefr: data.cefr || null,
          by_dialect: {
            RP: data.by_dialect?.RP?.composite_score ?? null,
            AmE: data.by_dialect?.AmE?.composite_score ?? null,
          },
        }),
      });
      const res = await resp.json();
      if (!resp.ok) {
        // A guarded/unmeasured take (should be rare — recorder gates 422 first).
        setUnmeasuredMsg('Non ho potuto registrare questo tentativo. Riprova.');
        setPhase('unmeasured');
        return;
      }
      // eslint-disable-next-line no-console
      console.log('[LT-DIAG] persistAttempt OK', {
        ipa: current.ipa, serverCount: res.count, teachable: res.teachable,
        maxReached: res.max_reached, score: res.migliore?.target_score,
      });
      setInfo((s) => ({ ...s, [current.ipa]: res }));
      setLastResult(data);
      // Teachable (wrong word OR below the tunable threshold) AND attempts left
      // → coach. Otherwise the phoneme is DONE (LAW then shows the bidialectal
      // moment; the others advance).
      if (res.teachable && !res.max_reached) {
        setPhase('teach');
      } else {
        setPhase('done');
        onPhonemeDone(current.ipa, res.migliore);
      }
    } catch (e) {
      setUnmeasuredMsg('Errore di rete durante il salvataggio del tentativo. Riprova.');
      setPhase('unmeasured');
    }
  };

  const handleError = (err) => {
    // 422 = unmeasurable (noise/mic/mistracking): NOT a wrong sound. Distinct
    // gentle UX, no attempt consumed, no teachable coaching.
    // eslint-disable-next-line no-console
    console.log('[LT-DIAG] 422/error — NOT counted', {
      ipa: current.ipa, status: err && err.status, reason: err?.detail?.reason,
      serverCountBefore: curInfo.count || 0, phase,
    });
    if (err && err.status === 422) {
      const msg = (err.detail && (err.detail.message || err.detail)) ||
        'Non ti ho sentito chiaramente. Avvicinati al microfono, riduci il rumore e riprova.';
      setUnmeasuredMsg(typeof msg === 'string' ? msg : 'Non ti ho sentito chiaramente. Riprova.');
    } else if (err && err.status === 'too_short') {
      setUnmeasuredMsg('Tieni il suono fermo 1-2 secondi: la presa era troppo breve per misurarla.');
    } else if (err && err.status === 'mic_denied') {
      setUnmeasuredMsg('Consenti l\u2019accesso al microfono per continuare, poi riprova.');
    } else {
      setUnmeasuredMsg('Non riusciamo ad accedere al microfono o alla registrazione. Riprova.');
    }
    setPhase('unmeasured');
  };

  const retry = () => { setTakeKey((k) => k + 1); setPhase('record'); };

  const advance = () => {
    if (isLast) return;
    // eslint-disable-next-line no-console
    console.log('[LT-DIAG] advance', { from: current.ipa, fromCount: curInfo.count, toIdx: isoIdx + 1 });
    setIsoIdx((i) => i + 1);
    setPhase('record');
    setLastResult(null);
    setTakeKey((k) => k + 1);
  };

  return (
    <div className="mt-8">
      {/* progress dots */}
      <div className="flex items-center justify-center gap-3 mb-8" data-testid="lt-isolated-progress">
        {targets.map((t, i) => {
          const done = !!(info[t.ipa] && (info[t.ipa].max_reached || (i < isoIdx)));
          const scored = !!info[t.ipa]?.migliore;
          const isCur = i === isoIdx;
          return (
            <div key={t.ipa} className="flex flex-col items-center gap-1">
              <span className={`font-mono text-lg transition-colors ${i < isoIdx || (isCur && phase === 'done') ? 'text-emerald-400' : isCur ? 'text-orange-400' : scored ? 'text-emerald-400' : 'text-slate-600'}`}>/{t.ipa}/</span>
              <span className={`w-8 h-1 rounded-full transition-colors ${i < isoIdx || (isCur && phase === 'done') ? 'bg-emerald-400' : isCur ? 'bg-orange-400' : 'bg-slate-700'}`} />
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* ============ RECORD / SUBMITTING ============ */}
      {(phase === 'record' || phase === 'submitting') && (
        <>
          <div className="max-w-md mx-auto mb-6 rounded-2xl border border-orange-500/25 bg-slate-900/50 px-6 py-5" data-testid="lt-isolated-prompt">
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70 font-bold mb-2">Pronuncia la parola</p>
            <div className="text-4xl sm:text-5xl font-black text-white leading-none">{current.word}</div>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <span className="text-orange-400 font-mono text-xl drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">/{current.ipa}/</span>
              <span className="text-slate-400">{current.hint}</span>
            </div>
            {curInfo.count > 0 && (
              <p className="mt-3 text-[11px] uppercase tracking-widest font-bold text-cyan-300/60" data-testid="lt-attempt-counter">
                Tentativo {Math.min(curInfo.count + 1, 3)} di 3
              </p>
            )}
            {curInfo.count === 0 && (
              <p className="mt-3 text-[11px] text-slate-500 italic" data-testid="lt-cold-note">
                Prova prima a orecchio — l'ascolto del Prof. arriva dopo.
              </p>
            )}
          </div>
          {phase === 'submitting' ? (
            <div className="text-center text-sm text-cyan-300 uppercase tracking-widest font-bold py-6" data-testid="lt-isolated-submitting">
              Registro il tentativo…
            </div>
          ) : (
            <MockRecorder
              key={`${current.ipa}-${takeKey}`}
              label={`Pronuncia ${current.label}`}
              target={`/${current.ipa}/`}
              phonemeIpa={current.ipa}
              expected={current.word}
              kind="word"
              dialect="RP"
              sessionId={sessionId}
              hideOutcome
              testid="lt-isolated-recorder"
              onDone={persistAttempt}
              onError={handleError}
            />
          )}
        </>
      )}

      {/* ============ ERRORE-CHE-INSEGNA (teachable) ============ */}
      {phase === 'teach' && (
        <div className="max-w-md mx-auto rounded-2xl border border-orange-400/45 bg-gradient-to-br from-orange-500/10 to-slate-900/70 p-6 text-left lt-step" data-testid="lt-teach-moment">
          <div className="flex items-center gap-2 text-orange-300 mb-3">
            <GraduationCap size={20} />
            <span className="text-sm font-black uppercase tracking-wider">
              {lastResult?.rhoticity?.detected
                ? 'R americana — nel britannico non c\u2019\u00e8'
                : lastResult?.lexical?.status === 'wrong' ? 'Parola diversa — correggiamo' : 'Suono da correggere'}
            </span>
          </div>

          {/* Prof frontal view (single source: assets.frontView) OR fallback (c) */}
          {front ? (
            <img
              src={front.startsWith('http') ? front : `${BACKEND_URL}${front}`}
              alt={`Vista frontale del Prof. per /${current.ipa}/`}
              className="w-full max-h-72 object-contain rounded-xl border border-cyan-500/25 bg-slate-950/60 mb-4"
              data-testid="lt-teach-frontview-img"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-slate-950/60 py-8 mb-4" data-testid="lt-teach-fallback">
              <div className="w-20 h-20 rounded-full border-2 border-orange-400/50 bg-orange-500/10 flex items-center justify-center">
                <span className="font-mono text-3xl text-orange-300">/{current.ipa}/</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300/60">Posizione articolatoria</span>
            </div>
          )}

          <p className="text-sm text-slate-200 leading-relaxed mb-4" data-testid="lt-teach-instruction">
            {lastResult?.rhoticity?.detected ? lastResult.rhoticity.message : current.teach}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {wordAudio[current.ipa]?.RP && (
              <button
                type="button"
                onClick={() => playProf(wordAudio[current.ipa].RP)}
                data-testid="lt-teach-listen-rp"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25 hover:text-white font-bold text-sm uppercase tracking-wider transition-all"
              >
                <Volume2 size={16} /> Ascolta il Prof. 🇬🇧
              </button>
            )}
            <button
              type="button"
              onClick={retry}
              data-testid="lt-teach-retry"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] shadow-[0_0_24px_rgba(251,146,60,0.45)]"
            >
              <RotateCcw size={16} /> Riprova
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 text-center">Ti restano {Math.max(0, 3 - (curInfo.count || 0))} tentativi su questo suono.</p>
        </div>
      )}

      {/* ============ NON MISURATO (422) — distinct from teachable ============ */}
      {phase === 'unmeasured' && (
        <div className="max-w-md mx-auto rounded-2xl border border-slate-600/50 bg-slate-900/70 p-6 text-center lt-step" data-testid="lt-unmeasured">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mb-4">
            <MicOff className="text-slate-300" size={26} />
          </div>
          <p className="text-sm font-bold text-slate-100 mb-1">Non ti ho sentito chiaramente</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3" data-testid="lt-unmeasured-msg">{unmeasuredMsg}</p>
          <p className="text-[11px] text-emerald-400/80 font-semibold mb-2">Questa presa non conta come tentativo.</p>
          {(curInfo.count || 0) > 0 && (
            <p className="text-[11px] text-slate-400 mb-5" data-testid="lt-valid-attempts">
              Tentativi validi già registrati: <span className="text-cyan-300 font-bold">{curInfo.count}/3</span>
            </p>
          )}
          <button
            type="button"
            onClick={retry}
            data-testid="lt-unmeasured-retry"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-100 font-bold text-sm uppercase tracking-wider transition-all"
          >
            <RotateCcw size={16} /> Riprova
          </button>
        </div>
      )}

      {/* ============ DONE (+ bidialectal LAW moment) ============ */}
      {phase === 'done' && (
        <div className="lt-step">
          <div className="max-w-md mx-auto rounded-2xl border border-cyan-500/25 bg-slate-900/60 p-6 text-center" data-testid="lt-isolated-done">
            {curInfo.migliore?.lexical_status === 'wrong' ? (
              <div className="inline-flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider mb-2"><GraduationCap size={18} /> Continuiamo ad allenarlo</div>
            ) : (
              <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2"><Check size={18} /> {current.label} acquisito</div>
            )}
            <div className="text-sm text-slate-300">
              Miglior punteggio <span className="text-orange-400 font-bold text-lg">{Math.round(curInfo.migliore?.target_score ?? 0)}/100</span>
              {curInfo.migliore?.cefr?.band && <span className="text-cyan-300 font-bold ml-2">{curInfo.migliore.cefr.band}</span>}
            </div>
          </div>

          {/* Bidialectal LAW moment — ALWAYS after LAW, never score-gated.
              Predisposed as a CONVERSATIONAL Prof. moment (message → reveal →
              listen). Copy below is PLACEHOLDER — final copy provided later. */}
          {isLaw && (
            <div className="max-w-md mx-auto mt-5 rounded-2xl border border-cyan-500/25 bg-slate-900/50 p-5 text-left" data-testid="lt-law-bidialect">
              <div className="flex items-center gap-2 text-cyan-200 mb-2">
                <Waves size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Il Prof. ti fa notare una cosa · LAW</span>
              </div>
              {/* Conversational message (PLACEHOLDER copy) */}
              <p className="text-sm text-slate-200 leading-relaxed mb-4" data-testid="lt-law-message">
                «Questo suono vive in due mondi. Nell'inglese britannico /ɔː/ è lungo e arrotondato;
                l'americano lo apre di più. Ascoltali di fila e senti come cambia — non c'è giusto o
                sbagliato, c'è il mondo in cui vuoi suonare a casa.» <span className="text-slate-500 italic">(copy provvisorio)</span>
              </p>

              {/* HONEST prima→dopo: only if >1 attempt AND the model was truly
                  heard AND the scores actually differ. Otherwise: reveal only. */}
              {(() => {
                const p = curInfo.primo_a_freddo, m = curInfo.migliore;
                const improved = (curInfo.count || 0) > 1 && heard[current.ipa]
                  && p && m && Math.round(p.target_score ?? 0) !== Math.round(m.target_score ?? 0);
                if (!improved) return null;
                return (
                  <div className="flex items-center justify-center gap-4 mb-4 rounded-xl bg-slate-950/50 border border-orange-400/25 py-3" data-testid="lt-law-prima-dopo">
                    <div className="text-center" data-testid="lt-law-prima">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Prima (a freddo)</div>
                      <div className="text-2xl font-black text-slate-300">{Math.round(p.target_score ?? 0)}</div>
                    </div>
                    <ArrowRight className="text-orange-400" size={20} />
                    <div className="text-center" data-testid="lt-law-dopo">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-orange-400/80">Dopo aver ascoltato</div>
                      <div className="text-2xl font-black text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">{Math.round(m.target_score ?? 0)}</div>
                    </div>
                  </div>
                );
              })()}

              {(wordAudio[current.ipa]?.RP || wordAudio[current.ipa]?.AmE) && (
                <div className="flex gap-3">
                  {wordAudio[current.ipa]?.RP && (
                    <button type="button" onClick={() => playProf(wordAudio[current.ipa].RP)} data-testid="lt-law-rp"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25 hover:text-white font-bold text-sm transition-all">
                      <Volume2 size={16} /> 🇬🇧 Britannico
                    </button>
                  )}
                  {wordAudio[current.ipa]?.AmE && (
                    <button type="button" onClick={() => playClip(wordAudio[current.ipa].AmE)} data-testid="lt-law-us"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-orange-500/15 border border-orange-400/40 text-orange-200 hover:bg-orange-500/25 hover:text-white font-bold text-sm transition-all">
                      <Volume2 size={16} /> 🇺🇸 Americano
                    </button>
                  )}
                </div>
              )}
              <p className="mt-3 text-[10px] text-slate-500">L'americano lo senti solo per confronto — non viene valutato.</p>
            </div>
          )}

          {!isLast ? (
            <button
              onClick={advance}
              data-testid="lt-isolated-next-phoneme"
              className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 shadow-[0_0_28px_rgba(251,146,60,0.5)]"
            >
              Prossimo suono <ArrowRight size={17} />
            </button>
          ) : (
            <p className="mt-6 text-xs uppercase tracking-widest font-bold text-emerald-400" data-testid="lt-isolated-complete">Tutti e 3 i suoni acquisiti ✓ — premi Avanti</p>
          )}
        </div>
      )}

      {submitError && <p className="mt-4 text-xs text-rose-400 text-center">{submitError}</p>}
    </div>
  );
};

export default IsolatedStep;
