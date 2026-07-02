import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  ArrowLeft, Save, ExternalLink, ChevronDown, ChevronRight, Plus, Trash2,
  Info, Sparkles, GraduationCap, Volume2, MapPin, BookOpen, FileText, Image as ImageIcon,
  Video, Type, Palette, Wand2, Check, AlertCircle, MousePointer2, ListTree,
} from 'lucide-react';
import HotspotVisualEditor from '../components/HotspotVisualEditor';
import ImageUploader from '../components/ImageUploader';

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
  const isNew = !routeId || routeId === 'new';

  const [card, setCard]     = useState(BLANK);
  const [initial, setInitial] = useState(BLANK);
  const [fetching, setFetching] = useState(!isNew);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');
  const [advancedJson, setAdvancedJson] = useState('');
  const [jsonError, setJsonError]     = useState('');

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
      }
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setError(`Errore salvataggio: ${e.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

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

      <div className="max-w-[1200px] mx-auto px-5 py-8">
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
            <Field label="Nota dialetto" help="Testo mostrato in fondo alla card (es: 'near identical AmE and RP').">
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
            <Field label="Audio (URL)">
              <Input
                value={card.mnemonic?.audio || ''}
                onChange={(e) => setField(['mnemonic', 'audio'], e.target.value)}
                placeholder="/api/uploads/elevenlabs/…mp3"
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                data-testid="editor-field-mnemonic-audio"
              />
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

        {/* ================== ADVANCED JSON ================== */}
        <Section title="Avanzato — dati di visualizzazione (JSON)" icon={<Palette className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-3">
            Campi complessi di grafica/statistica: <code className="text-cyan-300">spellings</code>, <code className="text-cyan-300">frequencyChart</code>,{' '}
            <code className="text-cyan-300">features</code>, <code className="text-cyan-300">knobs</code>, <code className="text-cyan-300">facialMuscles</code>,{' '}
            <code className="text-cyan-300">classification</code>, <code className="text-cyan-300">funFact</code>, <code className="text-cyan-300">vowelChartPosition</code>.
            Modifica come JSON strutturato (in una prossima iterazione avranno editor dedicati).
          </p>
          <Textarea
            value={advancedJson}
            onChange={(e) => handleAdvancedChange(e.target.value)}
            rows={22}
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

      {/* Sticky footer with actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isDirty
              ? <span className="text-amber-300 font-bold">● Modifiche non salvate</span>
              : <span className="text-slate-500">Nessuna modifica pendente</span>}
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

const ADVANCED_KEYS = ['spellings', 'frequencyChart', 'features', 'knobs', 'facialMuscles', 'classification', 'funFact', 'vowelChartPosition'];
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
