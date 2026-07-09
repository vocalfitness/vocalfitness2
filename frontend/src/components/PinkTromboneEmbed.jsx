import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BACKEND_URL } from '../lib/backend';
import { useLanguage } from '../context/LanguageContext';
import useDialect from '../hooks/useDialect';
import { pickLang } from '../lib/pickLang';

// i18n dictionary for the Pink Trombone chrome. The underlying iframe
// (Neil Thapen's engine) is untouched — only React chrome is localised.
const PT_I18N = {
  caption: {
    it: 'Pink Trombone · modello fisico interattivo del tratto vocale',
    en: 'Pink Trombone · interactive physical model of the vocal tract',
  },
  refPlay:  { it: '🎙  Ascolta voce di Steve (riferimento)', en: '🎙  Listen to Steve\'s voice (reference)' },
  refPause: { it: '⏸  Pausa riferimento',                   en: '⏸  Pause reference' },
  errAudio: { it: 'Errore caricamento audio',               en: 'Audio loading error' },
  trapezoidLegend: {
    it: <>Trapezio vocalico IPA. <b>Clicca un simbolo</b> per aprire il tratto vocale interattivo (popup) e impostare la postura. <b>Trascina</b> per morfare in continuo.</>,
    en: <>IPA vowel trapezoid. <b>Click a symbol</b> to open the interactive vocal tract (popup) and set the posture. <b>Drag</b> to morph continuously.</>,
  },
  axisFront: { it: 'anteriore', en: 'front' },
  axisBack:  { it: 'posteriore', en: 'back' },
  axisClose: { it: 'chiusa',    en: 'close' },
  axisOpen:  { it: 'aperta',    en: 'open' },
  modelInfoReady:    { it: ' · ✓ pronto',                    en: ' · ✓ ready' },
  modelInfoNotReady: { it: ' · iframe non ancora caricato',  en: ' · iframe not loaded yet' },
  popupClose:  { it: 'Chiudi tratto vocale',            en: 'Close vocal tract' },
  iframeTitle: { it: 'Pink Trombone — tratto vocale interattivo', en: 'Pink Trombone interactive vocal tract' },
  popupLegend: {
    it: <>Sezione sagittale interattiva — tocca / trascina su lingua, palato, velo, labbra. L&rsquo;audio si attiva al primo tocco.</>,
    en: <>Interactive sagittal cross-section — tap / drag on tongue, palate, velum, lips. Audio activates on first touch.</>,
  },
};

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

