import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  ArrowLeft, Save, ExternalLink, ChevronDown, ChevronRight, Plus, Trash2,
  Info, Sparkles, GraduationCap, Volume2, MapPin, BookOpen, FileText, Image as ImageIcon,
  Video, Type, Palette, Wand2, Check, AlertCircle, MousePointer2, ListTree, Layers, Zap,
} from 'lucide-react';
import HotspotVisualEditor from '../components/HotspotVisualEditor';
import ImageUploader from '../components/ImageUploader';
import BulkAudioGenerator from '../components/BulkAudioGenerator';
import PhonemeLivePreview from '../components/PhonemeLivePreview';
import { PHONEME_CATALOGUE } from '../data/phonemeCatalogue';

/**
 * PhonemeAdminEditorPage — CMS form editor.
 *
 * Modes:
 *   - /admin/phonemes/new   → create
 *   - /admin/phonemes/:id   → edit
 *
 * Design principles:
 *   - Non-technical editor first: friendly labels, help text, chip inputs
 *   - Repeater components for hotspot / common word / step arrays
 *   - JSON escape hatch for the deeply-nested visualisation blobs
 *   - Sticky footer with Save / Publish / Preview buttons
 */

// ============================================================
// Controlled vocabulary (mirrors /app/backend/routers/canonical_phonemes.py)
// Kept in sync with backend seed to enforce identical option lists in the CMS
// dropdowns. Never free-type Height values like "Near-high" (bug #4 in brief).
// ============================================================
const HEIGHT_TERMS = ['Close', 'Near-close', 'Close-mid', 'Mid', 'Open-mid', 'Near-open', 'Open'];
const ACTIVATION_TERMS = ['HIGH', 'MODERATE', 'LOW'];
const HEIGHT_LABEL_ALIASES = ['height', 'altezza'];

