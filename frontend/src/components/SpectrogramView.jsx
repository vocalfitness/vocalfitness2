import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Activity } from 'lucide-react';

/**
 * SpectrogramView — real-time scrolling spectrogram for a single audio clip.
 *
 * Implementation: HTML5 <audio> → Web Audio API MediaElementSource →
 * AnalyserNode → byte-frequency data sampled in a requestAnimationFrame loop
 * → 1 px-wide vertical strip is painted at the right edge of the canvas and
 * the existing image is shifted left by 1 px. The result is the same
 * scrolling waterfall used by professional acoustic-phonetics tools (Praat,
 * Audacity), implemented entirely client-side with zero external deps.
 *
 * Colour ramp: dark blue → cyan → orange → white (perceptually monotonic on
 * dark backgrounds; same family as the LMS palette).
 */
export const SpectrogramView = ({
  src,
  height = 180,
  fftSize = 1024,
  label = 'Spettrogramma',
  testId,
}) => {
  const audioRef    = useRef(null);
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);   // AudioContext
  const analyserRef = useRef(null);
  const rafRef      = useRef(0);
  const [playing,  setPlaying]  = useState(false);
  const [error,    setError]    = useState('');

  // --- helper: paint one vertical strip on the canvas ----------------
  const paintStrip = useCallback(() => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const cctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);

    // Shift existing image left by 1 px
    const old = cctx.getImageData(1, 0, w - 1, h);
    cctx.putImageData(old, 0, 0);

    // Paint new strip at the right edge — vertical pixel stack, low frequencies at bottom
    const strip = cctx.createImageData(1, h);
    // Only render lower ~75% of the bins (the upper bins are sparse for voice)
    const usable = Math.floor(analyser.frequencyBinCount * 0.75);
    for (let y = 0; y < h; y++) {
      const binIdx = Math.floor(((h - 1 - y) / h) * usable);
      const v = bins[binIdx] / 255; // 0..1
      // Smooth dark→cyan→orange→white ramp
      let r, g, b;
      if (v < 0.25)      { const t = v / 0.25;     r = 6 + t * 22;   g = 9 + t * 90;   b = 32 + t * 110; }
      else if (v < 0.55) { const t = (v - 0.25) / 0.30; r = 28 + t * 14;  g = 99 + t * 130; b = 142 - t * 60; }
      else if (v < 0.80) { const t = (v - 0.55) / 0.25; r = 42 + t * 213; g = 229 + t * 17; b = 82 - t * 36;  }
      else               { const t = (v - 0.80) / 0.20; r = 255;          g = 246;          b = 46 + t * 209; }
      const a = v < 0.04 ? 0 : 255;   // tiny noise floor cut
      const off = y * 4;
      strip.data[off]     = r;
      strip.data[off + 1] = g;
      strip.data[off + 2] = b;
      strip.data[off + 3] = a;
    }
    cctx.putImageData(strip, w - 1, 0);
  }, []);

  const tick = useCallback(() => {
    paintStrip();
    rafRef.current = requestAnimationFrame(tick);
  }, [paintStrip]);

  // --- wire AudioContext lazily after first user gesture --------------
  const initAudioGraph = useCallback(async () => {
    if (analyserRef.current) return; // already wired
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      setError('Web Audio non disponibile: ' + (e?.message || 'errore sconosciuto'));
    }
  }, [fftSize]);

  const handleToggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); return; }
    setError('');
    await initAudioGraph();
    if (ctxRef.current?.state === 'suspended') {
      try { await ctxRef.current.resume(); } catch (_) { /* ignore */ }
    }
    try { a.currentTime = 0; await a.play(); }
    catch (e) { setError('Impossibile riprodurre: ' + (e?.message || 'autoplay bloccato')); }
  };

  // --- bind audio events to state + rAF lifecycle --------------------
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onPlay  = () => { setPlaying(true);  rafRef.current = requestAnimationFrame(tick); };
    const onStop  = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); };
    a.addEventListener('play',  onPlay);
    a.addEventListener('pause', onStop);
    a.addEventListener('ended', onStop);
    a.addEventListener('error', () => setError('Audio non disponibile.'));
    return () => {
      a.removeEventListener('play',  onPlay);
      a.removeEventListener('pause', onStop);
      a.removeEventListener('ended', onStop);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Cleanup on unmount: close audio context to release the worker
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    try { ctxRef.current?.close(); } catch (_) { /* ignore */ }
  }, []);

  // Paint a blank canvas on mount so the empty state looks intentional
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const cctx = c.getContext('2d');
    cctx.fillStyle = '#04070d';
    cctx.fillRect(0, 0, c.width, c.height);
  }, []);

  return (
    <div className="relative" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-bold flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          {label}
        </p>
        <button
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
            playing
              ? 'bg-orange-500 text-slate-900 shadow-[0_0_24px_rgba(251,146,60,0.4)]'
              : 'bg-slate-800/70 text-cyan-200 border border-cyan-500/40 hover:bg-slate-700 hover:border-cyan-300'
          }`}
          data-testid="spectrogram-play"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          {playing ? 'In riproduzione' : 'Avvia spettrogramma'}
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-950 shadow-inner">
        <canvas
          ref={canvasRef}
          width={1200}
          height={height}
          className="w-full block"
          style={{ height: `${height}px` }}
          aria-label={label}
        />
        {/* Y-axis frequency hint */}
        <div className="absolute left-2 top-2 text-[9px] uppercase tracking-widest text-cyan-400/70 font-bold pointer-events-none">F2 / F3</div>
        <div className="absolute left-2 bottom-2 text-[9px] uppercase tracking-widest text-cyan-400/70 font-bold pointer-events-none">F0 / F1</div>
        <div className="absolute right-2 bottom-2 text-[9px] uppercase tracking-widest text-orange-300/70 font-bold pointer-events-none">→ tempo</div>
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-500 uppercase tracking-[0.22em]">tocca <span className="text-cyan-300">Avvia</span> per analizzare</p>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

      <audio ref={audioRef} src={src} crossOrigin="anonymous" preload="metadata" />
    </div>
  );
};

export default SpectrogramView;
