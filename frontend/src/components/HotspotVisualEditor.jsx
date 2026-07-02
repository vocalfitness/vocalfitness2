import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, Save, X, MousePointer2, Move, Info, Eye, EyeOff, ListTree,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

/**
 * HotspotVisualEditor
 * ────────────────────
 * Visual drag-and-drop editor for phoneme hotspots.
 *
 *  • Renders the sagittal image at the same aspect ratio as the public
 *    PhonemeCardPage (1:1) so coordinates are exchangeable.
 *  • Existing hotspots appear as animated dots. Drag a dot → update x/y%.
 *  • Click an empty area → creates a fresh hotspot at that spot and opens
 *    the inline edit panel.
 *  • Click a dot → opens the inline edit panel for that hotspot.
 *  • Delete / duplicate / focus actions live inside the panel.
 *  • Coordinates stored as percentages (0-100) with one decimal — identical
 *    to the format used by /app/frontend/src/data/phonemes.js.
 *
 * Props:
 *   image       — URL of the side-view sagittal image
 *   hotspots    — current array of hotspot objects (parent state)
 *   onChange(next) — callback with the mutated array
 *   testId      — root data-testid
 */

const DEFAULT_HOTSPOT = () => ({
  id: `hotspot-${Math.random().toString(36).slice(2, 8)}`,
  x: 50,
  y: 50,
  label: '',
  title: '',
  role: '',
  detail: '',
  anatomy: '',
  kineticCue: '',
});

