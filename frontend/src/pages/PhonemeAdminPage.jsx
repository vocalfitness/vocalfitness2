import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft, Plus, Pencil, Copy, Trash2, Eye, EyeOff,
  ExternalLink, Search, GraduationCap, RefreshCw, ChevronRight,
  Volume2, PlaySquare, MapPin, Type, LayoutList, Target,
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
            <Button onClick={fetchCards} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" data-testid="phoneme-admin-refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Aggiorna</span>
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
