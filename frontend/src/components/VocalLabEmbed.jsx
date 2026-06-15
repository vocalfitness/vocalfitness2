import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VOCAL_LAB_PROFILES, VOCAL_LAB_PROFILE_ORDER } from '../data/vocalLabProfiles';

/**
 * VocalLabEmbed — React wrapper around the standalone VocalLabEngine.
 *
 *   <VocalLabEmbed profileId="u-foot" />
 *
 * Loads `/lms/vocal-lab/vocal-framework.js` once (shared across instances),
 * mounts a fully scoped DOM tree, instantiates the engine, and tears
 * everything down on unmount. Switching `profileId` at runtime triggers
 * `engine.loadPhoneme()` which morphs the tract smoothly.
 */
const FRAMEWORK_SRC = '/lms/vocal-lab/vocal-framework.js';

// Shared loader so multiple components don't double-inject the script
let frameworkLoadingPromise = null;
function loadFrameworkOnce() {
  if (window.VocalLabEngine) return Promise.resolve();
  if (frameworkLoadingPromise) return frameworkLoadingPromise;
  frameworkLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${FRAMEWORK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('vocal-framework failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = FRAMEWORK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('vocal-framework failed to load'));
    document.body.appendChild(s);
  });
  return frameworkLoadingPromise;
}

export const VocalLabEmbed = ({
  profileId = 'u-foot',
  profiles = VOCAL_LAB_PROFILES,
  order = VOCAL_LAB_PROFILE_ORDER,
  className = '',
}) => {
  const rootRef = useRef(null);
  const engineRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState(profileId);

  // Init engine ONCE on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFrameworkOnce();
        if (cancelled || !rootRef.current) return;
        const Engine = window.VocalLabEngine;
        if (!Engine) throw new Error('VocalLabEngine not available');
        const engine = new Engine(rootRef.current, { width: 720, height: 320 });
        engineRef.current = engine;

        // Register all known profiles so chip buttons auto-bind
        Object.values(profiles).forEach(p => engine.registerProfile(p));

        await engine.init(profiles[activeId] || profiles[order[0]]);
        if (!cancelled) setReady(true);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[VocalLabEmbed] init failed', err);
      }
    })();
    return () => {
      cancelled = true;
      try { engineRef.current?.destroy?.(); } catch { /* engine already torn down */ }
      engineRef.current = null;
    };
  }, []);  // eslint-disable-line

  // React to profileId prop changes after init
  useEffect(() => {
    if (!ready) return;
    if (profileId === activeId) return;
    const cfg = profiles[profileId];
    if (cfg && engineRef.current) {
      engineRef.current.loadPhoneme(cfg);
      setActiveId(profileId);
    }
  }, [profileId, profiles, ready, activeId]);

  const handleChipClick = useCallback((id) => {
    const cfg = profiles[id];
    if (cfg && engineRef.current) {
      engineRef.current.loadPhoneme(cfg);
      setActiveId(id);
    }
  }, [profiles]);

  return (
    <div className={className}>
      <style>{styles}</style>
      <div ref={rootRef} className="vocal-lab-engine" data-vl-root data-testid="vocal-lab-root">
        <div className="vocal-lab-engine__header">
          <h3 className="vocal-lab-engine__title" data-vl-title>Phonetics Lab</h3>
          <span className="vocal-lab-engine__ipa" data-vl-ipa>/ʊ/</span>
        </div>
        <p className="vocal-lab-engine__hint">
          Tocca o trascina sul tratto vocale per modificare la posizione della lingua.
          Usa i controlli sotto per modulare voce, intonazione e velo palatino.
        </p>

        <div className="vocal-lab-engine__stage">
          <canvas
            data-vl-canvas
            className="vocal-lab-engine__canvas"
            width="720"
            height="320"
            aria-label="Sezione sagittale interattiva del tratto vocale"
            data-testid="vocal-lab-canvas"
          />
          <div className="vocal-lab-engine__overlay" data-vl-overlay data-visible="true">
            <div className="vocal-lab-engine__overlay-text">
              Per attivare il sintetizzatore audio è necessaria un&apos;interazione esplicita
              (vincolo dei browser).
            </div>
            <button
              className="vocal-lab-engine__activate"
              data-vl-activate
              type="button"
              data-testid="vocal-lab-activate"
            >
              ▶ Attiva Phonetics Lab
            </button>
          </div>
        </div>

        <div className="vocal-lab-engine__controls">
          <label className="vocal-lab-engine__field">
            <span className="vocal-lab-engine__field-label">
              Pitch f₀
              <span className="vocal-lab-engine__field-value" data-vl-freq-value>130 Hz</span>
            </span>
            <input type="range" className="vocal-lab-engine__slider"
                   min="60" max="400" step="1" defaultValue="130" data-vl-freq />
          </label>

          <label className="vocal-lab-engine__field">
            <span className="vocal-lab-engine__field-label">Tenseness</span>
            <input type="range" className="vocal-lab-engine__slider"
                   min="0" max="1" step="0.01" defaultValue="0.6" data-vl-tenseness />
          </label>

          <label className="vocal-lab-engine__field">
            <span className="vocal-lab-engine__field-label">Velo palatino</span>
            <input type="range" className="vocal-lab-engine__slider"
                   min="0" max="0.6" step="0.01" defaultValue="0" data-vl-velum />
          </label>

          <div className="vocal-lab-engine__field vocal-lab-engine__field--switch">
            <label className="vocal-lab-engine__switch">
              <input type="checkbox" data-vl-voicing defaultChecked />
              Voicing on
            </label>
          </div>
        </div>

        <div className="vocal-lab-engine__profiles">
          {order.map(id => {
            const p = profiles[id];
            if (!p) return null;
            const isActive = id === activeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleChipClick(id)}
                className={`vocal-lab-engine__chip${isActive ? ' vocal-lab-engine__chip--active' : ''}`}
                data-vl-profile={id}
                data-testid={`vocal-lab-profile-${id}`}
              >
                {p.ipa} {p.label?.split('—')[0]?.trim() || id}
              </button>
            );
          })}
        </div>

        <p className="vocal-lab-engine__legend">
          Il modello simula 44 sezioni cilindriche di tratto vocale + 28 sezioni nasali.
          Il glottal source può essere sintetico (LF-pulse) oppure un campione di voce clonata
          (ElevenLabs) pitch-shiftato in tempo reale.
        </p>
      </div>
    </div>
  );
};