// ============================================================
// ConfidencePill — visual indicator for LLM draft confidence [0..1]
// ============================================================
const ConfidencePill = ({ value }) => {
  const v = typeof value === 'number' ? value : 0;
  const pct = Math.round(v * 100);
  const cls = v >= 0.8 ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
            : v >= 0.5 ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
            : 'text-rose-300 border-rose-500/40 bg-rose-500/10';
  const label = v >= 0.8 ? 'alta' : v >= 0.5 ? 'media' : 'bassa';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${cls}`}>
      confidence {pct}% · {label}
    </span>
  );
};

// ============================================================
// Blank template for /new
// ============================================================
const BLANK = {
  id: '',
  ipa: '',
  displayIpa: '',
  category: 'vowel',
  subcategory: '',
  examples: [],
  dialects: ['AmE', 'RP'],
  dialectNote: '',
  published: false,
  order: 100,
  videoLesson: null,
  assets: { sideView: '', frontView: '', frontViewClean: '', articulatory: '' },
  audio: {
    AmE: { isolated: '', examples: ['', '', ''] },
    RP:  { isolated: '', examples: ['', '', ''] },
  },
  exampleSentences: [
    { text: '', highlights: [] },
    { text: '', highlights: [] },
    { text: '', highlights: [] },
  ],
  mnemonic: { phrase: '', highlights: [], note: '', audio: '' },
  pronunciationGuide: { headline: 'Vocal Fitness articulatory protocol', steps: [] },
  hotspots: [],
  commonWords: [],
  // Advanced / rendered blobs — edited via JSON textarea for now
  spellings: [],
  frequencyChart: [],
  features: [],
  knobs: [],
  facialMuscles: [],
  vowelChartPosition: { x: 50, y: 50 },
  classification: [],
  funFact: null,
};

// ============================================================
// Main component
// ============================================================
export default function PhonemeAdminEditorPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !routeId || routeId === 'new';

  const [card, setCard]     = useState(BLANK);
  const [initial, setInitial] = useState(BLANK);
  const [fetching, setFetching] = useState(!isNew);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');
  const [advancedJson, setAdvancedJson] = useState('');
  const [jsonError, setJsonError]     = useState('');

  // ─── Auto-save ────────────────────────────────────────────
  // Debounces every 30s from the last edit and silently persists as draft.
  // Only active in edit mode (never in /new — we need a real id first).
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    try { return localStorage.getItem('vf_editor_autosave') !== 'off'; }
    catch { return true; }
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveInFlightRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem('vf_editor_autosave', autoSaveEnabled ? 'on' : 'off'); } catch { /* ignore */ }
  }, [autoSaveEnabled]);

  const API = process.env.REACT_APP_BACKEND_URL;
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}`,
    'Content-Type': 'application/json',
  });

  // ---- Load existing card (edit mode) ----
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const res = await fetch(`${API}/api/admin/phonemes/${routeId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Merge with BLANK so missing keys always exist
        const merged = deepMerge(BLANK, data);
        setCard(merged);
        setInitial(merged);
        setAdvancedJson(serialiseAdvanced(merged));
      } catch (e) {
        setError(`Errore caricamento: ${e.message}`);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [routeId, isNew]);

  // ---- Prefill from PHONEME_CATALOGUE when creating a new card via ?prefill=xxx ----
  useEffect(() => {
    if (!isNew) return;
    const prefillId = searchParams.get('prefill');
    if (!prefillId) return;
    const entry = PHONEME_CATALOGUE.find((e) => e.id === prefillId);
    if (!entry) return;

    const seed = {
      ...BLANK,
      id: entry.id,
      ipa: entry.ipa,
      displayIpa: `/${entry.ipa}/`,
      category: entry.group,
      subcategory: entry.subgroup || '',
      examples: (entry.words || []).map((w) => w.toUpperCase()),
      dialects: entry.dialectScope === 'GA-only' ? ['AmE'] : entry.dialectScope === 'RP-only' ? ['RP'] : ['AmE', 'RP'],
      dialectNote: entry.description || '',
      // Pre-seed commonWords from the catalogue's example words so the admin
      // has 3 concrete rows to build on rather than starting empty.
      commonWords: (entry.words || []).map((w) => ({ w, ipa: '', audio: '' })),
    };
    setCard(seed);
    setInitial(seed);
    setAdvancedJson(serialiseAdvanced(seed));
    setToast(`Editor pre-compilato dal catalogo: ${entry.subtitle || entry.id}`);
    setTimeout(() => setToast(''), 3500);
  }, [isNew, searchParams]);

  // Auto-fill advanced JSON textarea when card changes (initial load & after save)
  useEffect(() => {
    setAdvancedJson(serialiseAdvanced(card));
  }, [initial]);

  // ---- Dirty state (unsaved changes)
  const isDirty = useMemo(() => JSON.stringify(card) !== JSON.stringify(initial), [card, initial]);

  // ---- Field helpers ----
  const setField = (path, value) => {
    setCard((prev) => setIn(prev, path, value));
  };

  const handleAdvancedChange = (val) => {
    setAdvancedJson(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError('');
      // Merge only the advanced keys back into card
      setCard((prev) => ({ ...prev, ...parsed }));
    } catch (e) {
      setJsonError(e.message);
    }
  };

  // ---- Save ----
  const validate = () => {
    if (!card.id) return 'Il campo ID è obbligatorio.';
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(card.id))
      return 'ID non valido. Usa solo lettere minuscole, cifre e trattini (es: "u-foot").';
    if (!card.ipa) return 'Il campo IPA è obbligatorio.';
    if (!card.displayIpa) return 'Il campo Display IPA è obbligatorio (es: /ʊ/).';
    if (!['vowel', 'consonant', 'diphthong'].includes(card.category)) return 'Categoria non valida.';
    if (jsonError) return `JSON avanzato non valido: ${jsonError}`;
    return '';
  };

  const save = async ({ publish } = {}) => {
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true); setError(''); setToast('');
    try {
      const payload = { ...card };
      if (publish !== undefined) payload.published = publish;

      let res, data;
      if (isNew) {
        res = await fetch(`${API}/api/admin/phonemes`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/api/admin/phonemes/${routeId}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
        throw new Error(detail);
      }
      data = await res.json();
      const merged = deepMerge(BLANK, data);
      setCard(merged);
      setInitial(merged);
      setToast('Scheda salvata correttamente ✓');

      if (isNew) {
        // Navigate to the edit URL so future saves are PUT
        navigate(`/admin/phonemes/${data.id}`, { replace: true });
      } else {
        // Phase E — auto-refresh readiness after every successful save
        fetchReadiness();
      }
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setError(`Errore salvataggio: ${e.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Phase D — Deterministic Autofill from canonical inventory ─────
  // Card.dialects on VF is ['AmE','RP']; canonical uses 'GenAm'/'RP'. Map here.
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillPreview, setAutofillPreview] = useState(null); // {features, knobs, classification, vowelChartPosition, source, dialectUsed}
  const [autofillError, setAutofillError] = useState('');

  // ─── Phase E — Readiness checklist ─────────────────────────────────
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState('');

  // ─── Phase F — AI drafting (Claude Sonnet 4.5 preview-only) ────────
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftPreview, setAiDraftPreview] = useState(null); // {drafts:{mnemonic,funFact}, model, dialect, ipa, status}
  const [aiDraftError, setAiDraftError] = useState('');
  const [aiDraftFields, setAiDraftFields] = useState({ mnemonic: true, funFact: true });

  const requestAiDraft = async () => {
    setAiDraftError('');
    setAiDraftPreview(null);
    if (isNew) {
      setAiDraftError('Salva prima la scheda: il draft AI legge il canonical inventory sull\'IPA salvato.');
      return;
    }
    const fields = Object.entries(aiDraftFields).filter(([, v]) => v).map(([k]) => k);
    if (fields.length === 0) {
      setAiDraftError('Seleziona almeno un campo da generare.');
      return;
    }
    setAiDraftLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${routeId}/ai-draft`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setAiDraftPreview(data);
    } catch (e) {
      setAiDraftError(e.message);
    } finally {
      setAiDraftLoading(false);
    }
  };

  const applyAiDraft = () => {
    if (!aiDraftPreview?.drafts) return;
    const drafts = aiDraftPreview.drafts;
    setCard((prev) => {
      const next = { ...prev };
      if (drafts.mnemonic) {
        const prevPhrase = prev.mnemonic?.phrase || '';
        const newPhrase = drafts.mnemonic.phrase || prevPhrase;
        // Clear audio when phrase changes — a recorded WAV no longer matches
        const newAudio = newPhrase === prevPhrase ? (prev.mnemonic?.audio || '') : '';
        next.mnemonic = {
          ...(prev.mnemonic || {}),
          phrase: newPhrase,
          highlights: drafts.mnemonic.highlights || prev.mnemonic?.highlights || [],
          note: drafts.mnemonic.note || prev.mnemonic?.note || '',
          audio: newAudio,
        };
      }
      if (drafts.funFact) {
        next.funFact = {
          ...(prev.funFact || {}),
          headline: drafts.funFact.headline || prev.funFact?.headline || '',
          body: drafts.funFact.body || prev.funFact?.body || '',
        };
      }
      return next;
    });
    const applied = Object.keys(drafts).join(', ');
    setAiDraftPreview(null);
    setToast(`Bozza AI applicata: ${applied} · rileggi e correggi prima di salvare.`);
    setTimeout(() => setToast(''), 4500);
  };

  const fetchReadiness = async () => {
    if (isNew) {
      setReadinessError('Salva prima la scheda per eseguire il check di readiness.');
      return;
    }
    setReadinessError('');
    setReadinessLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${routeId}/readiness`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReadiness(data);
    } catch (e) {
      setReadinessError(e.message);
    } finally {
      setReadinessLoading(false);
    }
  };

  // Auto-fetch readiness on card load
  useEffect(() => {
    if (isNew) return;
    if (!routeId) return;
    fetchReadiness();
  }, [routeId, isNew]);

  const canonicalDialectFor = (card_) => {
    const ds = card_.dialects || [];
    if (ds.includes('AmE') || ds.includes('GenAm')) return 'GenAm';
    if (ds.includes('RP')) return 'RP';
    return 'GenAm';
  };

  const requestAutofill = async () => {
    setAutofillError('');
    setAutofillPreview(null);
    if (!card.ipa) {
      setAutofillError('Compila prima il simbolo IPA.');
      return;
    }
    const dialect = canonicalDialectFor(card);
    setAutofillLoading(true);
    try {
      const url = `${API}/api/admin/phonemes/autofill?ipa=${encodeURIComponent(card.ipa)}&dialect=${dialect}`;
      const res = await fetch(url, { method: 'POST', headers: authHeaders() });
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setAutofillPreview({ ...data, dialectUsed: dialect });
    } catch (e) {
      setAutofillError(e.message);
    } finally {
      setAutofillLoading(false);
    }
  };

  const applyAutofill = () => {
    if (!autofillPreview) return;
    setCard((prev) => ({
      ...prev,
      features:  Array.isArray(autofillPreview.features)  && autofillPreview.features.length  ? autofillPreview.features  : prev.features,
      knobs:     Array.isArray(autofillPreview.knobs)     && autofillPreview.knobs.length     ? autofillPreview.knobs     : prev.knobs,
      classification: Array.isArray(autofillPreview.classification) && autofillPreview.classification.length ? autofillPreview.classification : prev.classification,
      vowelChartPosition: (autofillPreview.vowelChartPosition && Object.keys(autofillPreview.vowelChartPosition).length)
        ? autofillPreview.vowelChartPosition
        : prev.vowelChartPosition,
    }));
    const filled = [];
    if (autofillPreview.features?.length) filled.push('features');
    if (autofillPreview.knobs?.length) filled.push('knobs');
    if (autofillPreview.classification?.length) filled.push('classification');
    if (autofillPreview.vowelChartPosition && Object.keys(autofillPreview.vowelChartPosition).length) filled.push('vowelChartPosition');
    setAutofillPreview(null);
    setToast(`Autofill applicato: ${filled.join(', ')} · ricontrolla e salva.`);
    setTimeout(() => setToast(''), 4500);
  };

  // ─── Auto-save runner ─────────────────────────────────────
  // Silent save — never toggles publish, keeps current published state.
  // Skipped if: not in edit mode, not dirty, disabled, saving already, or JSON invalid.
  const autoSave = async () => {
    if (isNew || !autoSaveEnabled || autoSaveInFlightRef.current) return;
    if (!isDirty) return;
    if (jsonError) return;
    if (validate()) return;

    autoSaveInFlightRef.current = true;
    setAutoSaveStatus('saving');
    try {
      const res = await fetch(`${API}/api/admin/phonemes/${routeId}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(card),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const merged = deepMerge(BLANK, data);
      // Update `initial` so isDirty becomes false without disturbing the card ref
      setInitial(merged);
      setAutoSaveStatus('saved');
      setLastAutoSaveAt(new Date());
    } catch (e) {
      setAutoSaveStatus('error');
    } finally {
      autoSaveInFlightRef.current = false;
    }
  };

  // Debounced trigger — every dirty change resets a 30s timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (isNew || !autoSaveEnabled || !isDirty || jsonError) return;
    if (autoSaveStatus === 'saving') return;

    autoSaveTimerRef.current = setTimeout(() => { autoSave(); }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [card, isDirty, autoSaveEnabled, isNew, jsonError]);

  // ---- Guards ----
  if (loading) return <FullscreenNote text="Caricamento…" />;
  if (!user || user.role !== 'admin') {
    return (
      <FullscreenNote
        title="Accesso riservato"
        text="Solo gli amministratori possono modificare le schede fonetiche."
        cta={<Button onClick={() => navigate('/login')} className="bg-cyan-600 hover:bg-cyan-500">Vai al login</Button>}
      />
    );
  }
  if (fetching) return <FullscreenNote text="Caricamento scheda…" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      {/* Top nav */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-cyan-500/15">
        <div className="max-w-[1200px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/phonemes" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 transition flex-shrink-0" data-testid="editor-back-link">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:inline">Lista schede</span>
            </Link>
            <span className="text-cyan-500/30 hidden sm:inline">|</span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">
                {isNew ? 'Nuova scheda fonetica' : 'Modifica scheda'}
              </p>
              <p className="text-sm text-white font-black truncate">
                {card.displayIpa || (isNew ? '/nuovo/' : `/${routeId}/`)}
                {card.examples?.[0] && <span className="text-slate-400 font-medium"> — {card.examples[0]}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isNew && card.published && (
              <Link to={`/lms/phoneme/${card.id}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" data-testid="editor-preview-link">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Anteprima pubblica
                </Button>
              </Link>
            )}
            {isDirty && !saving && (
              <span className="hidden sm:inline text-xs text-amber-300 uppercase tracking-wider font-bold">● Modifiche non salvate</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 py-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="min-w-0">
        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm flex items-start gap-2" data-testid="editor-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {toast && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-3 text-emerald-300 text-sm flex items-center gap-2" data-testid="editor-toast">
            <Check className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        )}

        {/* ================== METADATA ================== */}
        <Section title="Informazioni principali" icon={<Info className="w-4 h-4" />} defaultOpen>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="ID (URL slug)" help="Solo minuscole, cifre e trattini. Non modificabile dopo la creazione." required>
              <Input
                value={card.id}
                onChange={(e) => setField('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="es. u-foot"
                disabled={!isNew}
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono"
                data-testid="editor-field-id"
              />
            </Field>
            <Field label="Categoria" required>
              <select
                value={card.category}
                onChange={(e) => setField('category', e.target.value)}
                className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                data-testid="editor-field-category"
              >
                <option value="vowel">Vocale</option>
                <option value="diphthong">Dittongo</option>
                <option value="consonant">Consonante</option>
              </select>
            </Field>
            <Field label="Simbolo IPA (nudo)" help="Solo il simbolo, senza slash. Es: ʊ  oppure  iː  oppure  θ" required>
              <Input
                value={card.ipa}
                onChange={(e) => setField('ipa', e.target.value)}
                placeholder="ʊ"
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-lg"
                data-testid="editor-field-ipa"
              />
            </Field>
            <Field label="Display IPA (con slash)" help="Come apparirà nella card. Es: /ʊ/  oppure  /iː/" required>
              <Input
                value={card.displayIpa}
                onChange={(e) => setField('displayIpa', e.target.value)}
                placeholder="/ʊ/"
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-lg"
                data-testid="editor-field-displayIpa"
              />
            </Field>
            <Field label="Sotto-categoria" help="Es: short-lax, long-tense, closing-diphthong, plosive…">
              <Input
                value={card.subcategory || ''}
                onChange={(e) => setField('subcategory', e.target.value)}
                placeholder="short-lax"
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-subcategory"
              />
            </Field>
            <Field label="Ordinamento" help="Numero: più basso = appare prima nella libreria">
              <Input
                type="number"
                value={card.order}
                onChange={(e) => setField('order', parseInt(e.target.value, 10) || 0)}
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-order"
              />
            </Field>
            <Field label="Esempi (Wells lexical set)" help="Le 3 parole chiave. Premi Invio per aggiungere.">
              <ChipInput
                value={card.examples}
                onChange={(v) => setField('examples', v)}
                placeholder="FOOT, BOOK, PUT"
                testId="editor-field-examples"
              />
            </Field>
            <Field label="Nota dialetto" help="Nota dialettale mostrata SOLO se compilata (sostituisce l'auto-tag dei dialetti). Lascia vuoto per usare l'elenco automatico AmE/RP.">
              <Input
                value={card.dialectNote || ''}
                onChange={(e) => setField('dialectNote', e.target.value)}
                placeholder="near identical AmE and RP"
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-dialectNote"
              />
            </Field>
            <Field label="Pubblicata" help="Se off, la scheda è in bozza e non appare nella library pubblica.">
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={card.published}
                  onCheckedChange={(v) => setField('published', v)}
                  data-testid="editor-field-published"
                />
                <span className={`text-sm font-bold ${card.published ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {card.published ? 'PUBBLICATA' : 'BOZZA'}
                </span>
              </div>
            </Field>
          </div>
        </Section>

        {/* ================== PHASE D — DETERMINISTIC AUTOFILL ================== */}
        <Section title="Autofill dal canonical (deterministico)" icon={<Wand2 className="w-4 h-4" />}>
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4 mb-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-orange-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-100/90 leading-relaxed">
                <p className="font-bold text-orange-200 mb-1">Precompilazione dall&apos;inventario canonical</p>
                <p>
                  Basato su <code className="text-cyan-300">canonical_phonemes</code>{' '}
                  ({(card.dialects || []).includes('AmE') ? 'GenAm' : 'RP'}). Nessun LLM, nessun dato inventato:
                  solo mappatura deterministica da IPA + dialetto → features / knobs / classification / vowel-chart position.
                  Puoi revisionare l&apos;anteprima e decidere se applicarla o annullare.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={requestAutofill}
              disabled={autofillLoading || !card.ipa}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
              data-testid="editor-autofill-request-btn"
            >
              {autofillLoading ? (
                <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Calcolo in corso…</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" />Ottieni anteprima autofill</>
              )}
            </Button>
            {card.ipa && (
              <span className="text-xs text-slate-400 font-mono">
                Sorgente: <span className="text-cyan-300">/{card.ipa}/</span> · dialetto <span className="text-cyan-300">{canonicalDialectFor(card)}</span>
              </span>
            )}
          </div>

          {autofillError && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2" data-testid="editor-autofill-error">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-200 leading-relaxed">{autofillError}</p>
            </div>
          )}

          {autofillPreview && (
            <div className="mt-5 rounded-xl border border-cyan-500/30 bg-slate-900/70 p-4" data-testid="editor-autofill-preview">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold">Anteprima autofill · {autofillPreview.dialectUsed}</p>
                  {autofillPreview.source?.lexical_set && (
                    <p className="text-xs text-slate-400 mt-1">Wells set: <span className="text-cyan-200 font-mono">{autofillPreview.source.lexical_set}</span></p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutofillPreview(null)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    data-testid="editor-autofill-cancel-btn"
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyAutofill}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                    data-testid="editor-autofill-apply-btn"
                  >
                    <Check className="w-4 h-4 mr-1.5" /> Applica al form
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                {autofillPreview.features?.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="editor-autofill-features">
                    <p className="text-[10px] text-cyan-300/70 uppercase tracking-wider font-bold mb-2">Features ({autofillPreview.features.length})</p>
                    <ul className="space-y-1">
                      {autofillPreview.features.map((f, i) => (
                        <li key={i} className="flex gap-2 text-slate-200">
                          <span className="text-cyan-400 font-bold min-w-[80px]">{f.label}:</span>
                          <span className="font-mono">{f.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {autofillPreview.knobs?.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="editor-autofill-knobs">
                    <p className="text-[10px] text-cyan-300/70 uppercase tracking-wider font-bold mb-2">Knobs ({autofillPreview.knobs.length})</p>
                    <ul className="space-y-1.5">
                      {autofillPreview.knobs.map((k, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-200">
                          <span className={`min-w-[100px] font-mono text-[10px] ${k.highlight ? 'text-orange-300 font-bold' : 'text-cyan-300'}`}>{k.label}</span>
                          <span className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <span className={`block h-full ${k.highlight ? 'bg-orange-400' : 'bg-cyan-400'}`} style={{ width: `${k.value}%` }} />
                          </span>
                          <span className="text-[10px] text-slate-400 min-w-[36px] text-right">{k.value}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {autofillPreview.classification?.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 md:col-span-2" data-testid="editor-autofill-classification">
                    <p className="text-[10px] text-cyan-300/70 uppercase tracking-wider font-bold mb-2">Classification ({autofillPreview.classification.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {autofillPreview.classification.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-mono text-[11px]">{c.label}</span>
                      ))}
                    </div>
                  </div>
                )}
                {autofillPreview.vowelChartPosition && Object.keys(autofillPreview.vowelChartPosition).length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="editor-autofill-position">
                    <p className="text-[10px] text-cyan-300/70 uppercase tracking-wider font-bold mb-2">Vowel chart position</p>
                    <p className="text-slate-200 font-mono">x: {autofillPreview.vowelChartPosition.x} · y: {autofillPreview.vowelChartPosition.y}</p>
                  </div>
                )}
                {autofillPreview.source?.notes && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 md:col-span-2">
                    <p className="text-[10px] text-amber-300/80 uppercase tracking-wider font-bold mb-1">Note canonical</p>
                    <p className="text-amber-100/90 italic text-[11px] leading-relaxed">{autofillPreview.source.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ================== PHASE E — READINESS CHECKLIST ================== */}
        <Section title="Readiness checklist (correctness)" icon={<Check className="w-4 h-4" />} defaultOpen>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {readiness ? (
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black" style={{ color: readiness.score >= 90 ? '#10b981' : readiness.score >= 70 ? '#fbbf24' : '#f43f5e' }} data-testid="editor-readiness-score">
                    {readiness.score}<span className="text-lg text-slate-500">/100</span>
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${readiness.ready ? 'text-emerald-400' : 'text-amber-400'}`} data-testid="editor-readiness-verdict">
                      {readiness.ready ? '✓ Pronta per pubblicazione' : '✗ Ci sono errori bloccanti'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {readiness.summary.pass} ok · {readiness.summary.warn} warning · <span className={readiness.summary.fail > 0 ? 'text-rose-400 font-bold' : ''}>{readiness.summary.fail} fail</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {isNew ? 'Salva la scheda per abilitare il check di readiness.' : 'Nessun report ancora. Premi "Ricalcola" per eseguirlo.'}
                </p>
              )}
            </div>
            <Button
              onClick={fetchReadiness}
              disabled={readinessLoading || isNew}
              variant="outline"
              size="sm"
              className="border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
              data-testid="editor-readiness-refresh-btn"
            >
              {readinessLoading ? (
                <><span className="inline-block w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin mr-2" />Analisi…</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-1.5" />Ricalcola</>
              )}
            </Button>
          </div>

          {readinessError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2 mb-3" data-testid="editor-readiness-error">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-200 leading-relaxed">{readinessError}</p>
            </div>
          )}

          {readiness && (
            <ul className="space-y-1.5" data-testid="editor-readiness-list">
              {readiness.checks.map((c) => {
                const color = c.status === 'pass' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
                            : c.status === 'warn' ? 'text-amber-300 border-amber-500/30 bg-amber-500/5'
                            : c.status === 'fail' ? 'text-rose-300 border-rose-500/30 bg-rose-500/5'
                            : 'text-slate-400 border-slate-700 bg-slate-800/40';
                const icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : c.status === 'fail' ? '✗' : '•';
                return (
                  <li
                    key={c.key}
                    className={`flex items-start gap-3 px-3 py-2 rounded-md border ${color}`}
                    data-testid={`editor-readiness-item-${c.key.replace(/\./g, '-')}`}
                  >
                    <span className="font-bold min-w-[16px] text-center">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{c.category} · {c.key}</p>
                      <p className="text-xs mt-0.5 leading-relaxed">{c.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ================== PHASE F — AI DRAFTING (Claude Sonnet 4.5) ================== */}
        <Section title="AI drafting · Claude Sonnet 4.5 (bozze)" icon={<Sparkles className="w-4 h-4" />}>
          <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-4 mb-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-fuchsia-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-fuchsia-100/90 leading-relaxed">
                <p className="font-bold text-fuchsia-200 mb-1">Bozze generate da LLM · sempre da revisionare</p>
                <p>
                  Il modello usa il profilo canonical (IPA + dialetto + Wells set) come ground truth e non
                  può inventare feature fonetiche. Ogni bozza porta un flag <code className="text-orange-300">confidence</code>{' '}
                  e <b>non viene salvata automaticamente</b> — tu decidi se applicarla e poi correggerla prima di{' '}
                  <i>Salva</i>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Switch
                checked={aiDraftFields.mnemonic}
                onCheckedChange={(v) => setAiDraftFields((s) => ({ ...s, mnemonic: v }))}
                data-testid="editor-aidraft-toggle-mnemonic"
              />
              <span className={aiDraftFields.mnemonic ? 'text-fuchsia-200 font-bold' : 'text-slate-500'}>Mnemonic</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Switch
                checked={aiDraftFields.funFact}
                onCheckedChange={(v) => setAiDraftFields((s) => ({ ...s, funFact: v }))}
                data-testid="editor-aidraft-toggle-funFact"
              />
              <span className={aiDraftFields.funFact ? 'text-fuchsia-200 font-bold' : 'text-slate-500'}>Fun fact</span>
            </label>
            <Button
              onClick={requestAiDraft}
              disabled={aiDraftLoading || isNew}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold"
              data-testid="editor-aidraft-request-btn"
            >
              {aiDraftLoading ? (
                <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Genero bozza…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Genera bozza AI</>
              )}
            </Button>
          </div>

          {aiDraftError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2 mb-3" data-testid="editor-aidraft-error">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-200 leading-relaxed">{aiDraftError}</p>
            </div>
          )}

          {aiDraftPreview && (
            <div className="rounded-xl border border-fuchsia-500/30 bg-slate-900/70 p-4" data-testid="editor-aidraft-preview">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <p className="text-[10px] text-fuchsia-300/80 uppercase tracking-widest font-bold">
                    Bozza · {aiDraftPreview.dialect} · <span className="text-slate-400 normal-case font-mono">{aiDraftPreview.model}</span>
                  </p>
                  <p className="text-[10px] text-amber-300/70 mt-0.5 italic">Rileggi con attenzione prima di applicare.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setAiDraftPreview(null)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    data-testid="editor-aidraft-cancel-btn"
                  >
                    Scarta
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyAiDraft}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                    data-testid="editor-aidraft-apply-btn"
                  >
                    <Check className="w-4 h-4 mr-1.5" /> Applica al form
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {aiDraftPreview.drafts?.mnemonic && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="editor-aidraft-mnemonic">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-fuchsia-300/80 uppercase tracking-wider font-bold">Mnemonic</p>
                      <ConfidencePill value={aiDraftPreview.drafts.mnemonic.confidence} />
                    </div>
                    <p className="text-sm text-slate-100 italic mb-2">&ldquo;{aiDraftPreview.drafts.mnemonic.phrase}&rdquo;</p>
                    {Array.isArray(aiDraftPreview.drafts.mnemonic.highlights) && aiDraftPreview.drafts.mnemonic.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {aiDraftPreview.drafts.mnemonic.highlights.map((h, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 text-[11px] font-mono">{h}</span>
                        ))}
                      </div>
                    )}
                    {aiDraftPreview.drafts.mnemonic.note && (
                      <p className="text-xs text-slate-400 leading-relaxed">{aiDraftPreview.drafts.mnemonic.note}</p>
                    )}
                  </div>
                )}
                {aiDraftPreview.drafts?.funFact && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="editor-aidraft-funFact">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-fuchsia-300/80 uppercase tracking-wider font-bold">Fun fact</p>
                      <ConfidencePill value={aiDraftPreview.drafts.funFact.confidence} />
                    </div>
                    <p className="text-sm text-cyan-200 font-bold mb-1">{aiDraftPreview.drafts.funFact.headline}</p>
                    <p className="text-xs text-slate-200 leading-relaxed">{aiDraftPreview.drafts.funFact.body}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ================== VIDEO LESSON ================== */}
        <Section title="Video-lezione (opzionale)" icon={<Video className="w-4 h-4" />}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="YouTube Video ID" help="Solo l'ID (es: da https://youtu.be/0-aau56RM9I → 0-aau56RM9I). Lascia vuoto per rimuovere.">
              <Input
                value={card.videoLesson?.id || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setField('videoLesson', val ? { id: val, title: card.videoLesson?.title || '' } : null);
                }}
                placeholder="0-aau56RM9I"
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono"
                data-testid="editor-field-videoLesson-id"
              />
            </Field>
            <Field label="Titolo video">
              <Input
                value={card.videoLesson?.title || ''}
                onChange={(e) => setField('videoLesson', { ...(card.videoLesson || { id: '' }), title: e.target.value })}
                placeholder="L'arte del fonema /ʊ/ — anteprima della video-lezione"
                disabled={!card.videoLesson?.id}
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-videoLesson-title"
              />
            </Field>
          </div>
        </Section>

        {/* ================== ASSETS ================== */}
        <Section title="Immagini della scheda" icon={<ImageIcon className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Carica le 4 immagini anatomiche direttamente (trascina un file oppure clicca &quot;Upload&quot;), o incolla un URL esistente.
          </p>
          <div className="grid gap-5">
            {[
              ['sideView',       'Side view (sagittale)', 'Vista laterale — sfondo della card principale. Usata anche dall\'editor visuale hotspot.'],
              ['frontView',      'Front view (frontale)', 'Attivazione muscoli facciali — mostrata nel modal front-view.'],
              ['frontViewClean', 'Front view — clean',    'Ritaglio circolare per la miniatura HUD sulla card principale.'],
              ['articulatory',   'Articulatory deep-dive', 'Diagramma articolatorio dettagliato — modal "Deep dive".'],
            ].map(([key, label, help]) => (
              <Field key={key} label={label} help={help}>
                <ImageUploader
                  value={card.assets?.[key] || ''}
                  onChange={(url) => setField(['assets', key], url)}
                  placeholder="Trascina un'immagine qui, clicca Upload, o incolla un URL"
                  testId={`editor-field-assets-${key}`}
                />
              </Field>
            ))}
          </div>
        </Section>

        {/* ================== BULK AUDIO GENERATOR ================== */}
        <Section title="Generatore audio ElevenLabs (bulk)" icon={<Wand2 className="w-4 h-4" />}>
          <BulkAudioGenerator
            card={card}
            onFieldChange={setField}
          />
        </Section>

        {/* ================== AUDIO ================== */}
        <Section title="Audio (ElevenLabs / altro)" icon={<Volume2 className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            URL dei file audio isolati e delle 3 frasi di esempio per ogni dialetto. Vai su ElevenLabs o carica i file
            in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">/api/uploads/elevenlabs/…</code>.
          </p>
          {['AmE', 'RP'].map((dialect) => (
            <div key={dialect} className="mb-5">
              <p className="text-[11px] uppercase tracking-widest text-cyan-300 font-bold mb-2">
                {dialect === 'AmE' ? '🇺🇸 American English' : '🇬🇧 British RP'}
              </p>
              <div className="grid gap-3">
                <Field label="Fonema isolato">
                  <Input
                    value={card.audio?.[dialect]?.isolated || ''}
                    onChange={(e) => setField(['audio', dialect, 'isolated'], e.target.value)}
                    placeholder="/api/uploads/elevenlabs/…mp3"
                    className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                    data-testid={`editor-field-audio-${dialect}-isolated`}
                  />
                </Field>
                {[0, 1, 2].map((i) => (
                  <Field key={i} label={`Esempio ${i + 1}${card.exampleSentences?.[i]?.text ? ` — "${card.exampleSentences[i].text}"` : ''}`}>
                    <Input
                      value={card.audio?.[dialect]?.examples?.[i] || ''}
                      onChange={(e) => {
                        const arr = [...(card.audio?.[dialect]?.examples || ['', '', ''])];
                        arr[i] = e.target.value;
                        setField(['audio', dialect, 'examples'], arr);
                      }}
                      placeholder="/api/uploads/elevenlabs/…mp3"
                      className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                      data-testid={`editor-field-audio-${dialect}-ex${i}`}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ================== EXAMPLE SENTENCES ================== */}
        <Section title="Frasi di esempio (3)" icon={<Type className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Le 3 frasi mostrate sotto la card principale. Le parole in &quot;highlights&quot; verranno colorate in arancione.
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-3 p-3 border border-slate-800 rounded-lg">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Frase {i + 1}</p>
              <div className="grid gap-2">
                <Input
                  value={card.exampleSentences?.[i]?.text || ''}
                  onChange={(e) => {
                    const arr = [...(card.exampleSentences || [{}, {}, {}])];
                    arr[i] = { ...(arr[i] || {}), text: e.target.value };
                    setField('exampleSentences', arr);
                  }}
                  placeholder="Put the book down."
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  data-testid={`editor-field-sentence-${i}-text`}
                />
                <ChipInput
                  value={card.exampleSentences?.[i]?.highlights || []}
                  onChange={(v) => {
                    const arr = [...(card.exampleSentences || [{}, {}, {}])];
                    arr[i] = { ...(arr[i] || {}), highlights: v };
                    setField('exampleSentences', arr);
                  }}
                  placeholder="Parole da evidenziare: Put, book…"
                  testId={`editor-field-sentence-${i}-highlights`}
                />
              </div>
            </div>
          ))}
        </Section>

        {/* ================== MNEMONIC ================== */}
        <Section title="Frase mnemonica" icon={<Sparkles className="w-4 h-4" />}>
          <div className="grid gap-4">
            <Field label="Frase" help="La frase mnemonica principale mostrata al centro della card.">
              <Textarea
                value={card.mnemonic?.phrase || ''}
                onChange={(e) => setField(['mnemonic', 'phrase'], e.target.value)}
                placeholder="Pull the wool, push the hood, put the foot."
                rows={2}
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-mnemonic-phrase"
              />
            </Field>
            <Field label="Parole da evidenziare">
              <ChipInput
                value={card.mnemonic?.highlights || []}
                onChange={(v) => setField(['mnemonic', 'highlights'], v)}
                placeholder="pull, wool, push, hood, put, foot"
                testId="editor-field-mnemonic-highlights"
              />
            </Field>
            <Field label="Nota didattica">
              <Textarea
                value={card.mnemonic?.note || ''}
                onChange={(e) => setField(['mnemonic', 'note'], e.target.value)}
                placeholder="Repeat slowly five times…"
                rows={2}
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-field-mnemonic-note"
              />
            </Field>
            <Field label="Audio (URL)" help="⚠️ Se hai modificato la frase mnemonica, l'audio potrebbe non corrispondere più. Svuota il campo e rigenera con ElevenLabs.">
              <div className="flex gap-2">
                <Input
                  value={card.mnemonic?.audio || ''}
                  onChange={(e) => setField(['mnemonic', 'audio'], e.target.value)}
                  placeholder="/api/uploads/elevenlabs/…mp3"
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs flex-1"
                  data-testid="editor-field-mnemonic-audio"
                />
                {card.mnemonic?.audio && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setField(['mnemonic', 'audio'], '')}
                    className="border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                    data-testid="editor-field-mnemonic-audio-clear"
                    title="Svuota audio (utile quando la frase è cambiata)"
                  >
                    Svuota
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Section>

        {/* ================== PRONUNCIATION GUIDE ================== */}
        <Section title="Guida alla pronuncia" icon={<GraduationCap className="w-4 h-4" />}>
          <Field label="Titolo blocco">
            <Input
              value={card.pronunciationGuide?.headline || ''}
              onChange={(e) => setField(['pronunciationGuide', 'headline'], e.target.value)}
              placeholder="Vocal Fitness articulatory protocol"
              className="bg-slate-900 border-slate-700 text-slate-100"
              data-testid="editor-field-guide-headline"
            />
          </Field>
          <Repeater
            label="Passaggi"
            items={card.pronunciationGuide?.steps || []}
            onChange={(items) => setField(['pronunciationGuide', 'steps'], items)}
            template={{ label: '', body: '' }}
            testId="editor-guide-steps"
            renderItem={(item, upd, i) => (
              <div className="grid sm:grid-cols-4 gap-2">
                <Input
                  value={item.label || ''}
                  onChange={(e) => upd({ ...item, label: e.target.value })}
                  placeholder="Jaw"
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  data-testid={`editor-guide-step-${i}-label`}
                />
                <Textarea
                  value={item.body || ''}
                  onChange={(e) => upd({ ...item, body: e.target.value })}
                  placeholder="Open the mouth slightly…"
                  rows={2}
                  className="sm:col-span-3 bg-slate-900 border-slate-700 text-slate-100"
                  data-testid={`editor-guide-step-${i}-body`}
                />
              </div>
            )}
          />
        </Section>

        {/* ================== HOTSPOTS ================== */}
        <Section title="Hotspot anatomici" icon={<MapPin className="w-4 h-4" />}>
          <HotspotSection
            image={card.assets?.sideView}
            hotspots={card.hotspots || []}
            onChange={(items) => setField('hotspots', items)}
          />
        </Section>

        {/* ================== COMMON WORDS ================== */}
        <Section title="Parole comuni (con audio)" icon={<BookOpen className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Le parole più frequenti che contengono questo fonema. Consigliate: 20–30 elementi.
          </p>
          <Repeater
            label="Parola"
            items={card.commonWords || []}
            onChange={(items) => setField('commonWords', items)}
            template={{ w: '', ipa: '', audio: '' }}
            testId="editor-common-words"
            compact
            renderItem={(item, upd, i) => (
              <div className="grid sm:grid-cols-6 gap-2">
                <Input value={item.w || ''} onChange={(e) => upd({ ...item, w: e.target.value })} placeholder="look" className="sm:col-span-1 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-cw-${i}-w`} />
                <Input value={item.ipa || ''} onChange={(e) => upd({ ...item, ipa: e.target.value })} placeholder="/lʊk/" className="sm:col-span-2 bg-slate-900 border-slate-700 text-slate-100 font-mono" data-testid={`editor-cw-${i}-ipa`} />
                <Input value={item.audio || ''} onChange={(e) => upd({ ...item, audio: e.target.value })} placeholder="/api/uploads/…mp3" className="sm:col-span-3 bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs" data-testid={`editor-cw-${i}-audio`} />
              </div>
            )}
          />
        </Section>

        {/* ================== SPELLINGS ================== */}
        <Section title="Ortografia (spellings)" icon={<FileText className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Come questo fonema viene scritto in inglese — con frequenza in percentuale e alcuni esempi.
          </p>
          <Repeater
            label="Grafia"
            items={card.spellings || []}
            onChange={(items) => setField('spellings', items)}
            template={{ letters: '', percent: 0, examples: '' }}
            testId="editor-spellings"
            compact
            renderItem={(item, upd, i) => (
              <div className="grid sm:grid-cols-8 gap-2">
                <Input value={item.letters || ''} onChange={(e) => upd({ ...item, letters: e.target.value })} placeholder="oo" className="sm:col-span-2 bg-slate-900 border-slate-700 text-slate-100 font-mono" data-testid={`editor-spelling-${i}-letters`} />
                <div className="sm:col-span-2 flex items-center gap-2">
                  <Input type="number" min="0" max="100" value={item.percent ?? 0} onChange={(e) => upd({ ...item, percent: parseInt(e.target.value, 10) || 0 })} className="bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-spelling-${i}-percent`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
                <Input value={item.examples || ''} onChange={(e) => upd({ ...item, examples: e.target.value })} placeholder="foot, book, look" className="sm:col-span-4 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-spelling-${i}-examples`} />
              </div>
            )}
          />
        </Section>

        {/* ================== FREQUENCY CHART (Phase C — read-only) ================== */}
        <Section title="Grafico di frequenza · read-only" icon={<Palette className="w-4 h-4" />}>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 mb-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-cyan-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-cyan-100/90 leading-relaxed">
                <p className="font-bold text-cyan-200 mb-1">Bloccato dal Phase C</p>
                <p>
                  Il grafico è ora <b>calcolato automaticamente</b> dal <code className="text-orange-300">canonical_phonemes</code> inventory
                  (rank di frequenza reale per categoria + dialetto). Non è più possibile inserire percentuali arbitrarie o IPA a mano
                  per evitare corruzione dei dati fonetici. <b className="text-cyan-200">Salva la scheda per ricalcolare</b> il grafico dopo aver
                  modificato IPA, categoria o dialetti.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold mb-3">Anteprima calcolata</p>
            {Array.isArray(card.frequencyChart) && card.frequencyChart.length > 0 ? (
              <div className="h-28 flex items-end gap-2 justify-around" data-testid="editor-freq-preview">
                {card.frequencyChart.map((b, i) => (
                  <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full flex-1">
                    <div
                      className={`w-3 rounded-sm transition-all duration-700 ${b.active ? 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.7)]' : 'bg-slate-500/70'}`}
                      style={{ height: `${b.height}%` }}
                      data-testid={`editor-freq-bar-${i}`}
                    />
                    <span className={`text-[10px] font-mono ${b.active ? 'text-orange-400 font-bold' : 'text-slate-400'}`}>/{b.ipa}/</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Nessun dato canonical per <code className="text-cyan-300">{card.ipa || '?'}</code> ({card.category}, dialetto {(card.dialects || []).join('/')}).
                Verifica che la categoria e il simbolo IPA siano corretti.
              </p>
            )}
          </div>
        </Section>

        {/* ================== FEATURES ================== */}
        <Section title="Features articolatorie" icon={<Info className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Tabella di attributi mostrata sulla card. Coppie etichetta/valore.
          </p>
          <Repeater
            label="Feature"
            items={card.features || []}
            onChange={(items) => setField('features', items)}
            template={{ label: '', value: '' }}
            testId="editor-features"
            compact
            renderItem={(item, upd, i) => {
              const isHeight = HEIGHT_LABEL_ALIASES.includes((item.label || '').trim().toLowerCase());
              return (
                <div className="grid sm:grid-cols-3 gap-2">
                  <Input value={item.label || ''} onChange={(e) => upd({ ...item, label: e.target.value })} placeholder="Height" className="bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-feature-${i}-label`} />
                  {isHeight ? (
                    <select
                      value={HEIGHT_TERMS.includes(item.value) ? item.value : ''}
                      onChange={(e) => upd({ ...item, value: e.target.value })}
                      className="sm:col-span-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-md h-10 px-3 text-sm"
                      data-testid={`editor-feature-${i}-value`}
                    >
                      <option value="">— Seleziona altezza IPA —</option>
                      {HEIGHT_TERMS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  ) : (
                    <Input value={item.value || ''} onChange={(e) => upd({ ...item, value: e.target.value })} placeholder="Near-close" className="sm:col-span-2 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-feature-${i}-value`} />
                  )}
                </div>
              );
            }}
          />
        </Section>

        {/* ================== KNOBS ================== */}
        <Section title="Manopole (knobs)" icon={<Palette className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Le 4 &quot;manopole&quot; visive sotto la card (Advancement / Tenseness / Height / Roundness).
            Valore da 0 a 100. Marca <code className="text-cyan-300">highlight</code> per le manopole distintive del fonema.
          </p>
          <Repeater
            label="Manopola"
            items={card.knobs || []}
            onChange={(items) => setField('knobs', items)}
            template={{ id: '', label: '', value: 50, valueLabel: '', highlight: false }}
            testId="editor-knobs"
            renderItem={(item, upd, i) => {
              const isHeight = (item.id || '').trim().toLowerCase() === 'height'
                || HEIGHT_LABEL_ALIASES.includes((item.label || '').trim().toLowerCase());
              return (
              <div className="grid gap-2">
                <div className="grid sm:grid-cols-4 gap-2">
                  <Input value={item.id || ''} onChange={(e) => upd({ ...item, id: e.target.value })} placeholder="height" className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs" data-testid={`editor-knob-${i}-id`} />
                  <Input value={item.label || ''} onChange={(e) => upd({ ...item, label: e.target.value })} placeholder="HEIGHT" className="bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-knob-${i}-label`} />
                  {isHeight ? (
                    <select
                      value={HEIGHT_TERMS.includes(item.valueLabel) ? item.valueLabel : ''}
                      onChange={(e) => upd({ ...item, valueLabel: e.target.value })}
                      className="bg-slate-900 border border-slate-700 text-slate-100 rounded-md h-10 px-3 text-sm"
                      data-testid={`editor-knob-${i}-valueLabel`}
                    >
                      <option value="">— altezza IPA —</option>
                      {HEIGHT_TERMS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  ) : (
                    <Input value={item.valueLabel || ''} onChange={(e) => upd({ ...item, valueLabel: e.target.value })} placeholder="near-close" className="bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-knob-${i}-valueLabel`} />
                  )}
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <Switch checked={!!item.highlight} onCheckedChange={(v) => upd({ ...item, highlight: v })} data-testid={`editor-knob-${i}-highlight`} />
                    <span className={item.highlight ? 'text-orange-300 font-bold' : 'text-slate-500'}>Distintiva</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="0" max="100"
                    value={item.value ?? 50}
                    onChange={(e) => upd({ ...item, value: parseInt(e.target.value, 10) || 0 })}
                    className="flex-1 accent-cyan-500"
                    data-testid={`editor-knob-${i}-value-range`}
                  />
                  <Input type="number" min="0" max="100" value={item.value ?? 50} onChange={(e) => upd({ ...item, value: parseInt(e.target.value, 10) || 0 })} className="w-20 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-knob-${i}-value`} />
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
              );
            }}
          />
        </Section>

        {/* ================== FACIAL MUSCLES ================== */}
        <Section title="Muscoli facciali" icon={<Sparkles className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Elenco muscoli con attivazione — mostrato nel modal &quot;Facial muscles&quot;.
          </p>
          <Repeater
            label="Muscolo"
            items={card.facialMuscles || []}
            onChange={(items) => setField('facialMuscles', items)}
            template={{ name: '', activation: 'MODERATE', detail: '' }}
            testId="editor-facialMuscles"
            compact
            renderItem={(item, upd, i) => (
              <div className="grid sm:grid-cols-6 gap-2">
                <Input value={item.name || ''} onChange={(e) => upd({ ...item, name: e.target.value })} placeholder="Orbicularis oris" className="sm:col-span-2 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-muscle-${i}-name`} />
                <select
                  value={ACTIVATION_TERMS.includes((item.activation || '').toUpperCase()) ? item.activation.toUpperCase() : ''}
                  onChange={(e) => upd({ ...item, activation: e.target.value })}
                  className="sm:col-span-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-md h-10 px-3 text-sm font-bold"
                  data-testid={`editor-muscle-${i}-activation`}
                >
                  <option value="">—</option>
                  {ACTIVATION_TERMS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <Input value={item.detail || ''} onChange={(e) => upd({ ...item, detail: e.target.value })} placeholder="rounding" className="sm:col-span-3 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-muscle-${i}-detail`} />
              </div>
            )}
          />
        </Section>

        {/* ================== CLASSIFICATION ================== */}
        <Section title="Classificazione (etichette + tooltip)" icon={<Layers className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Le etichette-chip mostrate sotto la card (es: Near-close · Back · Relaxed · Monophthong). Ogni etichetta ha un tooltip esplicativo al passaggio del mouse.
          </p>
          <Repeater
            label="Etichetta"
            items={card.classification || []}
            onChange={(items) => setField('classification', items)}
            template={{ label: '', tooltip: '' }}
            testId="editor-classification"
            compact
            renderItem={(item, upd, i) => (
              <div className="grid sm:grid-cols-5 gap-2">
                <Input value={item.label || ''} onChange={(e) => upd({ ...item, label: e.target.value })} placeholder="Near-close" className="sm:col-span-2 bg-slate-900 border-slate-700 text-slate-100" data-testid={`editor-cls-${i}-label`} />
                <Textarea value={item.tooltip || ''} onChange={(e) => upd({ ...item, tooltip: e.target.value })} rows={2} placeholder="Descrizione mostrata nel tooltip…" className="sm:col-span-3 bg-slate-900 border-slate-700 text-slate-100 text-xs" data-testid={`editor-cls-${i}-tooltip`} />
              </div>
            )}
          />
        </Section>

        {/* ================== FUN FACT ================== */}
        <Section title="Curiosità (funFact)" icon={<Sparkles className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Blocco &quot;Statistical curiosity&quot; opzionale mostrato sulla card. Lascia vuoto per non mostrarlo.
          </p>
          <div className="grid gap-3">
            <Field label="Titolo">
              <Input
                value={card.funFact?.headline || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setField('funFact', val || card.funFact?.body ? { ...(card.funFact || {}), headline: val } : null);
                }}
                placeholder="Statistical curiosity"
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-funFact-headline"
              />
            </Field>
            <Field label="Testo">
              <Textarea
                value={card.funFact?.body || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setField('funFact', val || card.funFact?.headline ? { ...(card.funFact || {}), body: val } : null);
                }}
                rows={3}
                placeholder="Testo della curiosità…"
                className="bg-slate-900 border-slate-700 text-slate-100"
                data-testid="editor-funFact-body"
              />
            </Field>
            {!(card.funFact?.headline || card.funFact?.body) && (
              <p className="text-[10px] text-slate-500 italic">
                Nessuna curiosità impostata — il blocco non apparirà sulla card pubblica.
              </p>
            )}
          </div>
        </Section>

        {/* ================== VOWEL CHART POSITION ================== */}
        <Section title="Posizione nella tabella vocalica (vowelChartPosition)" icon={<MapPin className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Coordinate (0–100) sulla vowel chart. X: fronte→retro (0=front, 100=back). Y: alto→basso (0=close, 100=open).
            Usato solo per vocali e dittonghi.
          </p>
          <div className="grid sm:grid-cols-[240px,1fr] gap-4 items-start">
            {/* Mini visual picker */}
            <div className="relative rounded-lg border border-slate-700 bg-slate-950 aspect-square overflow-hidden" data-testid="editor-vowelPos-picker">
              {/* Grid overlay */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-30">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border border-slate-700/60" />
                ))}
              </div>
              {/* Axis labels */}
              <span className="absolute top-1 left-1 text-[9px] text-slate-500 uppercase font-bold">front · close</span>
              <span className="absolute top-1 right-1 text-[9px] text-slate-500 uppercase font-bold">back · close</span>
              <span className="absolute bottom-1 left-1 text-[9px] text-slate-500 uppercase font-bold">front · open</span>
              <span className="absolute bottom-1 right-1 text-[9px] text-slate-500 uppercase font-bold">back · open</span>
              {/* Dot */}
              <div
                className="absolute w-4 h-4 bg-orange-400 border-2 border-orange-100 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_14px_rgba(251,146,60,0.9)]"
                style={{
                  left:  `${card.vowelChartPosition?.x ?? 50}%`,
                  top:   `${card.vowelChartPosition?.y ?? 50}%`,
                }}
              />
              {/* Click-to-set */}
              <button
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top)  / rect.height) * 100));
                  setField('vowelChartPosition', { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) });
                }}
                className="absolute inset-0 cursor-crosshair"
                title="Clicca per impostare la posizione"
                data-testid="editor-vowelPos-click"
              />
            </div>
            <div className="grid gap-3">
              <Field label="X (front→back, 0–100)">
                <Input type="number" step="0.1" min="0" max="100"
                  value={card.vowelChartPosition?.x ?? 50}
                  onChange={(e) => setField('vowelChartPosition', { ...(card.vowelChartPosition || {}), x: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  data-testid="editor-vowelPos-x"
                />
              </Field>
              <Field label="Y (close→open, 0–100)">
                <Input type="number" step="0.1" min="0" max="100"
                  value={card.vowelChartPosition?.y ?? 50}
                  onChange={(e) => setField('vowelChartPosition', { ...(card.vowelChartPosition || {}), y: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  data-testid="editor-vowelPos-y"
                />
              </Field>
              <p className="text-[10px] text-slate-500 italic">
                💡 Clicca sulla griglia a sinistra per impostare la posizione visivamente.
              </p>
            </div>
          </div>
        </Section>

        {/* ================== EXPERT MODE — JSON FALLBACK ================== */}
        <Section title="Expert mode — JSON avanzato" icon={<Palette className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Modifica diretta di tutti i campi di visualizzazione come JSON — solo per casi edge o import/export massivi.
            Le modifiche fatte qui sostituiscono quelle degli editor sopra.
          </p>
          <Textarea
            value={advancedJson}
            onChange={(e) => handleAdvancedChange(e.target.value)}
            rows={16}
            className="bg-slate-950 border-slate-700 text-slate-100 font-mono text-xs leading-relaxed"
            spellCheck={false}
            data-testid="editor-field-advanced-json"
          />
          {jsonError && (
            <p className="mt-2 text-xs text-red-300 flex items-center gap-1.5" data-testid="editor-json-error">
              <AlertCircle className="w-3.5 h-3.5" />
              JSON non valido: {jsonError}
            </p>
          )}
        </Section>
          </div>

          {/* ── Right column: sticky live preview ── */}
          <PhonemeLivePreview
            card={card}
            cardId={isNew ? null : routeId}
            isDirty={isDirty}
            isSaved={!isNew && !isDirty}
          />
        </div>
      </div>

      {/* Sticky footer with actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="text-slate-400">
              {isDirty
                ? <span className="text-amber-300 font-bold">● Modifiche non salvate</span>
                : <span className="text-slate-500">Nessuna modifica pendente</span>}
            </div>
            {!isNew && (
              <AutoSaveIndicator
                enabled={autoSaveEnabled}
                onToggle={() => setAutoSaveEnabled((v) => !v)}
                status={autoSaveStatus}
                lastAt={lastAutoSaveAt}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => save({ publish: false })}
              disabled={saving || !!jsonError}
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
              data-testid="editor-save-draft"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Salva come bozza
            </Button>
            <Button
              onClick={() => save({ publish: true })}
              disabled={saving || !!jsonError}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-bold hover:scale-[1.03] transition"
              data-testid="editor-save-publish"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              {saving ? 'Salvataggio…' : 'Salva e pubblica'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : [path];
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : { ...(next || {}) };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

function deepMerge(a, b) {
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
  const out = { ...a };
  Object.keys(b).forEach((k) => {
    out[k] = isObj(a[k]) && isObj(b[k]) ? deepMerge(a[k], b[k]) : b[k];
  });
  return out;
}

const ADVANCED_KEYS = ['spellings', 'features', 'knobs', 'facialMuscles', 'classification', 'funFact', 'vowelChartPosition'];
function serialiseAdvanced(card) {
  const subset = {};
  ADVANCED_KEYS.forEach((k) => { subset[k] = card[k]; });
  return JSON.stringify(subset, null, 2);
}

// ============================================================
// Sub-components
// ============================================================
function FullscreenNote({ title, text, cta }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        {title && <h2 className="text-2xl font-black text-white mb-3">{title}</h2>}
        <p className="text-slate-400 mb-6">{text}</p>
        {cta}
      </div>
    </div>
  );
}

function Section({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-900 transition"
        data-testid={`editor-section-toggle-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`}
      >
        <span className="inline-flex items-center gap-2 text-cyan-100 font-bold">
          <span className="text-cyan-300">{icon}</span>
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-800 pt-5">{children}</div>}
    </div>
  );
}

function Field({ label, help, required, children }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-slate-300 font-bold">
        {label}{required && <span className="text-orange-400 ml-1">*</span>}
      </Label>
      {children}
      {help && <p className="text-[11px] text-slate-500 italic">{help}</p>}
    </div>
  );
}

// ============================================================
// AutoSaveIndicator — subtle status + on/off toggle in the sticky footer
// ============================================================
function AutoSaveIndicator({ enabled, onToggle, status, lastAt }) {
  const time = lastAt ? lastAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <div className="flex items-center gap-2" data-testid="autosave-indicator">
      <button
        type="button"
        onClick={onToggle}
        title={enabled ? 'Disattiva salvataggio automatico' : 'Attiva salvataggio automatico ogni 30s'}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border transition ${
          enabled
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300'
        }`}
        data-testid="autosave-toggle"
      >
        {enabled ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        Autosave {enabled ? 'ON' : 'OFF'}
      </button>
      {enabled && (
        <span className="text-[10px] text-slate-500" data-testid="autosave-status">
          {status === 'saving' && (
            <span className="text-cyan-300 inline-flex items-center gap-1"><Wand2 className="w-3 h-3 animate-pulse" />Salvataggio…</span>
          )}
          {status === 'saved' && time && (
            <span className="text-emerald-300">✓ Salvato alle {time}</span>
          )}
          {status === 'error' && (
            <span className="text-red-300">⚠ Errore autosave</span>
          )}
          {status === 'idle' && (
            <span className="text-slate-500">ogni 30s dopo l&apos;ultima modifica</span>
          )}
        </span>
      )}
    </div>
  );
}

// ============================================================
// HotspotSection — toggle between visual editor and tabular editor
// ============================================================
function HotspotSection({ image, hotspots, onChange }) {
  const [mode, setMode] = useState('visual'); // 'visual' | 'table'

  return (
    <div>
      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 mb-4 w-fit" data-testid="editor-hotspots-mode-toggle">
        <button
          type="button"
          onClick={() => setMode('visual')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
            mode === 'visual' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
          }`}
          data-testid="editor-hotspots-mode-visual"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          Editor visuale
        </button>
        <button
          type="button"
          onClick={() => setMode('table')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
            mode === 'table' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
          }`}
          data-testid="editor-hotspots-mode-table"
        >
          <ListTree className="w-3.5 h-3.5" />
          Tabellare
        </button>
        <span className="ml-2 text-[10px] text-slate-500 pr-2">{hotspots.length} hotspot</span>
      </div>

      {mode === 'visual' ? (
        <HotspotVisualEditor
          image={image}
          hotspots={hotspots}
          onChange={onChange}
          testId="editor-hotspots-visual"
        />
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Modalità tabellare — utile per import/export massivi o correzioni testuali. Passa a &quot;Editor visuale&quot; per trascinare i punti direttamente sull&apos;immagine.
          </p>
          <Repeater
            label="Hotspot"
            items={hotspots}
            onChange={onChange}
            template={{ id: '', x: 50, y: 50, label: '', title: '', role: '', detail: '', anatomy: '', kineticCue: '' }}
            testId="editor-hotspots"
            renderItem={(item, upd) => (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input value={item.id || ''} onChange={(e) => upd({ ...item, id: e.target.value })} placeholder="id (velum-raised)" className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs" />
                  <Input type="number" step="0.1" value={item.x ?? ''} onChange={(e) => upd({ ...item, x: parseFloat(e.target.value) || 0 })} placeholder="X (0-100)" className="bg-slate-900 border-slate-700 text-slate-100" />
                  <Input type="number" step="0.1" value={item.y ?? ''} onChange={(e) => upd({ ...item, y: parseFloat(e.target.value) || 0 })} placeholder="Y (0-100)" className="bg-slate-900 border-slate-700 text-slate-100" />
                  <Input value={item.label || ''} onChange={(e) => upd({ ...item, label: e.target.value })} placeholder="Label breve" className="bg-slate-900 border-slate-700 text-slate-100" />
                </div>
                <Input value={item.title || ''} onChange={(e) => upd({ ...item, title: e.target.value })} placeholder="Titolo (nel pannello di dettaglio)" className="bg-slate-900 border-slate-700 text-slate-100" />
                <Input value={item.role || ''} onChange={(e) => upd({ ...item, role: e.target.value })} placeholder="Ruolo" className="bg-slate-900 border-slate-700 text-slate-100" />
                <Textarea value={item.detail || ''} onChange={(e) => upd({ ...item, detail: e.target.value })} placeholder="Descrizione articolatoria dettagliata…" rows={2} className="bg-slate-900 border-slate-700 text-slate-100" />
                <Input value={item.anatomy || ''} onChange={(e) => upd({ ...item, anatomy: e.target.value })} placeholder="Nota anatomica (opzionale)" className="bg-slate-900 border-slate-700 text-slate-100" />
                <Input value={item.kineticCue || ''} onChange={(e) => upd({ ...item, kineticCue: e.target.value })} placeholder="Kinetic cue (opzionale)" className="bg-slate-900 border-slate-700 text-slate-100" />
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}

/**
 * ChipInput — Enter/comma adds a chip. Backspace on empty removes the last.
 */
function ChipInput({ value = [], onChange, placeholder, testId }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const parts = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...(value || []), ...parts]);
    setDraft('');
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-[40px] bg-slate-900 border border-slate-700 rounded-md p-1.5 flex flex-wrap gap-1.5" data-testid={testId}>
      {(value || []).map((chip, i) => (
        <span key={`${chip}-${i}`} className="inline-flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 text-xs font-bold px-2 py-1 rounded-md">
          {chip}
          <button type="button" onClick={() => remove(i)} className="hover:text-red-300" data-testid={`${testId}-remove-${i}`}>
            <Trash2 className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) { remove(value.length - 1); }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500 px-2"
        data-testid={`${testId}-input`}
      />
    </div>
  );
}

/**
 * Repeater — generic add/remove/reorder for arrays of objects.
 */
function Repeater({ label, items, onChange, template, renderItem, testId, compact = false }) {
  const list = items || [];

  const upd = (idx) => (nextItem) => {
    const copy = [...list];
    copy[idx] = nextItem;
    onChange(copy);
  };
  const del = (idx) => onChange(list.filter((_, i) => i !== idx));
  const add = () => onChange([...list, JSON.parse(JSON.stringify(template))]);
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  };

  return (
    <div data-testid={testId}>
      {list.map((item, i) => (
        <div key={i} className={`mb-2 p-3 border border-slate-800 rounded-lg ${compact ? '' : 'bg-slate-950/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label} {i + 1}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-cyan-300 disabled:opacity-30 text-xs px-1.5" data-testid={`${testId}-up-${i}`}>▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="text-slate-500 hover:text-cyan-300 disabled:opacity-30 text-xs px-1.5" data-testid={`${testId}-down-${i}`}>▼</button>
              <button type="button" onClick={() => del(i)} className="text-slate-500 hover:text-red-400 px-1" data-testid={`${testId}-delete-${i}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {renderItem(item, upd(i), i)}
        </div>
      ))}
      <Button
        type="button"
        onClick={add}
        variant="outline"
        size="sm"
        className="border-dashed border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-cyan-500 w-full mt-2"
        data-testid={`${testId}-add`}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Aggiungi {label.toLowerCase()}
      </Button>
    </div>
  );
}
