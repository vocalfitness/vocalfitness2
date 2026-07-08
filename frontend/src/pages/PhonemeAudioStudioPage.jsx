import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Volume2, Search, Filter, Play, Pause,
  RefreshCw, CheckCircle2, X, Loader2, Wand2, Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * PhonemeAudioStudioPage — global audio dashboard for autonomous fine-tuning.
 *
 * Design contract:
 *   • Fetches ALL admin phoneme cards + flattens them into a "clip catalog"
 *     (~2900 rows max: isolated × 2 + examples × 2 + mnemonic × 1 + words × 2).
 *   • Filters: card / group / dialect / status (present vs missing).
 *   • Text search: word or example substring across every card.
 *   • Play inline (native <audio>) — quick A/B between cards without leaving the page.
 *   • Per-row regen with a chosen voice + prosody preset (option user picks at page level).
 *   • Bulk selection: pick N clips → "Rigenera selezionati con voce X + preset Y".
 *
 * Backend: POST /api/admin/phonemes/{id}/batch-audio with ``only_keys=[…]`` +
 *          ``overwrite=true`` + voice_* fields. One HTTP request per card;
 *          the client loops cards sequentially to keep requests short.
 */

const GROUPS = [
  { value: 'all',       label: 'Tutti i gruppi' },
  { value: 'isolated',  label: 'Fonema isolato' },
  { value: 'examples',  label: 'Frasi di esempio' },
  { value: 'mnemonic',  label: 'Frase mnemonica' },
  { value: 'words',     label: 'Parole comuni' },
];
const DIALECTS = [
  { value: 'all',       label: 'Tutti i dialetti' },
  { value: 'AmE',       label: '🇺🇸 AmE' },
  { value: 'RP',        label: '🇬🇧 RP' },
  { value: 'default',   label: 'Default' },
];
const STATES = [
  { value: 'all',       label: 'Tutti' },
  { value: 'present',   label: '✓ Presenti' },
  { value: 'missing',   label: '✗ Mancanti' },
];

const PROSODY_PRESETS = {
  natural:    { label: 'Naturale',    stability: 0.42, similarity_boost: 0.88, style: 0.05 },
  expressive: { label: 'Espressivo',  stability: 0.25, similarity_boost: 0.85, style: 0.15 },
  stable:     { label: 'Stabile',     stability: 0.65, similarity_boost: 0.92, style: 0.02 },
};

/** Flatten one phoneme card into up to ~29 clip rows. */
function flattenCardToClips(card, wordsLimit = 10) {
  const rows = [];
  const primary = ((card.examples || [])[0] || card.ipa || '').toString();
  const isolatedText = primary
    ? `The ${card.displayIpa || card.ipa} sound. As in ${primary.toLowerCase()}.`
    : (card.displayIpa || card.ipa || '');

  const audio = card.audio || {};
  ['AmE', 'RP'].forEach((d) => {
    rows.push({
      cardId: card.id, cardIpa: card.displayIpa || card.ipa,
      key: `isolated-${d}`, group: 'isolated', dialect: d,
      text: isolatedText,
      currentUrl: (audio[d] || {}).isolated || '',
    });
  });
  (card.exampleSentences || []).forEach((ex, i) => {
    const t = (ex || {}).text || '';
    if (!t) return;
    ['AmE', 'RP'].forEach((d) => {
      const list = (audio[d] || {}).examples || [];
      rows.push({
        cardId: card.id, cardIpa: card.displayIpa || card.ipa,
        key: `example-${d}-${i}`, group: 'examples', dialect: d,
        text: t,
        currentUrl: Array.isArray(list) ? (list[i] || '') : (list?.[String(i)] || ''),
      });
    });
  });
  if ((card.mnemonic || {}).phrase) {
    rows.push({
      cardId: card.id, cardIpa: card.displayIpa || card.ipa,
      key: 'mnemonic', group: 'mnemonic', dialect: 'default',
      text: card.mnemonic.phrase,
      currentUrl: card.mnemonic.audio || '',
    });
  }
  ((card.commonWords || []).slice(0, wordsLimit)).forEach((w, i) => {
    if (!w?.w) return;
    rows.push({
      cardId: card.id, cardIpa: card.displayIpa || card.ipa,
      key: `word-${i}-AmE`, group: 'words', dialect: 'AmE',
      text: w.w, currentUrl: w.audioAmE || w.audio || '',
    });
    rows.push({
      cardId: card.id, cardIpa: card.displayIpa || card.ipa,
      key: `word-${i}-RP`, group: 'words', dialect: 'RP',
      text: w.w, currentUrl: w.audioRP || '',
    });
  });
  return rows;
}