const styles = `
  .vocal-lab-engine, .vocal-lab-engine * { box-sizing: border-box; }
  .vocal-lab-engine {
    --vle-bg-0: #0b1220;
    --vle-bg-1: #111c2e;
    --vle-fg:   #e2e8f0;
    --vle-muted:#94a3b8;
    --vle-accent:#f59e0b;
    --vle-accent-2:#38bdf8;
    --vle-radius: 14px;
    --vle-shadow: 0 8px 28px rgba(0,0,0,0.35);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--vle-fg);
    background: var(--vle-bg-0);
    padding: 18px;
    border-radius: var(--vle-radius);
    box-shadow: var(--vle-shadow);
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }
  .vocal-lab-engine__header {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; margin-bottom: 10px; flex-wrap: wrap;
  }
  .vocal-lab-engine__title {
    font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0;
    color: var(--vle-fg);
  }
  .vocal-lab-engine__ipa {
    font-family: "Charis SIL", "Doulos SIL", Georgia, serif;
    font-size: 24px; color: var(--vle-accent); font-weight: 600;
  }
  .vocal-lab-engine__hint {
    font-size: 12px; color: var(--vle-muted); margin: 4px 0 14px;
  }
  .vocal-lab-engine__stage {
    position: relative; border-radius: 12px; overflow: hidden;
    background: linear-gradient(180deg, var(--vle-bg-0), var(--vle-bg-1));
  }
  .vocal-lab-engine__canvas {
    display: block; width: 100%; height: auto;
    cursor: crosshair; touch-action: none;
  }
  .vocal-lab-engine__overlay {
    position: absolute; inset: 0;
    background: rgba(15, 23, 42, 0.86);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 10px;
    transition: opacity .25s ease; opacity: 1; z-index: 5;
  }
  .vocal-lab-engine__overlay[data-visible="false"] { opacity: 0; pointer-events: none; }
  .vocal-lab-engine__activate {
    appearance: none; border: 0;
    background: var(--vle-accent); color: #0f172a;
    font-weight: 700; font-size: 14px;
    padding: 12px 24px; border-radius: 999px;
    cursor: pointer; letter-spacing: 0.02em;
    box-shadow: 0 8px 22px rgba(245, 158, 11, 0.35);
    transition: transform .15s ease;
  }
  .vocal-lab-engine__activate:hover { transform: translateY(-1px); }
  .vocal-lab-engine__activate:active { transform: translateY(1px); }
  .vocal-lab-engine__overlay-text {
    color: var(--vle-fg); font-size: 13px;
    max-width: 320px; text-align: center; opacity: .85;
  }
  .vocal-lab-engine__controls {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px; margin-top: 14px;
  }
  .vocal-lab-engine__field {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px; padding: 10px 12px;
  }
  .vocal-lab-engine__field--switch { display: flex; align-items: center; }
  .vocal-lab-engine__field-label {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--vle-muted); margin-bottom: 6px;
  }
  .vocal-lab-engine__field-value {
    color: var(--vle-accent); font-weight: 600; font-variant-numeric: tabular-nums;
  }
  .vocal-lab-engine__slider {
    width: 100%; appearance: none; height: 4px;
    background: #1e293b; border-radius: 2px; outline: none;
  }
  .vocal-lab-engine__slider::-webkit-slider-thumb {
    appearance: none; width: 14px; height: 14px;
    border-radius: 50%; background: var(--vle-accent);
    cursor: pointer; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
  }
  .vocal-lab-engine__switch {
    display: inline-flex; align-items: center; gap: 8px;
    cursor: pointer; user-select: none; font-size: 12px;
    color: var(--vle-fg);
  }
  .vocal-lab-engine__switch input { accent-color: var(--vle-accent); }
  .vocal-lab-engine__profiles {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px;
  }
  .vocal-lab-engine__chip {
    appearance: none;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--vle-fg);
    padding: 8px 14px; border-radius: 999px;
    font-size: 13px; cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
    font-family: inherit;
  }
  .vocal-lab-engine__chip:hover {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.4);
  }
  .vocal-lab-engine__chip--active {
    background: rgba(245, 158, 11, 0.2);
    border-color: var(--vle-accent);
    color: var(--vle-accent);
  }
  .vocal-lab-engine__legend {
    font-size: 11px; color: var(--vle-muted);
    margin-top: 10px; line-height: 1.5;
  }
`;

export default VocalLabEmbed;
