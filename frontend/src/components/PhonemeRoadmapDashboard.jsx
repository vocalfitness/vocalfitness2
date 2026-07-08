import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Circle, ArrowRight, Sparkles, Filter, Target,
  MapPin, Type, Volume2, PlaySquare, FileCheck, Layers, Wand2, Loader2, X,
} from 'lucide-react';
import { Button } from './ui/button';
import { PHONEME_CATALOGUE } from '../data/phonemeCatalogue';

/**
 * PhonemeRoadmapDashboard
 * ────────────────────────
 * Cross-references the 44 canonical English phonemes (from PHONEME_CATALOGUE)
 * with the phoneme cards already in the DB (fetched by the parent page) to
 * produce a "what's left to build" dashboard.
 *
 * For each canonical entry we compute a completeness checklist:
 *   1. exists in DB
 *   2. has ≥5 hotspots
 *   3. has ≥20 common words
 *   4. has audio (isolated + examples for at least one dialect)
 *   5. has a video lesson
 *   6. is published
 *
 * A pedagogical priority (P0 / P1 / P2) is assigned by subgroup, tuned for
 * Italian learners of business English (short-monophthongs and fricatives get
 * P0 because they're both very frequent and phonetically distant from Italian).
 *
 * Props
 *   existingCards — array returned by GET /api/admin/phonemes
 *                   Each element is a PhonemeCardSummary (id, published, hasAudio,
 *                   hasVideoLesson, hotspotCount, commonWordCount, examples…)
 */

// ─────────────────────────────────────────────────────────────
// Priority scoring (pedagogical — Italian → English business)
// ─────────────────────────────────────────────────────────────
const PRIORITY_BY_SUBGROUP = {
  // P0 — critical for Italian speakers + high frequency
  'short-monophthong': 0,
  'fricative':         0,
  // P1 — high value
  'long-monophthong':  1,
  'plosive':           1,
  'affricate':         1,
  // P2 — polish & completeness
  'closing-diphthong': 2,
  'closing-fronting':  2,
  'centring':          2,
  'approximant':       2,
  'nasal':             2,
};

const PRIORITY_LABEL = {
  0: { label: 'ALTA',  cls: 'bg-red-500/15    border-red-500/40    text-red-300'    },
  1: { label: 'MEDIA', cls: 'bg-amber-500/15  border-amber-500/40  text-amber-300'  },
  2: { label: 'BASSA', cls: 'bg-slate-500/15  border-slate-500/40  text-slate-300'  },
};

