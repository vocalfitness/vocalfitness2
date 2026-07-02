import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, ExternalLink, CheckCircle2, Circle, MapPin, Volume2, PlaySquare,
  FileCheck, Layers, Type, Info, Sparkles,
} from 'lucide-react';

/**
 * PhonemeLivePreview
 * ───────────────────
 * Sticky sidebar preview that mirrors the key content the admin is editing
 * in the phoneme card. Not a full public-page reproduction — instead a
 * cinematic summary with:
 *   • IPA glyph + subtitle + example word
 *   • Sagittal image with the current hotspots overlaid
 *   • Completeness ring + per-section indicators
 *   • Preview blocks for example sentences, mnemonic and common words
 *   • Open-in-new-tab CTA to the public preview (when the card is saved)
 */

const CHECKS = [
  { key: 'exists',    icon: FileCheck,   label: 'Metadata OK' },
  { key: 'hotspots',  icon: MapPin,      label: 'Hotspot ≥ 5' },
  { key: 'words',     icon: Type,        label: 'Parole ≥ 20' },
  { key: 'audio',     icon: Volume2,     label: 'Audio (AmE + RP)' },
  { key: 'video',     icon: PlaySquare,  label: 'Video-lezione' },
  { key: 'published', icon: Layers,      label: 'Pubblicata' },
];

