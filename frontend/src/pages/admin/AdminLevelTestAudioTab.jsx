import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Upload, Sparkles, RefreshCw, CheckCircle2, Circle } from 'lucide-react';

/**
 * Level Test · Audio-da-imitare (M2.3) — mini admin panel.
 * The 6 word-example slots (LAW/BIRD/TRAP × RP/US). Per slot the admin either
 * UPLOADS the Prof.'s real recording (preferred) or GENERATES via ElevenLabs.
 * Reads/writes the canonical card store — single source of truth.
 */
export const AdminLevelTestAudioTab = ({ backendUrl, token, showToast }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const keyOf = (s) => `${s.phoneme}-${s.dialect}`;
  const fullUrl = (u) => (u ? (u.startsWith('http') ? u : `${backendUrl}${u}`) : '');

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/level-test/word-examples`);
      setSlots(res.data.slots || []);
    } catch (e) {
      showToast?.('Errore nel caricamento degli slot', 'error');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, showToast]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleUpload = async (slot, file) => {
    if (!file) return;
    setBusy(keyOf(slot));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('phoneme', slot.phoneme);
      fd.append('dialect', slot.dialect);
      await axios.post(`${backendUrl}/api/level-test/admin/word-examples/upload`, fd, authHeaders);
      showToast?.(`Caricato: ${slot.label} ${slot.dialect}`, 'success');
      fetchSlots();
    } catch (e) {
      showToast?.(e?.response?.data?.detail || 'Upload fallito', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleGenerate = async (slot) => {
    setBusy(keyOf(slot));
    try {
      await axios.post(
        `${backendUrl}/api/level-test/admin/word-examples/generate`,
        { phoneme: slot.phoneme, dialect: slot.dialect },
        authHeaders,
      );
      showToast?.(`Generato (ElevenLabs): ${slot.label} ${slot.dialect}`, 'success');
      fetchSlots();
    } catch (e) {
      showToast?.(e?.response?.data?.detail || 'Generazione fallita', 'error');
    } finally {
      setBusy('');
    }
  };

  const labels = [...new Set(slots.map((s) => s.label))];

  return (
    <div className="space-y-6" data-testid="admin-leveltest-audio-tab">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Level Test · Audio-da-imitare</h2>
          <p className="text-sm text-slate-400">
            Le 6 parole di riferimento del Prof. (LAW/BIRD/TRAP × RP/US). Carica la registrazione reale
            oppure genera con ElevenLabs. ⚠️ BIRD RP (bɜːd, non-rotico) e US (bɝd, r-colored) devono suonare diversi.
          </p>
        </div>
        <Button onClick={fetchSlots} disabled={loading} className="bg-slate-700 hover:bg-slate-600" data-testid="leveltest-audio-refresh">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
        </Button>
      </div>

      {labels.map((label) => (
        <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300 mb-3">{label}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {slots.filter((s) => s.label === label).map((slot) => {
              const k = keyOf(slot);
              const isBusy = busy === k;
              const ready = slot.state === 'ready';
              return (
                <div key={k} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4" data-testid={`leveltest-slot-${label}-${slot.dialect}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-white">{slot.dialect === 'AmE' ? '🇺🇸 US' : '🇬🇧 RP'}</span>
                      <span className="text-white font-bold text-lg">{slot.word}</span>
                      <span className="font-mono text-orange-400 text-sm">/{slot.ipa}/</span>
                    </div>
                    {ready ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold" data-testid={`leveltest-state-${label}-${slot.dialect}`}><CheckCircle2 className="w-4 h-4" /> PRONTO</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-xs font-bold" data-testid={`leveltest-state-${label}-${slot.dialect}`}><Circle className="w-4 h-4" /> DA GENERARE</span>
                    )}
                  </div>

                  {ready && (
                    <audio controls src={fullUrl(slot.url)} className="w-full h-9 mb-3" data-testid={`leveltest-audio-${label}-${slot.dialect}`} />
                  )}

                  <div className="flex items-center gap-2">
                    <label className={`flex-1 cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-600 ${isBusy ? 'opacity-50 pointer-events-none' : ''}`} data-testid={`leveltest-upload-${label}-${slot.dialect}`}>
                      <Upload className="w-4 h-4" /> {ready ? 'Sostituisci' : 'Carica audio'}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleUpload(slot, e.target.files?.[0])}
                      />
                    </label>
                    <Button
                      onClick={() => handleGenerate(slot)}
                      disabled={isBusy}
                      className="flex-1 bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white text-xs font-bold"
                      data-testid={`leveltest-generate-${label}-${slot.dialect}`}
                    >
                      <Sparkles className="w-4 h-4 mr-1" /> {isBusy ? '...' : 'Genera EL'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