export default function HotspotVisualEditor({ image, hotspots = [], onChange, testId = 'hotspot-visual-editor' }) {
  const surfaceRef = useRef(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [drag, setDrag] = useState(null);         // { idx, offsetX, offsetY }
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // -------------------------------------------------------------------- //
  // Helpers
  // -------------------------------------------------------------------- //
  const clampPct = (v) => Math.max(0, Math.min(100, v));

  const percentFromEvent = (e) => {
    const rect = surfaceRef.current.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    return { x: clampPct(x), y: clampPct(y) };
  };

  const updateItem = (idx, patch) => {
    const next = hotspots.map((h, i) => (i === idx ? { ...h, ...patch } : h));
    onChange(next);
  };

  const removeItem = (idx) => {
    const next = hotspots.filter((_, i) => i !== idx);
    onChange(next);
    setSelectedIdx(null);
  };

  const duplicateItem = (idx) => {
    const src = hotspots[idx];
    const clone = {
      ...src,
      id: `${src.id || 'hotspot'}-copy-${Math.random().toString(36).slice(2, 5)}`,
      x: clampPct(src.x + 3),
      y: clampPct(src.y + 3),
    };
    const next = [...hotspots.slice(0, idx + 1), clone, ...hotspots.slice(idx + 1)];
    onChange(next);
    setSelectedIdx(idx + 1);
  };

  const addAt = (x, y) => {
    const hp = { ...DEFAULT_HOTSPOT(), x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
    const next = [...hotspots, hp];
    onChange(next);
    setSelectedIdx(next.length - 1);
  };

  // -------------------------------------------------------------------- //
  // Surface interactions
  // -------------------------------------------------------------------- //
  const handleSurfaceClick = (e) => {
    // Only act on clicks that didn't come from a dot.
    if (e.target !== surfaceRef.current && !e.target.dataset.surface) return;
    if (drag) return; // ignore if we just finished a drag
    const { x, y } = percentFromEvent(e);
    addAt(x, y);
  };

  const startDrag = (e, idx) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIdx(idx);
    const { x, y } = percentFromEvent(e);
    const hp = hotspots[idx];
    setDrag({ idx, offsetX: x - hp.x, offsetY: y - hp.y });
  };

  const onMove = useCallback((e) => {
    if (!drag) return;
    const { x, y } = percentFromEvent(e);
    const nx = clampPct(x - drag.offsetX);
    const ny = clampPct(y - drag.offsetY);
    updateItem(drag.idx, { x: parseFloat(nx.toFixed(1)), y: parseFloat(ny.toFixed(1)) });
  }, [drag]);

  const stopDrag = useCallback(() => setDrag(null), []);

  useEffect(() => {
    if (!drag) return;
    const move = (e) => onMove(e);
    const up = () => stopDrag();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag, onMove, stopDrag]);

  const selected = selectedIdx != null ? hotspots[selectedIdx] : null;

  return (
    <div className="grid lg:grid-cols-5 gap-4" data-testid={testId}>
      {/* ─── Visual canvas ─── */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
            <MousePointer2 className="w-3.5 h-3.5" />
            Clicca sull&apos;immagine per aggiungere · trascina i punti per riposizionarli
          </p>
          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            className="text-xs text-slate-400 hover:text-cyan-300 inline-flex items-center gap-1"
            data-testid={`${testId}-toggle-labels`}
          >
            {showLabels ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showLabels ? 'Nascondi etichette' : 'Mostra etichette'}
          </button>
        </div>

        <div
          ref={surfaceRef}
          data-surface="true"
          onClick={handleSurfaceClick}
          className={`relative rounded-2xl overflow-hidden border-2 ${
            drag ? 'border-orange-400 cursor-grabbing' : 'border-slate-800 hover:border-cyan-500/40 cursor-crosshair'
          } bg-slate-950 transition-colors select-none`}
          style={{ aspectRatio: '1 / 1' }}
        >
          {!image ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div>
                <Info className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">Nessuna immagine caricata.</p>
                <p className="text-slate-500 text-xs mt-1">Compila il campo <code className="text-cyan-300">Side view</code> nella sezione &quot;Immagini della scheda&quot;.</p>
              </div>
            </div>
          ) : (
            <>
              <img
                src={image}
                alt="Vista sagittale del fonema"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(false)}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
                data-testid={`${testId}-image`}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-slate-400 text-xs">
                  Caricamento immagine…
                </div>
              )}
              {/* Hotspot dots */}
              {hotspots.map((h, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <div
                    key={h.id || i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                    data-testid={`${testId}-dot-${i}`}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => startDrag(e, i)}
                      onTouchStart={(e) => startDrag(e, i)}
                      onClick={(e) => { e.stopPropagation(); setSelectedIdx(i); }}
                      title={h.label || h.title || 'hotspot'}
                      className={`relative block rounded-full transition-all duration-150 ${
                        isSelected
                          ? 'w-4 h-4 bg-orange-400 border-2 border-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.9)] cursor-move'
                          : 'w-3 h-3 bg-cyan-400 border-2 border-cyan-100 hover:scale-125 shadow-[0_0_12px_rgba(34,211,238,0.7)] cursor-move'
                      }`}
                    />
                    {/* Optional label */}
                    {showLabels && (h.label || h.title) && (
                      <span
                        className={`absolute left-1/2 -translate-x-1/2 mt-1 top-full whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider pointer-events-none ${
                          isSelected
                            ? 'bg-orange-500/95 text-white'
                            : 'bg-slate-900/90 text-cyan-100 border border-cyan-500/30'
                        }`}
                      >
                        {h.label || h.title}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Crosshair reticle while dragging */}
              {drag && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-orange-500/[0.02]" />
                </div>
              )}
            </>
          )}

          {/* Coordinate readout */}
          {selected && (
            <div className="absolute top-2 left-2 bg-slate-950/85 border border-cyan-500/40 rounded-md px-2 py-1 text-[10px] text-cyan-100 font-mono pointer-events-none">
              x={selected.x?.toFixed(1)}% · y={selected.y?.toFixed(1)}%
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-slate-950/85 border border-slate-700 rounded-md px-2 py-1 text-[10px] text-slate-300 pointer-events-none">
            {hotspots.length} hotspot
          </div>
        </div>

        {/* Legend / helpers */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> normale</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> selezionato</span>
          <span className="inline-flex items-center gap-1"><Move className="w-3 h-3" /> trascina per spostare</span>
        </div>
      </div>

      {/* ─── Side panel (edit selected) ─── */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-slate-950/70 border border-cyan-500/25 rounded-2xl p-4 space-y-3" data-testid={`${testId}-panel`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">
                Hotspot #{selectedIdx + 1} di {hotspots.length}
              </p>
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                className="text-slate-400 hover:text-slate-200"
                title="Chiudi"
                data-testid={`${testId}-close`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <FieldRow label="ID" help="Slug interno (auto-generato)">
              <Input
                value={selected.id || ''}
                onChange={(e) => updateItem(selectedIdx, { id: e.target.value })}
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs h-8"
                data-testid={`${testId}-field-id`}
              />
            </FieldRow>

            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="X (%)">
                <Input
                  type="number" step="0.1" min="0" max="100"
                  value={selected.x ?? ''}
                  onChange={(e) => updateItem(selectedIdx, { x: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border-slate-700 text-slate-100 h-8"
                  data-testid={`${testId}-field-x`}
                />
              </FieldRow>
              <FieldRow label="Y (%)">
                <Input
                  type="number" step="0.1" min="0" max="100"
                  value={selected.y ?? ''}
                  onChange={(e) => updateItem(selectedIdx, { y: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border-slate-700 text-slate-100 h-8"
                  data-testid={`${testId}-field-y`}
                />
              </FieldRow>
            </div>

            <FieldRow label="Label breve" help="Testo mostrato accanto al puntino nel visual editor">
              <Input
                value={selected.label || ''}
                onChange={(e) => updateItem(selectedIdx, { label: e.target.value })}
                placeholder="Velum"
                className="bg-slate-900 border-slate-700 text-slate-100 h-8"
                data-testid={`${testId}-field-label`}
              />
            </FieldRow>

            <FieldRow label="Titolo" help="Titolo mostrato nel pannello di dettaglio pubblico">
              <Input
                value={selected.title || ''}
                onChange={(e) => updateItem(selectedIdx, { title: e.target.value })}
                placeholder="Velum (soft palate) — RAISED"
                className="bg-slate-900 border-slate-700 text-slate-100 h-8"
                data-testid={`${testId}-field-title`}
              />
            </FieldRow>

            <FieldRow label="Ruolo">
              <Input
                value={selected.role || ''}
                onChange={(e) => updateItem(selectedIdx, { role: e.target.value })}
                placeholder="Nasal port closed"
                className="bg-slate-900 border-slate-700 text-slate-100 h-8"
                data-testid={`${testId}-field-role`}
              />
            </FieldRow>

            <FieldRow label="Descrizione articolatoria">
              <Textarea
                value={selected.detail || ''}
                onChange={(e) => updateItem(selectedIdx, { detail: e.target.value })}
                rows={3}
                placeholder="The velum is RAISED, closing the nasal port…"
                className="bg-slate-900 border-slate-700 text-slate-100 text-sm"
                data-testid={`${testId}-field-detail`}
              />
            </FieldRow>

            <FieldRow label="Nota anatomica (opzionale)">
              <Input
                value={selected.anatomy || ''}
                onChange={(e) => updateItem(selectedIdx, { anatomy: e.target.value })}
                placeholder="Velum palatinum — muscular flap…"
                className="bg-slate-900 border-slate-700 text-slate-100 h-8 text-xs"
                data-testid={`${testId}-field-anatomy`}
              />
            </FieldRow>

            <FieldRow label="Kinetic cue (opzionale)">
              <Input
                value={selected.kineticCue || ''}
                onChange={(e) => updateItem(selectedIdx, { kineticCue: e.target.value })}
                placeholder="Sensazione motoria per lo studente…"
                className="bg-slate-900 border-slate-700 text-slate-100 h-8 text-xs"
                data-testid={`${testId}-field-kineticCue`}
              />
            </FieldRow>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => duplicateItem(selectedIdx)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                data-testid={`${testId}-duplicate`}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />Duplica
              </Button>
              <Button
                type="button" size="sm"
                onClick={() => { if (window.confirm('Eliminare questo hotspot?')) removeItem(selectedIdx); }}
                className="bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                data-testid={`${testId}-delete`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />Elimina
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/50 border border-dashed border-slate-700 rounded-2xl p-6 text-center" data-testid={`${testId}-empty-panel`}>
            <ListTree className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-1 font-bold">Nessun hotspot selezionato</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Clicca su un puntino esistente per modificarlo, oppure clicca su un punto vuoto dell&apos;immagine per aggiungerne uno nuovo.
            </p>
            {hotspots.length === 0 && (
              <p className="mt-3 text-orange-300 text-xs">
                Questa scheda non ha ancora hotspot. Comincia cliccando sull&apos;immagine!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny label+field wrapper used only inside the side panel
function FieldRow({ label, help, children }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</Label>
      {children}
      {help && <p className="text-[10px] text-slate-500 italic">{help}</p>}
    </div>
  );
}
