import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BACKEND_URL } from '../lib/backend';

/**
 * PinkTromboneEmbed — Mounts the authentic open-source `<pink-trombone>`
 * custom element (by Neil Thapen, MIT) inside an isolated iframe and
 * controls it via postMessage.
 *
 * The iframe approach avoids React lifecycle / module-loading conflicts:
 *   • The iframe HTML is a clean ES-modules host page.
 *   • Pink Trombone runs in its native environment with full canvas/SVG.
 *   • The React parent renders the IPA vowel trapezoid + ElevenLabs
 *     reference audio button, and pushes parameter changes (frequency,
 *     tenseness, intensity, loudness) to the iframe over postMessage.
 *
 * Initial posture for /ʊ/ FOOT: lax, near-close near-back rounded
 *   → frequency 120 Hz, tenseness 0.55, intensity 0.85.
 */

const IFRAME_URL = '/lms/vocal-lab/pink-trombone-original.html';

const VOWEL_TARGETS = [
  { sym: 'i', x: 0.08, y: 0.08, label: '/iː/ FLEECE', freq: 138, tense: 0.85, intensity: 0.85 },
  { sym: 'ɪ', x: 0.22, y: 0.20, label: '/ɪ/ KIT',     freq: 130, tense: 0.55, intensity: 0.80 },
  { sym: 'e', x: 0.18, y: 0.45, label: '/e/ DRESS',   freq: 128, tense: 0.65, intensity: 0.80 },
  { sym: 'æ', x: 0.30, y: 0.85, label: '/æ/ TRAP',    freq: 132, tense: 0.55, intensity: 0.85 },
  { sym: 'ɑ', x: 0.78, y: 0.92, label: '/ɑː/ FATHER', freq: 125, tense: 0.70, intensity: 0.90 },
  { sym: 'ɔ', x: 0.86, y: 0.55, label: '/ɔː/ THOUGHT',freq: 122, tense: 0.70, intensity: 0.85 },
  { sym: 'ʊ', x: 0.78, y: 0.20, label: '/ʊ/ FOOT',    freq: 120, tense: 0.55, intensity: 0.85 },
  { sym: 'u', x: 0.92, y: 0.08, label: '/uː/ GOOSE',  freq: 130, tense: 0.85, intensity: 0.85 },
  { sym: 'ə', x: 0.52, y: 0.50, label: '/ə/ schwa',   freq: 120, tense: 0.45, intensity: 0.75 },
];

// Map phoneme card IDs to (a) the matching vowel-chart symbol used as
// initial posture for the Pink Trombone and (b) the ElevenLabs reference
// recording of the Professor's isolated phoneme.
//
// The ``defaultSym`` fallback is now resolved dynamically from the
// phoneme's own IPA (via ``resolveDefaultSym`` below) so *every* card —
// present or future, seeded or batch-drafted — picks the correct
// trapezoid target without needing an explicit entry here. This entry
// map is used only for the reference-audio URL and any hand-tuned
// overrides that deviate from the pure IPA match.
const PHONEME_DEFAULTS = {
  'u-foot':   { defaultSym: 'ʊ', referenceAudio: '/api/uploads/elevenlabs/glottal_u_foot_mIrm7gNC_1781555727.mp3' },
  'i-fleece': { defaultSym: 'i', referenceAudio: '/api/uploads/elevenlabs/i_fleece_isolated_v3_mIrm7gNC_1782662697.mp3' },
};
const FALLBACK_DEFAULTS = { defaultSym: 'ʊ', referenceAudio: null };

/**
 * Resolve the trapezoid target symbol for a given phoneme card.
 *
 * Precedence:
 *   1. Explicit override in ``PHONEME_DEFAULTS[phonemeId]``.
 *   2. Direct match of ``phonemeIpa`` against a ``VOWEL_TARGETS.sym`` —
 *      also strips the length marker (``ː`` / ``:``) so ``/uː/`` matches
 *      the ``u`` node on the trapezoid.
 *   3. FALLBACK_DEFAULTS.defaultSym (``ʊ``).
 */
