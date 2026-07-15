import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Save, Trash2, Loader2, AudioLines, Lock, RotateCcw } from 'lucide-react';
import SpectrogramView from './SpectrogramView';
import { pickDialectAudio } from '../lib/pickDialectAudio';

/**
 * StudentRecordingStudio — Phase 1 self-assessment (audio only).
 *
 * The student records themselves pronouncing the isolated phoneme or one of
 * the card's example words. The recorded clip drives the SAME SpectrogramView
 * renderer used for Prof. Dapper's reference clip, shown side by side. Logged
 * in students can save the recording (persisted + linked to student/card/
 * phoneme/dialect/timestamp) and browse their history.
 */
const pickMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

const extForMime = (mime) => {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
};

export const StudentRecordingStudio = ({ phoneme, dialect, supportsAmE, supportsRP, user, token }) => {
  const API = process.env.REACT_APP_BACKEND_URL;
  const isLoggedIn = !!(user && token);

  // Recording dialect target — default to the card-level current dialect.
  const [recDialect, setRecDialect] = useState(dialect || 'AmE');
  useEffect(() => { setRecDialect(dialect || 'AmE'); }, [dialect]);

  // Target selector: isolated phoneme + each example word.
  const words = Array.isArray(phoneme?.commonWords) ? phoneme.commonWords : [];
  const [targetIdx, setTargetIdx] = useState(-1); // -1 = isolated phoneme

  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const mimeRef = useRef('');

  const resolveReferenceSrc = useCallback(() => {
    if (targetIdx < 0) {
      const a = phoneme?.audio || {};
      return a?.[recDialect]?.isolated || a?.AmE?.isolated || a?.RP?.isolated || '';
    }
    const w = words[targetIdx];
    return pickDialectAudio(w, recDialect) || '';
  }, [targetIdx, recDialect, phoneme, words]);

  const targetLabel = targetIdx < 0 ? `/${phoneme?.ipa}/` : (words[targetIdx]?.w || '');
  const targetKind = targetIdx < 0 ? 'phoneme' : 'word';
  const referenceSrc = resolveReferenceSrc();

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn || !phoneme?.id) return;
    try {
      const res = await fetch(`${API}/api/phonemes/${phoneme.id}/recordings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch (_) { /* silent */ }
  }, [API, isLoggedIn, phoneme?.id, token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const startRecording = async () => {
    setError('');
    setSaved(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Il tuo browser non supporta la registrazione audio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const type = mimeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      setError('Permesso microfono negato o non disponibile.');
    }
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop(); } catch (_) { /* ignore */ }
    setRecording(false);
  };

  const resetRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl('');
    blobRef.current = null;
    setSaved(false);
    setError('');
  };

  const saveRecording = async () => {
    if (!isLoggedIn || !blobRef.current) return;
    setSaving(true);
    setError('');
    try {
      const ext = extForMime(mimeRef.current);
      const fd = new FormData();
      fd.append('file', blobRef.current, `rec.${ext}`);
      fd.append('phoneme_ipa', phoneme?.ipa || '');
      fd.append('dialect', recDialect);
      fd.append('target_kind', targetKind);
      fd.append('target_label', targetLabel);
      const res = await fetch(`${API}/api/phonemes/${phoneme.id}/recordings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Salvataggio fallito');
      setSaved(true);
      await loadHistory();
    } catch (e) {
      setError(e.message || 'Salvataggio fallito.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecording = async (id) => {
    try {
      const res = await fetch(`${API}/api/phonemes/recordings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory((h) => h.filter((r) => r.id !== id));
    } catch (_) { /* silent */ }
  };

  useEffect(() => () => { if (recordedUrl) URL.revokeObjectURL(recordedUrl); }, [recordedUrl]);

  const dialectBtn = (d, label, enabled) => (
    <button
      key={d}
      type="button"
      disabled={!enabled}
      onClick={() => setRecDialect(d)}
      data-testid={`rec-dialect-${d}`}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
        recDialect === d
          ? 'bg-orange-500 text-slate-900 shadow-[0_0_18px_rgba(251,146,60,0.35)]'
          : enabled
            ? 'bg-slate-800/70 text-cyan-200 border border-cyan-500/40 hover:border-cyan-300'
            : 'bg-slate-900/40 text-slate-600 border border-slate-700/40 cursor-not-allowed'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="mt-12 rounded-3xl border border-orange-500/25 bg-slate-900/60 p-6 md:p-7"
      data-testid="student-recording-studio"
    >
      <div className="flex items-center gap-2 mb-4">
        <AudioLines className="w-4 h-4 text-orange-300" />
        <p className="text-[11px] uppercase tracking-[0.22em] text-orange-300 font-bold">
          Auto-valutazione · Registra & Confronta
        </p>
      </div>
      <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
        Registrati e confronta lo spettrogramma
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-6">
        Registra la tua pronuncia e confronta il tuo spettrogramma con quello di riferimento del
        Prof.&nbsp;Dapper, affiancati. Scegli cosa pronunciare e il dialetto target.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold">Bersaglio</label>
          <select
            value={targetIdx}
            onChange={(e) => setTargetIdx(Number(e.target.value))}
            data-testid="rec-target-select"
            className="bg-slate-950 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-cyan-50 focus:border-cyan-300 outline-none"
          >
            <option value={-1}>Fonema isolato · /{phoneme?.ipa}/</option>
            {words.map((w, i) => (
              <option key={i} value={i}>Parola · {w.w}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold">Dialetto target</label>
          <div className="flex gap-2">
            {dialectBtn('AmE', '🇺🇸 GenAm', supportsAmE !== false)}
            {dialectBtn('RP', '🇬🇧 RP', supportsRP !== false)}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold">Registrazione</label>
          <div className="flex items-center gap-2">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                data-testid="rec-start-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition-all duration-300 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
              >
                <Mic className="w-3.5 h-3.5" /> Registra
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                data-testid="rec-stop-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-slate-200 text-slate-900 animate-pulse"
              >
                <Square className="w-3.5 h-3.5" /> Ferma
              </button>
            )}
            {recordedUrl && !recording && (
              <button
                type="button"
                onClick={resetRecording}
                data-testid="rec-reset-btn"
                title="Nuova registrazione"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-slate-800/70 text-cyan-200 border border-cyan-500/40 hover:border-cyan-300 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-[12px] text-rose-300" data-testid="rec-error">{error}</p>}

      {/* Side-by-side spectrograms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold mb-3">
            🎓 Riferimento · Prof. Dapper
          </p>
          {referenceSrc ? (
            <SpectrogramView src={referenceSrc} label={`Riferimento · ${targetLabel}`} height={150} testId="rec-spectrogram-reference" />
          ) : (
            <p className="text-xs text-slate-500 italic py-10 text-center" data-testid="rec-reference-missing">
              Audio di riferimento non disponibile per questo bersaglio/dialetto.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-orange-500/25 bg-slate-950/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-orange-400/80 font-bold mb-3">
            🎙️ La tua registrazione
          </p>
          {recordedUrl ? (
            <SpectrogramView key={recordedUrl} src={recordedUrl} label={`Tu · ${targetLabel}`} height={150} testId="rec-spectrogram-student" />
          ) : (
            <p className="text-xs text-slate-500 italic py-10 text-center" data-testid="rec-student-empty">
              Premi <span className="text-orange-300 font-bold">Registra</span> per catturare la tua pronuncia.
            </p>
          )}
        </div>
      </div>

      {/* Save action */}
      {recordedUrl && !recording && (
        <div className="mt-5 flex items-center gap-3" data-testid="rec-save-row">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={saveRecording}
              disabled={saving || saved}
              data-testid="rec-save-btn"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                saved
                  ? 'bg-emerald-500 text-slate-900'
                  : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 disabled:opacity-60'
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Salvata ✓' : 'Salva registrazione'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-amber-300/90" data-testid="rec-login-hint">
              <Lock className="w-3.5 h-3.5" />
              Accedi per salvare le tue registrazioni e seguire i tuoi progressi.
            </div>
          )}
        </div>
      )}

      {/* History */}
      {isLoggedIn && history.length > 0 && (
        <div className="mt-8" data-testid="rec-history">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold mb-3">
            Le tue registrazioni · {history.length}
          </p>
          <div className="space-y-2">
            {history.map((r) => (
              <div
                key={r.id}
                data-testid={`rec-history-item-${r.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-950/50 px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cyan-50 font-bold truncate">
                    {r.target_label} <span className="text-[10px] text-cyan-400/60 ml-1">{r.dialect === 'AmE' ? '🇺🇸 GenAm' : '🇬🇧 RP'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(r.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
                <audio controls preload="none" src={r.audio_url} className="h-8 max-w-[220px]" data-testid={`rec-history-audio-${r.id}`} />
                <button
                  type="button"
                  onClick={() => deleteRecording(r.id)}
                  data-testid={`rec-history-delete-${r.id}`}
                  title="Elimina"
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRecordingStudio;