export default function PhonemeAudioStudioPage() {
  const navigate = useNavigate();
  const [cards,      setCards]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [voices,     setVoices]     = useState([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState('');

  const [cardFilter, setCardFilter] = useState('all');
  const [group,      setGroup]      = useState('all');
  const [dialect,    setDialect]    = useState('all');
  const [state,      setState]      = useState('all');
  const [search,     setSearch]     = useState('');

  const [voiceAme,   setVoiceAme]   = useState('');
  const [voiceRp,    setVoiceRp]    = useState('');
  const [voiceDef,   setVoiceDef]   = useState('');
  const [prosody,    setProsody]    = useState('natural');

  const [selected,   setSelected]   = useState(new Set());   // Set of "cardId::key"
  const [runningRows, setRunningRows] = useState(new Set()); // Set of "cardId::key" currently regenerating
  const [audioPlaying, setAudioPlaying] = useState(null);    // "cardId::key" whose <audio> is playing
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkErrors,  setBulkErrors]  = useState([]);

  // Fetch cards + voices on mount
  useEffect(() => {
    const token = localStorage.getItem('vf_token');
    if (!token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const [cardsRes, voicesRes] = await Promise.all([
          fetch(`${API}/api/admin/phonemes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/admin/elevenlabs/voices`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const list = await cardsRes.json();
        const summaries = Array.isArray(list) ? list : (list.items || []);
        // Fetch full docs (we need audio + commonWords + mnemonic + exampleSentences)
        const full = await Promise.all(summaries.map((c) =>
          fetch(`${API}/api/admin/phonemes/${encodeURIComponent(c.id)}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then((r) => r.json()).catch(() => null)
        ));
        setCards(full.filter(Boolean));
        const v = await voicesRes.json();
        setVoices(v.voices || []);
        setDefaultVoiceId(v.default_voice_id || '');
        setVoiceAme(v.default_voice_id || '');
        setVoiceRp(v.default_voice_id || '');
        setVoiceDef(v.default_voice_id || '');
      } catch (e) {
        console.error('Audio Studio load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // Flatten + filter clips (recomputed only when inputs change)
  const allRows = useMemo(() => {
    const out = [];
    cards.forEach((c) => { flattenCardToClips(c, 10).forEach((r) => out.push(r)); });
    return out;
  }, [cards]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (cardFilter !== 'all' && r.cardId !== cardFilter) return false;
      if (group !== 'all' && r.group !== group) return false;
      if (dialect !== 'all' && r.dialect !== dialect) return false;
      if (state === 'present' && !r.currentUrl) return false;
      if (state === 'missing' && r.currentUrl) return false;
      if (q && !(r.text.toLowerCase().includes(q) || r.cardId.includes(q) || r.cardIpa.includes(q))) return false;
      return true;
    });
  }, [allRows, cardFilter, group, dialect, state, search]);

  const stats = useMemo(() => {
    const present = allRows.filter((r) => r.currentUrl).length;
    return { total: allRows.length, present, missing: allRows.length - present };
  }, [allRows]);

  const toggleRow = (rid) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid); else next.add(rid);
      return next;
    });
  };
  const selectAllVisible = () => setSelected(new Set(rows.map((r) => `${r.cardId}::${r.key}`)));
  const clearSelection   = () => setSelected(new Set());

  const regenOne = async (row, opts = {}) => {
    const token = localStorage.getItem('vf_token');
    const rid = `${row.cardId}::${row.key}`;
    setRunningRows((prev) => { const s = new Set(prev); s.add(rid); return s; });
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${encodeURIComponent(row.cardId)}/batch-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          only_keys:      [row.key],
          overwrite:      true,
          voice_ame:      voiceAme,
          voice_rp:       voiceRp,
          voice_default:  voiceDef,
          text_override:  opts.text ? { [row.key]: opts.text } : undefined,
          ipa_override:   opts.ipa  ? { [row.key]: opts.ipa  } : undefined,
          ...PROSODY_PRESETS[prosody],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      // Refresh just this card
      const refreshed = await fetch(`${API}/api/admin/phonemes/${encodeURIComponent(row.cardId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((r) => r.json());
      setCards((prev) => prev.map((c) => c.id === row.cardId ? refreshed : c));
    } catch (e) {
      alert(`Errore regen ${row.cardId} / ${row.key}: ${e.message}`);
    } finally {
      setRunningRows((prev) => { const s = new Set(prev); s.delete(rid); return s; });
    }
  };

  // Prompt the user for an IPA override + regenerate the single clip.
  // Auto-strips /…/ wrapping. Empty submission uses just the row's own ipa.
  const regenWithIpa = (row) => {
    const suggestedIpa = row.dialect === 'AmE' || row.dialect === 'RP'
      ? (row.text.match(/\/([^/]+)\//)?.[1] || row.text)
      : row.text;
    const raw = window.prompt(
      `Rigenera "${row.key}" con SSML IPA scientifico.\n\n` +
      `Testo attuale: "${row.text}"\n\n` +
      `Inserisci il simbolo IPA (es. ʌ, ə, iː, aɪ):\n` +
      `Le barre /…/ sono opzionali — vengono rimosse automaticamente.\n` +
      `Lascia vuoto per usare la voce naturale senza SSML.`,
      suggestedIpa
    );
    if (raw === null) return;   // cancel
    const clean = raw.trim().replace(/^\/+|\/+$/g, '').trim();
    regenOne(row, { ipa: clean || undefined, text: clean ? clean : undefined });
  };

  const runBulkRegenSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Rigenera ${selected.size} clip con voce/preset selezionati?\nSovrascriverà le clip esistenti.`)) return;
    setBulkRunning(true);
    setBulkErrors([]);
    // Group selected rids by cardId → send one batch request per card
    const byCard = {};
    selected.forEach((rid) => {
      const [cardId, key] = rid.split('::');
      (byCard[cardId] = byCard[cardId] || []).push(key);
    });
    const cardIds = Object.keys(byCard);
    setBulkProgress({ done: 0, total: cardIds.length });
    const token = localStorage.getItem('vf_token');
    const errs = [];
    for (let i = 0; i < cardIds.length; i++) {
      const cid = cardIds[i];
      setBulkProgress({ done: i, total: cardIds.length });
      try {
        const res = await fetch(`${API}/api/admin/phonemes/${encodeURIComponent(cid)}/batch-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            only_keys:      byCard[cid],
            overwrite:      true,
            voice_ame:      voiceAme,
            voice_rp:       voiceRp,
            voice_default:  voiceDef,
            ...PROSODY_PRESETS[prosody],
          }),
        });
        const data = await res.json();
        if (!res.ok) errs.push({ card: cid, key: '(request)', error: data.detail || `HTTP ${res.status}` });
        (data.errors || []).forEach((e) => errs.push({ card: cid, ...e }));
      } catch (e) {
        errs.push({ card: cid, key: '(network)', error: e.message });
      }
    }
    setBulkProgress({ done: cardIds.length, total: cardIds.length });
    setBulkErrors(errs);
    // Refresh all touched cards
    const refreshed = await Promise.all(cardIds.map((cid) =>
      fetch(`${API}/api/admin/phonemes/${encodeURIComponent(cid)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((r) => r.json()).catch(() => null)
    ));
    setCards((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      refreshed.filter(Boolean).forEach((c) => map.set(c.id, c));
      return Array.from(map.values());
    });
    setBulkRunning(false);
    setSelected(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50" data-testid="audio-studio-page">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-slate-900/60 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/phonemes')}
              className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100 text-sm font-bold"
              data-testid="audio-studio-back"
            >
              <ArrowLeft className="w-4 h-4" /> CMS Fonemi
            </button>
            <span className="text-slate-500">|</span>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-orange-400" /> Audio Studio
            </h1>
            <span className="text-xs text-slate-400">
              {stats.present}/{stats.total} clip · {stats.missing} mancanti
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-5">
        {/* IPA SSML hint banner */}
        <div className="mb-4 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 border border-fuchsia-500/25 p-3 flex items-start gap-3" data-testid="audio-studio-ipa-hint">
          <Sparkles className="w-5 h-5 text-fuchsia-300 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-cyan-100/90 leading-relaxed">
            <b className="text-fuchsia-200">Modalità IPA scientifica</b> — <b>auto-detect inline</b>: qualsiasi <code className="text-cyan-200 bg-slate-800/70 px-1 rounded">/ʌ/</code> o <code className="text-cyan-200 bg-slate-800/70 px-1 rounded">/kʊk/</code> dentro un testo viene wrappato in SSML (<code className="text-fuchsia-200 bg-slate-800/70 px-1 rounded">&lt;phoneme alphabet=&quot;ipa&quot; ph=&quot;…&quot;&gt;</code>). Puoi scrivere frasi ibride tipo <i>&quot;The word /kʊk/ contains /ʊ/&quot;</i> e i fonemi verranno pronunciati esattamente. Clicca l&apos;icona <Sparkles className="w-3 h-3 inline text-fuchsia-300" /> per override manuale del singolo clip. Modello auto-switched a <code className="bg-slate-800/70 px-1 rounded">eleven_turbo_v2</code> quando SSML è attivo.
          </div>
        </div>

        {/* Voice + Prosody controls */}
        <div className="mb-4 p-4 rounded-xl bg-slate-900/50 border border-cyan-500/15 grid md:grid-cols-4 gap-3" data-testid="audio-studio-voices">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">🇺🇸 Voce AmE</label>
            <select className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm" value={voiceAme} onChange={(e) => setVoiceAme(e.target.value)} data-testid="audio-studio-voice-ame">
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} {v.labels?.accent ? `(${v.labels.accent})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">🇬🇧 Voce RP</label>
            <select className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm" value={voiceRp} onChange={(e) => setVoiceRp(e.target.value)} data-testid="audio-studio-voice-rp">
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} {v.labels?.accent ? `(${v.labels.accent})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Voce default (mnemonica + parole)</label>
            <select className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm" value={voiceDef} onChange={(e) => setVoiceDef(e.target.value)} data-testid="audio-studio-voice-default">
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} {v.labels?.accent ? `(${v.labels.accent})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Preset prosodia</label>
            <div className="mt-1 flex gap-1">
              {Object.entries(PROSODY_PRESETS).map(([k, p]) => (
                <button key={k} onClick={() => setProsody(k)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold border transition ${
                    prosody === k ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-orange-400/50'
                  }`}
                  data-testid={`audio-studio-prosody-${k}`}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters + search */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filtri
          </span>
          <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} data-testid="audio-studio-filter-card">
            <option value="all">Tutte le card</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.displayIpa || c.ipa} · {c.id}</option>)}
          </select>
          {[[GROUPS, group, setGroup, 'group'], [DIALECTS, dialect, setDialect, 'dialect'], [STATES, state, setState, 'state']].map(([opts, val, set, k]) => (
            <select key={k} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" value={val} onChange={(e) => set(e.target.value)} data-testid={`audio-studio-filter-${k}`}>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input className="bg-transparent text-xs w-32 focus:outline-none" placeholder="cerca testo…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="audio-studio-search" />
          </div>
          <span className="ml-auto text-xs text-slate-400" data-testid="audio-studio-visible">
            {rows.length} clip visibili
          </span>
        </div>

        {/* Selection action bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <button onClick={selectAllVisible} className="text-cyan-300 hover:text-cyan-100 font-bold" data-testid="audio-studio-select-all">
            Seleziona tutte visibili ({rows.length})
          </button>
          <span className="text-slate-600">·</span>
          <button onClick={clearSelection} className="text-slate-400 hover:text-slate-200 font-bold" data-testid="audio-studio-clear-sel">
            Deseleziona
          </button>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-slate-400">{selected.size} selezionate</span>
            <Button size="sm" disabled={!selected.size || bulkRunning}
              onClick={runBulkRegenSelected}
              className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold"
              data-testid="audio-studio-bulk-regen">
              {bulkRunning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1" />}
              {bulkRunning ? `${bulkProgress.done}/${bulkProgress.total} card…` : `Rigenera ${selected.size} selezionate`}
            </Button>
          </span>
        </div>

        {bulkErrors.length > 0 && (
          <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-100 p-3 text-xs" data-testid="audio-studio-bulk-errors">
            <b>{bulkErrors.length} errori sui singoli clip:</b>
            <ul className="mt-1 max-h-32 overflow-y-auto font-mono text-[10px]">
              {bulkErrors.slice(0, 30).map((e, i) => <li key={i}>{e.card} · {e.key} — {e.error}</li>)}
            </ul>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl bg-slate-900/40 border border-slate-700/50 overflow-hidden">
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-700 z-10">
                <tr className="text-slate-400 uppercase tracking-wider">
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left">Card</th>
                  <th className="p-2 text-left">Gruppo</th>
                  <th className="p-2 text-left">Dial.</th>
                  <th className="p-2 text-left">Testo</th>
                  <th className="p-2 text-center">Stato</th>
                  <th className="p-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rid = `${r.cardId}::${r.key}`;
                  const isRunning = runningRows.has(rid);
                  const isPlaying = audioPlaying === rid;
                  const audioSrc = r.currentUrl ? (r.currentUrl.startsWith('http') ? r.currentUrl : `${API}${r.currentUrl}`) : '';
                  return (
                    <tr key={rid} className="border-b border-slate-800 hover:bg-slate-800/40" data-testid={`audio-studio-row-${rid}`}>
                      <td className="p-2 text-center">
                        <input type="checkbox" checked={selected.has(rid)} onChange={() => toggleRow(rid)} data-testid={`audio-studio-row-check-${rid}`} />
                      </td>
                      <td className="p-2 font-bold text-cyan-200"><span className="text-orange-300">{r.cardIpa}</span> · <span className="text-slate-400">{r.cardId}</span></td>
                      <td className="p-2 text-slate-300">{r.group}</td>
                      <td className="p-2 text-slate-300">{r.dialect === 'AmE' ? '🇺🇸' : r.dialect === 'RP' ? '🇬🇧' : '·'}</td>
                      <td className="p-2 text-slate-100 max-w-md truncate" title={r.text}>{r.text}</td>
                      <td className="p-2 text-center">
                        {r.currentUrl
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                          : <X className="w-4 h-4 text-rose-400 inline" />}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          {audioSrc && (
                            <button
                              onClick={() => {
                                if (isPlaying) {
                                  const el = document.querySelector(`audio[data-rid="${rid}"]`);
                                  if (el) el.pause();
                                  setAudioPlaying(null);
                                } else {
                                  const el = document.querySelector(`audio[data-rid="${rid}"]`);
                                  if (el) { el.currentTime = 0; el.play(); setAudioPlaying(rid); }
                                }
                              }}
                              className="p-1.5 rounded hover:bg-slate-700 text-cyan-300"
                              data-testid={`audio-studio-play-${rid}`}
                            >
                              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {audioSrc && (
                            <audio data-rid={rid} src={audioSrc} preload="none" onEnded={() => setAudioPlaying(null)} />
                          )}
                          <button
                            onClick={() => regenOne(r)}
                            disabled={isRunning}
                            className="p-1.5 rounded hover:bg-orange-500/30 text-orange-300 disabled:opacity-40"
                            title="Rigenera con voce/preset selezionati"
                            data-testid={`audio-studio-regen-${rid}`}
                          >
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => regenWithIpa(r)}
                            disabled={isRunning}
                            className="p-1.5 rounded hover:bg-fuchsia-500/30 text-fuchsia-300 disabled:opacity-40"
                            title="Rigenera con SSML IPA scientifico (es. inserisci ʌ, ə, iː)"
                            data-testid={`audio-studio-regen-ipa-${rid}`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">Nessuna clip corrisponde ai filtri.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
