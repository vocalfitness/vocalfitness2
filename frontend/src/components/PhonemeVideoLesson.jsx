import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Lock, GraduationCap, ArrowRight, Volume2 } from 'lucide-react';

/**
 * PhonemeVideoLesson — cinematic YouTube-embed for each phoneme card.
 *
 * State-of-the-art container:
 *   - 16:9 framed surface with gradient border + ambient glow + grain texture
 *   - "Cover" state shows the YouTube thumbnail + a centered play button.
 *     The iframe is mounted only on first click (saves first-paint weight and
 *     defers YouTube's heavy JS bundle).
 *   - When the video reaches the end (YT state === 0), a full-surface gradient
 *     overlay fades in with the upsell copy + CTA. Non-premium users see the
 *     hard CTA, premium users see a softer "watch more lessons" link.
 *
 * Dependency: official YouTube IFrame Player API is loaded once on demand.
 */

const loadYouTubeApi = (() => {
  let promise = null;
  return () => {
    if (promise) return promise;
    promise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      document.head.appendChild(tag);
    });
    return promise;
  };
})();

export const PhonemeVideoLesson = ({
  videoId,
  title = 'Video-lezione del Prof. Steve Dapper',
  isPremium = false,
  onUpsellClick,
  testId,
}) => {
  const containerRef = useRef(null);
  const playerRef    = useRef(null);
  const [active,   setActive]   = useState(false);   // iframe mounted?
  const [ended,    setEnded]    = useState(false);
  const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const handlePlay = useCallback(async () => {
    if (active) return;
    setActive(true);
    setEnded(false);
    const YT = await loadYouTubeApi();
    playerRef.current = new YT.Player(containerRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        rel: 0,                // no related videos
        modestbranding: 1,
        playsinline: 1,
        autoplay: 1,
        cc_load_policy: 1,
        iv_load_policy: 3,     // hide annotations
        origin: window.location.origin,
      },
      events: {
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) setEnded(true);
          if (e.data === YT.PlayerState.PLAYING) setEnded(false);
        },
      },
    });
  }, [active, videoId]);

  // Cleanup the player on unmount
  useEffect(() => () => {
    try { playerRef.current?.destroy?.(); } catch (_) { /* ignore */ }
  }, []);

  return (
    <div
      className="relative rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 md:p-7 overflow-hidden"
      data-testid={testId}
    >
      <style>{`
        @keyframes pvl-aura { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); } 50% { box-shadow: 0 0 60px 0 rgba(34,211,238,0.18); } }
        .pvl-aura { animation: pvl-aura 5s ease-in-out infinite; }
        @keyframes pvl-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .85; } }
        .pvl-pulse { animation: pvl-pulse 1.8s ease-in-out infinite; }
        @keyframes pvl-fade { from { opacity: 0; } to { opacity: 1; } }
        .pvl-fade  { animation: pvl-fade .5s ease-out both; }
      `}</style>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-bold flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Video-lezione · Prof. Steve Dapper
          </p>
          <h3 className="mt-1 text-lg md:text-xl font-black text-white leading-tight">{title}</h3>
        </div>
        {!isPremium && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Volume2 className="w-3 h-3" />
            anteprima
          </span>
        )}
      </div>

      {/* 16:9 framed surface */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] bg-black pvl-aura">
        {/* Subtle grain overlay (decorative) */}
        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
             style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />

        {/* Cover state — thumbnail + huge play button */}
        {!active && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Avvia video-lezione"
            data-testid="phoneme-video-play"
            className="absolute inset-0 group cursor-pointer"
          >
            <img
              src={thumb}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl pvl-pulse" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-[0_10px_40px_rgba(251,146,60,0.55)] group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-9 h-9 md:w-11 md:h-11 text-slate-900 ml-1.5" fill="currentColor" />
                </div>
              </div>
            </div>
            <p className="absolute bottom-4 left-5 right-5 text-xs md:text-sm text-white/80 font-medium drop-shadow">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 pvl-pulse" />
                Tocca per avviare
              </span>
            </p>
          </button>
        )}

        {/* Mounted iframe (YouTube replaces the inner div with its player) */}
        {active && (
          <div className="absolute inset-0">
            <div ref={containerRef} className="w-full h-full" />
          </div>
        )}

        {/* End-of-video upsell overlay */}
        {ended && (
          <div
            className="absolute inset-0 z-10 pvl-fade flex items-center justify-center p-6 md:p-10"
            data-testid="phoneme-video-upsell"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(7,15,28,0.85) 0%, rgba(7,15,28,0.96) 70%), linear-gradient(135deg, rgba(251,146,60,0.18), rgba(34,211,238,0.12))' }}
          >
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 mb-5 shadow-[0_8px_30px_rgba(251,146,60,0.45)]">
                <Lock className="w-7 h-7 text-slate-900" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-orange-300 font-bold mb-2">Continua la lezione</p>
              <h4 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">
                Iscriviti per <span className="text-orange-300">vedere</span><br className="hidden sm:block" />
                l&rsquo;intera video-lezione.
              </h4>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Questo era solo un assaggio. La lezione completa include articolazione approfondita, esercizi guidati e correzione live del Prof.&nbsp;Dapper.
              </p>
              <button
                type="button"
                onClick={onUpsellClick}
                data-testid="phoneme-video-upsell-cta"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold shadow-[0_10px_30px_rgba(251,146,60,0.45)] hover:scale-105 transition-transform duration-300"
              >
                <GraduationCap className="w-5 h-5" />
                Iscriviti per accedere
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setEnded(false); try { playerRef.current?.seekTo(0); playerRef.current?.playVideo(); } catch (_) { /* noop */ } }}
                className="mt-4 block mx-auto text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                data-testid="phoneme-video-replay"
              >
                Rivedi l&rsquo;anteprima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhonemeVideoLesson;
