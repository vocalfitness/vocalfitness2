import React, { useMemo, useEffect, useRef } from 'react';
import { parseVideoUrl } from './VideoLinkInput';

/**
 * PhonemeAssetMedia — smart image/video swap for the public phoneme card.
 *
 * The component is CONTROLLED: the parent owns the ``videoActive`` state.
 * This is required because sibling components (e.g. articulatory hotspots
 * on the hero surface) need to react to the video mode too (hide when
 * the video plays, restore when the image comes back).
 *
 * Rendering rules (per Vocal-Fitness product spec, 06/07/2026):
 *   • image only              → renders <img> just like before
 *   • video only              → renders the chromeless video (autoplay,
 *                              muted, loop, playsinline) permanently
 *   • image + video (default) → renders <img>. When ``videoActive`` flips
 *     to true, the video layer fades in over 500 ms and takes over.
 *
 * Provider handling
 *   • uploaded file           → <video autoplay muted loop playsinline>
 *   • YouTube                 → <iframe> controls=0 &modestbranding=1
 *   • Vimeo                   → <iframe> background=1 (fully chromeless)
 *   • direct .mp4/.webm/.mov  → <video>
 *
 * IMPORTANT — pointer events:
 *   The iframe used to be ``pointer-events-none`` so an internal toggle
 *   button could receive clicks. That broke Vimeo's own initialisation
 *   handshake on Safari. The toggle button now lives in the parent
 *   (outside the video surface), so we leave pointer events on the
 *   iframe intact.
 */
export default function PhonemeAssetMedia({
  imageUrl,
  videoUploadUrl,
  videoLinkUrl,
  alt = '',
  className = '',
  mediaClassName = '',
  iframeClassName = '',
  videoActive = false,
  testId,
}) {
  const API = process.env.REACT_APP_BACKEND_URL;
  const videoElRef = useRef(null);

  // Resolve a single video source. Uploaded file wins over external link.
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
        const params = new URLSearchParams({
          autoplay: '1', mute: '1', controls: '0', loop: '1',
          playlist: parsed.id, modestbranding: '1', rel: '0',
          playsinline: '1', iv_load_policy: '3', disablekb: '1', fs: '0',
        });
        return { type: 'iframe', src: `${parsed.embed}?${params.toString()}` };
      }
      if (parsed.provider === 'vimeo') {
        // background=1 → truly chromeless: no play button, no title, muted autoplay loop.
        return {
          type: 'iframe',
          src: `${parsed.embed}?autoplay=1&muted=1&loop=1&controls=0&background=1&byline=0&title=0&portrait=0`,
        };
      }
      if (parsed.provider === 'file') return { type: 'file', src: parsed.embed };
    }
    return null;
  }, [videoUploadUrl, videoLinkUrl, API]);

  const hasImage = Boolean(imageUrl);
  const hasVideo = Boolean(videoResolved);
  const alwaysVideo = hasVideo && !hasImage;
  const displayingVideo = alwaysVideo || (hasVideo && videoActive);

  // Perf: pause the local <video> element when it's not visible.
  // ``play()`` returns a Promise which **rejects** silently when the
  // browser refuses (autoplay policy, unsupported source, network error).
  // We must swallow the rejection — an unhandled promise error otherwise
  // trips CRA's dev overlay and looks like a hard app crash.
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    if (displayingVideo) {
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* silent */ });
      } catch { /* ignore sync throw */ }
    } else {
      try { el.pause(); } catch { /* ignore */ }
    }
  }, [displayingVideo, videoResolved]);

  const renderVideoNode = () => {
    if (!videoResolved) return null;
    if (videoResolved.type === 'file') {
      return (
        <video
          ref={videoElRef}
          src={videoResolved.src}
          autoPlay muted loop playsInline
          preload="auto"
          aria-label={alt}
          className={mediaClassName}
          onError={(e) => {
            // Silent — a failed video load must not crash the card;
            // the underlying <img> is still rendered behind us.
            // eslint-disable-next-line no-console
            console.warn('PhonemeAssetMedia: video source failed', e?.currentTarget?.error);
          }}
          data-testid={testId ? `${testId}-video` : undefined}
        />
      );
    }
    // iframe → NO object-contain, NO pointer-events-none. Just fill.
    return (
      <iframe
        src={videoResolved.src}
        title={alt || 'video'}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder="0"
        className={iframeClassName || mediaClassName.replace(/object-\S+/g, '').trim()}
        data-testid={testId ? `${testId}-video` : undefined}
      />
    );
  };

  // ---- CASE A: only image -----------------------------------------------
  if (!hasVideo) {
    // Empty asset slot → render a solid dark placeholder rather than a
    // broken <img> icon + alt text. The overlay layer above still gets to
    // draw labels/arrows for the phoneme even without a background image.
    if (!hasImage) {
      return (
        <div
          className={mediaClassName}
          aria-label={alt}
          data-testid={testId}
        />
      );
    }
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={mediaClassName}
        data-testid={testId}
      />
    );
  }

  // ---- CASE B: only video ------------------------------------------------
  if (alwaysVideo) {
    return <div className={className}>{renderVideoNode()}</div>;
  }

  // ---- CASE C: image + video (parent-controlled) ------------------------
  return (
    <div className={`relative ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        className={`${mediaClassName} transition-opacity duration-500 ${
          displayingVideo ? 'opacity-0' : 'opacity-100'
        }`}
        data-testid={testId}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          displayingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {renderVideoNode()}
      </div>
    </div>
  );
}

/**
 * Utility: does this asset slot have any playable video source?
 * Used by the parent to decide whether to render the toggle CTA.
 */
export function hasPlayableVideo(assets, key) {
  if (!assets) return false;
  const upload = assets[`${key}Video`];
  const link = assets[`${key}VideoLink`];
  if (upload) return true;
  if (link && parseVideoUrl(link)) return true;
  return false;
}
