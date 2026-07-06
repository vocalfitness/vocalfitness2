import React, { useEffect, useState, useMemo } from 'react';

/**
 * SagittalOverlay — SVG overlay that sits on top of the clean sagittal
 * illustration and renders the DERIVED overlay bundle stored on each
 * phoneme card:
 *
 *   • ``anatomicalLabels`` (string[])  — subset of the 12 canonical
 *     landmarks. Each label is drawn as: a small anchor dot on the
 *     anatomy + a thin leader line to a text tag rendered with the
 *     card's HUD typography (cyan uppercase, tracking-wider).
 *
 *   • ``airflowArrows``   — 1..N arrow descriptors with a shape (oral-smooth,
 *     oral-turbulent, nasal, lateral, blocked). Rendered as animated
 *     cyan strokes that flow along a quadratic Bézier.
 *
 *   • ``voicing``          — 'Voiced' → three pulsing bars at the vocal
 *     folds anchor; 'Voiceless' → same bars but static / desaturated.
 *
 * Positioning: all coordinates are 0..100 percentages. The parent must
 * render this component absolutely inside a positioned container that
 * matches the aspect ratio of the sagittal image.
 */
export default function SagittalOverlay({
  card,
  className = '',
  labels: labelsProp,
  lang = 'it',
}) {
  const [canonicalLabels, setCanonicalLabels] = useState(labelsProp || null);

  useEffect(() => {
    if (labelsProp || canonicalLabels) return;
    const API = process.env.REACT_APP_BACKEND_URL;
    fetch(`${API}/api/canonical/anatomical-labels`)
      .then((r) => (r.ok ? r.json() : { labels: [] }))
      .then((d) => setCanonicalLabels(d.labels || []))
      .catch(() => setCanonicalLabels([]));
  }, [labelsProp, canonicalLabels]);

  const activeLabels = useMemo(() => {
    if (!canonicalLabels || !card?.anatomicalLabels) return [];
    const wanted = new Set(card.anatomicalLabels);
    return canonicalLabels.filter((l) => wanted.has(l.id));
  }, [canonicalLabels, card?.anatomicalLabels]);

  const arrows = card?.airflowArrows || [];
  const voiced = (card?.voicing || '').toLowerCase() === 'voiced';
  // Vocal-folds landmark position — canonical anchor used by the
  // voicing indicator so the graphic sits exactly on the larynx.
  const vfAnchor = (canonicalLabels || []).find((l) => l.id === 'vocal-folds')?.anchor
                    || { x: 47, y: 76 };

  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid="sagittal-overlay"
    >
      <defs>
        {/* Airflow gradient — cyan → transparent so the arrows read as
            'flowing' rather than static strokes. */}
        <linearGradient id="airflow-cyan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#67e8f9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.15" />
        </linearGradient>
        <marker id="arrow-cyan" viewBox="0 0 8 8" refX="6" refY="4"
                markerWidth="2.4" markerHeight="2.4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="#67e8f9" />
        </marker>
        <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ============================= Airflow arrows ============================= */}
      {arrows.map((a, i) => {
        const p = a.path || [];
        if (p.length < 3) return null;
        const dPath = `M ${p[0].x} ${p[0].y} Q ${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y}`;
        const styleKey = a.type || 'oral-smooth';
        const strokeDash = {
          'oral-smooth':    '',
          'oral-turbulent': '1.2 0.6',
          'nasal':          '2 1',
          'lateral':        '',
          'blocked':        '0.6 0.6',
        }[styleKey] || '';
        return (
          <g key={`arrow-${i}`} className={`sag-arrow sag-arrow--${styleKey}`}>
            <path
              d={dPath}
              fill="none"
              stroke="url(#airflow-cyan)"
              strokeWidth={styleKey === 'blocked' ? 1.0 : 0.7}
              strokeLinecap="round"
              strokeDasharray={strokeDash}
              markerEnd={styleKey === 'blocked' ? '' : 'url(#arrow-cyan)'}
              filter="url(#glow-cyan)"
            />
            {/* 'X' marker on the closure point for stop consonants */}
            {styleKey === 'blocked' && (
              <g transform={`translate(${p[2].x} ${p[2].y})`}>
                <line x1="-1.4" y1="-1.4" x2="1.4" y2="1.4" stroke="#f87171" strokeWidth="0.6" />
                <line x1="-1.4" y1="1.4"  x2="1.4" y2="-1.4" stroke="#f87171" strokeWidth="0.6" />
              </g>
            )}
          </g>
        );
      })}

      {/* ========================== Anatomical labels ============================= */}
      {activeLabels.map((l) => {
        const a = l.anchor;
        const t = l.leader;
        const text = lang === 'en' ? l.labelEn : l.labelIt;
        // Text-anchor decision — if leader is on the left of anchor, text
        // right-aligns to end at the leader; if right, left-align.
        const textAnchor = t.x < a.x ? 'end' : 'start';
        const textDX = t.x < a.x ? -0.8 : 0.8;
        return (
          <g key={l.id} className="sag-label" data-testid={`sagittal-label-${l.id}`}>
            {/* Leader line */}
            <line
              x1={a.x} y1={a.y} x2={t.x} y2={t.y}
              stroke="#67e8f9" strokeWidth="0.25" strokeOpacity="0.7"
            />
            {/* Anchor dot on the anatomy */}
            <circle cx={a.x} cy={a.y} r="0.7" fill="#22d3ee"
                    stroke="#0f172a" strokeWidth="0.15"
                    filter="url(#glow-cyan)" />
            {/* End-of-leader tick + text tag */}
            <circle cx={t.x} cy={t.y} r="0.35" fill="#67e8f9" />
            <text
              x={t.x + textDX}
              y={t.y + 0.4}
              fill="#a5f3fc"
              fontSize="1.85"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              fontWeight="700"
              letterSpacing="0.15"
              textAnchor={textAnchor}
              style={{ textTransform: 'uppercase' }}
            >
              {text}
            </text>
          </g>
        );
      })}

      {/* =========================== Voicing indicator ============================ */}
      <g
        className={`sag-voicing ${voiced ? 'sag-voicing--voiced' : 'sag-voicing--voiceless'}`}
        transform={`translate(${vfAnchor.x + 4} ${vfAnchor.y})`}
        data-testid={`sagittal-voicing-${voiced ? 'voiced' : 'voiceless'}`}
      >
        {/* Three vertical bars — like an equaliser. Voiced = animated
            pulse, voiceless = static + desaturated. */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 1.4}
            y="-1.4"
            width="0.9"
            height="2.8"
            rx="0.3"
            fill={voiced ? '#22d3ee' : '#475569'}
            opacity={voiced ? 0.95 : 0.4}
            filter={voiced ? 'url(#glow-cyan)' : ''}
          >
            {voiced && (
              <animate
                attributeName="height"
                values="1.2;3.2;1.6;2.8;1.2"
                dur="1.4s"
                begin={`${i * 0.15}s`}
                repeatCount="indefinite"
              />
            )}
            {voiced && (
              <animate
                attributeName="y"
                values="-0.6;-1.6;-0.8;-1.4;-0.6"
                dur="1.4s"
                begin={`${i * 0.15}s`}
                repeatCount="indefinite"
              />
            )}
          </rect>
        ))}
        {/* Muted-cross overlay for voiceless — a slate diagonal that
            reads instantly as "off". */}
        {!voiced && (
          <line x1="-0.4" y1="-1.8" x2="4.4" y2="1.8"
                stroke="#94a3b8" strokeWidth="0.35" strokeOpacity="0.85" />
        )}
      </g>

      {/* Arrow-flow animation */}
      <style>{`
        .sag-arrow--oral-smooth path,
        .sag-arrow--oral-turbulent path,
        .sag-arrow--nasal path,
        .sag-arrow--lateral path {
          stroke-dashoffset: 0;
          animation: sag-flow 2.2s linear infinite;
        }
        @keyframes sag-flow {
          from { stroke-dashoffset: 6; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}
