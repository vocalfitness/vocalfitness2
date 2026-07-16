import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Mic, Video, ShieldCheck } from 'lucide-react';

/**
 * ConsentDialog — GDPR double consent (audio + video), independently
 * grantable/revocable. The video consent is recorded for a future phase
 * (webcam) and does not enable anything yet.
 */
export const ConsentDialog = ({ open, onOpenChange, initial, onSave, saving }) => {
  const [audio, setAudio] = useState(initial?.audio_granted || false);
  const [video, setVideo] = useState(initial?.video_granted || false);

  React.useEffect(() => {
    setAudio(initial?.audio_granted || false);
    setVideo(initial?.video_granted || false);
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border border-cyan-500/30 text-cyan-50 max-w-lg" data-testid="consent-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Consenso al trattamento dei dati
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Per registrare e analizzare la tua pronuncia abbiamo bisogno del tuo consenso.
            I due consensi sono separati e revocabili in qualsiasi momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-4 cursor-pointer" data-testid="consent-audio-row">
            <Checkbox checked={audio} onCheckedChange={(v) => setAudio(!!v)} data-testid="consent-audio-checkbox" className="mt-0.5" />
            <span>
              <span className="flex items-center gap-2 font-bold text-cyan-100"><Mic className="w-4 h-4" /> Registrazione audio</span>
              <span className="block text-xs text-slate-400 mt-1">
                Consento la registrazione della mia voce, la sua analisi acustica (formanti) e
                il salvataggio delle registrazioni nel mio profilo per seguire i progressi.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4 cursor-pointer" data-testid="consent-video-row">
            <Checkbox checked={video} onCheckedChange={(v) => setVideo(!!v)} data-testid="consent-video-checkbox" className="mt-0.5" />
            <span>
              <span className="flex items-center gap-2 font-bold text-cyan-100"><Video className="w-4 h-4" /> Registrazione video <span className="text-[10px] font-normal text-slate-500">(fase futura)</span></span>
              <span className="block text-xs text-slate-400 mt-1">
                Consento in futuro la registrazione video (webcam) per l'analisi articolatoria.
                Non è ancora attiva: il consenso viene solo memorizzato.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onSave({ audio, video })}
            disabled={saving}
            data-testid="consent-save-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-cyan-500 text-slate-900 hover:bg-cyan-400 disabled:opacity-60 transition-all"
          >
            {saving ? 'Salvataggio…' : 'Salva preferenze'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentDialog;