function resolveDefaultSym(phonemeId, phonemeIpa) {
  if (phonemeId && PHONEME_DEFAULTS[phonemeId]) return PHONEME_DEFAULTS[phonemeId].defaultSym;
  if (phonemeIpa) {
    const stripped = phonemeIpa.replace(/[ːː:]/g, '').trim();
    const direct = VOWEL_TARGETS.find(v => v.sym === stripped);
    if (direct) return direct.sym;
    // Diphthongs / broad phonemes — take the first character as anchor
    // (e.g. /eɪ/ → e, /aʊ/ → ɑ closest, /oʊ/ → ɔ closest).
    const firstChar = VOWEL_TARGETS.find(v => v.sym === stripped[0]);
    if (firstChar) return firstChar.sym;
  }
  return FALLBACK_DEFAULTS.defaultSym;
}

export const PinkTromboneEmbed = ({ phonemeId = 'u-foot', phonemeIpa = '', className = '' }) => {
  const explicitProfile = PHONEME_DEFAULTS[phonemeId];
  const defaultSym = resolveDefaultSym(phonemeId, phonemeIpa);
  const profile = explicitProfile || { defaultSym, referenceAudio: null };
  const defaultTarget = VOWEL_TARGETS.find(v => v.sym === defaultSym) || VOWEL_TARGETS[0];

  const iframeRef = useRef(null);
  const refAudioRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [activeVowel, setActiveVowel] = useState(defaultTarget.sym);
  // Free-form dragging position (0..1 in chart coords). When set, the
  // trapezoid renders an extra "you are here" cursor at this location.
  // The preset target chosen by ``activeVowel`` still highlights normally
  // — a drag simply overlays the continuous morph indicator on top so the
  // user can see exactly where the tract is being pushed.
  const [dragPos, setDragPos] = useState(null);
  const [refPlaying, setRefPlaying] = useState(false);
  const [error, setError] = useState('');
  const [tractOpen, setTractOpen] = useState(false);

  // Open the popup as a side-effect of any interaction on the trapezoid.
  // Calling this redundantly (e.g. on every drag-move) is safe — React
  // bails out of state updates that don't change the value.
  const openTract = () => setTractOpen(true);
  const closeTract = () => setTractOpen(false);

  const sendParams = useCallback((params) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'pt:set-params', params }, '*');
  }, []);

  const applyVowel = useCallback((target) => {
    sendParams({
      frequency: target.freq,
      tenseness: target.tense,
      intensity: target.intensity,
      loudness: target.intensity,
    });
    setActiveVowel(target.sym);
    // Clicking a preset resets the free-form cursor — the tract now
    // sits exactly on the target.
    setDragPos(null);
  }, [sendParams]);

  // Listen for "ready" handshake from the iframe. When the popup is first
  // opened by clicking a vowel target, the iframe has not yet mounted, so
  // the earlier applyVowel postMessage is dropped. Once ready, re-apply the
  // latest user selection (activeVowel) so the tract immediately reflects
  // the clicked phoneme instead of resetting to the card default.
  useEffect(() => {
    const onMsg = (ev) => {
      const d = ev.data;
      if (d && d.type === 'pt:ready') {
        setIframeReady(true);
        const current = VOWEL_TARGETS.find(v => v.sym === activeVowel) || defaultTarget;
        applyVowel(current);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [applyVowel, defaultTarget, activeVowel]);

  useEffect(() => () => {
    if (refAudioRef.current) { try { refAudioRef.current.pause(); } catch { /* noop */ } refAudioRef.current = null; }
  }, []);

  const playReference = () => {
    const url = profile.referenceAudio;
    if (!url) { setError('Audio di riferimento non ancora disponibile per questa scheda'); return; }
    if (!refAudioRef.current) {
      refAudioRef.current = new Audio(`${BACKEND_URL}${url}`);
      refAudioRef.current.addEventListener('ended', () => setRefPlaying(false));
      refAudioRef.current.addEventListener('error', () => { setRefPlaying(false); setError('Errore caricamento audio'); });
    }
    if (refPlaying) { refAudioRef.current.pause(); setRefPlaying(false); }
    else { refAudioRef.current.currentTime = 0; refAudioRef.current.play().then(() => setRefPlaying(true)).catch(() => {}); }
  };

  const handleChartDrag = (e) => {
    if (!iframeReady) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const tense = Math.max(0.3, Math.min(0.95, 0.9 - y * 0.55));
    const intensity = Math.max(0.5, Math.min(1.0, 0.65 + (1 - y) * 0.25));
    const freq = Math.max(80, Math.min(220, 125 + (0.5 - x) * 30));
    sendParams({ tenseness: tense, intensity, frequency: freq });
    // Continuous morph → update the free-form cursor + the live-params
    // read-out. We keep ``activeVowel`` intact so the last preset stays
    // highlighted as a reference anchor.
    setDragPos({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      freq, tense, intensity,
    });
  };

  return (
    <div className={`phonetics-lab-wrapper ${className}`} data-testid="phonetics-lab-wrapper">
      <style>{styles}</style>

      <div className="phonetics-lab-wrapper__topbar">
        <div className="phonetics-lab-wrapper__title">
          <span className="phonetics-lab-wrapper__ipa">/{defaultTarget.sym}/</span>
          <span className="phonetics-lab-wrapper__caption">
            Pink Trombone · modello fisico interattivo del tratto vocale
          </span>
        </div>
        <button
          type="button"
          onClick={playReference}
          className={`phonetics-lab-wrapper__reference ${refPlaying ? 'is-playing' : ''}`}
          data-testid="phonetics-lab-reference-btn"
        >
          {refPlaying ? '⏸  Pausa riferimento' : '🎙  Ascolta voce di Steve (riferimento)'}
        </button>
      </div>

      {error && (
        <div className="phonetics-lab-wrapper__error" data-testid="phonetics-lab-error">{error}</div>
      )}

      <div className="phonetics-lab-wrapper__grid phonetics-lab-wrapper__grid--compact">
        <div className="phonetics-lab-wrapper__chart-col">
          <p className="phonetics-lab-wrapper__legend">
            Trapezio vocalico IPA. <b>Clicca un simbolo</b> per aprire il tratto vocale
            interattivo (popup) e impostare la postura. <b>Trascina</b> per morfare in continuo.
          </p>
          <svg
            viewBox="0 0 220 180"
            className="phonetics-lab-wrapper__chart"
            onMouseDown={(e) => { openTract(); handleChartDrag(e); e.currentTarget._dragging = true; }}
            onMouseMove={(e) => { if (e.currentTarget._dragging) handleChartDrag(e); }}
            onMouseUp={(e) => { e.currentTarget._dragging = false; }}
            onMouseLeave={(e) => { e.currentTarget._dragging = false; }}
            data-testid="phonetics-lab-vowel-chart"
          >
            <polygon points="14,14 206,14 178,166 42,166"
                     fill="rgba(245,158,11,0.04)"
                     stroke="rgba(245,158,11,0.5)" strokeWidth="1.2" />
            <text x="6"   y="10"  className="phonetics-lab-wrapper__axis">front</text>
            <text x="180" y="10"  className="phonetics-lab-wrapper__axis">back</text>
            <text x="6"   y="178" className="phonetics-lab-wrapper__axis">open</text>
            <text x="178" y="178" className="phonetics-lab-wrapper__axis">open</text>
            {VOWEL_TARGETS.map(v => {
              const cx = 14 + v.x * (206 - 14);
              const cy = 14 + v.y * (166 - 14);
              const active = activeVowel === v.sym;
              return (
                <g
                  key={v.sym}
                  onClick={(ev) => { ev.stopPropagation(); openTract(); applyVowel(v); }}
                  className={`phonetics-lab-wrapper__target ${active ? 'is-active' : ''}`}
                  data-testid={`vowel-target-${v.sym}`}
                >
                  <circle cx={cx} cy={cy} r={active ? 11 : 8} />
                  <text x={cx} y={cy + 5} textAnchor="middle">{v.sym}</text>
                  <title>{v.label}</title>
                </g>
              );
            })}
            {/* Free-form drag cursor — "you are here" indicator that
                tracks the mouse while the user morphs the tract in
                continuous mode. Rendered above the preset targets so
                the position is unambiguous. */}
            {dragPos && (
              <g className="phonetics-lab-wrapper__cursor" data-testid="phonetics-lab-vowel-cursor" aria-hidden="true">
                <circle
                  cx={14 + dragPos.x * (206 - 14)}
                  cy={14 + dragPos.y * (166 - 14)}
                  r={7}
                />
                {/* Live parameter read-out anchored to the cursor —
                    reveals in real time the vocal-tract knobs being
                    pushed as the user morphs (pedagogical value: shows
                    the physical mapping between mouth position and
                    acoustic parameters). Positioned to the right of
                    the cursor when in the left half of the chart, and
                    to the left when in the right half — always stays
                    inside the trapezoid. */}
                <g className="phonetics-lab-wrapper__cursor-label">
                  {(() => {
                    const cx = 14 + dragPos.x * (206 - 14);
                    const cy = 14 + dragPos.y * (166 - 14);
                    const rightSide = dragPos.x > 0.55;
                    const lx = rightSide ? cx - 62 : cx + 12;
                    const ly = cy - 20;
                    return (
                      <>
                        <rect x={lx} y={ly} width="52" height="34" rx="4" />
                        <text x={lx + 4} y={ly + 10}>{Math.round(dragPos.freq)} Hz</text>
                        <text x={lx + 4} y={ly + 20}>tense {dragPos.tense.toFixed(2)}</text>
                        <text x={lx + 4} y={ly + 30}>int   {dragPos.intensity.toFixed(2)}</text>
                      </>
                    );
                  })()}
                </g>
              </g>
            )}
          </svg>
          <p className="phonetics-lab-wrapper__hint">
            Modello: <span>Pink Trombone</span> (Neil Thapen, MIT)
            {iframeReady ? ' · ✓ pronto' : ' · iframe non ancora caricato'}
          </p>
        </div>
      </div>

      {/* ============= Pink Trombone popup (top-left, draggable backdrop) ============= */}
      {tractOpen && (
        <div
          className="phonetics-lab-popup"
          role="dialog"
          aria-modal="true"
          data-testid="phonetics-lab-popup"
          onClick={(e) => { if (e.target === e.currentTarget) closeTract(); }}
        >
          <div className="phonetics-lab-popup__card">
            <div className="phonetics-lab-popup__head">
              <span className="phonetics-lab-popup__title">
                Pink Trombone · <span className="phonetics-lab-popup__ipa">/{activeVowel}/</span>
              </span>
              <button
                type="button"
                className="phonetics-lab-popup__close"
                onClick={closeTract}
                aria-label="Chiudi tratto vocale"
                data-testid="phonetics-lab-popup-close"
              >×</button>
            </div>
            <iframe
              ref={iframeRef}
              src={IFRAME_URL}
              title="Pink Trombone interactive vocal tract"
              className="phonetics-lab-popup__iframe"
              data-testid="phonetics-lab-iframe"
              sandbox="allow-scripts allow-same-origin"
            />
            <p className="phonetics-lab-popup__legend">
              Sezione sagittale interattiva — tocca / trascina su lingua, palato, velo, labbra.
              L&rsquo;audio si attiva al primo tocco.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = `
  .phonetics-lab-wrapper, .phonetics-lab-wrapper * { box-sizing: border-box; }
  .phonetics-lab-wrapper {
    --plw-bg-0:#0b1220; --plw-bg-1:#111c2e;
    --plw-fg:#e2e8f0; --plw-muted:#94a3b8;
    --plw-accent:#f59e0b; --plw-accent-2:#38bdf8;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: var(--plw-fg);
    background: linear-gradient(180deg, var(--plw-bg-0), var(--plw-bg-1));
    padding: 18px 20px; border-radius: 14px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    max-width: 1100px; margin: 0 auto;
  }
  .phonetics-lab-wrapper__topbar {
    display:flex; align-items:center; justify-content:space-between;
    flex-wrap:wrap; gap:12px; margin-bottom:14px;
  }
  .phonetics-lab-wrapper__title { display:flex; align-items:center; gap:12px; }
  .phonetics-lab-wrapper__ipa {
    font-family:"Charis SIL", Georgia, serif;
    font-size:28px; color: var(--plw-accent); font-weight:700;
  }
  .phonetics-lab-wrapper__caption {
    font-size:12px; color: var(--plw-muted); letter-spacing:0.02em;
  }
  .phonetics-lab-wrapper__reference {
    appearance:none; border:1px solid rgba(245,158,11,0.45);
    background: rgba(245,158,11,0.12); color: var(--plw-accent);
    padding: 9px 16px; border-radius: 999px;
    cursor: pointer; font-size: 13px; font-weight:600;
    transition: background .15s ease, color .15s ease, transform .1s ease;
    font-family: inherit;
  }
  .phonetics-lab-wrapper__reference:hover {
    background: rgba(245,158,11,0.22); transform: translateY(-1px);
  }
  .phonetics-lab-wrapper__reference.is-playing { background: var(--plw-accent); color:#0f172a; }
  .phonetics-lab-wrapper__error {
    background: rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3);
    color:#fda4af; border-radius:10px; padding:10px 14px;
    font-size:13px; margin-bottom:14px;
  }
  .phonetics-lab-wrapper__grid {
    display:grid; grid-template-columns: minmax(220px, 320px) 1fr; gap:18px;
  }
  @media (max-width: 800px) {
    .phonetics-lab-wrapper__grid { grid-template-columns: 1fr; }
  }
  .phonetics-lab-wrapper__legend {
    font-size:12px; color: var(--plw-muted); line-height:1.5; margin:0 0 10px;
  }
  .phonetics-lab-wrapper__legend b { color: var(--plw-fg); font-weight:600; }
  .phonetics-lab-wrapper__chart {
    width:100%; height:auto; aspect-ratio: 220 / 180;
    background: rgba(255,255,255,0.02);
    border-radius:10px; cursor: crosshair; touch-action:none; user-select:none;
  }
  .phonetics-lab-wrapper__axis {
    fill: var(--plw-muted); font-size:8px;
    font-family: inherit; letter-spacing:0.05em;
  }
  .phonetics-lab-wrapper__target { cursor:pointer; }
  .phonetics-lab-wrapper__target circle {
    fill: rgba(56,189,248,0.15); stroke: rgba(56,189,248,0.6);
    transition: fill .15s, stroke .15s, r .15s;
  }
  .phonetics-lab-wrapper__target:hover circle {
    fill: rgba(245,158,11,0.3); stroke: var(--plw-accent);
  }
  .phonetics-lab-wrapper__target.is-active circle { fill: var(--plw-accent); stroke: var(--plw-accent); }
  .phonetics-lab-wrapper__target text {
    fill: var(--plw-fg); font-family:"Charis SIL", Georgia, serif;
    font-size:10px; pointer-events:none; text-anchor:middle;
  }
  .phonetics-lab-wrapper__target.is-active text { fill: #0f172a; font-weight:700; }
  .phonetics-lab-wrapper__cursor circle {
    fill: rgba(255,255,255,0.35);
    stroke: #f8fafc;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 6px rgba(248,250,252,0.65));
    animation: plw-cursor-pulse 1.4s ease-in-out infinite;
  }
  @keyframes plw-cursor-pulse {
    0%,100% { r: 6; opacity: 0.85; }
    50%     { r: 8; opacity: 1;    }
  }
  .phonetics-lab-wrapper__cursor-label rect {
    fill: rgba(2, 6, 12, 0.86);
    stroke: rgba(248, 250, 252, 0.35);
    stroke-width: 0.5;
  }
  .phonetics-lab-wrapper__cursor-label text {
    fill: #f8fafc;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 6.5px;
    letter-spacing: 0.02em;
    pointer-events: none;
    dominant-baseline: hanging;
  }
  .phonetics-lab-wrapper__hint {
    font-size:10px; color: var(--plw-muted); line-height:1.6; margin:8px 0 0;
  }
  .phonetics-lab-wrapper__hint span { color: var(--plw-accent); font-weight:600; }
  .phonetics-lab-wrapper__iframe {
    width: 100%; aspect-ratio: 1 / 1; min-height: 560px;
    border: 0; border-radius: 12px;
    background: #ffffff;
    display: block;
  }
  .phonetics-lab-wrapper__grid--compact {
    grid-template-columns: minmax(280px, 460px);
    justify-content: center;
  }

  /* ---- Top-left popup that hosts the Pink Trombone iframe ---- */
  .phonetics-lab-popup {
    position: fixed; inset: 0; z-index: 70;
    padding: 24px;
    animation: plw-fade-in .25s ease-out;
    /* Backdrop is non-blocking so the user can keep dragging on the
       vowel trapezoid below while the popup is open. Interactive
       elements inside the card re-enable pointer events. */
    pointer-events: none;
    background: transparent;
  }
  .phonetics-lab-popup > * { pointer-events: auto; }
  @keyframes plw-fade-in { from { opacity:0; } to { opacity:1; } }
  @keyframes plw-slide-tl { from { opacity:0; transform: translate(-12px,-12px) scale(.96); } to { opacity:1; transform:none; } }
  .phonetics-lab-popup__card {
    position: absolute; top: 24px; left: 24px;
    width: min(440px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    background: #ffffff; border-radius: 16px;
    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.35);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: plw-slide-tl .3s cubic-bezier(.2,.8,.2,1);
  }
  .phonetics-lab-popup__head {
    display:flex; align-items:center; justify-content:space-between;
    gap: 10px; padding: 10px 14px;
    background: linear-gradient(180deg, #0b1220, #111c2e);
    color: #e2e8f0; border-bottom: 1px solid rgba(245,158,11,0.35);
  }
  .phonetics-lab-popup__title {
    font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #cbd5e1;
  }
  .phonetics-lab-popup__ipa {
    font-family:"Charis SIL", Georgia, serif; font-size: 16px;
    color: var(--plw-accent); font-weight: 700; text-transform: none; letter-spacing: 0;
  }
  .phonetics-lab-popup__close {
    appearance: none; border: 0; background: rgba(255,255,255,0.08); color: #fff;
    width: 28px; height: 28px; border-radius: 999px;
    cursor: pointer; font-size: 18px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s ease, transform .1s ease;
  }
  .phonetics-lab-popup__close:hover { background: rgba(244,63,94,0.7); transform: scale(1.06); }
  .phonetics-lab-popup__iframe {
    width: 100%; aspect-ratio: 1/1; min-height: 360px;
    border: 0; background: #ffffff; display: block;
  }
  .phonetics-lab-popup__legend {
    margin: 0; padding: 8px 14px 12px;
    font-size: 11px; color: #475569; line-height: 1.5;
    background: #f8fafc; border-top: 1px solid #e2e8f0;
  }
`;

export default PinkTromboneEmbed;
