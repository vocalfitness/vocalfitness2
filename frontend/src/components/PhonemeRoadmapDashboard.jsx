import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Circle, ArrowRight, Sparkles, Filter, Target,
  MapPin, Type, Volume2, PlaySquare, FileCheck, Layers,
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
export default function PhonemeRoadmapDashboard({ existingCards = [] }) {
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all'); // all | pending | done

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
