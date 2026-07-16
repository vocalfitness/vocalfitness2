import React from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

const bandColor = (band) => {
  if (band?.startsWith('C')) return 'text-emerald-300 border-emerald-400/50 bg-emerald-500/10';
  if (band === 'B2') return 'text-cyan-300 border-cyan-400/50 bg-cyan-500/10';
  if (band === 'B1') return 'text-sky-300 border-sky-400/50 bg-sky-500/10';
  if (band === 'A2') return 'text-amber-300 border-amber-400/50 bg-amber-500/10';
  return 'text-rose-300 border-rose-400/50 bg-rose-500/10';
};

const scoreBar = (score) => {
  const color = score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-cyan-400' : score >= 30 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.max(3, score)}%` }} />
    </div>
  );
};

export const FormantScorePanel = ({ result }) => {
  if (!result) return null;
  const { per_formant = [], composite_score, cefr, citation, reference_source, reference_group, high_impact } = result;

  return (
    <div className="mt-6 rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-5 md:p-6" data-testid="formant-score-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-300" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-bold">
            Scoring formanti · Metodologia Vocal Fitness
          </p>
        </div>
        {high_impact && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-400/40 rounded-full px-2.5 py-1" data-testid="formant-high-impact">
            Fonema ad alto impatto sull'intelligibilità
          </span>
        )}
      </div>

      {/* Composite + CEFR */}
      <div className="flex flex-wrap items-center gap-5 mb-6">
        <div className="text-center" data-testid="formant-composite">
          <p className="text-5xl font-black text-white leading-none">{Math.round(composite_score)}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">punteggio /100</p>
        </div>
        <div className={`rounded-2xl border px-5 py-3 ${bandColor(cefr?.band)}`} data-testid="formant-cefr">
          <p className="text-2xl font-black leading-none">{cefr?.band}</p>
          <p className="text-xs mt-1 opacity-90">{cefr?.label}</p>
        </div>
      </div>

      {/* Per-formant */}
      <div className="space-y-4">
        {per_formant.map((f) => (
          <div key={f.name} data-testid={`formant-row-${f.name}`}>
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="font-bold text-cyan-100">
                {f.name}
                <span className="text-[11px] text-slate-500 ml-2 font-normal">
                  tu {f.measured} Hz · rif. {f.reference} Hz
                </span>
              </span>
              <span className={`font-mono text-xs font-bold ${f.score >= 60 ? 'text-emerald-300' : f.score >= 30 ? 'text-amber-300' : 'text-rose-300'}`}>
                {Math.round(f.score)}
              </span>
            </div>
            {scoreBar(f.score)}
            <p className={`mt-1.5 text-[11px] flex items-center gap-1.5 ${f.hint?.includes('✓') ? 'text-emerald-300/80' : 'text-slate-400'}`}>
              {f.hint?.includes('✓') ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3 text-amber-400/70" />}
              {f.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Citation */}
      <p className="mt-5 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed" data-testid="formant-citation">
        Valori di riferimento: {reference_source === 'dataset'
          ? `${citation}${reference_group ? ` · gruppo: ${reference_group}` : ''}`
          : citation}
        <br />
        Fasce ispirate ai descrittori CEFR "Sound Articulation" (Consiglio d'Europa · CEFR Companion Volume, Piccardo 2016).
        Metodologia Vocal Fitness — non è una certificazione CEFR ufficiale.
      </p>
    </div>
  );
};

export default FormantScorePanel;
