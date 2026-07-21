import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Check, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { blobToWav } from '../../lib/blobToWav';
import { BACKEND_URL } from '../../lib/backend';

/**
 * PhonemeRecorder (V2) — record → WAV → /api/level-test/score.
 * Real MediaRecorder (browser DSP OFF for formant accuracy) → transient
 * server analysis (formants + Whisper ASR, audio NOT persisted).
 * kind="word": returns composite + lexical (correct/wrong) + target_score.
 * kind="phrase": returns phrase_score (lexical accuracy only).
 * 422 (mistracking OR ASR-uncertain) → onError → invalidate + retry.
 */
export const MockRecorder = ({ label, target, phonemeIpa, expected, kind = 'word', dialect = '', testid, onDone, onError, hideOutcome = false }) => {
  const [phase, setPhase] = useState('idle'); // idle | recording | analysing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const autoStopRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(autoStopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  const stopStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  const start = async () => {
    setErrorMsg(''); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => analyse();
      mr.start();
      setPhase('recording');
      autoStopRef.current = setTimeout(() => stop(), kind === 'phrase' ? 9000 : 6000);
    } catch (err) {
      setErrorMsg('Non riusciamo ad accedere al microfono. Consenti l\u2019accesso e riprova.');
      setPhase('error');
    }
  };

  const stop = () => {
    clearTimeout(autoStopRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
  };

  const analyse = async () => {
    setPhase('analysing');
    try {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
      const wav = await blobToWav(blob);
      const fd = new FormData();
      fd.append('file', wav, 'take.wav');
      fd.append('phoneme_ipa', phonemeIpa || '');
      fd.append('expected', expected || '');
      fd.append('kind', kind);
      fd.append('dialect', dialect || '');
      const resp = await fetch(`${BACKEND_URL}/api/level-test/score`, { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = (data && data.detail && (data.detail.message || data.detail)) ||
          'Non siamo riusciti a misurare la registrazione. Riprova.';
        setErrorMsg(typeof msg === 'string' ? msg : 'Misura non affidabile. Riprova.');
        setPhase('error');
        onError && onError({ phonemeIpa, status: resp.status, detail: data && data.detail });
      } else {
        setResult(data);
        setPhase('done');
        onDone && onDone(data);
      }
    } catch (err) {
      setErrorMsg('Errore durante l\u2019analisi. Riprova.');
      setPhase('error');
      onError && onError({ phonemeIpa, status: 0 });
    } finally {
      stopStream();
    }
  };

  const reset = () => { setPhase('idle'); setResult(null); setErrorMsg(''); };
  const active = phase === 'recording' || phase === 'analysing';
  const wrongWord = result && result.lexical && result.lexical.status === 'wrong';

  return (
    <div className="w-full max-w-md mx-auto text-center" data-testid={testid}>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-cyan-500/25 mb-6">
        <span className="text-[10px] uppercase tracking-widest text-cyan-300/70 font-bold">{label}</span>
        {target && <span className="text-orange-400 font-mono text-lg drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">{target}</span>}
      </div>

      <div className="h-20 flex items-center justify-center gap-1 mb-6">
        {Array.from({ length: 28 }).map((_, i) => {
          const h = active ? 20 + Math.abs(Math.sin(i * 0.9)) * 70 : phase === 'done' ? 14 + Math.abs(Math.sin(i)) * 40 : 8;
          return (
            <span key={i} className={`w-1.5 rounded-full transition-all duration-300 ${active ? 'bg-orange-400' : phase === 'done' ? 'bg-cyan-400/70' : 'bg-slate-600/60'}`}
              style={{ height: `${h}%`, boxShadow: active ? '0 0 8px rgba(251,146,60,0.7)' : 'none', animation: active ? 'ltBar 0.6s ease-in-out infinite' : 'none', animationDelay: `${i * 0.04}s` }} />
          );
        })}
      </div>

      {phase === 'idle' && (
        <button type="button" onClick={start} data-testid={`${testid}-start`}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105 shadow-[0_0_28px_rgba(251,146,60,0.55)]">
          <Mic size={18} /> Registra
        </button>
      )}
      {phase === 'recording' && (
        <button type="button" onClick={stop} data-testid={`${testid}-stop`}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-red-600/90 hover:bg-red-600 text-white font-bold uppercase tracking-wider text-sm animate-pulse">
          <Square size={16} /> Ferma
        </button>
      )}
      {phase === 'analysing' && (
        <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-cyan-600/80 text-white font-bold uppercase tracking-wider text-sm">
          <Loader2 size={18} className="animate-spin" /> Analisi…
        </div>
      )}
      {phase === 'done' && result && (
        <div className="flex flex-col items-center gap-3" data-testid={`${testid}-result`}>
          {hideOutcome ? null : kind === 'phrase' ? (
            <>
              <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider"><Check size={18} /> Frase acquisita</div>
              <div className="text-xs text-slate-400">Bravo — hai sentito la tua voce. Questo passo è esperienziale.</div>
            </>
          ) : wrongWord ? (
            <>
              <div className="inline-flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider"><AlertTriangle size={18} /> Parola diversa</div>
              <div className="text-xs text-slate-400">Ho sentito <span className="text-amber-300 font-semibold">"{result.lexical.transcript}"</span> — atteso <span className="text-cyan-300 font-semibold">"{expected}"</span> → A1</div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider"><Check size={18} /> Acquisito</div>
              <div className="text-sm text-slate-300">Punteggio <span className="text-orange-400 font-bold text-lg">{result.target_score}/100</span> <span className="text-cyan-300 font-bold">{result.cefr?.band}</span></div>
            </>
          )}
          <button type="button" onClick={reset} data-testid={`${testid}-retry`}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-slate-400 hover:text-cyan-300 transition-colors">
            <RotateCcw size={13} /> Registra di nuovo
          </button>
        </div>
      )}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-3" data-testid={`${testid}-error`}>
          {hideOutcome ? null : (
            <>
              <div className="flex items-center gap-2 text-amber-400 text-sm max-w-xs"><AlertTriangle size={18} /> <span>{errorMsg}</span></div>
              <button type="button" onClick={reset} data-testid={`${testid}-retry`}
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-xs transition-all">
                <RotateCcw size={14} /> Riprova
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MockRecorder;
