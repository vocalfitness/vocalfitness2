import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wand2, Loader2, Check, X, AlertCircle, Play, Pause, RefreshCw,
  Volume2, ChevronDown, ChevronRight, Sparkles, Mic2,
} from 'lucide-react';
import { Button } from './ui/button';

/**
 * BulkAudioGenerator
 * ───────────────────
 * Analyses the card and produces a work-list of audio clips that ElevenLabs
 * should generate. The admin can select/deselect items, then click
 * "Genera selezionati" — the component walks the queue with a small
 * concurrency window, calls POST /api/admin/elevenlabs/tts for each, and
 * writes the returned URL back into the card via `onFieldChange(path, url)`.
 *
 * Props
 *   card          — the full card object
 *   onFieldChange(path, value) — imperative setter (same helper the editor uses)
 *
 * Item shape:
 *   { key, path, label, text, group, currentUrl }
 */

const CONCURRENCY = 2;

/**
 * Prosody presets — tested ElevenLabs configs tuned for phonetic teaching.
 *
 *  • Naturale (default)  — balanced, good for most phonemes
 *  • Espressivo          — more variation, ideal for long vowels and mnemonic sentences
 *  • Stabile             — very consistent, ideal for isolated phonemes and consonants
 */
const PROSODY_PRESETS = {
  natural: {
    label: 'Naturale',
    hint:  'Bilanciato — buono per la maggior parte dei fonemi',
    stability: 0.42, similarity_boost: 0.88, style: 0.05, use_speaker_boost: true,
  },
  expressive: {
    label: 'Espressivo',
    hint:  'Più variazione — ideale per vocali lunghe e frasi mnemoniche',
    stability: 0.25, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true,
  },
  stable: {
    label: 'Stabile',
    hint:  'Molto consistente — ideale per fonemi isolati e consonanti',
    stability: 0.65, similarity_boost: 0.92, style: 0.02, use_speaker_boost: true,
  },
};

