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
const PHONEME_DEFAULTS = {
  'u-foot':   { defaultSym: 'ʊ', referenceAudio: '/api/uploads/elevenlabs/glottal_u_foot_mIrm7gNC_1781555727.mp3' },
  'i-fleece': { defaultSym: 'i', referenceAudio: '/api/uploads/elevenlabs/i_fleece_isolated_mIrm7gNC_1782653316.mp3' },
};
const FALLBACK_DEFAULTS = { defaultSym: 'ʊ', referenceAudio: null };

export const PinkTromboneEmbed = ({ phonemeId = 'u-foot', className = '' }) => {
  const profile = PHONEME_DEFAULTS[phonemeId] || FALLBACK_DEFAULTS;
  const defaultTarget = VOWEL_TARGETS.find(v => v.sym === profile.defaultSym) || VOWEL_TARGETS[0];

  const iframeRef = useRef(null);
  const refAudioRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [activeVowel, setActiveVowel] = useState(defaultTarget.sym);
  const [refPlaying, setRefPlaying] = useState(false);
  const [error, setError] = useState('');

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
  }, [sendParams]);

  // Listen for "ready" handshake from the iframe
  useEffect(() => {
    const onMsg = (ev) => {
      const d = ev.data;
      if (d && d.type === 'pt:ready') {
        setIframeReady(true);
        applyVowel(defaultTarget);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [applyVowel, defaultTarget]);

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
    const tense = 0.9 - y * 0.55;
    const intensity = 0.65 + (1 - y) * 0.25;
    const freq = 125 + (0.5 - x) * 30;
    sendParams({
      tenseness: Math.max(0.3, Math.min(0.95, tense)),
      intensity: Math.max(0.5, Math.min(1.0, intensity)),
      frequency: Math.max(80, Math.min(220, freq)),
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

      <div className="phonetics-lab-wrapper__grid">
        <div className="phonetics-lab-wrapper__chart-col">
          <p className="phonetics-lab-wrapper__legend">
            Trapezio vocalico IPA. <b>Clicca un simbolo</b> per impostare la postura,
            oppure <b>trascina</b> per morfare continuamente. Il tratto vocale a fianco
            reagirà istantaneamente.
          </p>
          <svg
            viewBox="0 0 220 180"
            className="phonetics-lab-wrapper__chart"
            onMouseDown={(e) => { handleChartDrag(e); e.currentTarget._dragging = true; }}
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
                  onClick={(ev) => { ev.stopPropagation(); applyVowel(v); }}
                  className={`phonetics-lab-wrapper__target ${active ? 'is-active' : ''}`}
                  data-testid={`vowel-target-${v.sym}`}
                >
                  <circle cx={cx} cy={cy} r={active ? 11 : 8} />
                  <text x={cx} y={cy + 5} textAnchor="middle">{v.sym}</text>
                  <title>{v.label}</title>
                </g>
              );
            })}
          </svg>
          <p className="phonetics-lab-wrapper__hint">
            Modello: <span>Pink Trombone</span> (Neil Thapen, MIT)
            {iframeReady ? ' · ✓ pronto' : ' · caricamento…'}
          </p>
        </div>

        <div className="phonetics-lab-wrapper__tract-col">
          <p className="phonetics-lab-wrapper__legend">
            Sezione sagittale interattiva. <b>Tocca o trascina</b> direttamente sul tratto
            vocale (lingua, palato, velo, labbra). L&apos;audio si attiva al primo tocco.
          </p>
          <iframe
            ref={iframeRef}
            src={IFRAME_URL}
            title="Pink Trombone interactive vocal tract"
            className="phonetics-lab-wrapper__iframe"
            data-testid="phonetics-lab-iframe"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      </div>
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
`;

export default PinkTromboneEmbed;
