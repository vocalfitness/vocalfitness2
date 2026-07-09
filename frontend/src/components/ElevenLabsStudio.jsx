import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../lib/backend';
import { Button } from '../components/ui/button';
import { Loader2, Copy, Download, Play, Pause, Sparkles, AudioLines, Check } from 'lucide-react';

/**
 * ElevenLabsStudio — Admin panel for generating TTS audio with the user's
 * cloned voice. The generated file is persisted to Emergent Object Storage
 * by the backend and a public URL is returned, ready to be pasted into
 * vocalLabProfiles.js (voiceClone.url) or any other place.
 */
export const ElevenLabsStudio = ({ token, language = 'it' }) => {
  const [voices, setVoices] = useState([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [text, setText] = useState('');
  const [ipaPhoneme, setIpaPhoneme] = useState('');   // NEW · isolated-sound SSML forcing
  const [stability, setStability] = useState(0.45);
  const [similarity, setSimilarity] = useState(0.85);
  const [style, setStyle] = useState(0.0);
  const [filenameHint, setFilenameHint] = useState('');
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);   // NEW · file upload
  const [externalUrl, setExternalUrl] = useState('');
  const [fetchingExternal, setFetchingExternal] = useState(false);
  // Associate result → phoneme card slot
  const [phonemeCards, setPhonemeCards] = useState([]);
  const [assocCardId, setAssocCardId] = useState('');
  const [assocSlot,   setAssocSlot]   = useState('isolated-AmE');
  const [assocWordIndex, setAssocWordIndex] = useState(0);
  const [assocExampleIndex, setAssocExampleIndex] = useState(0);
  const [associating, setAssociating] = useState(false);
  const [associated,  setAssociated]  = useState(false);
  const audioRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Pre-baked text presets useful for the Phonetics Lab workflow
  const PRESETS = [
    { id: 'glottal-u', label: 'Glottal /ʊ/ (FOOT loop)', text: 'uuh, uuh, uuh, uuh, uuh, uuh', hint: 'glottal_u_foot' },
    { id: 'glottal-i', label: 'Glottal /iː/ (FLEECE loop)', text: 'eeh, eeh, eeh, eeh, eeh', hint: 'glottal_i_fleece' },
    { id: 'glottal-a', label: 'Glottal /ɑː/ (FATHER loop)', text: 'aah, aah, aah, aah, aah', hint: 'glottal_a_father' },
    { id: 'glottal-neutral', label: 'Glottal neutro (schwa)', text: 'uh, uh, uh, uh, uh', hint: 'glottal_neutral' },
  ];

  // Complete IPA phoneme grid — RP (British) + AmE (General American)
  // variants. The two dialects share most consonants and 3 diphthongs;
  // the vowel inventory diverges (RP has centering diphthongs and
  // length distinctions AmE lacks, AmE has /ɑ/, /ɔ/, /ɝ/, /ɚ/, /oʊ/).
  // Click a chip → loads that IPA into the SSML field.
  const IPA_QUICK = {
    'Vocali condivise':            ['ɪ', 'ʊ', 'ɛ', 'e', 'æ', 'ʌ', 'ə'],
    'Monoftongi RP (lunghi)':       ['iː', 'uː', 'ɑː', 'ɔː', 'ɜː', 'ɒ'],
    'Vocali AmE (r-colorate + no length)': ['i', 'u', 'ɑ', 'ɔ', 'ɝ', 'ɚ'],
    'Dittonghi condivisi':          ['eɪ', 'aɪ', 'ɔɪ', 'aʊ'],
    'Dittonghi RP (centering)':     ['əʊ', 'ɪə', 'eə', 'ʊə'],
    'Dittonghi AmE':                ['oʊ'],
    'Consonanti · plosive':          ['p', 'b', 't', 'd', 'k', 'ɡ'],
    'Consonanti · fricat.':          ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'],
    'Consonanti · nasali':           ['m', 'n', 'ŋ'],
    'Consonanti · approx.':          ['l', 'ɹ', 'j', 'w'],
    'Consonanti · affric.':          ['tʃ', 'dʒ'],
  };

  // RP → AmE IPA equivalence for the associate-panel dropdown, so a
  // card indexed by its RP symbol (e.g. /ɒ/ o-lot) also shows the AmE
  // variant (/ɑ/) inline. Only pairs where the two dialects diverge
  // are listed — cards with a shared symbol just show the single IPA.
  const RP_TO_AME_IPA = {
    'e':  'ɛ',
    'ɒ':  'ɑ',
    'ɑː': 'ɑ',
    'ɔː': 'ɔ',
    'əʊ': 'oʊ',
    'ɜː': 'ɝ',
    'iː': 'i',
    'uː': 'u',
    'ɪə': 'ɪr',
    'eə': 'ɛr',
    'ʊə': 'ʊr',
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/elevenlabs/voices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVoices(res.data.voices || []);
        setDefaultVoiceId(res.data.default_voice_id || '');
        setVoiceId(res.data.default_voice_id || (res.data.voices?.[0]?.voice_id ?? ''));
      } catch (e) {
        setError(e.response?.data?.detail || 'Errore caricamento voci ElevenLabs');
      }
    })();
  }, [token]);

  // Load the phoneme catalogue once — used by the "Associa a fonema"
  // panel to let the user pick a target card + slot for the clip.
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/phonemes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data?.cards || res.data || [];
        setPhonemeCards(list);
      } catch (e) {
        // silently fail — the associate panel just won't show cards
      }
    })();
  }, [token]);

  const handleGenerate = async () => {
    setError(''); setResult(null); setLoading(true); setPlaying(false);
    // If IPA is filled but text is empty, use the IPA symbol itself as
    // the visual fallback (ElevenLabs SDK requires non-empty text).
    const effectiveText = text.trim() || ipaPhoneme.trim();
    // Auto-suggest a filename when the user pastes an IPA symbol and
    // hasn't provided one manually.
    const effectiveHint = filenameHint
      || (ipaPhoneme.trim() ? `isolated_${ipaPhoneme.trim().replace(/[^\w]/g, '_')}` : '');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin/elevenlabs/tts`, {
        text: effectiveText,
        voice_id: voiceId,
        stability,
        similarity_boost: similarity,
        style,
        output_format: outputFormat,
        filename_hint: effectiveHint || undefined,
        ipa_phoneme: ipaPhoneme.trim() || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore generazione');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!result?.relative_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`${BACKEND_URL}${result.relative_url}`);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.currentTime = 0; audioRef.current.play(); setPlaying(true); }
  };

  useEffect(() => {
    // Reset player when result changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, [result]);

  const copyUrl = (url) => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ─── Manual file upload (drag & drop or file picker) ────────────────
  // For fonemi where ElevenLabs quality is insufficient the Prof uploads
  // a pre-recorded MP3/WAV from PC (or a clip downloaded from a
  // scientific IPA repository — see the "Repository IPA scientifiche"
  // panel below for CC-BY-SA sources).
  const handleFileUpload = async (file) => {
    if (!file) return;
    setError(''); setResult(null); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (filenameHint) fd.append('filename_hint', filenameHint);
      const res = await axios.post(`${BACKEND_URL}/api/admin/elevenlabs/upload-audio`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult({ ...res.data, __manual: true });
    } catch (e) {
      setError(e.response?.data?.detail || `Errore upload: ${e.message}`);
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileUpload(f);
  };

  // ─── Fetch audio from an EXTERNAL URL (Wikimedia, GitHub raw, etc.)
  // The backend downloads the file server-side and persists it to
  // Emergent Storage, bypassing the manual download → re-upload dance.
  const handleFetchExternal = async () => {
    const url = externalUrl.trim();
    if (!url) return;
    setError(''); setResult(null); setFetchingExternal(true); setAssociated(false);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin/elevenlabs/fetch-external-audio`, {
        url,
        filename_hint: filenameHint || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult({ ...res.data, __external: true });
    } catch (e) {
      setError(e.response?.data?.detail || `Errore fetch: ${e.message}`);
    } finally {
      setFetchingExternal(false);
    }
  };

  // ─── Associate the currently-loaded clip to a phoneme card slot
  // via PATCH /api/admin/phonemes/{card_id}/audio-url. Zero UX friction:
  // pick card + slot from dropdowns → one click → done.
  const buildAssocKey = () => {
    if (assocSlot === 'isolated-AmE' || assocSlot === 'isolated-RP' || assocSlot === 'mnemonic') return assocSlot;
    if (assocSlot === 'example-AmE') return `example-AmE-${assocExampleIndex}`;
    if (assocSlot === 'example-RP')  return `example-RP-${assocExampleIndex}`;
    if (assocSlot === 'word-AmE')    return `word-${assocWordIndex}-AmE`;
    if (assocSlot === 'word-RP')     return `word-${assocWordIndex}-RP`;
    return assocSlot;
  };
  const handleAssociate = async () => {
    if (!result?.relative_url || !assocCardId) return;
    setAssociating(true); setAssociated(false); setError('');
    try {
      await axios.patch(
        `${BACKEND_URL}/api/admin/phonemes/${encodeURIComponent(assocCardId)}/audio-url`,
        { key: buildAssocKey(), url: result.relative_url },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAssociated(true);
      setTimeout(() => setAssociated(false), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || `Errore associazione: ${e.message}`);
    } finally {
      setAssociating(false);
    }
  };

  const t = language === 'it'
    ? {
      title: 'Voice Lab · ElevenLabs',
      sub: 'Genera audio custom con la voce clonata: prosa naturale oppure fonemi IPA isolati (SSML). Ogni clip viene salvata su Emergent Storage con URL pubblico pronto da incollare nei profili VocalLab o nel Phoneme CMS.',
      voice: 'Voce', text: 'Testo', presets: 'Preset rapidi', filename: 'Nome file (hint)',
      stab: 'Stabilità', sim: 'Similarity boost', styleL: 'Style', format: 'Formato',
      generate: 'Genera audio', generating: 'Generazione…', play: 'Riproduci', pause: 'Pausa',
      result: 'File generato', url: 'URL pubblico', copy: 'Copia URL', copied: 'Copiato!',
      download: 'Scarica', size: 'Dimensione', noKey: 'API ElevenLabs non configurata',
    }
    : {
      title: 'Voice Lab · ElevenLabs',
      sub: 'Generate custom audio with the cloned voice: natural prose OR isolated IPA phonemes (SSML). Every clip is saved to Emergent Storage with a public URL ready to paste into the VocalLab profiles or the Phoneme CMS.',
      voice: 'Voice', text: 'Text', presets: 'Quick presets', filename: 'Filename hint',
      stab: 'Stability', sim: 'Similarity boost', styleL: 'Style', format: 'Format',
      generate: 'Generate audio', generating: 'Generating…', play: 'Play', pause: 'Pause',
      result: 'Generated file', url: 'Public URL', copy: 'Copy URL', copied: 'Copied!',
      download: 'Download', size: 'Size', noKey: 'ElevenLabs API not configured',
    };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700" data-testid="elevenlabs-studio">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AudioLines className="w-5 h-5 text-amber-400" /> {t.title}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{t.sub}</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg p-3 mb-4 text-sm" data-testid="el-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.voice}</label>
            <select
              value={voiceId}
              onChange={e => setVoiceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              data-testid="el-voice-select"
            >
              {voices.length === 0 && <option value="">(loading…)</option>}
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} {v.voice_id === defaultVoiceId ? '★ default' : ''} ({v.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.presets}</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => { setText(p.text); setFilenameHint(p.hint); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-amber-600/30 text-slate-200 border border-slate-600 hover:border-amber-500 transition-colors"
                  data-testid={`el-preset-${p.id}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.text}</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={language === 'it' ? "Es. 'Could you push the book?' oppure 'uuh, uuh, uuh' per il glottal loop" : "e.g. 'Could you push the book?'"}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono"
              data-testid="el-text"
            />
            <p className="text-xs text-slate-500 mt-1">{text.length}/2000 caratteri</p>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              Isolated-phoneme IPA field (SSML-forced pronunciation)
              ═══════════════════════════════════════════════════════════
              When populated, the text field becomes the visual fallback
              and the IPA drives ElevenLabs' SSML <phoneme> tag → exact
              scientific pronunciation of a single sound. Perfect for
              cutting the 44 phoneme demo clips ("Say /ʊ/", "Say /θ/").
              Leave empty for natural prose. */}
          <div className="rounded-xl border-2 border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 to-purple-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-fuchsia-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> IPA fonema isolato (opzionale)
              </label>
              {ipaPhoneme && (
                <button
                  type="button"
                  onClick={() => setIpaPhoneme('')}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                  data-testid="el-ipa-clear"
                >
                  Svuota
                </button>
              )}
            </div>
            <input
              type="text"
              value={ipaPhoneme}
              onChange={e => setIpaPhoneme(e.target.value)}
              placeholder="es. ʊ · kʊk · θ · dʒ …"
              className="w-full bg-slate-900 border border-fuchsia-500/40 text-fuchsia-100 rounded-lg px-3 py-2 text-lg font-mono text-center tracking-wider"
              data-testid="el-ipa-input"
            />
            <p className="text-[11px] text-fuchsia-300/80 mt-1.5 leading-snug">
              Se compilato, la voce pronuncia <b>esattamente</b> questo IPA via SSML{' '}
              <code className="bg-fuchsia-500/20 px-1 rounded">&lt;phoneme&gt;</code>.
              Audio breve (~0.5–1s) — perfetto per le clip dei 44 fonemi.
              Lascia vuoto per prosa naturale.
            </p>

            {/* Quick-pick grid: click to load into the IPA field. */}
            <div className="mt-3 space-y-1.5" data-testid="el-ipa-grid">
              {Object.entries(IPA_QUICK).map(([group, syms]) => (
                <div key={group} className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 w-32 flex-shrink-0">{group}</span>
                  <div className="flex flex-wrap gap-1">
                    {syms.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setIpaPhoneme(s); if (!filenameHint) setFilenameHint(`isolated_${s.replace(/[^\w]/g, '_')}`); }}
                        className={`px-2.5 py-0.5 rounded font-mono text-sm border transition ${
                          ipaPhoneme === s
                            ? 'bg-fuchsia-500 border-fuchsia-400 text-white'
                            : 'bg-slate-800 border-slate-600 text-fuchsia-200 hover:bg-fuchsia-500/20 hover:border-fuchsia-400/50'
                        }`}
                        data-testid={`el-ipa-chip-${s}`}
                      >
                        /{s}/
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* RP ↔ AmE equivalence table — quick reference so the Prof
                can pick the right dialect variant of a phoneme without
                consulting an external guide. Ordered by lexical set
                (Wells 1982). ≈ = approximation with regional variation;
                = = exact 1:1 mapping. */}
            <details className="mt-3 group" data-testid="el-ipa-equivalence-table">
              <summary className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 cursor-pointer hover:text-fuchsia-200 select-none font-bold">
                🔀 Tabella equivalenze RP ↔ AmE (Wells 1982 lexical sets)
              </summary>
              <div className="mt-2 rounded-lg bg-slate-950/60 border border-fuchsia-500/20 p-2 overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead className="text-fuchsia-300/80 uppercase tracking-wider text-[9px]">
                    <tr className="border-b border-fuchsia-500/20">
                      <th className="text-left py-1 pl-1 pr-3">Lexical set</th>
                      <th className="text-center px-2">🇬🇧 RP</th>
                      <th className="text-center px-2">≡</th>
                      <th className="text-center px-2">🇺🇸 AmE</th>
                      <th className="text-left px-2 hidden sm:table-cell">Esempio</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {[
                      ['DRESS',  'e',   '=', 'ɛ',   'dress, bed, said'],
                      ['LOT',    'ɒ',   '≈', 'ɑ',   'lot, box, hot'],
                      ['CLOTH',  'ɒ',   '≈', 'ɔ',   'cloth, off, gone'],
                      ['PALM',   'ɑː',  '=', 'ɑ',   'palm, father, bra'],
                      ['THOUGHT','ɔː',  '=', 'ɔ',   'thought, law, saw'],
                      ['GOAT',   'əʊ',  '=', 'oʊ',  'goat, no, boat'],
                      ['NURSE',  'ɜː',  '=', 'ɝ',   'nurse, bird, term'],
                      ['letter', 'ə',   '=', 'ɚ',   'letter, doctor (r-colored)'],
                      ['FLEECE', 'iː',  '≈', 'i',   'fleece, tree, see'],
                      ['GOOSE',  'uː',  '≈', 'u',   'goose, moon, food'],
                      ['happY',  'ɪ/i', '=', 'i',   'happy, city, easy'],
                      ['NEAR',   'ɪə',  '≈', 'ɪr',  'near, here, deer'],
                      ['SQUARE', 'eə',  '≈', 'ɛr',  'square, hair, care'],
                      ['CURE',   'ʊə',  '≈', 'ʊr',  'cure, tour, poor'],
                      ['START',  'ɑː',  '≈', 'ɑr',  'start, car, hard'],
                      ['NORTH',  'ɔː',  '≈', 'ɔr',  'north, horse, door'],
                    ].map(([name, rp, eq, ame, ex]) => (
                      <tr key={name} className="border-b border-slate-800/60 hover:bg-fuchsia-500/5">
                        <td className="py-0.5 pl-1 pr-3 text-fuchsia-200 font-bold">{name}</td>
                        <td className="text-center px-2 text-cyan-300">/{rp}/</td>
                        <td className="text-center px-2 text-slate-500">{eq}</td>
                        <td className="text-center px-2 text-amber-300">/{ame}/</td>
                        <td className="px-2 text-slate-400 italic hidden sm:table-cell">{ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-500 mt-2 leading-snug px-1">
                  <b className="text-slate-400">=</b> mapping 1:1 stabile · <b className="text-slate-400">≈</b> approssimazione con variazione regionale (rhoticity, cot-caught merger, ecc.). Base: Wells (1982) &ldquo;Accents of English&rdquo;.
                </p>
              </div>
            </details>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              Upload manuale + Repository IPA scientifiche
              ═══════════════════════════════════════════════════════════
              Per fonemi dove ElevenLabs SSML dà qualità scarsa: carica
              un MP3/WAV registrato dal Prof o scaricato da repository
              scientifiche (Wikimedia Commons, IPA.org, UCLA archive).
          */}
          <div className="rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-3">
            <label className="text-xs uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1.5 mb-2">
              <AudioLines className="w-3.5 h-3.5" /> Upload da PC · fonema pre-registrato
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-emerald-500/40 rounded-lg p-4 text-center hover:border-emerald-400 hover:bg-emerald-500/5 transition cursor-pointer"
              onClick={() => uploadInputRef.current?.click()}
              data-testid="el-upload-dropzone"
            >
              {uploading
                ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span className="text-sm text-emerald-200">Caricamento…</span>
                  </div>
                )
                : (
                  <>
                    <p className="text-sm text-emerald-100 font-semibold">Trascina qui un file audio · o clicca per selezionare</p>
                    <p className="text-[10px] text-emerald-300/70 mt-1">MP3 · WAV · OGG · M4A · FLAC · max 5 MB</p>
                  </>
                )}
              <input
                type="file"
                ref={uploadInputRef}
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="hidden"
                data-testid="el-upload-file"
              />
            </div>

            {/* Fetch from external URL — the backend downloads the
                clip server-side (no need to save on the PC and re-upload).
                Great for Wikimedia Commons OGG links, GitHub raw MP3,
                UCLA archive WAV, etc. */}
            <div className="mt-3 pt-3 border-t border-emerald-500/20">
              <label className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1 block">
                Da URL esterno · fetch server-side
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://upload.wikimedia.org/…/vowel.ogg"
                  className="flex-1 bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono"
                  data-testid="el-external-url"
                />
                <Button
                  onClick={handleFetchExternal}
                  disabled={!externalUrl.trim() || fetchingExternal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-40"
                  data-testid="el-external-fetch-btn"
                >
                  {fetchingExternal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Scarica'}
                </Button>
              </div>
              <p className="text-[10px] text-emerald-300/60 mt-1">
                Il file viene scaricato dal server → salvato su Emergent Storage → URL restituito qui a destra.
              </p>
            </div>

            {/* Scientific IPA repositories · CC-BY-SA sources for isolated
                phoneme audio. Prof clicks link → downloads → uploads. */}
            <details className="mt-3 group">
              <summary className="text-[11px] text-emerald-300/90 cursor-pointer hover:text-emerald-200 select-none">
                📚 Repository IPA scientifiche (RP + AmE · CC-BY-SA)
              </summary>
              <div className="mt-2 space-y-2 text-[11px] text-slate-300 pl-3 border-l border-emerald-500/30">

                {/* RP · British English sources */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold mb-1">🇬🇧 RP · British English</p>
                  <p><a href="https://www.pronunciationstudio.com/english-ipa-chart-4/" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">Pronunciation Studio · English IPA Chart</a> — 44 fonemi RP streaming (non open-source).</p>
                  <p><a href="https://en.wikipedia.org/wiki/Received_Pronunciation" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">Wikipedia · Received Pronunciation</a> — tabella IPA RP con file audio embedded.</p>
                </div>

                {/* AmE · General American sources */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-amber-300/90 font-bold mb-1">🇺🇸 AmE · General American</p>
                  <p><a href="https://pronuncian.com/intro-to-american-english-pronunciation" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">Pronuncian · American English Pronunciation</a> — IPA AmE con audio per ogni fonema.</p>
                  <p><a href="https://en.wikipedia.org/wiki/General_American_English" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">Wikipedia · General American English</a> — inventario fonetico AmE con audio embedded.</p>
                  <p><a href="https://soundsofspeech.uiowa.edu/english/english.html" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">University of Iowa · Sounds of Speech (AmE)</a> — animazioni articolatorie + audio per ogni fonema AmE. Riferimento accademico.</p>
                </div>

                {/* Universal / scientific archives */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-fuchsia-300/90 font-bold mb-1">🌐 Universali / Scientifiche</p>
                  <p><a href="https://www.internationalphoneticalphabet.org/ipa-sounds/ipa-chart-with-sounds/" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">IPA.org · Chart with sounds</a> — 107 simboli IPA (streaming). CC-BY-SA 3.0.</p>
                  <p><a href="https://archive.phonetics.ucla.edu" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">UCLA Phonetics Lab Archive</a> (Ladefoged) — 200+ lingue. CC free noncommercial.</p>
                  <p><a href="https://github.com/michaelbennieUFL/UCLA-IPA-Phonetic-Corpus" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">UCLA-IPA-Phonetic-Corpus (GitHub)</a> — versione ripulita, dir <code>eng/audio</code>. CC.</p>
                  <p><a href="https://commons.wikimedia.org/wiki/Category:IPA_sound_files" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">Wikimedia Commons · IPA sound files</a> — OGG per ogni simbolo IPA. CC-BY-SA. <b>Compatibile con &laquo;Da URL esterno&raquo; ↑</b> — copia il link diretto del file.</p>
                </div>

                <p className="text-slate-500 pt-1">💡 <b>Workflow rapido</b>: Wikimedia Commons → apri file IPA → tasto destro sul player audio → &laquo;Copia indirizzo audio&raquo; → incolla in <b>&laquo;Da URL esterno&raquo;</b> ↑ → Scarica → Associa a fonema.</p>
              </div>
            </details>
          </div>

          <div>
            <input
              type="text" value={filenameHint}
              onChange={e => setFilenameHint(e.target.value)}
              placeholder="es. glottal_u_foot, push_the_book"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono"
              data-testid="el-filename"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.stab}: {stability.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.01" value={stability}
                     onChange={e => setStability(+e.target.value)} className="w-full accent-amber-500" data-testid="el-stab" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.sim}: {similarity.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.01" value={similarity}
                     onChange={e => setSimilarity(+e.target.value)} className="w-full accent-amber-500" data-testid="el-sim" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.styleL}: {style.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.01" value={style}
                     onChange={e => setStyle(+e.target.value)} className="w-full accent-amber-500" data-testid="el-style" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.format}</label>
            <select value={outputFormat} onChange={e => setOutputFormat(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm" data-testid="el-format">
              <option value="mp3_44100_128">MP3 44.1kHz 128kbps (default)</option>
              <option value="mp3_44100_192">MP3 44.1kHz 192kbps (HQ)</option>
              <option value="mp3_22050_32">MP3 22kHz 32kbps (light)</option>
              <option value="pcm_44100">PCM 44.1kHz (raw, per waveguide)</option>
            </select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || (!text.trim() && !ipaPhoneme.trim()) || !voiceId}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-amber-500 hover:from-fuchsia-600 hover:to-amber-600 disabled:opacity-40 font-bold"
            data-testid="el-generate-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? t.generating : (ipaPhoneme.trim() ? `Genera IPA /${ipaPhoneme.trim()}/` : t.generate)}
          </Button>
        </div>

        {/* RIGHT: result */}
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
          {!result && !loading && (
            <div className="text-slate-500 text-sm italic h-full flex items-center justify-center text-center min-h-[300px]">
              {language === 'it' ? "L'audio generato apparirà qui con un URL pronto da copiare nei profili VocalLab." : 'The generated audio will appear here with a copyable URL.'}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm text-slate-400">{t.generating}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3" data-testid="el-result">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{t.result}</p>
                <span className="text-xs text-slate-500">{(result.size_bytes / 1024).toFixed(1)} KB</span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePlay}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  data-testid="el-play-btn"
                >
                  {playing ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {playing ? t.pause : t.play}
                </Button>
                <Button
                  onClick={() => copyUrl(result.url)}
                  className={`flex-1 ${copied ? 'bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                  data-testid="el-copy-btn"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? t.copied : t.copy}
                </Button>
                <a
                  href={`${BACKEND_URL}${result.relative_url}`}
                  download
                  className="inline-flex items-center justify-center px-4 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm"
                  data-testid="el-download-link"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">{t.url}</p>
                <code className="block bg-slate-950 text-amber-300 text-xs p-2 rounded font-mono break-all" data-testid="el-url">
                  {result.url}
                </code>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p><span className="text-slate-500">filename:</span> {result.filename}</p>
                <p><span className="text-slate-500">voice_id:</span> {result.voice_id}</p>
                <p><span className="text-slate-500">format:</span> {result.content_type}</p>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  Associa direttamente a fonema — one-click PATCH to
                  route this URL into any of the ~29 audio slots of any
                  phoneme card, without leaving Voice Lab.
                  ═══════════════════════════════════════════════════ */}
              <div className="bg-cyan-500/10 border-2 border-cyan-500/40 rounded-lg p-3 mt-3 space-y-2" data-testid="el-associate-panel">
                <p className="text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Associa direttamente a fonema
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold block mb-0.5">Card fonema</label>
                    <select
                      value={assocCardId}
                      onChange={(e) => setAssocCardId(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/40 text-cyan-100 rounded px-2 py-1 text-xs"
                      data-testid="el-assoc-card"
                    >
                      <option value="">— seleziona —</option>
                      {(phonemeCards || []).map((c) => {
                        const rp = c.ipa || '?';
                        const ame = RP_TO_AME_IPA[rp];
                        const label = ame
                          ? `🇬🇧 /${rp}/ · 🇺🇸 /${ame}/ · ${c.displayName || c.title || c.id}`
                          : `/${rp}/ · ${c.displayName || c.title || c.id}`;
                        return (
                          <option key={c.id} value={c.id}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold block mb-0.5">Slot</label>
                    <select
                      value={assocSlot}
                      onChange={(e) => setAssocSlot(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/40 text-cyan-100 rounded px-2 py-1 text-xs"
                      data-testid="el-assoc-slot"
                    >
                      <optgroup label="Isolato">
                        <option value="isolated-AmE">🇺🇸 Isolato · AmE</option>
                        <option value="isolated-RP">🇬🇧 Isolato · RP</option>
                      </optgroup>
                      <optgroup label="Mnemonica">
                        <option value="mnemonic">🎵 Mnemonica</option>
                      </optgroup>
                      <optgroup label="Esempi">
                        <option value="example-AmE">🇺🇸 Frase esempio · AmE</option>
                        <option value="example-RP">🇬🇧 Frase esempio · RP</option>
                      </optgroup>
                      <optgroup label="Parole comuni">
                        <option value="word-AmE">🇺🇸 Parola comune · AmE</option>
                        <option value="word-RP">🇬🇧 Parola comune · RP</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                {(assocSlot.startsWith('example-') || assocSlot.startsWith('word-')) && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold block mb-0.5">
                      Indice ({assocSlot.startsWith('example-') ? 'frase esempio' : 'parola comune'})
                    </label>
                    <input
                      type="number"
                      min="0" max="29"
                      value={assocSlot.startsWith('example-') ? assocExampleIndex : assocWordIndex}
                      onChange={(e) => {
                        const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                        if (assocSlot.startsWith('example-')) setAssocExampleIndex(n);
                        else setAssocWordIndex(n);
                      }}
                      className="w-24 bg-slate-900 border border-cyan-500/40 text-cyan-100 rounded px-2 py-1 text-xs font-mono"
                      data-testid="el-assoc-index"
                    />
                    <span className="ml-2 text-[10px] text-cyan-200/60">→ key: <code className="text-cyan-100">{buildAssocKey()}</code></span>
                  </div>
                )}
                <Button
                  onClick={handleAssociate}
                  disabled={!assocCardId || associating}
                  className={`w-full text-xs ${associated ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-cyan-600 hover:bg-cyan-700'} disabled:opacity-40`}
                  data-testid="el-assoc-btn"
                >
                  {associating
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Associo…</>
                    : associated
                      ? <><Check className="w-3.5 h-3.5 mr-1" /> Associata ✓</>
                      : <><Sparkles className="w-3.5 h-3.5 mr-1" /> Associa e salva</>}
                </Button>
                {associated && assocCardId && (
                  <p className="text-[11px] text-emerald-300">
                    ✓ URL salvato in <code className="text-emerald-100">/{phonemeCards.find(c => c.id === assocCardId)?.ipa || '?'}/</code> · <code className="text-emerald-100">{buildAssocKey()}</code>
                  </p>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-amber-200">
                  💡 {language === 'it' ? 'Per usarlo nel VocalLab (es. /ʊ/ FOOT), apri ' : 'To use in VocalLab (e.g. /ʊ/ FOOT), open '}
                  <code className="bg-amber-500/20 px-1 rounded">src/data/vocalLabProfiles.js</code>
                  {language === 'it' ? ' e aggiungi: ' : ' and add: '}
                  <code className="bg-amber-500/20 px-1 rounded block mt-1">{`voiceClone: { url: '${result.relative_url}', refFreq: 120 }`}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElevenLabsStudio;
