import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Save, Trash2, Loader2, AudioLines, Lock, RotateCcw, ShieldCheck, Sparkles, FlaskConical, ChevronDown } from 'lucide-react';
import SpectrogramView from './SpectrogramView';
import FormantScorePanel from './FormantScorePanel';
import ConsentDialog from './ConsentDialog';
import { pickDialectAudio } from '../lib/pickDialectAudio';
import { blobToWav } from '../lib/blobToWav';

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
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  // Phase-2: GDPR consent + formant scoring state.
  const [consent, setConsent] = useState({ audio_granted: false, video_granted: false });
  const [showConsent, setShowConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [analyzeExpert, setAnalyzeExpert] = useState(null);
  const [showRejectExpert, setShowRejectExpert] = useState(false);

  const MAX_SECONDS = 10;
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const mimeRef = useRef('');
  const timerRef = useRef(null);
  const startTsRef = useRef(0);
  const studentSpecRef = useRef(null);

  const fmtTime = (s) => `0:${String(Math.min(MAX_SECONDS, Math.floor(s))).padStart(2, '0')}`;

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

  const loadConsent = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API}/api/phonemes/consent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const c = await res.json();
        setConsent({ audio_granted: !!c.audio_granted, video_granted: !!c.video_granted });
      }
    } catch (_) { /* silent */ }
  }, [API, isLoggedIn, token]);

  useEffect(() => { loadConsent(); }, [loadConsent]);

  const saveConsent = async ({ audio, video }) => {
    setSavingConsent(true);
    try {
      for (const [kind, granted] of [['audio', audio], ['video', video]]) {
        await fetch(`${API}/api/phonemes/consent`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, granted }),
        });
      }
      setConsent({ audio_granted: audio, video_granted: video });
      setShowConsent(false);
    } catch (_) { /* silent */ } finally {
      setSavingConsent(false);
    }
  };

  const analyzeRecording = useCallback(async () => {
    if (!isLoggedIn || !consent.audio_granted || !blobRef.current) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalysis(null);
    setAnalyzeExpert(null);
    try {
      const wav = await blobToWav(blobRef.current);
      const fd = new FormData();
      fd.append('file', wav, 'rec.wav');
      fd.append('phoneme_ipa', phoneme?.ipa || '');
      fd.append('dialect', recDialect);
      fd.append('target_kind', targetKind);
      if (referenceSrc) fd.append('reference_url', referenceSrc);
      const res = await fetch(`${API}/api/phonemes/analyze-formants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        // 422 may carry a structured detail: { message, reason, expert }.
        const d = data.detail;
        if (d && typeof d === 'object') {
          if (d.expert) setAnalyzeExpert(d.expert);
          throw new Error(d.message || 'Analisi non riuscita');
        }
        throw new Error(d || 'Analisi non riuscita');
      }
      setAnalysis(data);
    } catch (e) {
      setAnalyzeError(e.message || 'Analisi non riuscita.');
    } finally {
      setAnalyzing(false);
    }
  }, [API, isLoggedIn, consent.audio_granted, phoneme?.ipa, recDialect, targetKind, referenceSrc, token]);

  const startRecording = async () => {
    setError('');
    setSaved(false);
    setAnalysis(null);
    setAnalyzeError('');
    setAnalyzeExpert(null);
    // GDPR gate: logged-in users must grant audio consent first.
    if (isLoggedIn && !consent.audio_granted) {
      setShowConsent(true);
      return;
    }
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
      // Visible timer + hard auto-stop at MAX_SECONDS.
      startTsRef.current = Date.now();
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startTsRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_SECONDS) stopRecording();
      }, 200);
    } catch (e) {
      setError('Permesso microfono negato o non disponibile.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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

  // Cleanup timer on unmount.
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Auto-start the spectrogram analysis of the student's recording once it's
  // ready — no extra click. The freshly mounted SpectrogramView (key=url)
  // exposes its play control via data-testid; we trigger it programmatically.
  useEffect(() => {
    if (!recordedUrl) return undefined;
    const t = setTimeout(() => {
      const btn = studentSpecRef.current?.querySelector('[data-testid="spectrogram-play"]');
      if (btn) btn.click();
    }, 450);
    return () => clearTimeout(t);
  }, [recordedUrl]);

  // Auto-run formant analysis once a recording is ready (logged-in + consent).
  useEffect(() => {
    if (recordedUrl && isLoggedIn && consent.audio_granted) analyzeRecording();
  }, [recordedUrl]);

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
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black bg-rose-600 text-white shadow-[0_0_22px_rgba(244,63,94,0.55)] hover:bg-rose-500 transition-all"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <Square className="w-4 h-4" /> Ferma
                <span className="ml-1 font-mono tabular-nums" data-testid="rec-timer">{fmtTime(elapsed)}</span>
                <span className="text-[10px] font-semibold text-rose-200/80">/ 0:{MAX_SECONDS}</span>
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
          <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-cyan-300" data-testid="rec-caption-reference">
            Pronuncia di riferimento
          </p>
        </div>
        <div className="rounded-2xl border border-orange-500/25 bg-slate-950/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-orange-400/80 font-bold mb-3">
            🎙️ La tua registrazione
          </p>
          {recordedUrl ? (
            <div ref={studentSpecRef}>
              <SpectrogramView key={recordedUrl} src={recordedUrl} label={`Tu · ${targetLabel}`} height={150} testId="rec-spectrogram-student" />
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-10 text-center" data-testid="rec-student-empty">
              Premi <span className="text-orange-300 font-bold">Registra</span> per catturare la tua pronuncia.
            </p>
          )}
          <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-orange-300" data-testid="rec-caption-student">
            La tua pronuncia
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-slate-400 leading-relaxed" data-testid="rec-compare-hint">
        Confronta la forma della tua onda sonora con quella di riferimento: più si assomigliano,
        più la tua pronuncia è accurata.
      </p>

      {/* Formant analysis (Phase 2) */}
      {analyzing && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-cyan-300" data-testid="formant-analyzing">
          <Loader2 className="w-4 h-4 animate-spin" /> Analisi acustica delle formanti in corso…
        </div>
      )}
      {analyzeError && !analyzing && (
        <div className="mt-4" data-testid="formant-error-wrap">
          <p className="text-center text-[12px] text-rose-300" data-testid="formant-error">{analyzeError}</p>
          {analyzeExpert && (
            <div className="mt-3 max-w-2xl mx-auto rounded-xl border border-fuchsia-500/20 bg-slate-950/60 p-3" data-testid="reject-expert-section">
              <button
                type="button"
                onClick={() => setShowRejectExpert((v) => !v)}
                data-testid="reject-expert-toggle"
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300/80 hover:text-fuchsia-200 transition-colors"
              >
                <FlaskConical className="w-3.5 h-3.5" /> Expert Mode · dettaglio rifiuto
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRejectExpert ? 'rotate-180' : ''}`} />
              </button>
              {showRejectExpert && (
                <div className="mt-3 font-mono text-[11px] text-slate-300 space-y-3" data-testid="reject-expert-panel">
                  <p className="text-slate-500">
                    Ceiling selezionato: <span className="text-fuchsia-300">{analyzeExpert.ceiling_selected_hz || '—'} Hz</span>
                    {' · '}affidabile: <span className="text-rose-300">no</span>
                  </p>
                  {analyzeExpert.nucleus_sd_hz && Object.keys(analyzeExpert.nucleus_sd_hz).length > 0 && (
                    <div>
                      <p className="text-slate-500 mb-1">SD finestra-nucleo (Hz) · soglia:</p>
                      {['F1', 'F2', 'F3'].filter((k) => analyzeExpert.nucleus_sd_hz[k] != null).map((k) => {
                        const sd = analyzeExpert.nucleus_sd_hz[k];
                        const thr = (analyzeExpert.nucleus_sd_thresholds_hz || {})[k];
                        const ok = thr == null || sd <= thr;
                        return (
                          <div key={k} className={`pl-2 ${ok ? 'text-slate-400' : 'text-rose-300'}`} data-testid={`reject-sd-${k}`}>
                            {k}: SD {sd} (≤ {thr}) {ok ? '✓' : '✕ instabile'}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {analyzeExpert.plausibility_range_hz && (
                    <div>
                      <p className="text-slate-500 mb-1">Range plausibilità (rif ± 3·SD):</p>
                      {['F1', 'F2', 'F3'].filter((k) => analyzeExpert.plausibility_range_hz[k]).map((k) => {
                        const r = analyzeExpert.plausibility_range_hz[k];
                        return (
                          <div key={k} className="pl-2 text-slate-400" data-testid={`reject-range-${k}`}>
                            {k}: {r.min}–{r.max} Hz (rif {r.ref}, SD {r.sd_used} · {r.sd_source})
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {Array.isArray(analyzeExpert.attempts) && analyzeExpert.attempts.length > 0 && (
                    <div data-testid="reject-attempts">
                      <p className="text-slate-500 mb-1">Tentativi per ceiling:</p>
                      {analyzeExpert.attempts.map((a, i) => (
                        <div key={i} className="pl-2 text-slate-400">
                          {a.ceiling_hz} Hz → {a.result === 'no_usable_window'
                            ? 'nessuna finestra utile'
                            : `F1=${a.F1} F2=${a.F2} F3=${a.F3} · ${a.plausible ? 'plausibile' : 'IMPLAUSIBILE'}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {analysis && !analyzing && <FormantScorePanel result={analysis} />}
      {recordedUrl && !recording && isLoggedIn && consent.audio_granted && !analyzing && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={analyzeRecording}
            data-testid="formant-reanalyze-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-slate-800/70 text-cyan-200 border border-cyan-500/40 hover:border-cyan-300 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" /> {analysis ? 'Rianalizza' : 'Analizza pronuncia'}
          </button>
        </div>
      )}

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

      {/* Consent management + dialog */}
      {isLoggedIn && (
        <div className="mt-8 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-3" data-testid="rec-consent-manage">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
            Consensi: audio {consent.audio_granted ? '✓' : '✕'} · video {consent.video_granted ? '✓' : '✕'}
          </span>
          <button
            type="button"
            onClick={() => setShowConsent(true)}
            data-testid="rec-consent-manage-btn"
            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
          >
            Gestisci consensi
          </button>
        </div>
      )}
      <ConsentDialog
        open={showConsent}
        onOpenChange={setShowConsent}
        initial={consent}
        onSave={saveConsent}
        saving={savingConsent}
      />
    </div>
  );
};

export default StudentRecordingStudio;
