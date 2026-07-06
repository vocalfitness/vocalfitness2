import React, { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * SagittalOverlay — printed-card-style anatomical annotations.
 *
 * Style replicates the reference labels baked into the physical Vocal
 * Fitness card (see reference JPG shared on 06/07/2026):
 *   • Font: **Barlow Condensed 400** — tall, narrow, thin sans-serif.
 *   • Colour: pure WHITE, no glow, no cyan tint. Sentence-case text.
 *   • Leader: single WHITE hairline (1px) from the anatomy anchor dot
 *     to the text tag. **No dot on the text side** — only on the anatomy.
 *   • Airflow arrows: small, curved, cyan, **contained INSIDE the vocal
 *     tract cavity**. They no longer sweep across the face.
 *
 * Absolute-positioned HTML keeps circles perfectly circular and text
 * crisp regardless of the container aspect ratio (which is 16:9 for the
 * side-view card).
 */
export default function SagittalOverlay({
  card,
  className = '',
  labels: labelsProp,
  lang: langProp,
}) {
  const { language: ctxLang } = useLanguage();
  const lang = langProp || ctxLang || 'it';
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

  const FONT_STACK = '"Barlow Condensed", "Roboto Condensed", "Fira Sans Condensed", ui-sans-serif, system-ui, sans-serif';

  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="sagittal-overlay"
    >
      {/* Leader lines only — airflow arrows have been PERMANENTLY removed
          per user directive 06/07/2026: the intra-cavity arrow was more
          distracting than informative. The HUD Airflow badge (bottom
          right) already communicates airflow presence. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Hairline white leader lines */}
        {activeLabels.map((l) => (
          <line
            key={`leader-${l.id}`}
            x1={l.anchor.x}
            y1={l.anchor.y}
            x2={l.leader.x}
            y2={l.leader.y}
            stroke="#ffffff"
            strokeOpacity="0.9"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Anchor dots + text tags — plain HTML absolutely positioned. */}
      {activeLabels.map((l) => {
        const text = lang === 'en' ? l.labelEn : l.labelIt;
        const textAlignsRight = l.leader.x < l.anchor.x;
        return (
          <React.Fragment key={l.id}>
            {/* Landmark dot on the anatomy — small, subtle, TRUE circle */}
            <span
              className="absolute rounded-full bg-white"
              style={{
                left: `${l.anchor.x}%`,
                top:  `${l.anchor.y}%`,
                width: '5px',
                height: '5px',
                transform: 'translate(-50%, -50%)',
              }}
              data-testid={`sagittal-anchor-${l.id}`}
            />
            {/* Text tag — Barlow Condensed 400, sits right next to the leader end */}
            <span
              className="absolute select-none"
              style={{
                left: `${l.leader.x}%`,
                top:  `${l.leader.y}%`,
                transform: textAlignsRight
                  ? 'translate(-100%, -50%) translateX(-4px)'
                  : 'translate(0, -50%) translateX(4px)',
                color: '#ffffff',
                fontFamily: FONT_STACK,
                fontWeight: 400,
                fontSize: 'clamp(14px, 1.4vw, 20px)',
                lineHeight: 1.05,
                letterSpacing: '0.005em',
                textAlign: textAlignsRight ? 'right' : 'left',
                maxWidth: '18ch',
                whiteSpace: 'normal',
              }}
              data-testid={`sagittal-label-${l.id}`}
            >
              {text}
            </span>
          </React.Fragment>
        );
      })}

      {/* Airflow-flow animation (retained for backwards-compat; airflow
          arrows are no longer rendered per user directive 06/07/2026). */}
      <style>{`
        @keyframes sag-flow {
          from { stroke-dashoffset: 4; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