// Vowel targets on the IPA trapezoid.
//
// ``x``/``y``       — normalised (0..1) coords for rendering the dot on the SVG.
// ``freq``          — glottis default frequency (Hz) at rest.
// ``tense``         — glottis tenseness 0..1 (~ vocal-fold stiffness).
// ``intensity``     — legacy internal knob (kept for compat with old callers).
// ``tongueIndex``   — Pink Trombone tract-index of the tongue-tip centre.
//                     CRITICAL: in the Neil Thapen tract, indices map from
//                     glottis (~0) to lips (~44). The tongue-controllable
//                     window is bladeStart+2=12 (BACK, near velum) to
//                     tipStart-3=29 (FRONT, near lips). So FRONT vowels
//                     need HIGH tongueIndex, BACK vowels need LOW.
// ``tongueDiameter``— cross-section opening at the tongue centre
//                     (2.05 = closed constriction .. 3.50 = wide open).
const VOWEL_TARGETS = [
  { sym: 'i', x: 0.08, y: 0.08, label: '/iː/ FLEECE',  freq: 138, tense: 0.85, intensity: 0.85, tongueIndex: 29.0, tongueDiameter: 2.15 },
  { sym: 'ɪ', x: 0.22, y: 0.20, label: '/ɪ/ KIT',      freq: 130, tense: 0.55, intensity: 0.80, tongueIndex: 27.5, tongueDiameter: 2.50 },
  { sym: 'e', x: 0.18, y: 0.45, label: '/e/ DRESS',    freq: 128, tense: 0.65, intensity: 0.80, tongueIndex: 26.0, tongueDiameter: 2.85 },
  { sym: 'ɛ', x: 0.20, y: 0.55, label: '/ɛ/ DRESS AmE',freq: 128, tense: 0.60, intensity: 0.80, tongueIndex: 25.5, tongueDiameter: 2.95 },
  { sym: 'æ', x: 0.30, y: 0.85, label: '/æ/ TRAP',     freq: 132, tense: 0.55, intensity: 0.85, tongueIndex: 24.0, tongueDiameter: 3.20 },
  { sym: 'ʌ', x: 0.55, y: 0.75, label: '/ʌ/ STRUT',    freq: 122, tense: 0.55, intensity: 0.85, tongueIndex: 19.0, tongueDiameter: 3.10 },
  { sym: 'ɑ', x: 0.78, y: 0.92, label: '/ɑː/ FATHER',  freq: 125, tense: 0.70, intensity: 0.90, tongueIndex: 14.0, tongueDiameter: 3.35 },
  { sym: 'ɒ', x: 0.82, y: 0.90, label: '/ɒ/ LOT',      freq: 124, tense: 0.65, intensity: 0.88, tongueIndex: 13.5, tongueDiameter: 3.30 },
  { sym: 'ɔ', x: 0.86, y: 0.55, label: '/ɔː/ THOUGHT', freq: 122, tense: 0.70, intensity: 0.85, tongueIndex: 13.0, tongueDiameter: 2.95 },
  { sym: 'ʊ', x: 0.78, y: 0.20, label: '/ʊ/ FOOT',     freq: 120, tense: 0.55, intensity: 0.85, tongueIndex: 13.0, tongueDiameter: 2.50 },
  { sym: 'u', x: 0.92, y: 0.08, label: '/uː/ GOOSE',   freq: 130, tense: 0.85, intensity: 0.85, tongueIndex: 12.5, tongueDiameter: 2.15 },
  { sym: 'ɜ', x: 0.50, y: 0.45, label: '/ɜː/ NURSE',   freq: 122, tense: 0.60, intensity: 0.80, tongueIndex: 20.0, tongueDiameter: 2.90 },
  { sym: 'ɝ', x: 0.50, y: 0.48, label: '/ɝ/ NURSE AmE',freq: 122, tense: 0.60, intensity: 0.80, tongueIndex: 20.0, tongueDiameter: 2.90 },
  { sym: 'ə', x: 0.52, y: 0.50, label: '/ə/ schwa',    freq: 120, tense: 0.45, intensity: 0.75, tongueIndex: 20.5, tongueDiameter: 2.85 },
  { sym: 'ɚ', x: 0.55, y: 0.52, label: '/ɚ/ letter',   freq: 120, tense: 0.45, intensity: 0.75, tongueIndex: 20.5, tongueDiameter: 2.85 },
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

export const PinkTromboneEmbed = ({
  phonemeId = 'u-foot',
  phonemeIpa = '',
  className = '',
  /**
   * Card-level ``audio`` object (shape: ``{AmE:{isolated}, RP:{isolated}}``).
   * When provided, the "Listen to Steve's voice" reference button plays
   * the ElevenLabs-generated isolated sound from the card matching the
   * currently selected dialect — replacing the hardcoded legacy WAV in
   * ``PHONEME_DEFAULTS``. This makes the reference audio consistent
   * with every other audio button on the phoneme card (all switch on
   * the RP/US toggle).
   */
  cardAudioByDialect = null,
}) => {
  const { language } = useLanguage();
  const { dialect } = useDialect();
  const t = (key) => pickLang(PT_I18N[key], language);
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
      // The two fields below are what actually moves the tongue on
      // the sagittal cross-section — see pink-trombone-original.html
      // ``applyParams`` for how they map onto ``Tract.tongueIndex`` /
      // ``Tract.tongueDiameter``.
      tongueIndex: target.tongueIndex,
      tongueDiameter: target.tongueDiameter,
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
    // Preferred source: the phoneme card's ElevenLabs isolated audio for
    // the CURRENT dialect. Falls back to the legacy hardcoded WAV in
    // PHONEME_DEFAULTS only when the card doesn't yet expose one.
    let url = null;
    if (cardAudioByDialect && typeof cardAudioByDialect === 'object') {
      const branch = cardAudioByDialect[dialect] || cardAudioByDialect.AmE || cardAudioByDialect.RP;
      if (branch && typeof branch === 'object' && branch.isolated) url = branch.isolated;
    }
    if (!url) url = profile.referenceAudio;
    if (!url) { setError(language === 'it' ? 'Audio di riferimento non ancora disponibile per questa scheda' : 'Reference audio not yet available for this card'); return; }
    // Absolute URLs (customer-assets CDN, ElevenLabs) go through as-is;
    // legacy relative paths get prefixed with BACKEND_URL as before.
    const src = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    // Rebuild the Audio element whenever the URL flips so the RP/US
    // switch is immediate even mid-playback.
    if (!refAudioRef.current || refAudioRef.current.src !== src) {
      if (refAudioRef.current) { try { refAudioRef.current.pause(); } catch { /* noop */ } }
      refAudioRef.current = new Audio(src);
      refAudioRef.current.addEventListener('ended', () => setRefPlaying(false));
      refAudioRef.current.addEventListener('error', () => { setRefPlaying(false); setError(pickLang(PT_I18N.errAudio, language)); });
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
    // Map trapezoid → Pink Trombone tract-shape.
    //   x=0 (front IPA) ↔ tongueIndex 29 (tongue near lips)
    //   x=1 (back IPA)  ↔ tongueIndex 12 (tongue near velum)
    //   y=0 (close)     ↔ diameter 2.15 (tight)
    //   y=1 (open)      ↔ diameter 3.35 (wide)
    const tongueIndex    = 29.0 - x * (29.0 - 12.0);
    const tongueDiameter = 2.15 + y * (3.35 - 2.15);
    sendParams({ tenseness: tense, intensity, frequency: freq, tongueIndex, tongueDiameter });
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
            {t('caption')}
          </span>
        </div>
        <button
          type="button"
          onClick={playReference}
          className={`phonetics-lab-wrapper__reference ${refPlaying ? 'is-playing' : ''}`}
          data-testid="phonetics-lab-reference-btn"
        >
          {refPlaying ? t('refPause') : t('refPlay')}
        </button>
      </div>

      {error && (
        <div className="phonetics-lab-wrapper__error" data-testid="phonetics-lab-error">{error}</div>
      )}

      <div className="phonetics-lab-wrapper__grid phonetics-lab-wrapper__grid--compact">
        <div className="phonetics-lab-wrapper__chart-col">
          <p className="phonetics-lab-wrapper__legend">
            {t('trapezoidLegend')}
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
            <text x="6"   y="10"  className="phonetics-lab-wrapper__axis">{t('axisFront')}</text>
            <text x="180" y="10"  className="phonetics-lab-wrapper__axis">{t('axisBack')}</text>
            <text x="6"   y="178" className="phonetics-lab-wrapper__axis">{t('axisOpen')}</text>
            <text x="178" y="178" className="phonetics-lab-wrapper__axis">{t('axisOpen')}</text>
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
            {language === 'it' ? 'Modello' : 'Model'}: <span>Pink Trombone</span> (Neil Thapen, MIT)
            {iframeReady ? t('modelInfoReady') : t('modelInfoNotReady')}
          </p>
        </div>
      </div>

      {/* ============= Pink Trombone popup — floating card, no backdrop ============= */}
      {/* The popup used to wrap in a full-viewport ``.phonetics-lab-popup``
          layer with ``pointer-events: none`` to keep the trapezoid drag
          alive underneath. That approach broke the iframe: clicks on
          the pink cavity area fell through to elements behind because
          the wrapper's ``pointer-events: none`` was inherited by the
          iframe on some browsers (WebKit, in particular). The card is
          now positioned directly with ``position: fixed`` — no wrapper,
          no backdrop, no inheritance surprises. */}
      {tractOpen && (
        <div
          className="phonetics-lab-popup__card"
          role="dialog"
          aria-modal="true"
          data-testid="phonetics-lab-popup"
        >
          <div className="phonetics-lab-popup__head">
            <span className="phonetics-lab-popup__title">
              Pink Trombone · <span className="phonetics-lab-popup__ipa">/{activeVowel}/</span>
            </span>
            <button
              type="button"
              className="phonetics-lab-popup__close"
              onClick={closeTract}
              aria-label={t('popupClose')}
              data-testid="phonetics-lab-popup-close"
            >×</button>
          </div>
          <iframe
            ref={iframeRef}
            src={IFRAME_URL}
            title={t('iframeTitle')}
            className="phonetics-lab-popup__iframe"
            data-testid="phonetics-lab-iframe"
            sandbox="allow-scripts allow-same-origin"
          />
          <p className="phonetics-lab-popup__legend">
            {t('popupLegend')}
          </p>
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
  /* The card positions itself directly with position: fixed — no
     wrapper, no backdrop. This keeps the trapezoid interactive
     underneath (drag / click on presets works while the popup is
     open) AND lets the iframe capture all mouse events on the pink
     cavity for tract-shape drags. */
  @keyframes plw-fade-in { from { opacity:0; } to { opacity:1; } }
  @keyframes plw-slide-tl { from { opacity:0; transform: translate(-12px,-12px) scale(.96); } to { opacity:1; transform:none; } }
  .phonetics-lab-popup__card {
    position: fixed; top: 24px; left: 24px; z-index: 70;
    width: min(440px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    background: #ffffff; border-radius: 16px;
    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.35);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: plw-slide-tl .3s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes plw-fade-in { from { opacity:0; } to { opacity:1; } }
  @keyframes plw-slide-tl { from { opacity:0; transform: translate(-12px,-12px) scale(.96); } to { opacity:1; transform:none; } }
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
