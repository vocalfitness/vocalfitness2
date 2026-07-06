import React, { useEffect, useState, useMemo } from 'react';

/**
 * SagittalOverlay — clean, embedded-style anatomical annotations on top
 * of the sagittal illustration.
 *
 * Style mirrors the reference labels baked into the printed cards:
 *   • pure WHITE text, mixed-case, thin sans-serif (no uppercase, no
 *     tight tracking).
 *   • hairline WHITE leader lines terminating in a tiny WHITE dot on the
 *     anatomy landmark.
 *   • labels sit CLOSE to the face — leader lengths are short and text
 *     tags float just outside the anatomy outline.
 *
 * The big cyan airflow curve that used to sweep across the face has been
 * removed — the AIRFLOW indicator in the HUD badge already conveys the
 * information and the arrow obscured the character.
 *
 * Positioning uses absolute-positioned HTML on top of a plain SVG. This
 * guarantees:
 *   1. The anchor dots are TRUE circles (border-radius: 50% on a square
 *      DOM element), regardless of the SVG viewBox aspect scaling.
 *   2. Text is rendered by the browser text engine (crisp, real
 *      font-metric spacing) instead of the SVG text engine that gets
 *      distorted by ``preserveAspectRatio``.
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

  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="sagittal-overlay"
    >
      {/* Leader lines — drawn with a plain SVG that fills the same box.
          Non-scaling stroke keeps the hairline crisp regardless of the
          container size. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {activeLabels.map((l) => (
          <line
            key={`leader-${l.id}`}
            x1={l.anchor.x}
            y1={l.anchor.y}
            x2={l.leader.x}
            y2={l.leader.y}
            stroke="#ffffff"
            strokeOpacity="0.72"
            strokeWidth="0.18"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Anchor dots + text tags — plain HTML absolutely positioned so
          the dots render as perfect circles and text uses browser font
          metrics (no aspect-ratio distortion). */}
      {activeLabels.map((l) => {
        const text = lang === 'en' ? l.labelEn : l.labelIt;
        // Text anchor logic: if leader endpoint is to the LEFT of the
        // anatomy anchor, right-align text so it ends at the leader.
        const textAlignsRight = l.leader.x < l.anchor.x;
        return (
          <React.Fragment key={l.id}>
            {/* Landmark dot on the anatomy */}
            <span
              className="absolute rounded-full bg-white"
              style={{
                left: `${l.anchor.x}%`,
                top:  `${l.anchor.y}%`,
                width: '6px',
                height: '6px',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px rgba(255,255,255,0.85)',
              }}
              data-testid={`sagittal-anchor-${l.id}`}
            />
            {/* Text tag at the leader endpoint */}
            <span
              className="absolute text-white select-none"
              style={{
                left: `${l.leader.x}%`,
                top:  `${l.leader.y}%`,
                transform: textAlignsRight
                  ? 'translate(-100%, -50%) translateX(-6px)'
                  : 'translate(0, -50%) translateX(6px)',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                fontSize: 'clamp(10px, 1.35vw, 15px)',
                fontWeight: 400,
                letterSpacing: '0.01em',
                textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
              }}
              data-testid={`sagittal-label-${l.id}`}
            >
              {text}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
