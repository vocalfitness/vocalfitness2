import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { PHONEMES } from '../data/phonemes';
import {
  ArrowLeft, Play, Volume2, Mic2, AudioWaveform, Activity, Info,
  Maximize2, X, Pause, ChevronRight, GraduationCap, BookOpen, Sparkles, FlaskConical
} from 'lucide-react';
import { VocalLabEmbed } from '../components/VocalLabEmbed';
import { PinkTromboneEmbed } from '../components/PinkTromboneEmbed';
import SpectrogramView from '../components/SpectrogramView';
import PhonemeAuralQuiz from '../components/PhonemeAuralQuiz';
import PhonemeVideoLesson from '../components/PhonemeVideoLesson';
import useDialect from '../hooks/useDialect';
import { canAccessCard, hasPremiumAccess } from '../data/phonemeCatalogue';
import { useAuth } from '../context/AuthContext';
import LMSPremiumPaywall from '../components/LMSPremiumPaywall';

// ============================================================
// AnimatedKnob — circular gauge with stroke-dashoffset animation
// ============================================================
const AnimatedKnob = ({ label, value, valueLabel, highlight = false, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 1400;
      const step = (ts) => {
        const t = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayValue(Math.round(eased * value));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame((ts) => { start = ts; step(ts); });
    }, delay);
    return () => clearTimeout(timer);
  }, [visible, value, delay]);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayValue / 100) * circumference;
  const color = highlight ? '#fb923c' : '#22d3ee';

  return (
    <div ref={ref} className="flex flex-col items-center" data-testid={`knob-${label.toLowerCase()}`}>
      <p className="text-cyan-300/80 text-[10px] uppercase tracking-[0.18em] mb-3 font-semibold">{label}</p>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} stroke="rgba(34, 211, 238, 0.12)" strokeWidth="6" fill="none" />
          <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.05s linear',
              filter: highlight ? 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))' : 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.35))'
            }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-white'}`}>{displayValue}%</span>
        </div>
      </div>
      <p className={`text-xs mt-2 ${highlight ? 'text-orange-400' : 'text-cyan-200'} font-medium`}>{valueLabel}</p>
    </div>
  );
};

// ============================================================
// Hotspot — clickable point overlay on the background image
// ============================================================
const Hotspot = ({ hotspot, onClick, active }) => (
  <button
    type="button"
    onClick={() => onClick(hotspot)}
    data-testid={`phoneme-hotspot-${hotspot.id}`}
    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
    style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
    aria-label={hotspot.label}
  >
    {/* Outer ping (continuous) */}
    <span className="absolute inset-0 -m-3 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" style={{ animationDuration: '2.4s' }} />
    {/* Inner dot */}
    <span className={`relative block w-3 h-3 rounded-full border-2 transition-all duration-300
      ${active ? 'bg-orange-400 border-orange-300 scale-150 shadow-[0_0_18px_rgba(251,146,60,0.9)]'
              : 'bg-cyan-400 border-cyan-200 group-hover:scale-150 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.9)]'}`} />
    {/* Floating tooltip on hover */}
    <span className="absolute left-1/2 -translate-x-1/2 -top-9 bg-slate-900/95 border border-cyan-500/50 text-cyan-100 text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-[0_0_24px_rgba(34,211,238,0.4)]">
      {hotspot.label}
    </span>
  </button>
);

// ============================================================
// FrequencyBar — single bar in the frequency chart
// ============================================================
const FrequencyBar = ({ bar, index, animate }) => (
  <div className="flex flex-col items-center justify-end gap-1.5 h-full">
    <div
      className={`w-3 rounded-sm transition-all duration-1000 ease-out ${bar.active ? 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.7)]' : 'bg-slate-500/70'}`}
      style={{ height: animate ? `${bar.height}%` : '0%', transitionDelay: `${index * 80}ms` }}
    />
    <span className={`text-[9px] ${bar.active ? 'text-orange-400 font-bold' : 'text-slate-400'}`}>/{bar.ipa}/</span>
  </div>
);

// ============================================================
// SpellingBar — bar for the "How is /ʊ/ spelled?" section
// ============================================================
const SpellingBar = ({ s, index, animate }) => (
  <div className="flex items-center gap-3 mb-2.5">
    <span className="text-cyan-100 text-sm font-mono font-bold w-12 text-right">{s.letters}</span>
    <div className="flex-1 h-3 bg-slate-700/40 rounded-sm overflow-hidden">
      <div
        className="h-full bg-cyan-400/80 rounded-sm transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(34,211,238,0.4)]"
        style={{ width: animate ? `${s.percent}%` : '0%', transitionDelay: `${300 + index * 100}ms` }}
      />
    </div>
    <span className="text-cyan-200 text-xs font-semibold w-8">{s.percent}%</span>
    <span className="text-slate-400 text-xs italic min-w-[120px]">({s.examples})</span>
  </div>
);

