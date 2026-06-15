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
  const audioRef = useRef(null);

  // Pre-baked text presets useful for the Phonetics Lab workflow
  const PRESETS = [
    { id: 'glottal-u', label: 'Glottal /ʊ/ (FOOT loop)', text: 'uuh, uuh, uuh, uuh, uuh, uuh', hint: 'glottal_u_foot' },
    { id: 'glottal-i', label: 'Glottal /iː/ (FLEECE loop)', text: 'eeh, eeh, eeh, eeh, eeh', hint: 'glottal_i_fleece' },
    { id: 'glottal-a', label: 'Glottal /ɑː/ (FATHER loop)', text: 'aah, aah, aah, aah, aah', hint: 'glottal_a_father' },
    { id: 'glottal-neutral', label: 'Glottal neutro (schwa)', text: 'uh, uh, uh, uh, uh', hint: 'glottal_neutral' },
  ];

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

  const handleGenerate = async () => {
    setError(''); setResult(null); setLoading(true); setPlaying(false);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin/elevenlabs/tts`, {
        text,
        voice_id: voiceId,
        stability,
        similarity_boost: similarity,
        style,
        output_format: outputFormat,
        filename_hint: filenameHint || undefined,
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

  const t = language === 'it'
    ? {
      title: 'Audio Studio · ElevenLabs',
      sub: 'Genera audio con la voce clonata e ottieni un URL pronto da incollare nei profili VocalLab o nelle schede fonetiche.',
      voice: 'Voce', text: 'Testo', presets: 'Preset rapidi', filename: 'Nome file (hint)',
      stab: 'Stabilità', sim: 'Similarity boost', styleL: 'Style', format: 'Formato',
      generate: 'Genera audio', generating: 'Generazione…', play: 'Riproduci', pause: 'Pausa',
      result: 'File generato', url: 'URL pubblico', copy: 'Copia URL', copied: 'Copiato!',
      download: 'Scarica', size: 'Dimensione', noKey: 'API ElevenLabs non configurata',
    }
    : {
      title: 'Audio Studio · ElevenLabs',
      sub: 'Generate audio with the cloned voice and get a public URL ready to paste into the VocalLab profiles or phonetic cards.',
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

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{t.filename}</label>
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
            disabled={loading || !text.trim() || !voiceId}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40"
            data-testid="el-generate-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? t.generating : t.generate}
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