export default function PhonemeLivePreview({ card, cardId, isDirty, isSaved }) {
  const checks = useMemo(() => computeChecks(card), [card]);
  const percent = Math.round(
    (Object.values(checks).filter(Boolean).length / CHECKS.length) * 100
  );

  const primary = card?.examples?.[0] || card?.id?.toUpperCase() || 'nuovo';
  const category = card?.category === 'vowel' ? 'Vocale'
                : card?.category === 'diphthong' ? 'Dittongo'
                : card?.category === 'consonant' ? 'Consonante'
                : '—';

  return (
    <aside
      className="lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-108px)] lg:overflow-y-auto lg:pr-1"
      data-testid="phoneme-live-preview"
    >
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-cyan-500/15 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-bold flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Anteprima live
          </p>
          {isSaved && cardId && (
            <Link
              to={`/lms/phoneme/${cardId}`}
              target="_blank" rel="noreferrer"
              className="text-[10px] text-slate-400 hover:text-cyan-200 inline-flex items-center gap-1"
              data-testid="preview-open-public"
            >
              Apri pubblica
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Hero — IPA + subtitle + progress ring */}
        <div className="p-4 grid grid-cols-[auto,1fr] gap-4 items-center">
          <div className="relative w-20 h-20 rounded-2xl bg-slate-950/70 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-4xl font-black text-cyan-100 leading-none">
              {card?.displayIpa || `/${card?.ipa || '?'}/`}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">
              {primary}
              {card?.subcategory && <span className="ml-2 text-[10px] text-cyan-400 uppercase tracking-wider font-normal">{card.subcategory}</span>}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {category}
              {card?.dialects?.length ? <> · {card.dialects.join(' · ')}</> : null}
            </p>
            <ProgressBar percent={percent} />
          </div>
        </div>

        {/* Sagittal image with hotspot overlay */}
        {card?.assets?.sideView ? (
          <div className="mx-4 mb-4 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950" style={{ aspectRatio: '1 / 1' }} data-testid="preview-sagittal">
            <img
              src={card.assets.sideView}
              alt="side view"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
              onError={(e) => { e.currentTarget.style.opacity = '0.15'; }}
            />
            {(card.hotspots || []).map((h, i) => (
              <span
                key={h.id || i}
                className="absolute w-2 h-2 rounded-full bg-cyan-400 border border-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.7)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${h.x || 0}%`, top: `${h.y || 0}%` }}
              />
            ))}
            <div className="absolute bottom-1.5 right-1.5 text-[9px] text-slate-300 bg-slate-950/85 border border-slate-700 rounded-md px-1.5 py-0.5">
              {(card.hotspots || []).length} hotspot
            </div>
          </div>
        ) : (
          <div className="mx-4 mb-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
            <Info className="w-5 h-5 text-slate-600 mx-auto mb-1.5" />
            <p className="text-slate-500 text-[11px]">
              Nessuna immagine sagittale caricata.
            </p>
          </div>
        )}

        {/* Section checks */}
        <div className="mx-4 mb-4 grid grid-cols-2 gap-x-2 gap-y-1.5">
          {CHECKS.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 text-[10px] ${checks[key] ? 'text-emerald-300' : 'text-slate-500'}`}
              data-testid={`preview-check-${key}`}
            >
              {checks[key] ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <Circle className="w-3 h-3 flex-shrink-0" />}
              <Icon className="w-3 h-3 opacity-70" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Example sentences */}
        {(card?.exampleSentences || []).some((e) => e?.text) && (
          <PreviewSection label="Frasi di esempio">
            {(card.exampleSentences || []).filter((e) => e?.text).map((ex, i) => (
              <p key={i} className="text-[11px] text-slate-300 leading-snug mb-1 last:mb-0">
                <span className="text-slate-600">›</span>{' '}
                {highlightWords(ex.text, ex.highlights || [])}
              </p>
            ))}
          </PreviewSection>
        )}

        {/* Mnemonic */}
        {card?.mnemonic?.phrase && (
          <PreviewSection label="Frase mnemonica" icon={<Sparkles className="w-3 h-3 text-orange-300" />}>
            <p className="text-[12px] text-orange-100 italic leading-snug">
              {highlightWords(card.mnemonic.phrase, card.mnemonic.highlights || [])}
            </p>
          </PreviewSection>
        )}

        {/* Common words scroller */}
        {(card?.commonWords || []).length > 0 && (
          <PreviewSection label={`Parole comuni · ${card.commonWords.length}`}>
            <div className="flex flex-wrap gap-1">
              {(card.commonWords || []).slice(0, 24).map((w, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                  w.audio
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-100'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}>
                  {w.audio && <Volume2 className="w-2.5 h-2.5" />}
                  {w.w || '?'}
                </span>
              ))}
              {card.commonWords.length > 24 && (
                <span className="text-[10px] text-slate-500 italic">+{card.commonWords.length - 24}</span>
              )}
            </div>
          </PreviewSection>
        )}

        {/* Dirty state footer */}
        <div className="border-t border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-bold">
            {isDirty ? <span className="text-amber-300">● Modifiche non salvate</span>
                     : <span className="text-slate-500">Salvata</span>}
          </span>
          <span className={`text-[10px] font-bold ${percent === 100 ? 'text-emerald-300' : 'text-cyan-300'}`}>{percent}% completa</span>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function computeChecks(card) {
  const audio = card?.audio || {};
  const hasAudio = !!(audio.AmE?.isolated || audio.RP?.isolated);
  return {
    exists:    !!(card?.id && card?.ipa && card?.displayIpa),
    hotspots:  (card?.hotspots || []).length >= 5,
    words:     (card?.commonWords || []).length >= 20,
    audio:     hasAudio,
    video:     !!card?.videoLesson?.id,
    published: !!card?.published,
  };
}

function highlightWords(text, highlights) {
  if (!text) return null;
  if (!highlights?.length) return text;
  const escaped = highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
  if (!escaped.length) return text;
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  const parts = text.split(re);
  return parts.map((p, i) => (
    escaped.some((h) => h.toLowerCase() === p.toLowerCase())
      ? <mark key={i} className="bg-transparent text-orange-300 font-bold">{p}</mark>
      : <React.Fragment key={i}>{p}</React.Fragment>
  ));
}

function ProgressBar({ percent }) {
  return (
    <div className="mt-2">
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                            : 'bg-gradient-to-r from-cyan-500 to-orange-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PreviewSection({ label, icon, children }) {
  return (
    <div className="mx-4 mb-4">
      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}
