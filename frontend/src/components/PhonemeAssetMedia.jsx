import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { parseVideoUrl } from './VideoLinkInput';

/**
 * PhonemeAssetMedia — smart image/video swap for the public phoneme card.
 *
 * Behaviour (per Vocal-Fitness product spec, 06/07/2026):
 *   • image only              → renders the <img> just like before.
 *   • video (upload or link)  → renders the video as a chromeless,
 *     autoplaying, muted, looping surface — visually indistinguishable
 *     from a static image (no player controls, no branding).
 *   • image + video           → image is the default; a subtle "play"
 *     affordance appears on hover, and clicking anywhere on the surface
 *     cross-fades to the video (fluid transition, 500 ms). Clicking
 *     again returns to the image. Keyboard (Enter/Space) also toggles.
 *
 * The three video providers are handled transparently:
 *   • uploaded file            → <video autoplay muted loop playsinline>
 *   • YouTube (parsed by parseVideoUrl) → <iframe> with autoplay=1,
 *     mute=1, controls=0, loop=1, modestbranding=1, playsinline=1
 *   • Vimeo                    → <iframe> with autoplay=1, muted=1,
 *     loop=1, controls=0, background=1 (background-mode = zero UI)
 *   • direct .mp4/.webm/.mov   → <video> element same as upload
 *
 * Props:
 *   imageUrl        — optional static image URL (from card.assets.<key>)
 *   videoUploadUrl  — optional uploaded video URL (card.assets.<key>Video)
 *   videoLinkUrl    — optional external video URL (card.assets.<key>VideoLink)
 *   alt             — accessibility label for both image and video
 *   className       — Tailwind classes applied to the wrapper (positioning)
 *   mediaClassName  — Tailwind classes applied to both <img> and <video>
 *                     — must include fit/size classes so the swap is seamless
 *   testId          — data-testid root. Sub-testids: `${testId}-video`,
 *                     `${testId}-toggle`.
 *   forcePlayIcon   — if true, always show the play affordance (default:
 *                     shown only when both image and video are configured).
 */
export default function PhonemeAssetMedia({
  imageUrl,
  videoUploadUrl,
  videoLinkUrl,
  alt = '',
  className = '',
  mediaClassName = '',
  testId,
  forcePlayIcon = false,
}) {
  const API = process.env.REACT_APP_BACKEND_URL;
  const [showVideo, setShowVideo] = useState(false);
  const videoElRef = useRef(null);

  // Resolve a single "video source" descriptor. Upload wins over link
  // when both are supplied (higher fidelity, no network dependency).
  const videoResolved = useMemo(() => {
    if (videoUploadUrl) {
      const src = videoUploadUrl.startsWith('/api/')
        ? `${API}${videoUploadUrl}`
        : videoUploadUrl;
      return { type: 'file', src };
    }
    if (videoLinkUrl) {
      const parsed = parseVideoUrl(videoLinkUrl);
      if (!parsed) return null;
      if (parsed.provider === 'youtube') {
        // Chromeless YouTube: no controls, no branding, muted autoplay,
        // playlist=<id> is the documented loop trick for single videos.
        const params = new URLSearchParams({
          autoplay: '1',
          mute: '1',
          controls: '0',
          loop: '1',
          playlist: parsed.id,
          modestbranding: '1',
          rel: '0',
          playsinline: '1',
          iv_load_policy: '3',
          disablekb: '1',
          fs: '0',
        });
        return { type: 'iframe', src: `${parsed.embed}?${params.toString()}` };
      }
      if (parsed.provider === 'vimeo') {
        return {
          type: 'iframe',
          src: `${parsed.embed}?autoplay=1&muted=1&loop=1&controls=0&background=1&byline=0&title=0&portrait=0`,
        };
      }
      if (parsed.provider === 'file') {
        return { type: 'file', src: parsed.embed };
      }
    }
    return null;
  }, [videoUploadUrl, videoLinkUrl, API]);

  const hasImage = Boolean(imageUrl);
  const hasVideo = Boolean(videoResolved);

  // When there is no image, the video is always "on" — it visually
  // stands in for the image. When both exist we start with the image.
  const alwaysVideo = hasVideo && !hasImage;
  const displayingVideo = alwaysVideo || showVideo;

  // Pause the local <video> element when it's not visible (perf + battery).
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    if (displayingVideo) {
      // rewind so the toggle-back-to-video feels instantaneous
      try { el.currentTime = 0; el.play(); } catch { /* autoplay policy */ }
    } else {
      try { el.pause(); } catch { /* ignore */ }
    }
  }, [displayingVideo, videoResolved]);

  // ---------------------------------------------------------------- render
  const renderVideoNode = () => {
    if (!videoResolved) return null;
    if (videoResolved.type === 'file') {
      return (
        <video
          ref={videoElRef}
          src={videoResolved.src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={alt}
          className={mediaClassName}
          data-testid={testId ? `${testId}-video` : undefined}
        />
      );
    }
    // iframe (YouTube / Vimeo). pointer-events-none because the parent
    // button owns the toggle click — the iframe would otherwise swallow it.
    return (
      <iframe
        src={videoResolved.src}
        title={alt || 'video'}
        allow="autoplay; encrypted-media; picture-in-picture"
        frameBorder="0"
        className={`${mediaClassName} pointer-events-none`}
        data-testid={testId ? `${testId}-video` : undefined}
      />
    );
  };

  // ---- CASE A: only image -----------------------------------------------
  if (!hasVideo) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={mediaClassName}
        data-testid={testId}
      />
    );
  }

  // ---- CASE B: only video (video acts as an image) ----------------------
  if (alwaysVideo) {
    return (
      <div className={className}>
        {renderVideoNode()}
      </div>
    );
  }

  // ---- CASE C: image + video (click to fade to video) -------------------
  return (
    <div className={`relative ${className}`}>
      {/* Image layer */}
      <img
        src={imageUrl}
        alt={alt}
        className={`${mediaClassName} transition-opacity duration-500 ${
          displayingVideo ? 'opacity-0' : 'opacity-100'
        }`}
        data-testid={testId}
      />
      {/* Video layer */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          displayingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {renderVideoNode()}
      </div>

      {/* Toggle overlay — always covers the surface so click anywhere
          swaps. On top of the iframe (which we disabled pointer events on)
          so YouTube/Vimeo can't steal the click. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowVideo((v) => !v); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowVideo((v) => !v);
          }
        }}
        className="absolute inset-0 z-20 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-inherit"
        aria-label={displayingVideo ? 'Torna all\'immagine' : 'Riproduci video'}
        aria-pressed={displayingVideo}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {/* Play affordance — center pulse, only when image is showing */}
        {(!displayingVideo || forcePlayIcon) && (
          <span
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/70 backdrop-blur-sm flex items-center justify-center transition-all duration-300 shadow-[0_0_28px_rgba(34,211,238,0.6)] pointer-events-none ${
              displayingVideo
                ? 'opacity-0 scale-50'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:scale-100 scale-90'
            }`}
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current ml-1" />
          </span>
        )}
        {/* Subtle idle pulse — tells the user "there's something to click"
            without dominating the composition. Only when image is on. */}
        {!displayingVideo && (
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.9)] pointer-events-none phoneme-media-pulse"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
