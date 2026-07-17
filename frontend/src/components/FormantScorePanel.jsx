import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, FlaskConical, ChevronDown } from 'lucide-react';

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
  const { per_formant = [], composite_score, cefr, citation, reference_source, reference_group, high_impact, student_formants, diagnostics } = result;
  const f0 = student_formants?.F0;
  const groupLabel = { men: 'uomo', women: 'donna', children: 'bambino', male: 'uomo', female: 'donna' }[reference_group] || reference_group;
  const [showExpert, setShowExpert] = useState(false);

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

      {/* Speaker group + detected mean F0 (diagnostics) */}
      {reference_source === 'dataset' && (
        <p className="mb-5 text-[11px] text-slate-400" data-testid="formant-speaker-group">
          Confrontato con riferimento madrelingua <span className="font-bold text-cyan-200">{groupLabel}</span>
          {f0 ? <span className="text-slate-500"> · voce rilevata F0 medio ~{f0} Hz</span> : null}
        </p>
      )}

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

      {/* Expert Mode — diagnostics (hidden by default) */}
      {diagnostics && (
        <div className="mt-5 pt-4 border-t border-slate-800" data-testid="expert-mode-section">
          <button
            type="button"
            onClick={() => setShowExpert((v) => !v)}
            data-testid="expert-mode-toggle"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300/80 hover:text-fuchsia-200 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" /> Expert Mode
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExpert ? 'rotate-180' : ''}`} />
          </button>

          {showExpert && (
            <div className="mt-3 rounded-xl border border-fuchsia-500/20 bg-slate-950/70 p-4 space-y-3 font-mono text-[11px] text-slate-300" data-testid="expert-mode-panel">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span className="text-slate-500">Max n° formanti (LPC)</span>
                <span data-testid="expert-max-formants">{diagnostics.max_num_formants}</span>
                <span className="text-slate-500">Ceiling testati (Hz)</span>
                <span data-testid="expert-ceiling-range">{(diagnostics.ceiling_range_tested_hz || []).join(' → ')}</span>
                <span className="text-slate-500">Ceiling selezionato (Hz)</span>
                <span className="text-fuchsia-300 font-bold" data-testid="expert-ceiling-selected">{diagnostics.ceiling_selected_hz}</span>
                <span className="text-slate-500">Finestra nucleo (ms)</span>
                <span data-testid="expert-nucleus-window">
                  {diagnostics.nucleus_window_ms?.start} – {diagnostics.nucleus_window_ms?.end}
                </span>
                <span className="text-slate-500">Misura affidabile</span>
                <span className={diagnostics.reliable ? 'text-emerald-300' : 'text-rose-300'} data-testid="expert-reliable">
                  {diagnostics.reliable ? 'sì' : 'no (fallback)'}
                </span>
              </div>

              {/* FIX A2 — per-formant nucleus SD vs threshold (always shown) */}
              {diagnostics.nucleus_sd_hz && Object.keys(diagnostics.nucleus_sd_hz).length > 0 && (
                <div data-testid="expert-nucleus-sd">
                  <p className="text-slate-500 mb-1">SD finestra-nucleo (Hz) · soglia stabilità:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-slate-600">
                        <tr><th className="pr-3">form.</th><th className="pr-3">SD</th><th className="pr-3">soglia</th><th>stato</th></tr>
                      </thead>
                      <tbody>
                        {['F1', 'F2', 'F3'].filter((k) => diagnostics.nucleus_sd_hz[k] != null).map((k) => {
                          const sd = diagnostics.nucleus_sd_hz[k];
                          const thr = (diagnostics.nucleus_sd_thresholds_hz || {})[k];
                          const ok = thr == null || sd <= thr;
                          return (
                            <tr key={k} className={ok ? '' : 'text-rose-300'} data-testid={`expert-nucleus-sd-${k}`}>
                              <td className="pr-3 font-bold">{k}</td>
                              <td className="pr-3">{sd}</td>
                              <td className="pr-3 text-slate-500">≤ {thr}</td>
                              <td>{ok ? '✓ stabile' : '✕ instabile'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PROBLEMA B — per-formant plausibility range (ref ± 3·SD) */}
              {diagnostics.plausibility_range_hz && Object.keys(diagnostics.plausibility_range_hz).length > 0 && (
                <div data-testid="expert-plausibility-range">
                  <p className="text-slate-500 mb-1">Range plausibilità (|misura − rif| ≤ 3·SD):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-slate-600">
                        <tr><th className="pr-3">form.</th><th className="pr-3">rif.</th><th className="pr-3">SD</th><th className="pr-3">range (Hz)</th><th>fonte SD</th></tr>
                      </thead>
                      <tbody>
                        {['F1', 'F2', 'F3'].filter((k) => diagnostics.plausibility_range_hz[k]).map((k) => {
                          const r = diagnostics.plausibility_range_hz[k];
                          return (
                            <tr key={k} data-testid={`expert-plausibility-${k}`}>
                              <td className="pr-3 font-bold">{k}</td>
                              <td className="pr-3">{r.ref}</td>
                              <td className="pr-3">{r.sd_used}</td>
                              <td className="pr-3">{r.min} – {r.max}</td>
                              <td className="text-slate-500">{r.sd_source}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Retry attempts per ceiling */}
              {Array.isArray(diagnostics.attempts) && diagnostics.attempts.length > 0 && (
                <div data-testid="expert-attempts">
                  <p className="text-slate-500 mb-1">Tentativi per ceiling:</p>
                  {diagnostics.attempts.map((a, i) => (
                    <div key={i} className="pl-2 text-slate-400">
                      {a.ceiling_hz} Hz → {a.result === 'no_usable_window'
                        ? 'nessuna finestra utile'
                        : `F1=${a.F1} F2=${a.F2} F3=${a.F3} · ${a.plausible ? 'plausibile' : 'IMPLAUSIBILE'}`}
                    </div>
                  ))}
                </div>
              )}

              {/* Candidate windows before final selection */}
              {Array.isArray(diagnostics.candidate_formants) && diagnostics.candidate_formants.length > 0 && (
                <div data-testid="expert-candidates">
                  <p className="text-slate-500 mb-1">Finestre candidate (pre-selezione):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-slate-600">
                        <tr><th className="pr-3">ms</th><th className="pr-3">F1</th><th className="pr-3">F2</th><th className="pr-3">F3</th><th className="pr-3">SD</th><th>plaus.</th></tr>
                      </thead>
                      <tbody>
                        {diagnostics.candidate_formants.map((c, i) => (
                          <tr key={i} className={i === 0 ? 'text-fuchsia-300' : ''}>
                            <td className="pr-3">{c.start_ms}–{c.end_ms}</td>
                            <td className="pr-3">{c.F1}</td>
                            <td className="pr-3">{c.F2}</td>
                            <td className="pr-3">{c.F3}</td>
                            <td className="pr-3">{c.sd_f1f2}</td>
                            <td>{c.plausible ? '✓' : '✕'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Citation */}
      <div className="mt-5 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed" data-testid="formant-citation">
        <p>
          Valori di riferimento: {reference_source === 'dataset'
            ? `${citation}${reference_group ? ` · gruppo: ${reference_group}` : ''}`
            : citation}
        </p>
        <p className="mt-1" data-testid="formant-dispersion-note">
          {result.dispersion_source === 'published'
            ? 'Dispersione (SD): Hillenbrand et al. (1995), per fonema e gruppo.'
            : result.dispersion_source === 'teacher'
              ? 'Riferimento: campione del Prof. Dapper (Fase 1) — sanity check, non dato accademico.'
              : 'Dispersione (SD): stima interna Vocal Fitness (pooled ~F1 12% · F2 10% · F3 8%), non le SD pubblicate.'}
        </p>
        <p className="mt-1">
          Fasce ispirate ai descrittori CEFR "Sound Articulation" (Consiglio d'Europa · CEFR Companion Volume, Piccardo 2016).
          Metodologia Vocal Fitness — non è una certificazione CEFR ufficiale.
        </p>
      </div>
    </div>
  );
};

export default FormantScorePanel;