// ============================================================
// VowelChart — interactive trapezoid (bottom-left of the card)
// ============================================================
const VowelChart = ({ position }) => (
  <div className="relative w-full aspect-[4/3] bg-slate-900/40 border border-cyan-500/20 rounded-xl p-3" data-testid="phoneme-vowel-chart">
    <svg viewBox="0 0 100 75" className="w-full h-full">
      {/* Trapezoid */}
      <polygon points="10,10 90,10 80,65 25,65" fill="none" stroke="rgba(34, 211, 238, 0.35)" strokeWidth="0.4" />
      {/* Horizontal divider lines */}
      <line x1="13" y1="28" x2="87" y2="28" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="0.3" />
      <line x1="16" y1="46" x2="84" y2="46" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="0.3" />
      {/* Sample vowel labels */}
      <text x="15" y="14" fill="rgba(186, 230, 253, 0.8)" fontSize="3.5">i:</text>
      <text x="84" y="14" fill="rgba(186, 230, 253, 0.8)" fontSize="3.5">u:</text>
      <text x="18" y="46" fill="rgba(186, 230, 253, 0.6)" fontSize="3.2">e</text>
      <text x="25" y="63" fill="rgba(186, 230, 253, 0.6)" fontSize="3.2">a</text>
      <text x="75" y="46" fill="rgba(186, 230, 253, 0.6)" fontSize="3.2">o</text>
      {/* Other vowel placeholder dots */}
      <circle cx="50" cy="46" r="0.7" fill="rgba(186, 230, 253, 0.3)" />
      <circle cx="80" cy="42" r="0.7" fill="rgba(186, 230, 253, 0.3)" />
      {/* Active /ʊ/ position with glow */}
      <circle cx={position.x * 0.85 + 12} cy={position.y * 0.65 + 8} r="2" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 1))' }}>
        <animate attributeName="r" values="2;2.6;2" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
    <p className="absolute bottom-1 left-2 text-[9px] text-cyan-300/50 uppercase tracking-wider">Vowel chart</p>
  </div>
);

// ============================================================
// AudioPlayButton — real HTML5 Audio playback with state
// Notifies parent of playing state via onPlayingChange (optional).
// ============================================================
const AudioPlayButton = ({ src, size = 'md', label, onPlayingChange }) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  // Lazily create the audio element on first interaction
  const getAudio = () => {
    if (!audioRef.current && src) {
      const a = new Audio(src);
      // 'auto' lets the browser fetch the audio in the background as soon as
      // the element is created. Combined with the page-level preloader, this
      // means by the time the user clicks play, the bytes are already cached.
      a.preload = 'auto';
      a.addEventListener('ended', () => { setPlaying(false); onPlayingChange?.(false); });
      a.addEventListener('pause', () => { setPlaying(false); onPlayingChange?.(false); });
      a.addEventListener('playing', () => { setLoading(false); setPlaying(true); onPlayingChange?.(true); });
      a.addEventListener('waiting', () => setLoading(true));
      a.addEventListener('canplay', () => setLoading(false));
      a.addEventListener('error', () => { setLoading(false); setPlaying(false); onPlayingChange?.(false); });
      audioRef.current = a;
    }
    return audioRef.current;
  };

  // Clean up on unmount
  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const toggle = (e) => {
    e.stopPropagation();
    const a = getAudio();
    if (!a) return; // no src → no-op
    if (a.paused) {
      // Show spinner immediately if data isn't fully buffered yet.
      // readyState >= 3 (HAVE_FUTURE_DATA) means we can start instantly.
      if (a.readyState < 3) setLoading(true);
      a.currentTime = 0;
      a.play().catch(() => { setLoading(false); setPlaying(false); });
    } else {
      a.pause();
    }
  };

  const sz = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSz = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const disabled = !src;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`${sz} rounded-full ${disabled ? 'bg-slate-700/40 border-slate-600/40 text-slate-500 cursor-not-allowed' : 'bg-cyan-500/20 border-cyan-400/50 hover:bg-cyan-500/40 hover:border-cyan-300 text-cyan-200 hover:text-white hover:scale-110 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]'} ${playing ? 'ring-2 ring-orange-400/70 bg-orange-500/30 border-orange-400 text-white shadow-[0_0_20px_rgba(251,146,60,0.55)]' : ''} border flex items-center justify-center transition-all duration-300`}
      aria-label={label || (playing ? 'Pause' : 'Play')}
      title={disabled ? 'No audio available' : label}
      data-testid="phoneme-audio-play"
    >
      {loading
        ? <span className={`${iconSz} block rounded-full border-2 border-current border-t-transparent animate-spin`} />
        : playing
          ? <Pause className={iconSz} />
          : <Play className={`${iconSz} ml-0.5`} />}
    </button>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================