const CATEGORY_LABEL = {
  vowel:      'Vocali',
  diphthong:  'Dittonghi',
  consonant:  'Consonanti',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function computeChecks(existing) {
  if (!existing) {
    return {
      exists: false, hotspots: false, words: false, audio: false, video: false, published: false,
      completeness: 0,
    };
  }
  const checks = {
    exists:    true,
    hotspots:  (existing.hotspotCount || 0) >= 5,
    words:     (existing.commonWordCount || 0) >= 20,
    audio:     !!existing.hasAudio,
    video:     !!existing.hasVideoLesson,
    published: !!existing.published,
  };
  const total = Object.values(checks).filter(Boolean).length;
  return { ...checks, completeness: Math.round((total / 6) * 100) };
}

function priorityOf(entry) {
  const key = entry.subgroup in PRIORITY_BY_SUBGROUP ? entry.subgroup : null;
  return key !== null ? PRIORITY_BY_SUBGROUP[key] : 2;
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function PhonemeRoadmapDashboard({ existingCards = [], onRefresh }) {
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all'); // all | pending | done

  // ─── Bulk seed state ─────────────────────────────────
  const [seedRunning, setSeedRunning] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ done: 0, total: 0, current: '' });
  const [seedErrors, setSeedErrors] = useState([]);
  const [seedResult, setSeedResult] = useState('');

  const existingById = useMemo(() => {
    const map = new Map();
    (existingCards || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [existingCards]);

  const enriched = useMemo(() => {
    return (PHONEME_CATALOGUE || []).map((entry) => {
      const existing = existingById.get(entry.id) || null;
      const checks = computeChecks(existing);
      const priority = priorityOf(entry);
      return { entry, existing, checks, priority };
    });
  }, [existingById]);

  const totals = useMemo(() => {
    const t = { total: enriched.length, exists: 0, published: 0, complete: 0 };
    enriched.forEach(({ checks }) => {
      if (checks.exists) t.exists++;
      if (checks.published) t.published++;
      if (checks.completeness === 100) t.complete++;
    });
    return t;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(({ entry, checks, priority }) => {
      if (priorityFilter !== 'all' && String(priority) !== priorityFilter) return false;
      if (categoryFilter !== 'all' && entry.group !== categoryFilter) return false;
      if (progressFilter === 'pending' && checks.completeness === 100) return false;
      if (progressFilter === 'done' && checks.completeness !== 100) return false;
      return true;
    })
    // Sort: priority ASC → completeness DESC → subtitle
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.checks.completeness !== b.checks.completeness) return b.checks.completeness - a.checks.completeness;
      return (a.entry.subtitle || '').localeCompare(b.entry.subtitle || '');
    });
  }, [enriched, priorityFilter, categoryFilter, progressFilter]);

  const percentComplete = Math.round((totals.complete / Math.max(totals.total, 1)) * 100);
  const percentExists   = Math.round((totals.exists   / Math.max(totals.total, 1)) * 100);

  // Missing entries — never in DB. This is the fuel for the bulk seed button.
  const missingEntries = useMemo(
    () => enriched.filter(({ checks }) => !checks.exists),
    [enriched],
  );

  // ─── Bulk regenerate: reruns §3.1/§3.2/§3.4 + lexicon on every card ───
  const [derivedRunning, setDerivedRunning] = useState(false);
  const [derivedResult, setDerivedResult]   = useState('');
  const runBulkRegenDerived = async () => {
    const ok = window.confirm(
      'Rigenera automaticamente per TUTTE le card in bozza:\n' +
      '  • §3.1 Muscoli facciali (mai autoriali)\n' +
      '  • §3.2 Overlay anatomico (etichette + airflow + voicing)\n' +
      '  • §3.4 Hotspot articolatori (bilingue IT/EN)\n' +
      '  • §3.2/§3.3 Common Words (top 30 da CMUdict + Zipf) + Spelling distribution\n\n' +
      'Le card protette con hotspots_locked=true o lexicon_locked=true (u-foot, i-fleece) NON verranno toccate.\n' +
      'Gli URL audio ElevenLabs esistenti vengono preservati per le parole che sopravvivono al refresh.\n\n' +
      'Procedere?'
    );
    if (!ok) return;
    setDerivedRunning(true);
    setDerivedResult('');
    try {
      const token = localStorage.getItem('vf_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/admin/phonemes/batch/regenerate-derived`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore server');
      setDerivedResult(
        `Rigenerate ${data.processed} card · ${data.errors?.length || 0} errori.` +
        (data.errors?.length ? ` Errori: ${data.errors.slice(0, 5).join(', ')}` : '')
      );
      if (typeof onRefresh === 'function') await onRefresh();
    } catch (e) {
      setDerivedResult(`Errore: ${e.message}`);
    } finally {
      setDerivedRunning(false);
      setTimeout(() => setDerivedResult(''), 8000);
    }
  };

  // ─── Bulk mnemonic rewrite (§3.6): annotates every phrase with
  // [word|/ipa/] bracket tokens sourced from CMUdict. Deterministic.
  const [mnemRunning, setMnemRunning] = useState(false);
  const [mnemResult,  setMnemResult]  = useState(null);
  const runBulkMnemonicRewrite = async (overwrite = false) => {
    const ok = window.confirm(
      overwrite
        ? 'RE-annota da zero le mnemoniche: rimuove le annotazioni [w|/ipa/] esistenti e le rigenera con CMUdict.\n\nSicuro?'
        : 'Annota tutte le mnemoniche con la sintassi [word|/ipa/] usando CMUdict.\n\n' +
          '  • Solo le parole che contengono realmente il fonema target vengono annotate.\n' +
          '  • Le trascrizioni IPA arrivano da CMUdict (mai LLM).\n' +
          '  • Le card con mnemonic_locked=true vengono saltate.\n' +
          '  • Le mnemoniche già annotate vengono preservate (idempotente).\n' +
          '  • L\'audio della mnemonica viene azzerato: rilancia poi il batch audio.\n\n' +
          'Procedere?'
    );
    if (!ok) return;
    setMnemRunning(true);
    setMnemResult(null);
    try {
      const token = localStorage.getItem('vf_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/admin/phonemes/batch/rewrite-mnemonics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ overwrite_existing_brackets: !!overwrite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore server');
      setMnemResult({ ok: true, ...data });
      if (typeof onRefresh === 'function') await onRefresh();
    } catch (e) {
      setMnemResult({ ok: false, error: e.message });
    } finally {
      setMnemRunning(false);
    }
  };

  // ─── Bulk audio: mass ElevenLabs generation across ALL cards ───
  // Iterates card-by-card (backend keeps each request short ~30s), streams
  // progress into the UI, collects all per-clip errors and shows them at
  // the end (option E=c: "continue always, show errors at end").
  const [audioRunning,   setAudioRunning]   = useState(false);
  const [audioProgress,  setAudioProgress]  = useState({ done: 0, total: 0, current: '' });
  const [audioResult,    setAudioResult]    = useState(null);
  const runBulkAudio = async () => {
    const cardsToProcess = (existingCards || []).filter((c) => !!c.id);
    if (!cardsToProcess.length) return;
    const ok = window.confirm(
      `Genera audio ElevenLabs per ${cardsToProcess.length} card:\n\n` +
      '  • Fonema isolato × AmE + RP\n' +
      '  • Frasi di esempio × AmE + RP\n' +
      '  • Frase mnemonica\n' +
      '  • Top 10 parole comuni × AmE + RP\n\n' +
      'Clip già generate (URL popolato) verranno saltate — puoi rilanciare quante volte vuoi.\n' +
      'Errori sui singoli clip NON interrompono il run: vedrai la lista completa alla fine.\n\n' +
      'Procedere?'
    );
    if (!ok) return;

    setAudioRunning(true);
    setAudioProgress({ done: 0, total: cardsToProcess.length, current: '' });
    setAudioResult(null);

    const allErrors = [];
    let totalGenerated = 0;
    let totalSkipped   = 0;
    const token = localStorage.getItem('vf_token');
    const API = process.env.REACT_APP_BACKEND_URL;

    for (let i = 0; i < cardsToProcess.length; i++) {
      const card = cardsToProcess[i];
      setAudioProgress({
        done: i,
        total: cardsToProcess.length,
        current: card.subtitle || card.id,
      });
      try {
        const res = await fetch(
          `${API}/api/admin/phonemes/${encodeURIComponent(card.id)}/batch-audio`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ words_limit: 30, include_words_rp: true }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          allErrors.push({ card: card.id, key: '(request)', error: data.detail || `HTTP ${res.status}` });
          continue;
        }
        totalGenerated += (data.generated || []).length;
        totalSkipped   += (data.skipped   || []).length;
        (data.errors || []).forEach((e) => allErrors.push({ card: card.id, ...e }));
      } catch (e) {
        allErrors.push({ card: card.id, key: '(network)', error: e.message });
      }
    }
    setAudioProgress({ done: cardsToProcess.length, total: cardsToProcess.length, current: '' });
    setAudioResult({
      processed: cardsToProcess.length,
      generated: totalGenerated,
      skipped:   totalSkipped,
      errors:    allErrors,
    });
    setAudioRunning(false);
    if (typeof onRefresh === 'function') await onRefresh();
  };



  // ─── Bulk seed: create empty skeletons in DB from catalogue entries ───
  const runBulkSeed = async () => {
    if (!missingEntries.length) return;
    if (!window.confirm(
      `Verranno create ${missingEntries.length} schede scheletro in stato BOZZA ` +
      `(id, IPA, categoria, esempi pre-compilati dal catalogo).\n\n` +
      `Non verranno pubblicate finché non le rifinirai. Procedere?`
    )) return;

    setSeedRunning(true);
    setSeedErrors([]);
    setSeedResult('');
    setSeedProgress({ done: 0, total: missingEntries.length, current: '' });

    const errs = [];
    const API = process.env.REACT_APP_BACKEND_URL;
    const headers = {
      Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}`,
      'Content-Type': 'application/json',
    };

    for (let i = 0; i < missingEntries.length; i++) {
      const { entry } = missingEntries[i];
      setSeedProgress({ done: i, total: missingEntries.length, current: entry.subtitle || entry.id });

      const payload = {
        id: entry.id,
        ipa: entry.ipa,
        displayIpa: `/${entry.ipa}/`,
        category: entry.group,
        subcategory: entry.subgroup || '',
        examples: (entry.words || []).map((w) => w.toUpperCase()),
        dialects: entry.dialectScope === 'GA-only' ? ['AmE']
                : entry.dialectScope === 'RP-only' ? ['RP']
                : ['AmE', 'RP'],
        dialectNote: entry.description || '',
        commonWords: (entry.words || []).map((w) => ({ w, ipa: '', audio: '' })),
        published: false,
        order: 100 + i,
      };
      try {
        const res = await fetch(`${API}/api/admin/phonemes`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          let detail = text;
          try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
          throw new Error(detail);
        }
      } catch (e) {
        errs.push({ id: entry.id, message: e.message });
      }
    }

    setSeedProgress({ done: missingEntries.length, total: missingEntries.length, current: '' });
    setSeedErrors(errs);
    setSeedResult(
      errs.length
        ? `Creazione completata con ${errs.length} errori su ${missingEntries.length}.`
        : `${missingEntries.length} scheletri creati con successo.`
    );
    setSeedRunning(false);
    // Trigger parent refresh to update the roadmap grid immediately
    if (typeof onRefresh === 'function') await onRefresh();
    // Auto-hide result after a while
    setTimeout(() => setSeedResult(''), 6000);
  };

  return (
    <div data-testid="phoneme-roadmap-dashboard">
      {/* ─── Progress hero ─── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/25 p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300 font-bold">Roadmap · LMS Phase 2</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-black text-white">Fonemi da produrre</h2>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Inventario completo dei 44 fonemi dell&apos;inglese standard, ordinati per{' '}
              <span className="text-cyan-200 font-bold">priorità pedagogica</span> per studenti italiani.
            </p>
          </div>

          {/* Progress ring */}
          <div className="flex items-center justify-center">
            <ProgressRing percent={percentComplete} testId="roadmap-progress-ring" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatMini label="Totali" value={totals.total} accent="cyan" testId="roadmap-stat-total" />
            <StatMini label="Iniziate" value={totals.exists} suffix={`${percentExists}%`} accent="amber" testId="roadmap-stat-started" />
            <StatMini label="Pubblicate" value={totals.published} accent="emerald" testId="roadmap-stat-published" />
            <StatMini label="Complete 100%" value={totals.complete} accent="orange" testId="roadmap-stat-complete" />
          </div>
        </div>

        {/* Bulk seed CTA */}
        {(missingEntries.length > 0 || seedRunning || seedResult) && (
          <div className="relative mt-5 pt-5 border-t border-cyan-500/15" data-testid="roadmap-bulk-seed">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-orange-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Popolamento rapido
                </p>
                <p className="text-sm text-white mt-1 max-w-xl leading-relaxed">
                  Crea <span className="font-black text-orange-300">{missingEntries.length}</span> scheletri di scheda in stato bozza,
                  pre-compilati con id/IPA/categoria/esempi dal catalogo. Nessuna sarà pubblica finché non la rifinisci.
                </p>
              </div>
              <Button
                onClick={runBulkSeed}
                disabled={seedRunning || missingEntries.length === 0}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold hover:scale-[1.03] transition flex-shrink-0"
                data-testid="roadmap-bulk-seed-button"
              >
                {seedRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
                {seedRunning ? 'Creazione in corso…' : `Crea ${missingEntries.length} scheletri`}
              </Button>
            </div>

            {seedRunning && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    {seedProgress.done} / {seedProgress.total} · {seedProgress.current || 'preparazione…'}
                  </span>
                  <span className="text-xs font-bold text-orange-300" data-testid="roadmap-bulk-seed-progress">
                    {Math.round((seedProgress.done / Math.max(seedProgress.total, 1)) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200"
                    style={{ width: `${(seedProgress.done / Math.max(seedProgress.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {seedResult && !seedRunning && (
              <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
                seedErrors.length
                  ? 'bg-amber-500/10 border border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-200'
              }`} data-testid="roadmap-bulk-seed-result">
                {seedErrors.length ? <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="font-bold">{seedResult}</p>
                  {seedErrors.length > 0 && (
                    <p className="text-xs mt-1 opacity-80">
                      Errori: {seedErrors.map((e) => e.id).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk regenerate DERIVED (§3.1/3.2/3.4 + lexicon) — always visible */}
        <div className="relative mt-5 pt-5 border-t border-cyan-500/15" data-testid="roadmap-bulk-derived">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Rigenera contenuti DERIVED (bulk)
              </p>
              <p className="text-sm text-white mt-1 max-w-xl leading-relaxed">
                Rilancia i motori canonical su tutte le card: <b>muscoli §3.1</b>, <b>overlay §3.2</b>,{' '}
                <b>hotspot §3.4</b> (bilingue), <b>common words + spelling</b> da CMUdict.
                Card protette (u-foot, i-fleece) escluse. Audio ElevenLabs preservato.
              </p>
            </div>
            <Button
              onClick={runBulkRegenDerived}
              disabled={derivedRunning}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-900 font-bold hover:scale-[1.03] transition flex-shrink-0"
              data-testid="roadmap-bulk-derived-button"
            >
              {derivedRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
              {derivedRunning ? 'Rigenerazione in corso…' : 'Rigenera derived su tutte'}
            </Button>
          </div>
          {derivedResult && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
              derivedResult.startsWith('Errore')
                ? 'bg-rose-500/10 border border-rose-500/40 text-rose-200'
                : 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-100'
            }`} data-testid="roadmap-bulk-derived-result">
              {derivedResult.startsWith('Errore')
                ? <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <p className="font-bold min-w-0">{derivedResult}</p>
            </div>
          )}
        </div>

        {/* Bulk mnemonic inline-IPA rewrite (§3.6) — CMUdict-grounded */}
        <div className="relative mt-5 pt-5 border-t border-fuchsia-500/15" data-testid="roadmap-bulk-mnemonic">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Annota mnemoniche con IPA inline (bulk · §3.6)
              </p>
              <p className="text-sm text-white mt-1 max-w-2xl leading-relaxed">
                Aggiunge la sintassi <code className="text-fuchsia-300">[word|/ipa/]</code> a ogni parola
                che contiene il fonema target. Fonte: <b>CMUdict</b> (mai LLM). Al passaggio del mouse sulla
                card apparirà un tooltip con la trascrizione IPA e l&apos;audio ElevenLabs userà SSML per la pronuncia esatta.
                <br /><span className="text-xs text-fuchsia-300/80">Nota: l&apos;audio della mnemonica viene azzerato al rewrite — rilancia poi il batch audio.</span>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => runBulkMnemonicRewrite(false)}
                disabled={mnemRunning}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-bold hover:scale-[1.03] transition"
                data-testid="roadmap-bulk-mnemonic-button"
              >
                {mnemRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {mnemRunning ? 'Annotazione…' : 'Annota mnemoniche'}
              </Button>
              <Button
                onClick={() => runBulkMnemonicRewrite(true)}
                disabled={mnemRunning}
                variant="outline"
                className="border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10"
                data-testid="roadmap-bulk-mnemonic-force-button"
                title="Rimuove [word|/ipa/] esistenti e ri-annota da zero"
              >
                Re-annota da zero
              </Button>
            </div>
          </div>
          {mnemResult && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
              mnemResult.ok
                ? 'bg-fuchsia-500/10 border border-fuchsia-500/40 text-fuchsia-100'
                : 'bg-rose-500/10 border border-rose-500/40 text-rose-200'
            }`} data-testid="roadmap-bulk-mnemonic-result">
              {mnemResult.ok
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <X className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                {mnemResult.ok ? (
                  <>
                    <p className="font-bold">
                      Processate {mnemResult.processed} · modificate {mnemResult.changed} · saltate {mnemResult.skipped}
                    </p>
                    {Array.isArray(mnemResult.results) && mnemResult.results.filter((r) => r.changed).length > 0 && (
                      <p className="text-xs mt-1 opacity-80">
                        Es.: {mnemResult.results.filter((r) => r.changed).slice(0, 3).map((r) => r.id).join(', ')}…
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-bold">Errore: {mnemResult.error}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bulk audio generation (ElevenLabs mass runner) */}
        <div className="relative mt-5 pt-5 border-t border-orange-500/15" data-testid="roadmap-bulk-audio">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-orange-300 font-bold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Genera audio ElevenLabs (bulk)
              </p>
              <p className="text-sm text-white mt-1 max-w-2xl leading-relaxed">
                Per ogni card: <b>fonema isolato</b> + <b>frasi esempio</b> + <b>mnemonica</b> + <b>top 10 parole</b>, ciascuno in <b>AmE + RP</b>.
                Clip già presenti vengono saltate (idempotente, sicuro da rilanciare). Errori sui singoli clip non interrompono il run.
              </p>
            </div>
            <Button
              onClick={runBulkAudio}
              disabled={audioRunning}
              className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold hover:scale-[1.03] transition flex-shrink-0"
              data-testid="roadmap-bulk-audio-button"
            >
              {audioRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Volume2 className="w-4 h-4 mr-1.5" />}
              {audioRunning ? 'Generazione in corso…' : 'Genera audio su tutte'}
            </Button>
          </div>

          {audioRunning && (
            <div className="mt-4" data-testid="roadmap-bulk-audio-progress">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  {audioProgress.done} / {audioProgress.total} · {audioProgress.current || 'preparazione…'}
                </span>
                <span className="text-xs font-bold text-orange-300">
                  {Math.round((audioProgress.done / Math.max(audioProgress.total, 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-400 transition-all duration-200"
                  style={{ width: `${(audioProgress.done / Math.max(audioProgress.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {audioResult && !audioRunning && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
              audioResult.errors?.length
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-200'
                : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-200'
            }`} data-testid="roadmap-bulk-audio-result">
              {audioResult.errors?.length
                ? <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {audioResult.processed} card processate · {audioResult.generated} clip generati ·{' '}
                  {audioResult.skipped} già presenti · {audioResult.errors.length} errori
                </p>
                {audioResult.errors.length > 0 && (
                  <details className="mt-2 text-xs opacity-90">
                    <summary className="cursor-pointer font-semibold hover:underline">
                      Mostra {audioResult.errors.length} errori
                    </summary>
                    <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {audioResult.errors.slice(0, 40).map((e, i) => (
                        <li key={i} className="font-mono text-[10px]">
                          <span className="text-orange-300">{e.card}</span> · {e.key} — {e.error}
                        </li>
                      ))}
                      {audioResult.errors.length > 40 && (
                        <li className="italic">… +{audioResult.errors.length - 40} altri</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-400 font-bold">
          <Filter className="w-3.5 h-3.5" />
          Filtri
        </span>
        <FilterPills
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[['all', 'Tutte'], ['0', 'Alta'], ['1', 'Media'], ['2', 'Bassa']]}
          testId="roadmap-priority"
        />
        <FilterPills
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[['all', 'Tutte'], ['vowel', 'Vocali'], ['diphthong', 'Dittonghi'], ['consonant', 'Consonanti']]}
          testId="roadmap-category"
        />
        <FilterPills
          value={progressFilter}
          onChange={setProgressFilter}
          options={[['all', 'Tutte'], ['pending', 'Da completare'], ['done', 'Complete']]}
          testId="roadmap-progress"
        />
        <span className="ml-auto text-[11px] text-slate-500" data-testid="roadmap-visible-count">
          {filtered.length} / {enriched.length} visibili
        </span>
      </div>

      {/* ─── Grid ─── */}
      {filtered.length === 0 ? (
        <div className="text-slate-400 text-center py-16" data-testid="roadmap-empty">
          Nessun fonema corrisponde ai filtri.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="roadmap-grid">
          {filtered.map(({ entry, existing, checks, priority }) => (
            <RoadmapCard
              key={entry.id}
              entry={entry}
              existing={existing}
              checks={checks}
              priority={priority}
              onEdit={() => navigate(existing ? `/admin/phonemes/${entry.id}` : `/admin/phonemes/new?prefill=${encodeURIComponent(entry.id)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function RoadmapCard({ entry, existing, checks, priority, onEdit }) {
  const p = PRIORITY_LABEL[priority];
  const ipa = existing?.displayIpa || `/${entry.ipa}/`;
  const words = existing?.examples?.length
    ? existing.examples.join(' · ').toLowerCase()
    : (entry.words || []).join(' · ');

  return (
    <div
      className={`relative bg-slate-900/70 border rounded-2xl p-4 transition-all duration-300 hover:border-cyan-500/50 ${
        checks.completeness === 100 ? 'border-emerald-500/30' : 'border-slate-800'
      }`}
      data-testid={`roadmap-card-${entry.id}`}
    >
      {/* Priority pill */}
      <div className="absolute top-3 right-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${p.cls}`}>
          {priority === 0 && <Sparkles className="w-2.5 h-2.5" />}
          P{priority} · {p.label}
        </span>
      </div>

      {/* IPA + subtitle */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/15 to-slate-800 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-black text-cyan-100">{ipa}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-black text-base leading-tight truncate">
            {entry.subtitle || entry.id.toUpperCase()}
          </p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{entry.id}</p>
          <p className="text-[10px] text-cyan-400 uppercase tracking-wider mt-0.5">
            {CATEGORY_LABEL[entry.group] || entry.group}
            {entry.subgroup && <span className="text-slate-500"> · {entry.subgroup}</span>}
          </p>
        </div>
      </div>

      {/* Example words */}
      <p className="text-xs text-slate-400 italic mb-3 truncate">{words}</p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Completezza</span>
          <span className={`text-xs font-bold ${
            checks.completeness === 100 ? 'text-emerald-300'
            : checks.completeness >= 66 ? 'text-cyan-300'
            : checks.completeness >= 33 ? 'text-amber-300'
            : 'text-slate-400'
          }`}>{checks.completeness}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              checks.completeness === 100 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
              : 'bg-gradient-to-r from-cyan-500 to-orange-400'
            }`}
            style={{ width: `${checks.completeness}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-4">
        <CheckItem ok={checks.exists}    icon={<FileCheck className="w-3 h-3" />} label="Card in DB" />
        <CheckItem ok={checks.hotspots}  icon={<MapPin className="w-3 h-3" />}    label="Hotspot ≥ 5" />
        <CheckItem ok={checks.words}     icon={<Type className="w-3 h-3" />}      label="Parole ≥ 20" />
        <CheckItem ok={checks.audio}     icon={<Volume2 className="w-3 h-3" />}   label="Audio" />
        <CheckItem ok={checks.video}     icon={<PlaySquare className="w-3 h-3" />} label="Video-lezione" />
        <CheckItem ok={checks.published} icon={<Layers className="w-3 h-3" />}    label="Pubblicata" />
      </div>

      {/* Action */}
      <Button
        onClick={onEdit}
        size="sm"
        className={`w-full font-bold ${
          !checks.exists
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 hover:scale-[1.02]'
            : checks.completeness === 100
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
        }`}
        data-testid={`roadmap-action-${entry.id}`}
      >
        {!checks.exists ? (
          <>
            <Target className="w-3.5 h-3.5 mr-1.5" />
            Crea scheda
          </>
        ) : checks.completeness === 100 ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Ottimizza
          </>
        ) : (
          <>
            Continua produzione
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </>
        )}
      </Button>
    </div>
  );
}

function CheckItem({ ok, icon, label }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-300' : 'text-slate-500'}`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="inline-flex items-center gap-1 truncate">
        <span className="opacity-70">{icon}</span>
        {label}
      </span>
    </div>
  );
}

function StatMini({ label, value, suffix, accent = 'cyan', testId }) {
  const map = {
    cyan:    'text-cyan-200',
    amber:   'text-amber-200',
    emerald: 'text-emerald-200',
    orange:  'text-orange-200',
  };
  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5" data-testid={testId}>
      <p className={`text-[9px] uppercase tracking-widest font-bold ${map[accent] || map.cyan}`}>{label}</p>
      <p className="mt-0.5 text-lg font-black text-white leading-none">
        {value}
        {suffix && <span className="ml-1.5 text-[10px] text-slate-500 font-normal">({suffix})</span>}
      </p>
    </div>
  );
}

function FilterPills({ value, onChange, options, testId }) {
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1" data-testid={testId}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          data-testid={`${testId}-${key}`}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${
            value === key ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ProgressRing({ percent, testId }) {
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative flex items-center justify-center" data-testid={testId}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148, 163, 184, 0.12)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#roadmap-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="roadmap-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white leading-none">{percent}%</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">completate</span>
      </div>
    </div>
  );
}
