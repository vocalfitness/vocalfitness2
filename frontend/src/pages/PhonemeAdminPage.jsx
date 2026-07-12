import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft, Plus, Pencil, Copy, Trash2, Eye, EyeOff,
  ExternalLink, Search, GraduationCap, RefreshCw, ChevronRight,
  Volume2, PlaySquare, MapPin, Type, LayoutList, Target, HelpCircle,
  Sparkles, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import PhonemeRoadmapDashboard from '../components/PhonemeRoadmapDashboard';

/**
 * Phoneme CMS — list view.
 * Lists every phoneme card in the DB (published + draft), lets the admin
 * create / edit / duplicate / publish-toggle / delete each one.
 */
export default function PhonemeAdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [cards, setCards]     = useState([]);
  const [fetching, setFetching] = useState(true);
  const [query, setQuery]     = useState('');
  const [filter, setFilter]   = useState('all');   // all | published | draft
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(null);    // per-row loading indicator
  const [view, setView]       = useState('list');  // list | roadmap

  // ---- Batch AI fill ----
  const [batchOpen, setBatchOpen]           = useState(false);
  const [batchSelected, setBatchSelected]   = useState({}); // id → bool
  const [batchIncludeAi, setBatchIncludeAi] = useState(true);
  const [batchRunning, setBatchRunning]     = useState(false);
  const [batchCancel, setBatchCancel]       = useState(false);
  const [batchProgress, setBatchProgress]   = useState({ current: 0, total: 0, currentId: '' });
  const [batchResults, setBatchResults]     = useState([]); // {id, status:'ok'|'err', message, score}

  const API = process.env.REACT_APP_BACKEND_URL;
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}`,
    'Content-Type': 'application/json',
  });

  const fetchCards = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/phonemes`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(`Errore caricamento: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && user?.role === 'admin') fetchCards();
  }, [loading, user?.role]);

  // ---- Batch AI-fill handlers ----
  const openBatchModal = () => {
    // Pre-select all draft cards with readinessScore < 70
    const preset = {};
    for (const c of cards) {
      if (!c.published && (c.readinessScore ?? 0) < 70) preset[c.id] = true;
    }
    setBatchSelected(preset);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: 0, currentId: '' });
    setBatchCancel(false);
    setBatchOpen(true);
  };

  const runBatch = async () => {
    const ids = Object.entries(batchSelected).filter(([, v]) => v).map(([id]) => id);
    if (ids.length === 0) return;
    setBatchRunning(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: ids.length, currentId: ids[0] });
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      if (batchCancel) break;
      const id = ids[i];
      setBatchProgress({ current: i + 1, total: ids.length, currentId: id });
      try {
        // Use the v2 endpoint (full-taxonomy: creative + derived) so the batch
        // also generates exampleSentences, deepDive/pronunciationGuide and
        // videoScript — not only mnemonic + funFact like the legacy /batch-fill.
        // This matches Prof's expectation that "Batch bozze AI" fills ALL the
        // drafts that a human editor would otherwise fill by hand.
        const res = await fetch(`${API}/api/admin/phonemes/${id}/batch-fill-v2`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ include_creative: batchIncludeAi, overwrite: false }),
        });
        if (!res.ok) {
          const text = await res.text();
          let detail = text;
          try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
          results.push({ id, status: 'err', message: detail });
        } else {
          const data = await res.json();
          results.push({
            id, status: 'ok',
            message: data.message || 'ok',
            score: data.readinessScore,
            applied: data.applied,
          });
        }
      } catch (e) {
        results.push({ id, status: 'err', message: e.message });
      }
      setBatchResults([...results]);
    }
    setBatchRunning(false);
    // Refresh list so the new scores show up
    await fetchCards();
  };

  const toggleBatchAll = (v) => {
    const next = {};
    for (const c of cards) if (!c.published) next[c.id] = v;
    setBatchSelected(next);
  };

  // ---- Filters ----
  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter === 'published' && !c.published) return false;
      if (filter === 'draft'     &&  c.published) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.ipa?.toLowerCase().includes(q) ||
        c.displayIpa?.toLowerCase().includes(q) ||
        (c.examples || []).some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [cards, query, filter]);

  const stats = useMemo(() => ({
    total:     cards.length,
    published: cards.filter((c) => c.published).length,
    draft:     cards.filter((c) => !c.published).length,
  }), [cards]);

  // ---- Actions ----
  const togglePublish = async (id) => {
    setBusy(`pub-${id}`);
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${id}/publish`, {
        method: 'POST', headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchCards();
    } catch (e) {
      setError(`Errore publish: ${e.message}`);
    } finally { setBusy(null); }
  };

  const duplicate = async (id) => {
    setBusy(`dup-${id}`);
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${id}/duplicate`, {
        method: 'POST', headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cloned = await res.json();
      await fetchCards();
      // Jump straight to the editor for the copy
      navigate(`/admin/phonemes/${cloned.id}`);
    } catch (e) {
      setError(`Errore duplicazione: ${e.message}`);
    } finally { setBusy(null); }
  };

  const remove = async (id, label) => {
    if (!window.confirm(`Sicuro di eliminare la scheda ${label} (${id})? L'operazione è irreversibile.`)) return;
    setBusy(`del-${id}`);
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchCards();
    } catch (e) {
      setError(`Errore eliminazione: ${e.message}`);
    } finally { setBusy(null); }
  };

  // ---- Guards ----
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-200">Caricamento…</div>;
  }
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-black text-white mb-3">Accesso riservato</h2>
          <p className="text-slate-400 mb-6">Questa sezione è disponibile solo per gli amministratori.</p>
          <Button onClick={() => navigate('/login')} className="bg-cyan-600 hover:bg-cyan-500">Vai al login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-cyan-500/15">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 transition" data-testid="phoneme-admin-back-link">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">Admin Panel</span>
            </Link>
            <span className="text-cyan-500/30">|</span>
            <div className="inline-flex items-center gap-2 text-cyan-100">
              <GraduationCap className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold uppercase tracking-wider">Phoneme CMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/help/phoneme-cms" data-testid="phoneme-admin-help-link">
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="ml-2 hidden sm:inline">Guida</span>
              </Button>
            </Link>
            <Link to="/admin/audio-studio" data-testid="phoneme-admin-audio-studio-link">
              <Button variant="outline" size="sm" className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="ml-2 hidden sm:inline">Audio Studio</span>
              </Button>
            </Link>

            <Button onClick={fetchCards} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" data-testid="phoneme-admin-refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Aggiorna</span>
            </Button>
            <Button
              onClick={openBatchModal}
              variant="outline"
              size="sm"
              className="border-fuchsia-500/50 text-fuchsia-200 hover:bg-fuchsia-500/10"
              data-testid="phoneme-admin-batch-open"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="ml-2 hidden sm:inline">Batch bozze AI</span>
            </Button>
            <Link to="/admin/phonemes/new" data-testid="phoneme-admin-new-link">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold hover:scale-[1.03] transition">
                <Plus className="w-4 h-4 mr-1.5" />
                Nuova scheda
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-bold">CMS · LMS Phase 2</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-black text-white">Gestione schede fonetiche</h1>
          <p className="mt-2 text-slate-400 max-w-2xl leading-relaxed">
            Crea, modifica e pubblica le schede fonetiche visibili nella{' '}
            <Link to="/lms/phonemes" className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">Phonetic Library</Link>.
            Ogni scheda contiene contenuti didattici, audio, immagini e la video-lezione del Prof. Dapper.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="mb-5 flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit" data-testid="phoneme-admin-view-toggle">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
              view === 'list' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid="phoneme-admin-view-list"
          >
            <LayoutList className="w-3.5 h-3.5" />
            Lista schede
          </button>
          <button
            type="button"
            onClick={() => setView('roadmap')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
              view === 'roadmap' ? 'bg-orange-500/20 text-orange-200' : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid="phoneme-admin-view-roadmap"
          >
            <Target className="w-3.5 h-3.5" />
            Roadmap produzione
          </button>
        </div>

        {view === 'roadmap' ? (
          <PhonemeRoadmapDashboard existingCards={cards} onRefresh={fetchCards} />
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-5" data-testid="phoneme-admin-stat-total">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Totale</p>
            <p className="mt-1 text-3xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-5" data-testid="phoneme-admin-stat-published">
            <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">Pubblicate</p>
            <p className="mt-1 text-3xl font-black text-emerald-300">{stats.published}</p>
          </div>
          <div className="bg-slate-900/70 border border-amber-500/20 rounded-2xl p-5" data-testid="phoneme-admin-stat-draft">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Bozze</p>
            <p className="mt-1 text-3xl font-black text-amber-300">{stats.draft}</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per id, IPA, esempi (foot, book, …)"
              className="pl-9 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
              data-testid="phoneme-admin-search"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
            {['all', 'published', 'draft'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-testid={`phoneme-admin-filter-${f}`}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
                  filter === f ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'Tutte' : f === 'published' ? 'Pubblicate' : 'Bozze'}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm" data-testid="phoneme-admin-error">
            {error}
          </div>
        )}

        {/* List */}
        {fetching ? (
          <div className="text-slate-400 py-16 text-center">Caricamento schede…</div>
        ) : visibleCards.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center" data-testid="phoneme-admin-empty">
            <p className="text-slate-400 mb-4">Nessuna scheda corrisponde ai filtri.</p>
            <Link to="/admin/phonemes/new">
              <Button className="bg-cyan-600 hover:bg-cyan-500">
                <Plus className="w-4 h-4 mr-1.5" />Crea la prima
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3" data-testid="phoneme-admin-list">
            {visibleCards.map((c) => (
              <PhonemeRow
                key={c.id}
                card={c}
                busy={busy}
                onEdit={() => navigate(`/admin/phonemes/${c.id}`)}
                onDuplicate={() => duplicate(c.id)}
                onPublish={() => togglePublish(c.id)}
                onDelete={() => remove(c.id, c.displayIpa)}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* ================== BATCH AI-FILL MODAL ================== */}
      {batchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            // Don't dismiss on backdrop click while running or when results are visible
            if (batchRunning || batchResults.length > 0) return;
            setBatchOpen(false);
          }}
          data-testid="phoneme-admin-batch-modal"
        >
          <div
            className="bg-slate-950 border border-fuchsia-500/30 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-fuchsia-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Genera bozze AI in batch</h2>
                  <p className="text-xs text-slate-400">Autofill canonical + Claude Sonnet 4.5 · salva ogni scheda come <span className="text-amber-300 font-bold">bozza</span></p>
                </div>
              </div>
              <button
                onClick={() => !batchRunning && setBatchOpen(false)}
                className="text-slate-400 hover:text-slate-200 disabled:opacity-40"
                disabled={batchRunning}
                data-testid="phoneme-admin-batch-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {!batchRunning && batchResults.length === 0 && (
                <>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-4 text-xs text-amber-100/90 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="leading-relaxed">
                      <p><b>Sicurezza:</b> vengono elaborate SOLO schede in <i>bozza</i>. I campi già valorizzati manualmente vengono preservati (nessun overwrite). Il grafico di frequenza resta canonical-computed. Ogni scheda mantiene <code className="text-orange-300">published: false</code>.</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 mb-4 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchIncludeAi}
                      onChange={(e) => setBatchIncludeAi(e.target.checked)}
                      className="w-4 h-4 accent-fuchsia-500"
                      data-testid="phoneme-admin-batch-include-ai"
                    />
                    <span className={batchIncludeAi ? 'text-fuchsia-200' : 'text-slate-400'}>Includi bozze AI (mnemonic + funFact) · disattiva per solo autofill deterministico</span>
                  </label>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Schede da elaborare · {Object.values(batchSelected).filter(Boolean).length} selezionate
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleBatchAll(true)}
                        className="text-[11px] text-cyan-300 hover:text-cyan-200"
                        data-testid="phoneme-admin-batch-select-all"
                      >Tutte</button>
                      <span className="text-slate-600">·</span>
                      <button
                        onClick={() => toggleBatchAll(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                        data-testid="phoneme-admin-batch-select-none"
                      >Nessuna</button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-[300px] overflow-y-auto">
                    {cards.filter((c) => !c.published).map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-900/60 cursor-pointer"
                        data-testid={`phoneme-admin-batch-row-${c.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!batchSelected[c.id]}
                          onChange={(e) => setBatchSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                          className="w-4 h-4 accent-fuchsia-500"
                        />
                        <span className="font-mono text-cyan-300 text-sm min-w-[50px]">/{c.ipa}/</span>
                        <span className="text-xs text-slate-400 flex-1">{c.id}</span>
                        {typeof c.readinessScore === 'number' && (
                          <span
                            className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                              c.readinessScore >= 90 ? 'bg-emerald-500/15 text-emerald-300'
                              : c.readinessScore >= 70 ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {c.readinessScore}%
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {batchRunning && (
                <div className="space-y-4" data-testid="phoneme-admin-batch-progress">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="text-slate-300">
                        Elaboro <span className="font-mono text-fuchsia-300">{batchProgress.currentId}</span>
                      </span>
                      <span className="text-slate-400 font-bold">
                        {batchProgress.current} / {batchProgress.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {batchResults.length > 0 && (
                <div className="mt-4" data-testid="phoneme-admin-batch-results">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Risultati · {batchResults.filter((r) => r.status === 'ok').length} ok / {batchResults.filter((r) => r.status === 'err').length} errori
                  </p>
                  <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-[280px] overflow-y-auto">
                    {batchResults.map((r) => (
                      <div key={r.id} className="p-2.5 text-xs flex items-center gap-2.5">
                        {r.status === 'ok' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span className="font-mono text-cyan-300 min-w-[80px]">{r.id}</span>
                        <span className="text-slate-300 flex-1 truncate">{r.message}</span>
                        {typeof r.score === 'number' && (
                          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                            r.score >= 90 ? 'bg-emerald-500/15 text-emerald-300'
                            : r.score >= 70 ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                          }`}>{r.score}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
              {batchRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchCancel(true)}
                  className="border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                  data-testid="phoneme-admin-batch-cancel"
                >
                  Interrompi dopo la scheda corrente
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchOpen(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    data-testid="phoneme-admin-batch-dismiss"
                  >
                    Chiudi
                  </Button>
                  {batchResults.length === 0 && (
                    <Button
                      onClick={runBatch}
                      disabled={Object.values(batchSelected).filter(Boolean).length === 0}
                      className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold"
                      data-testid="phoneme-admin-batch-start"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Avvia batch su {Object.values(batchSelected).filter(Boolean).length} schede
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Single row card
// ============================================================
function PhonemeRow({ card, busy, onEdit, onDuplicate, onPublish, onDelete }) {
  const isBusy = (op) => busy === `${op}-${card.id}`;

  return (
    <div
      className="group bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-300"
      data-testid={`phoneme-admin-row-${card.id}`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* IPA glyph */}
        <div className="flex items-center gap-3 md:min-w-[220px]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-slate-800 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-cyan-100">{card.displayIpa}</span>
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight">{card.examples?.[0] || card.id.toUpperCase()}</p>
            <p className="text-xs text-slate-400 font-mono">{card.id}</p>
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Badge variant="outline" className="border-slate-700 text-slate-300 font-bold uppercase text-[10px]">
            {card.category}
          </Badge>
          {card.subcategory && (
            <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
              {card.subcategory}
            </Badge>
          )}
          <Badge className={card.published
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}
          >
            {card.published ? 'PUBBLICATA' : 'BOZZA'}
          </Badge>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3" />{card.hotspotCount} hotspot
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Type className="w-3 h-3" />{card.commonWordCount} parole
          </span>
          {card.hasAudio && (
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400">
              <Volume2 className="w-3 h-3" />audio
            </span>
          )}
          {card.hasVideoLesson && (
            <span className="inline-flex items-center gap-1 text-[11px] text-orange-300">
              <PlaySquare className="w-3 h-3" />video-lezione
            </span>
          )}
          {typeof card.readinessScore === 'number' && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                card.readinessScore >= 90 ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                : card.readinessScore >= 70 ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
              }`}
              title={
                card.readinessReady
                  ? `Pronta per pubblicazione · score ${card.readinessScore}/100`
                  : `${card.readinessFailCount ?? '?'} check falliti · score ${card.readinessScore}/100`
              }
              data-testid={`phoneme-admin-readiness-${card.id}`}
            >
              {card.readinessReady ? '✓' : '✗'} {card.readinessScore}%
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:justify-end flex-wrap">
          <Link to={`/lms/phoneme/${card.id}`} target="_blank" rel="noreferrer" title="Apri scheda pubblica in una nuova tab">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10" data-testid={`phoneme-admin-preview-${card.id}`}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost" size="sm"
            onClick={onPublish}
            disabled={isBusy('pub')}
            title={card.published ? 'Rimuovi dalla pubblicazione' : 'Pubblica'}
            className={card.published ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}
            data-testid={`phoneme-admin-publish-${card.id}`}
          >
            {card.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onDuplicate}
            disabled={isBusy('dup')}
            title="Duplica"
            className="text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            data-testid={`phoneme-admin-duplicate-${card.id}`}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onDelete}
            disabled={isBusy('del')}
            title="Elimina"
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            data-testid={`phoneme-admin-delete-${card.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={onEdit}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            data-testid={`phoneme-admin-edit-${card.id}`}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Modifica
            <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  );
}