const PhonemeCardPage = () => {
  const { id = 'u-foot' } = useParams();
  // ------------------------------------------------------------------
  // DB-first: try the CMS API, fall back to the legacy hardcoded
  // PHONEMES map so the page never breaks during a partial migration.
  // ------------------------------------------------------------------
  const [phoneme, setPhoneme] = useState(PHONEMES[id] || null);
  const [phonemeLoading, setPhonemeLoading] = useState(!PHONEMES[id]);

  const { user, token, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setPhonemeLoading(!PHONEMES[id]);
    const API = process.env.REACT_APP_BACKEND_URL;
    // Public endpoint. When the caller is a signed-in admin we pass the
    // JWT so the backend also returns draft (published=false) cards —
    // otherwise anonymous users can only see published cards.
    const headers = isAdmin && token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API}/api/phonemes/${id}`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setPhoneme(data);
      })
      .catch(() => {
        // Fallback to hardcoded catalogue when the API has no matching card
        if (!cancelled && PHONEMES[id]) setPhoneme(PHONEMES[id]);
      })
      .finally(() => { if (!cancelled) setPhonemeLoading(false); });
    return () => { cancelled = true; };
  }, [id, isAdmin, token]);

  const accessGranted = canAccessCard(id, user);
  const isPremiumUser = hasPremiumAccess(user);
  const navigate = useNavigate();

  const { dialect, setDialect } = useDialect();
  const [openHotspot, setOpenHotspot] = useState(null);
  const [showFrontView, setShowFrontView] = useState(false);
  const [showArticulatory, setShowArticulatory] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [coordPickerEnabled, setCoordPickerEnabled] = useState(false);
  const [pickedCoords, setPickedCoords] = useState([]);
  const [expandedWord, setExpandedWord] = useState(null);
  const imageContainerRef = useRef(null);

  // Dev coordinate picker: hold Alt and click anywhere on the image to log x,y%.
  // Toggle by pressing 'D' on keyboard. Logs to console + saves to local list.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          setCoordPickerEnabled(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleImageClick = (e) => {
    if (!coordPickerEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const entry = { x: x.toFixed(1), y: y.toFixed(1) };
    setPickedCoords(prev => [...prev, entry]);
    console.log(`📍 Coord picked: x=${entry.x}, y=${entry.y}`);
  };

  // Resolve audio sources based on selected dialect (safe when phoneme is null during initial fetch)
  const audio = phoneme?.audio?.[dialect] || phoneme?.audio?.AmE || { isolated: null, examples: [null, null, null] };

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 250);
    return () => clearTimeout(t);
  }, []);

  // ============================================================
  // Background audio preloader — warms the HTTP cache so users
  // experience near-instant playback on click. Without this, each
  // WAV (~200KB) is fetched on first click → 0.5–3s perceived lag
  // on slow connections. Uses fetch() (no decoding overhead) and
  // a small concurrency window (4 parallel) so we don't saturate
  // the user's bandwidth while they read the card.
  // ============================================================
  useEffect(() => {
    if (!phoneme) return; // safety when API fetch is still pending
    const collectUrls = () => {
      const urls = new Set();
      const a = phoneme.audio?.[dialect] || phoneme.audio?.AmE || {};
      if (a.isolated) urls.add(a.isolated);
      (a.examples || []).forEach(u => u && urls.add(u));
      if (phoneme.mnemonic?.audio) urls.add(phoneme.mnemonic.audio);
      (phoneme.commonWords || []).forEach(w => w.audio && urls.add(w.audio));
      return [...urls];
    };

    const urls = collectUrls();
    if (urls.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    // Delay the start so it doesn't compete with critical page rendering
    const startTimer = setTimeout(async () => {
      const CONCURRENCY = 4;
      let cursor = 0;
      const worker = async () => {
        while (!cancelled && cursor < urls.length) {
          const url = urls[cursor++];
          try {
            // HEAD won't populate the browser audio cache reliably — use GET.
            // The response is consumed but the bytes end up in the HTTP cache,
            // so the subsequent <audio>.play() reads them from disk cache.
            const res = await fetch(url, {
              signal: controller.signal,
              cache: 'force-cache',
              credentials: 'omit',
            });
            // Drain the body so the cache entry is committed
            if (res.ok && res.body) {
              await res.blob().catch(() => {});
            }
          } catch (_) {
            // network errors are non-fatal — playback will just go slower if user clicks
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      controller.abort();
    };
  }, [phoneme, dialect]);

  // Loading gate — phoneme fetch still in-flight and no local fallback available
  if (phonemeLoading && !phoneme) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-200 text-sm uppercase tracking-widest font-bold">Caricamento scheda…</div>
      </div>
    );
  }

  // Not found — no API result and no local fallback
  if (!phoneme) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-2xl font-black text-white mb-3">Scheda non trovata</h2>
          <p className="text-slate-400 mb-6">La scheda fonetica <code className="text-cyan-300">/{id}/</code> non esiste o non è pubblicata.</p>
          <Link to="/lms/phonemes" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
            <ArrowLeft className="w-4 h-4" />
            Torna alla libreria
          </Link>
        </div>
      </div>
    );
  }

  // Premium paywall guard — block render until auth state is resolved so the
  // gate is not flashed for a logged-in user during initial token validation.
  if (!authLoading && !accessGranted) {
    return (
      <LMSPremiumPaywall
        variant="fullscreen"
        cardId={id}
        cardLabel={`/${phoneme.ipa}/ ${phoneme.examples?.[0] || ''}`.trim()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 overflow-x-hidden">
      <style>{`
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 24px rgba(34, 211, 238, 0.25), inset 0 0 24px rgba(34, 211, 238, 0.08); }
          50%     { box-shadow: 0 0 40px rgba(34, 211, 238, 0.45), inset 0 0 32px rgba(34, 211, 238, 0.15); }
        }
        .phoneme-glow { animation: glowPulse 4s ease-in-out infinite; }

        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateY(2000%); opacity: 0; }
        }
        .phoneme-scanline {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.6), transparent);
          animation: scanline 6s linear infinite;
          pointer-events: none;
        }

        @keyframes airflowDots {
          0% { transform: translateX(-20px); opacity: 0; }
          20%,80% { opacity: 1; }
          100% { transform: translateX(28px); opacity: 0; }
        }
        .airflow-dot { animation: airflowDots 1.6s ease-in-out infinite; }

        @keyframes wave {
          0%, 100% { transform: scaleY(0.45); }
          50%      { transform: scaleY(1); }
        }

        /* HUD-style scanner ring around the front-view thumbnail */
        @keyframes hudRotateA { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes hudRotateB { from { transform: rotate(360deg); } to { transform: rotate(0deg);    } }
        @keyframes hudPulse {
          0%,100% { box-shadow: 0 0 24px rgba(34,211,238,0.35), inset 0 0 18px rgba(34,211,238,0.18); }
          50%     { box-shadow: 0 0 44px rgba(34,211,238,0.65), inset 0 0 28px rgba(34,211,238,0.30); }
        }
        .hud-ring-a { animation: hudRotateA 14s linear infinite; }
        .hud-ring-b { animation: hudRotateB 22s linear infinite; }
        .hud-pulse  { animation: hudPulse 3.6s ease-in-out infinite; }
      `}</style>

      {/* Top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/85 border-b border-cyan-500/15">
        <div className="max-w-[1600px] mx-auto px-5 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="flex items-center gap-2 text-cyan-300 hover:text-cyan-100 transition-colors group" data-testid="phoneme-back-link">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-sm font-semibold tracking-wide hidden sm:inline">Vocal Fitness LMS</span>
              <span className="text-sm font-semibold tracking-wide sm:hidden">Home</span>
            </Link>
            <span className="text-cyan-500/30">|</span>
            <Link
              to="/lms/phonemes"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white transition-all duration-300 group"
              data-testid="phoneme-library-link"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-xs font-bold tracking-wide uppercase">Tutte le card</span>
              <ChevronRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs text-cyan-300/70 uppercase tracking-[0.2em]">
              <GraduationCap className="w-3.5 h-3.5" />
              Phoneme Card
            </span>
            <span className="text-xs text-cyan-200/60 hidden sm:inline">·</span>
            <span className="text-xs font-mono font-bold text-cyan-100">{phoneme.displayIpa}</span>
          </div>
        </div>
      </nav>

      {/* MAIN CARD CONTAINER */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 lg:py-10">
        <div className="relative rounded-[28px] overflow-hidden border border-cyan-500/20 phoneme-glow bg-slate-900" data-testid="phoneme-main-card">
          {/* Scanline accent */}
          <div className="phoneme-scanline" />

          {/* Background image (clean anatomical side-view, square ratio capped at viewport height) */}
          <div ref={imageContainerRef} onClick={handleImageClick} className={`relative w-full mx-auto ${coordPickerEnabled ? 'cursor-crosshair' : ''}`} style={{ aspectRatio: '1 / 1', maxHeight: '85vh' }}>
            <img
              src={phoneme.assets.sideView}
              alt={`${phoneme.displayIpa} — articulatory side view`}
              className="absolute inset-0 w-full h-full object-contain bg-slate-950"
              data-testid="phoneme-side-image"
            />

            {/* Dev coord picker — marker dots for picked positions */}
            {coordPickerEnabled && pickedCoords.map((c, i) => (
              <span key={i} className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-fuchsia-500 rounded-full ring-2 ring-fuchsia-200 pointer-events-none z-40" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-fuchsia-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap">{c.x},{c.y}</span>
              </span>
            ))}
            {coordPickerEnabled && (
              <div className="absolute bottom-2 left-2 bg-fuchsia-600/95 text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold z-40 pointer-events-none">
                Picker ON · D to toggle · {pickedCoords.length} picked
              </div>
            )}

            {/* TOP-LEFT: Brand glyph + caption + master play (overlay because image no longer contains them) */}
            <div className="absolute top-[4%] left-[3%] sm:left-[4%] flex flex-col items-start z-20">
              <h1 className="text-cyan-100 text-5xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tighter drop-shadow-[0_4px_24px_rgba(34,211,238,0.4)]" data-testid="phoneme-ipa-glyph">
                /{phoneme.ipa}/
              </h1>
              <p className="text-cyan-300/80 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-bold mt-2 ml-1">
                {phoneme.examples.join(' · ')}
              </p>
              <div className="mt-4 ml-1 flex items-center gap-3">
                <AudioPlayButton size="lg" src={audio.isolated} label={`Play /${phoneme.ipa}/ isolated`} onPlayingChange={setAudioPlaying} />
                <span className={`text-[10px] uppercase tracking-widest font-bold transition-colors duration-300 ${audioPlaying ? 'text-orange-300' : 'text-cyan-300/70'}`} data-testid="phoneme-play-status">
                  {audioPlaying ? `Playing /${phoneme.ipa}/` : `Tap to hear`}
                </span>
              </div>
            </div>

            {/* TOP-RIGHT: AmE/RP Switch (sole instance now — no underlying conflict) */}
            <div className="absolute top-[4%] right-[3%] z-20">
              <button
                type="button"
                onClick={() => setDialect(dialect === 'AmE' ? 'RP' : 'AmE')}
                className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-cyan-500/40 rounded-full pl-2 pr-3 py-1.5 hover:border-orange-400 transition-all duration-300 hover:scale-105"
                data-testid="phoneme-dialect-switch"
              >
                <span className={`text-base ${dialect === 'AmE' ? 'opacity-100 scale-110' : 'opacity-40'} transition-all`}>🇺🇸</span>
                <span className={`text-base ${dialect === 'RP'  ? 'opacity-100 scale-110' : 'opacity-40'} transition-all`}>🇬🇧</span>
                <span className="text-[10px] text-cyan-200 uppercase tracking-widest font-bold ml-1">{dialect === 'AmE' ? 'AmE' : 'RP'}</span>
              </button>
            </div>

            {/* BOTTOM-RIGHT: Airflow + Voicing indicators (aligned vertically with circle above) */}
            <div className="absolute bottom-[4%] right-[8%] sm:right-[9%] flex items-center gap-4 bg-slate-900/55 backdrop-blur-sm border border-cyan-500/20 rounded-2xl px-4 py-2.5 z-20">
              <div className="flex flex-col items-center" data-testid="phoneme-airflow-indicator">
                <p className="text-[9px] text-cyan-300/70 uppercase tracking-wider mb-1 font-bold">Airflow</p>
                <div className={`relative h-5 w-16 flex items-center overflow-hidden transition-opacity duration-300 ${audioPlaying ? 'opacity-100' : 'opacity-55'}`}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="airflow-dot absolute w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.9)]" style={{ animationDelay: `${i * 0.28}s`, animationDuration: audioPlaying ? '0.9s' : '1.7s', top: `${20 + (i % 2) * 14}%` }} />
                  ))}
                </div>
              </div>
              <div className="w-px h-8 bg-cyan-500/20" />
              <div className="flex flex-col items-center" data-testid="phoneme-voicing-indicator">
                <p className="text-[9px] text-cyan-300/70 uppercase tracking-wider mb-1 font-bold">Voicing</p>
                <div className="flex items-end gap-0.5 h-5">
                  {[40, 80, 60, 100, 70, 90, 50, 75, 55, 70].map((h, i) => (
                    <span key={i} className={`w-1 rounded-full transition-colors duration-300 ${audioPlaying ? 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.85)]' : 'bg-cyan-300 shadow-[0_0_4px_rgba(34,211,238,0.7)]'}`} style={{ height: `${h}%`, animation: `wave 1.4s ease-in-out infinite`, animationDelay: `${i * 0.08}s`, animationDuration: audioPlaying ? '0.7s' : '1.4s' }} />
                  ))}
                </div>
                <span className={`text-[10px] font-bold mt-0.5 transition-colors ${audioPlaying ? 'text-orange-400' : 'text-cyan-200/80'}`}>ON</span>
              </div>
            </div>

            {/* RIGHT-CENTER (aligned with Airflow/Voicing panel below):
                Circular Front-View thumbnail with HUD scanner ring */}
            <button
              type="button"
              onClick={() => setShowFrontView(true)}
              className="absolute right-[8%] sm:right-[9%] top-[42%] -translate-y-1/2 group focus:outline-none z-30"
              data-testid="phoneme-front-view-trigger"
              aria-label="Open facial muscle activation map"
            >
              {/* Outer HUD scanner ring — dashed, slow rotate */}
              <div className="absolute inset-[-14%] rounded-full pointer-events-none hud-ring-a">
                <div className="w-full h-full rounded-full border border-dashed border-cyan-400/30" />
              </div>
              {/* Inner HUD ring — counter-rotating with arc segments */}
              <div className="absolute inset-[-6%] rounded-full pointer-events-none hud-ring-b">
                <div className="w-full h-full rounded-full border-[2px] border-transparent"
                     style={{
                       borderTopColor: 'rgba(34,211,238,0.85)',
                       borderRightColor: 'rgba(34,211,238,0.2)',
                       borderBottomColor: 'transparent',
                       borderLeftColor: 'rgba(34,211,238,0.4)',
                       filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))'
                     }} />
              </div>
              {/* Subtle blurred glow behind */}
              <div className="absolute inset-[-20%] rounded-full bg-cyan-400/12 blur-2xl pointer-events-none" />

              {/* Main portrait disc */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden border-2 border-cyan-400/60 group-hover:border-orange-400 transition-all duration-500 group-hover:scale-105 hud-pulse">
                <img
                  src={phoneme.assets.frontViewClean || phoneme.assets.frontView}
                  alt={`${phoneme.displayIpa} front-view portrait`}
                  className="w-full h-full object-cover scale-110"
                />
                {/* Inner vignette — masks any visible cropped edges of the photo so the disc blends seamlessly with the card background */}
                <div className="absolute inset-0 pointer-events-none rounded-full" style={{
                  boxShadow: 'inset 0 0 22px 8px rgba(2,6,23,0.85), inset 0 0 60px 18px rgba(2,6,23,0.55)',
                  background: 'radial-gradient(circle at center, transparent 55%, rgba(2,6,23,0.35) 78%, rgba(2,6,23,0.75) 100%)'
                }} />
                {/* Bottom darkening + label */}
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent" />
                <div className="absolute inset-x-0 bottom-2 text-center">
                  <span className="text-[9px] sm:text-[10px] text-cyan-100/90 uppercase tracking-[0.22em] font-bold group-hover:text-orange-300 transition-colors">
                    Front View
                  </span>
                </div>
                {/* Click affordance — radial cyan pulse on hover */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{ background: 'radial-gradient(circle at center, rgba(34,211,238,0.18) 0%, transparent 60%)' }} />
                {/* Center "click" icon — appears on hover */}
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-500/85 backdrop-blur-sm flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-[0_0_28px_rgba(34,211,238,0.7)]">
                  <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </span>
              </div>

              {/* Tooltip below */}
              <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 border border-cyan-500/50 text-cyan-100 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_24px_rgba(34,211,238,0.4)]">
                Open facial muscle map
              </span>
            </button>

            {/* Hotspot overlay (above face zone — so hotspots remain clickable) */}
            <div className="absolute inset-0 z-30 pointer-events-none">
              {(phoneme.hotspots || []).map((h) => (
                <div key={h.id} className="pointer-events-auto">
                  <Hotspot hotspot={h} onClick={setOpenHotspot} active={openHotspot?.id === h.id} />
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM PANEL — synthesis row: example sentences */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border-t border-cyan-500/15 px-5 sm:px-8 py-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {(phoneme.exampleSentences || []).map((ex, i) => (
                <div key={i} className="flex items-center gap-3" data-testid={`phoneme-example-${i}`}>
                  <AudioPlayButton size="md" src={audio.examples?.[i]} label={`Play "${ex.text || ''}"`} onPlayingChange={setAudioPlaying} />
                  <p className="text-sm text-cyan-100 leading-tight">
                    {(ex.text || '').split(' ').map((w, j) => {
                      const isHighlight = (ex.highlights || []).some(h => w.toLowerCase().includes(h.toLowerCase()));
                      return (
                        <span key={j} className={isHighlight ? 'text-orange-400 font-bold' : ''}>{w}{' '}</span>
                      );
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============== Video-lezione del Prof. Steve Dapper ============== */}
        {phoneme.videoLesson?.id && (
          <div className="mt-6" data-testid="phoneme-video-lesson-section">
            <PhonemeVideoLesson
              videoId={phoneme.videoLesson.id}
              title={phoneme.videoLesson.title}
              isPremium={isPremiumUser}
              onUpsellClick={() => navigate('/login?intent=signup')}
              testId="phoneme-video-lesson"
            />
          </div>
        )}

        {/* SUPPORT PANELS — below the main card */}
        <div className="grid lg:grid-cols-12 gap-5 mt-6">
          {/* LEFT: Vowel chart + Examples */}
          <div className="lg:col-span-3 space-y-4">
            <VowelChart position={phoneme.vowelChartPosition} />
            <button
              type="button"
              onClick={() => setShowArticulatory(true)}
              className="w-full bg-gradient-to-br from-slate-900 to-slate-900/60 border border-cyan-500/25 hover:border-orange-400 rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(251,146,60,0.25)] group"
              data-testid="phoneme-articulatory-trigger"
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-cyan-400 group-hover:text-orange-400 transition-colors" />
                <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold">Deep dive</p>
              </div>
              <p className="text-sm text-cyan-100 font-semibold">Articulatory Position</p>
              <p className="text-xs text-cyan-300/60 mt-1">High-detail anatomical view</p>
            </button>
          </div>

          {/* CENTER: Spellings + Frequency */}
          <div className="lg:col-span-6 grid sm:grid-cols-2 gap-5">
            {/* Spellings */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
              <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold mb-4">
                How is {phoneme.displayIpa} spelled?
              </p>
              {(phoneme.spellings || []).map((s, i) => <SpellingBar key={i} s={s} index={i} animate={animate} />)}
            </div>
            {/* Frequency */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
              <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold mb-4">Frequency in English</p>
              <div className="h-28 flex items-end gap-2 justify-around">
                {(phoneme.frequencyChart || []).map((b, i) => <FrequencyBar key={i} bar={b} index={i} animate={animate} />)}
              </div>
            </div>
          </div>

          {/* RIGHT: Features */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
              <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold mb-4">Features</p>
              <ul className="space-y-2 text-xs">
                {(phoneme.features || []).map((f, i) => (
                  <li key={i} className="flex gap-2 text-cyan-100/90" data-testid={`phoneme-feature-${i}`}>
                    <span className="text-cyan-400">•</span>
                    <span><span className="font-bold text-cyan-200">{f.label}:</span> {f.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* KNOBS ROW */}
        <div className="mt-6 bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {(phoneme.knobs || []).map((k, i) => (
              <AnimatedKnob key={k.id} label={k.label} value={k.value} valueLabel={k.valueLabel} highlight={k.highlight} delay={400 + i * 180} />
            ))}
          </div>
        </div>

        {/* ============== PRONUNCIATION LAB ============== */}
        <div className="mt-10 grid lg:grid-cols-12 gap-5" data-testid="phoneme-lab-section">
          {/* Classification badges */}
          <div className="lg:col-span-12 bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
            <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold mb-4">Phoneme classification</p>
            <div className="flex flex-wrap gap-2">
              {phoneme.classification?.map((c, i) => (
                <span key={i} title={c.tooltip}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/20 hover:border-cyan-300 transition-all cursor-help"
                  data-testid={`phoneme-class-${i}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {c.label}
                </span>
              ))}
            </div>
            {phoneme.funFact && (
              <div className="mt-5 flex items-start gap-3 bg-orange-500/5 border border-orange-400/20 rounded-xl p-4" data-testid="phoneme-fun-fact">
                <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold mb-1">{phoneme.funFact.headline}</p>
                  <p className="text-cyan-100/85 text-sm leading-relaxed">{phoneme.funFact.body}</p>
                </div>
              </div>
            )}
          </div>

          {/* Pronunciation guide */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic2 className="w-4 h-4 text-cyan-400" />
              <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold">{phoneme.pronunciationGuide?.headline}</p>
            </div>
            <ol className="space-y-2.5">
              {phoneme.pronunciationGuide?.steps?.map((s, i) => (
                <li key={i} className="flex gap-3" data-testid={`phoneme-guide-step-${i}`}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-[10px] font-bold text-cyan-200">
                    {i + 1}
                  </span>
                  <div className="text-sm">
                    <span className="text-cyan-200 font-bold">{s.label}:</span>{' '}
                    <span className="text-cyan-100/85">{s.body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Common words grid */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-cyan-500/15 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold">Top 30 common words with {phoneme.displayIpa}</p>
              </div>
              <p className="text-[10px] text-cyan-500/50 italic">Tap to reveal IPA</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {phoneme.commonWords?.map((item, i) => {
                const isExpanded = expandedWord === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setExpandedWord(isExpanded ? null : i)}
                    aria-expanded={isExpanded}
                    className={`group relative rounded-lg px-2.5 transition-all duration-500 ease-out text-left
                      ${isExpanded
                        ? 'bg-gradient-to-br from-cyan-500/20 via-slate-950/80 to-orange-500/15 border border-cyan-400 shadow-[0_8px_28px_-6px_rgba(34,211,238,0.45)] -translate-y-1 py-3 z-10'
                        : 'bg-slate-950/60 border border-cyan-500/15 hover:border-cyan-400/70 hover:bg-cyan-500/8 py-2 hover:-translate-y-0.5'}
                    `}
                    data-testid={`phoneme-word-${i}`}
                  >
                    <span className={`absolute top-1 right-1.5 text-[8px] font-mono transition-colors ${isExpanded ? 'text-cyan-200' : 'text-cyan-500/40'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`block text-sm font-bold transition-colors duration-300 ${isExpanded ? 'text-orange-300' : 'text-cyan-50 group-hover:text-orange-300'}`}>
                      {item.w}
                    </span>
                    {/* IPA reveal — animated height + fade */}
                    <div
                      className={`grid transition-all duration-500 ease-out overflow-hidden ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                    >
                      <div className="overflow-hidden">
                        <p className="font-mono text-base sm:text-lg text-cyan-100 tracking-wide leading-tight">
                          {/* Split IPA so we can color the ʊ in orange */}
                          {(item.ipa || '').split('').map((ch, ci) => (
                            <span
                              key={ci}
                              className={ch === phoneme.ipa
                                ? 'text-orange-400 font-black drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]'
                                : ''}
                              style={{
                                opacity: isExpanded ? 1 : 0,
                                transform: isExpanded ? 'translateY(0)' : 'translateY(4px)',
                                transition: `opacity 0.4s ease ${ci * 25}ms, transform 0.4s ease ${ci * 25}ms`,
                                display: 'inline-block',
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                        </p>
                        {/* Audio playback when available, otherwise placeholder */}
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          {item.audio ? (
                            <>
                              <AudioPlayButton src={item.audio} size="sm" label={`Play ${item.w}`} onPlayingChange={setAudioPlaying} />
                              <span className="text-[9px] text-cyan-300/60 uppercase tracking-wider italic">tap to hear</span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex w-7 h-7 rounded-full bg-slate-700/30 border border-slate-600/40 items-center justify-center cursor-not-allowed" title="Audio coming soon">
                                <Play className="w-2.5 h-2.5 text-slate-500" />
                              </span>
                              <span className="text-[9px] text-cyan-300/30 uppercase tracking-wider italic">audio soon</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-cyan-500/50 italic mt-3">All 30 audio recordings available · tap any word to expand and play.</p>
          </div>

          {/* Mnemonic phrase */}
          <div className="lg:col-span-12 bg-gradient-to-br from-cyan-500/10 via-slate-900/60 to-orange-500/10 border border-cyan-400/25 rounded-2xl p-6 relative overflow-hidden" data-testid="phoneme-mnemonic">
            <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/15 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <p className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Vocal Fitness mnemonic</p>
              </div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-cyan-50 leading-tight mb-4" data-testid="phoneme-mnemonic-phrase">
                {(phoneme.mnemonic?.phrase || '').split(' ').map((word, i) => {
                  const clean = word.replace(/[.,!?]/g, '').toLowerCase();
                  const isHL = (phoneme.mnemonic?.highlights || []).some((h) => clean === (h || '').toLowerCase());
                  return (
                    <span key={i} className={isHL ? 'text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.45)]' : ''}>
                      {word}{' '}
                    </span>
                  );
                })}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <AudioPlayButton src={phoneme.mnemonic?.audio} size="md" label="Play mnemonic" onPlayingChange={setAudioPlaying} />
                <p className="text-cyan-100/75 text-sm italic max-w-2xl">{phoneme.mnemonic?.note || ''}</p>
              </div>
            </div>
          </div>

          {/* ─── Phonetics Lab interactive vocal synthesizer ─── */}
          <div className="lg:col-span-12 mt-2" data-testid="phoneme-vocal-lab-section">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                Laboratorio interattivo · Pink Trombone Vocal Tract
              </p>
            </div>
            <PinkTromboneEmbed phonemeId={phoneme.id} />
            <p className="text-[10px] text-cyan-500/50 italic mt-3 text-center">
              Modello fisico originale di Neil Thapen (MIT). Esplora come la posizione di lingua,
              palato, velo e labbra modifica il suono in tempo reale, oppure clicca un simbolo IPA
              sul trapezio per impostare la postura corretta.
            </p>
          </div>

        </div>

        {/* ============== Acoustic phonetics + Aural training ============== */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="phoneme-deep-section">
          <div className="rounded-3xl border border-cyan-500/25 bg-slate-900/60 p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-300" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-bold">
                Fonetica Acustica · Analisi Spettrale
              </p>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
              Lo spettrogramma del Prof. Dapper
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              La visualizzazione in tempo reale di F0, F1, F2 e F3 mentre il fonema viene pronunciato.
              Asse Y = frequenza (0&nbsp;Hz in basso → ~10&nbsp;kHz in alto); colore = ampiezza.
            </p>
            <SpectrogramView
              src={phoneme.audio?.[dialect]?.isolated || phoneme.audio?.AmE?.isolated}
              label="Fonema isolato"
              testId="phoneme-spectrogram"
            />
          </div>

          <PhonemeAuralQuiz
            phoneme={phoneme}
            dialect={dialect}
            testId="phoneme-aural-quiz"
          />
        </div>

        {/* Bottom note — either the human-written dialectNote OR the dialects tag list, never both */}
        {((phoneme.dialectNote && phoneme.dialectNote.trim()) || (phoneme.dialects && phoneme.dialects.length > 0)) && (
          <p className="text-center text-xs text-cyan-500/40 mt-6 italic" data-testid="phoneme-dialect-footer">
            {phoneme.dialectNote && phoneme.dialectNote.trim()
              ? phoneme.dialectNote.trim().toUpperCase()
              : (phoneme.dialects || []).join(' & ')}
          </p>
        )}
      </div>

      {/* ============== Hotspot detail sheet ============== */}
      <Sheet open={!!openHotspot} onOpenChange={(o) => !o && setOpenHotspot(null)}>
        <SheetContent side="right" className="bg-slate-950 border-l border-cyan-500/30 text-cyan-50 w-full sm:max-w-md overflow-y-auto" data-testid="phoneme-hotspot-sheet">
          {openHotspot && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  <p className="text-[10px] text-cyan-300/70 uppercase tracking-[0.2em] font-bold">Anatomy · {phoneme.displayIpa}</p>
                </div>
                <SheetTitle className="text-cyan-50 text-2xl font-black leading-tight">{openHotspot.title}</SheetTitle>
                {openHotspot.role && (
                  <SheetDescription className="text-orange-300/90 font-semibold mt-1.5">{openHotspot.role}</SheetDescription>
                )}
              </SheetHeader>
              <div className="mt-7 space-y-5">
                <div>
                  <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider mb-2 font-bold">Detail</p>
                  <p className="text-cyan-100/90 text-sm leading-relaxed">{openHotspot.detail}</p>
                </div>
                {openHotspot.anatomy && (
                  <div className="border-t border-cyan-500/15 pt-4">
                    <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider mb-2 font-bold">Anatomy</p>
                    <p className="text-cyan-200/80 text-sm italic">{openHotspot.anatomy}</p>
                  </div>
                )}
                {openHotspot.kineticCue && (
                  <div className="bg-orange-500/10 border border-orange-400/30 rounded-xl p-4">
                    <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1.5 font-bold">Kinetic cue</p>
                    <p className="text-orange-100 text-sm">{openHotspot.kineticCue}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <AudioPlayButton size="lg" src={audio.isolated} label={`Play /${phoneme.ipa}/ isolated`} onPlayingChange={setAudioPlaying} />
                  <span className="text-xs text-cyan-300/60">Hear the {phoneme.displayIpa} articulation sample</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============== Front-view (Facial Muscle Activation) modal ============== */}
      <Dialog open={showFrontView} onOpenChange={setShowFrontView}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] bg-slate-950 border border-cyan-500/30 text-cyan-50 p-0 overflow-hidden flex flex-col" data-testid="phoneme-front-view-modal">
          <DialogHeader className="p-4 border-b border-cyan-500/20 bg-slate-900/40 flex-shrink-0">
            <DialogTitle className="text-cyan-50 text-base sm:text-xl font-black flex items-center gap-3">
              <span className="text-orange-400">{phoneme.displayIpa}</span> · Facial Muscle Activation
            </DialogTitle>
          </DialogHeader>
          <div className="grid lg:grid-cols-5 gap-0 flex-1 overflow-hidden">
            <div className="lg:col-span-3 bg-slate-950 flex items-center justify-center overflow-auto p-2">
              <img
                src={phoneme.assets.frontView}
                alt={`${phoneme.displayIpa} front view`}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                data-testid="phoneme-front-view-image"
              />
            </div>
            <div className="lg:col-span-2 p-5 space-y-3 overflow-y-auto border-t lg:border-t-0 lg:border-l border-cyan-500/20">
              <p className="text-[10px] text-cyan-300/70 uppercase tracking-widest font-bold">Muscle activation map</p>
              <p className="text-cyan-100/80 text-sm leading-relaxed">
                Visualisation of which facial muscles activate when producing {phoneme.displayIpa}. Colour intensity reflects activation level.
              </p>
              <div className="space-y-3 mt-2">
                {(phoneme.facialMuscles || []).map((m, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-900/60 border border-cyan-500/15 rounded-lg p-3" data-testid={`phoneme-muscle-${i}`}>
                    <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-orange-400/80 to-cyan-400/40" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-cyan-50 font-bold text-sm">{m.name}</p>
                        <span className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">{m.activation}</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs mt-0.5">{m.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============== Articulatory deep-dive modal ============== */}
      <Dialog open={showArticulatory} onOpenChange={setShowArticulatory}>
        <DialogContent className="max-w-[min(95vw,92vh)] w-auto p-0 bg-slate-950 border border-cyan-500/30 text-cyan-50 overflow-hidden flex flex-col" data-testid="phoneme-articulatory-modal">
          <DialogHeader className="p-4 border-b border-cyan-500/20 bg-slate-900/40 flex-shrink-0">
            <DialogTitle className="text-cyan-50 text-base sm:text-xl font-black flex items-center gap-3">
              <span className="text-orange-400">{phoneme.displayIpa}</span> · Articulatory Position — Deep Dive
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-950 flex items-center justify-center">
            <img
              src={phoneme.assets.articulatory}
              alt={`${phoneme.displayIpa} articulatory position deep dive`}
              className="block w-full h-auto max-h-[80vh] object-contain"
              data-testid="phoneme-articulatory-image"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhonemeCardPage;
