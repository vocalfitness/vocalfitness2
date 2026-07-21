import React, { useState, useRef } from 'react';
import { Mic, Square, Check, Loader2 } from 'lucide-react';

/**
 * MockRecorder — M1 placeholder for the record → analyse → score loop.
 * NO real getUserMedia. Clicking "Registra" fakes a ~1.8s capture, shows a
 * fake waveform, then a mock score. M2 swaps the internals (MediaRecorder +
 * blobToWav + /analyze-formants) behind the same `onDone(score)` contract.
 */
export const MockRecorder = ({ label, target, testid, onDone }) => {
  const [phase, setPhase] = useState('idle'); // idle | recording | analysing | done
  const [score, setScore] = useState(null);
  const timers = useRef([]);

  const start = () => {
    setPhase('recording');
    timers.current.push(
      setTimeout(() => {
        setPhase('analysing');
        timers.current.push(
          setTimeout(() => {
            const s = 55 + Math.floor(Math.random() * 18); // mock 55-72
            setScore(s);
            setPhase('done');
            onDone && onDone(s);
          }, 900)
        );
      }, 1800)
    );
  };

  return (
    <div className="w-full max-w-md mx-auto text-center" data-testid={testid}>
      {/* Target chip */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-cyan-500/25 mb-6">
        <span className="text-[10px] uppercase tracking-widest text-cyan-300/70 font-bold">{label}</span>
        <span className="text-orange-400 font-mono text-lg drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">{target}</span>
      </div>

      {/* Waveform strip */}
      <div className="h-20 flex items-center justify-center gap-1 mb-6">
        {Array.from({ length: 28 }).map((_, i) => {
          const active = phase === 'recording' || phase === 'analysing';
          const h = active ? 20 + Math.abs(Math.sin(i * 0.9)) * 70 : phase === 'done' ? 14 + Math.abs(Math.sin(i)) * 40 : 8;
          return (
            <span
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                active ? 'bg-orange-400' : phase === 'done' ? 'bg-cyan-400/70' : 'bg-slate-600/60'
              }`}
              style={{
                height: `${h}%`,
                boxShadow: active ? '0 0 8px rgba(251,146,60,0.7)' : 'none',
                animation: active ? `ltBar 0.6s ease-in-out infinite` : 'none',
                animationDelay: `${i * 0.04}s`,
              }}
            />
          );
        })}
      </div>

      {/* Control */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          data-testid={`${testid}-start`}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105 shadow-[0_0_28px_rgba(251,146,60,0.55)]"
        >
          <Mic size={18} /> Registra
        </button>
      )}
      {phase === 'recording' && (
        <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-red-600/90 text-white font-bold uppercase tracking-wider text-sm">
          <Square size={16} className="animate-pulse" /> Registrazione…
        </div>
      )}
      {phase === 'analysing' && (
        <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-cyan-600/80 text-white font-bold uppercase tracking-wider text-sm">
          <Loader2 size={18} className="animate-spin" /> Analisi…
        </div>
      )}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
            <Check size={18} /> Acquisito
          </div>
          <div className="text-xs text-slate-400">
            Punteggio suono <span className="text-orange-400 font-bold">{score}/100</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest text-slate-500">(demo)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockRecorder;