export default function BulkAudioGenerator({ card, onFieldChange }) {
  const [selected, setSelected] = useState(() => new Set());
  const [running,  setRunning]  = useState(new Set());
  const [errors,   setErrors]   = useState({});   // key → message
  const [expanded, setExpanded] = useState(new Set(['isolated', 'examples', 'mnemonic']));
  const abortRef = useRef({ cancelled: false });

  // ─── Voices (ElevenLabs) ──────────────────────────────
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState('');
  const [voiceByDialect, setVoiceByDialect] = useState(() => {
    // Restore last-used voices from localStorage so we don't ask twice
    try {
      const saved = JSON.parse(localStorage.getItem('vf_bulk_voices') || '{}');
      return { AmE: saved.AmE || '', RP: saved.RP || '', default: saved.default || '' };
    } catch { return { AmE: '', RP: '', default: '' }; }
  });
  const [previewing, setPreviewing] = useState('');

  // ─── Prosody preset (natural / expressive / stable) ──────
  const [prosodyKey, setProsodyKey] = useState(() => {
    try { return localStorage.getItem('vf_bulk_prosody') || 'natural'; }
    catch { return 'natural'; }
  });
  useEffect(() => {
    try { localStorage.setItem('vf_bulk_prosody', prosodyKey); } catch { /* ignore */ }
  }, [prosodyKey]);
  const prosody = PROSODY_PRESETS[prosodyKey] || PROSODY_PRESETS.natural;

  useEffect(() => {
    let cancelled = false;
    setVoicesLoading(true);
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/elevenlabs/voices`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setVoices(data.voices || []);
        // Seed all dialects with the account default the first time
        setVoiceByDialect((prev) => {
          const next = { ...prev };
          const def = data.default_voice_id || (data.voices?.[0]?.voice_id ?? '');
          ['AmE', 'RP', 'default'].forEach((k) => { if (!next[k]) next[k] = def; });
          return next;
        });
      })
      .catch((e) => { if (!cancelled) setVoicesError(e.message); })
      .finally(() => { if (!cancelled) setVoicesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Persist voice choices for future sessions
  useEffect(() => {
    try { localStorage.setItem('vf_bulk_voices', JSON.stringify(voiceByDialect)); } catch { /* ignore */ }
  }, [voiceByDialect]);

  const items = useMemo(() => computeItems(card), [card]);

  const totals = useMemo(() => {
    const t = { total: items.length, filled: 0, empty: 0 };
    items.forEach((it) => it.currentUrl ? t.filled++ : t.empty++);
    return t;
  }, [items]);

  // Auto-select all "empty" items when the list changes (until admin manually acts)
  const [autoSyncDone, setAutoSyncDone] = useState(false);
  React.useEffect(() => {
    if (autoSyncDone) return;
    if (!items.length) return;
    const initial = new Set(items.filter((it) => !it.currentUrl).map((it) => it.key));
    setSelected(initial);
    setAutoSyncDone(true);
  }, [items, autoSyncDone]);

  const busy = running.size > 0;
  const done = Object.keys(errors).length === 0 && !busy && selected.size === 0 && totals.filled > 0;

  // -------------------------------------------------------------------- //
  // Queue runner
  // -------------------------------------------------------------------- //
  const generateOne = async (item) => {
    setErrors((e) => { const n = { ...e }; delete n[item.key]; return n; });
    setRunning((r) => { const n = new Set(r); n.add(item.key); return n; });
    try {
      // Pick voice based on dialect (or fall back to default for dialect-agnostic items)
      const voiceId = voiceByDialect[item.dialect] || voiceByDialect.default || '';
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/elevenlabs/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: item.text,
          voice_id: voiceId || undefined,
          stability: prosody.stability,
          similarity_boost: prosody.similarity_boost,
          style: prosody.style,
          use_speaker_boost: prosody.use_speaker_boost,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          filename_hint: `${card.id || 'phoneme'}_${item.filenameSlug}`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      const url = data.relative_url || data.url;
      if (!url) throw new Error('Risposta TTS senza URL');
      onFieldChange(item.path, url);
      // Deselect after successful generation
      setSelected((s) => { const n = new Set(s); n.delete(item.key); return n; });
    } catch (e) {
      setErrors((err) => ({ ...err, [item.key]: e.message }));
    } finally {
      setRunning((r) => { const n = new Set(r); n.delete(item.key); return n; });
    }
  };

  const runQueue = async () => {
    abortRef.current.cancelled = false;
    const queue = items.filter((it) => selected.has(it.key));
    if (!queue.length) return;
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }).map(async () => {
      while (queue.length && !abortRef.current.cancelled) {
        const next = queue.shift();
        if (!next) break;
        await generateOne(next);
      }
    });
    await Promise.all(workers);
  };

  const stopQueue = () => { abortRef.current.cancelled = true; };

  const toggleSelected = (key) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const selectAllInGroup = (group, only) => {
    setSelected((s) => {
      const n = new Set(s);
      items.filter((it) => it.group === group).forEach((it) => {
        if (only === 'empty' && it.currentUrl) return;
        n.add(it.key);
      });
      return n;
    });
  };

  const deselectAllInGroup = (group) => {
    setSelected((s) => {
      const n = new Set(s);
      items.filter((it) => it.group === group).forEach((it) => n.delete(it.key));
      return n;
    });
  };

  const toggleGroup = (group) => setExpanded((e) => {
    const n = new Set(e);
    if (n.has(group)) n.delete(group); else n.add(group);
    return n;
  });

  // -------------------------------------------------------------------- //
  // Rendering
  // -------------------------------------------------------------------- //
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center" data-testid="bulk-audio-empty">
        <Volume2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm mb-1 font-bold">Nessun testo generabile</p>
        <p className="text-slate-500 text-xs">
          Compila prima le sezioni <span className="text-cyan-300">Frasi di esempio</span>,{' '}
          <span className="text-cyan-300">Frase mnemonica</span> e <span className="text-cyan-300">Parole comuni</span>,{' '}
          poi torna qui per generare gli audio in un colpo solo.
        </p>
      </div>
    );
  }

  const grouped = groupBy(items, 'group');
  const groupTitle = { isolated: 'Fonema isolato', examples: 'Frasi di esempio', mnemonic: 'Frase mnemonica', words: 'Parole comuni' };
  const groupOrder = ['isolated', 'examples', 'mnemonic', 'words'];

  const percent = totals.total === 0 ? 0 : Math.round((totals.filled / totals.total) * 100);

  return (
    <div data-testid="bulk-audio-generator" className="space-y-4">
      {/* Header bar */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ElevenLabs · Voce clonata Prof. Dapper
            </p>
            <h4 className="text-lg font-black text-white mt-0.5">Generazione bulk degli audio</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {totals.filled}/{totals.total} già presenti · {selected.size} selezionati per la generazione ·
              concorrenza {CONCURRENCY} chiamate parallele
            </p>
          </div>

          <div className="flex items-center gap-2">
            {busy ? (
              <Button onClick={stopQueue} variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10" data-testid="bulk-audio-stop">
                <Pause className="w-4 h-4 mr-1.5" />Interrompi
              </Button>
            ) : (
              <Button
                onClick={runQueue}
                disabled={selected.size === 0}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold hover:scale-[1.03] transition"
                data-testid="bulk-audio-run"
              >
                <Wand2 className="w-4 h-4 mr-1.5" />
                Genera {selected.size > 0 ? `(${selected.size})` : 'audio'}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Completezza audio</span>
            <span className={`text-xs font-bold ${percent === 100 ? 'text-emerald-300' : 'text-cyan-300'}`} data-testid="bulk-audio-percent">
              {percent}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-orange-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Voice pickers */}
        <div className="mt-4 pt-4 border-t border-slate-800" data-testid="bulk-audio-voice-panel">
          {/* Prosody preset selector */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Preset di prosodia
            </p>
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1" data-testid="bulk-audio-prosody-selector">
              {Object.entries(PROSODY_PRESETS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProsodyKey(key)}
                  title={cfg.hint}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${
                    prosodyKey === key
                      ? key === 'expressive' ? 'bg-orange-500/25 text-orange-200'
                      : key === 'stable'     ? 'bg-emerald-500/25 text-emerald-200'
                      :                        'bg-cyan-500/25 text-cyan-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  data-testid={`bulk-audio-prosody-${key}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic mb-3" data-testid="bulk-audio-prosody-hint">
            {prosody.hint} · stability {prosody.stability} · similarity {prosody.similarity_boost} · style {prosody.style}
          </p>

          <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5 mb-2">
            <Mic2 className="w-3.5 h-3.5" />
            Voci ElevenLabs
            {voicesLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
          </p>
          {voicesError ? (
            <p className="text-xs text-red-300 flex items-center gap-1.5" data-testid="bulk-audio-voices-error">
              <AlertCircle className="w-3.5 h-3.5" />
              Impossibile caricare le voci: {voicesError}
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-2">
              <VoicePicker
                label="🇺🇸 AmE"
                value={voiceByDialect.AmE}
                voices={voices}
                onChange={(v) => setVoiceByDialect((s) => ({ ...s, AmE: v }))}
                onPreview={setPreviewing}
                previewing={previewing}
                testId="bulk-audio-voice-AmE"
              />
              <VoicePicker
                label="🇬🇧 RP"
                value={voiceByDialect.RP}
                voices={voices}
                onChange={(v) => setVoiceByDialect((s) => ({ ...s, RP: v }))}
                onPreview={setPreviewing}
                previewing={previewing}
                testId="bulk-audio-voice-RP"
              />
              <VoicePicker
                label="Default (mnemonica + parole)"
                value={voiceByDialect.default}
                voices={voices}
                onChange={(v) => setVoiceByDialect((s) => ({ ...s, default: v }))}
                onPreview={setPreviewing}
                previewing={previewing}
                testId="bulk-audio-voice-default"
              />
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      {groupOrder.filter((g) => grouped[g]?.length).map((group) => {
        const list = grouped[group];
        const isOpen = expanded.has(group);
        const groupFilled = list.filter((it) => it.currentUrl).length;
        return (
          <div key={group} className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden" data-testid={`bulk-audio-group-${group}`}>
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-900 transition"
            >
              <span className="inline-flex items-center gap-2 text-sm text-cyan-100 font-bold">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                {groupTitle[group]}
                <span className="ml-2 text-[10px] text-slate-500 font-normal">
                  {groupFilled}/{list.length}
                </span>
              </span>
              <span className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); selectAllInGroup(group, 'empty'); }}
                  className="text-cyan-400 hover:text-cyan-200 uppercase tracking-wider font-bold"
                  data-testid={`bulk-audio-select-empty-${group}`}
                >
                  Seleziona mancanti
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deselectAllInGroup(group); }}
                  className="text-slate-500 hover:text-slate-300 uppercase tracking-wider font-bold"
                  data-testid={`bulk-audio-deselect-${group}`}
                >
                  Deseleziona
                </button>
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                {list.map((item) => (
                  <ItemRow
                    key={item.key}
                    item={item}
                    checked={selected.has(item.key)}
                    onToggle={() => toggleSelected(item.key)}
                    isRunning={running.has(item.key)}
                    error={errors[item.key]}
                    onGenerateOne={() => generateOne(item)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Row
// ============================================================
function ItemRow({ item, checked, onToggle, isRunning, error, onGenerateOne }) {
  const hasUrl = !!item.currentUrl;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/50 transition" data-testid={`bulk-audio-row-${item.key}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={isRunning}
        className="w-4 h-4 accent-cyan-500 cursor-pointer flex-shrink-0"
        data-testid={`bulk-audio-check-${item.key}`}
      />
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {isRunning ? (
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
        ) : error ? (
          <AlertCircle className="w-4 h-4 text-red-400" />
        ) : hasUrl ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <X className="w-3.5 h-3.5 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{item.label}</p>
        <p className="text-sm text-slate-100 truncate">{item.text || <span className="text-slate-600 italic">(vuoto)</span>}</p>
        {error && <p className="text-[11px] text-red-300 mt-0.5">⚠ {error}</p>}
      </div>
      {hasUrl && (
        <audio controls src={apiBase() + item.currentUrl.replace(/^\/api/, '/api')} className="h-8 flex-shrink-0 max-w-[220px]" data-testid={`bulk-audio-preview-${item.key}`} />
      )}
      <Button
        onClick={onGenerateOne}
        disabled={isRunning || !item.text}
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 flex-shrink-0"
        title={hasUrl ? 'Rigenera' : 'Genera'}
        data-testid={`bulk-audio-generate-${item.key}`}
      >
        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
         hasUrl ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

// ============================================================
// VoicePicker — dropdown with inline preview button
// ============================================================
function VoicePicker({ label, value, voices, onChange, onPreview, previewing, testId }) {
  const audioRef = useRef(null);
  const selected = voices.find((v) => v.voice_id === value);
  const previewUrl = selected?.preview_url || '';
  const isPreviewing = previewing === value;

  const togglePreview = () => {
    if (!previewUrl) return;
    if (isPreviewing) {
      audioRef.current?.pause();
      onPreview('');
    } else {
      onPreview(value);
      // Give React a tick to attach the src
      setTimeout(() => audioRef.current?.play?.().catch(() => {}), 30);
    }
  };

  return (
    <div className="grid gap-1" data-testid={testId}>
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</span>
      <div className="flex items-center gap-1.5">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 h-9 px-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100 text-xs truncate"
          data-testid={`${testId}-select`}
        >
          {!voices.length && <option value="">Caricamento…</option>}
          {voices.map((v) => (
            <option key={v.voice_id} value={v.voice_id}>
              {v.name}
              {v.category ? ` · ${v.category}` : ''}
              {v.labels?.accent ? ` · ${v.labels.accent}` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={togglePreview}
          disabled={!previewUrl}
          className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border transition ${
            !previewUrl
              ? 'border-slate-800 text-slate-700 cursor-not-allowed'
              : isPreviewing
                ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-cyan-300'
          }`}
          title={previewUrl ? (isPreviewing ? 'Ferma anteprima' : 'Ascolta anteprima') : 'Nessuna anteprima disponibile'}
          data-testid={`${testId}-preview`}
        >
          {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>
      {isPreviewing && previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onEnded={() => onPreview('')}
          className="hidden"
          autoPlay
        />
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function apiBase() {
  // audio src attribute needs full URL when running the app in preview mode
  const base = process.env.REACT_APP_BACKEND_URL || '';
  return base.replace(/\/$/, '');
}

function groupBy(arr, key) {
  const out = {};
  arr.forEach((it) => {
    (out[it[key]] ||= []).push(it);
  });
  return out;
}

/**
 * computeItems — derive the work-list from a phoneme card.
 * Each returned item points to the exact field path where the generated
 * URL should land in the card object.
 */
function computeItems(card) {
  if (!card) return [];
  const out = [];

  // ---- Isolated phoneme (AmE + RP) ----
  // ElevenLabs needs real text; we craft a short teaching line so the audio
  // renders naturally rather than being a bare vowel.
  const primary = (card.examples && card.examples[0]) || card.ipa || '';
  const isolatedText = primary ? `The ${card.displayIpa || card.ipa} sound. As in ${primary.toLowerCase()}.`
                              : (card.displayIpa || card.ipa || 'phoneme');

  ['AmE', 'RP'].forEach((dialect) => {
    out.push({
      key:  `isolated-${dialect}`,
      group: 'isolated',
      dialect,
      label: `${dialect === 'AmE' ? '🇺🇸 AmE' : '🇬🇧 RP'} · Fonema isolato`,
      text:  isolatedText,
      currentUrl: card.audio?.[dialect]?.isolated || '',
      path:  ['audio', dialect, 'isolated'],
      filenameSlug: `isolated_${dialect}`,
    });
  });

  // ---- Example sentences (AmE + RP) ----
  (card.exampleSentences || []).forEach((ex, i) => {
    if (!ex?.text) return;
    ['AmE', 'RP'].forEach((dialect) => {
      out.push({
        key:  `example-${dialect}-${i}`,
        group: 'examples',
        dialect,
        label: `${dialect === 'AmE' ? '🇺🇸 AmE' : '🇬🇧 RP'} · Frase ${i + 1}`,
        text:  ex.text,
        currentUrl: card.audio?.[dialect]?.examples?.[i] || '',
        path:  ['audio', dialect, 'examples', i],
        filenameSlug: `example_${dialect}_${i + 1}`,
      });
    });
  });

  // ---- Mnemonic ----
  if (card.mnemonic?.phrase) {
    out.push({
      key:  'mnemonic',
      group: 'mnemonic',
      dialect: 'default',
      label: 'Frase mnemonica',
      text:  card.mnemonic.phrase,
      currentUrl: card.mnemonic.audio || '',
      path:  ['mnemonic', 'audio'],
      filenameSlug: 'mnemonic',
    });
  }

  // ---- Common words ----
  (card.commonWords || []).forEach((w, i) => {
    if (!w?.w) return;
    out.push({
      key:  `word-${i}`,
      group: 'words',
      dialect: 'default',
      label: `Parola ${i + 1}`,
      text:  w.w,
      currentUrl: w.audio || '',
      path:  ['commonWords', i, 'audio'],
      filenameSlug: `word_${(w.w || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    });
  });

  return out;
}
