/**
 * prefetchVimeo — hover-warming helper for Vimeo (and YouTube) iframes.
 *
 * Rationale:
 *   The public phoneme card swaps the still image for a Vimeo iframe when
 *   the user taps the "Video" CTA. Vimeo's boot handshake typically costs
 *   1–3 s (player JS + config JSON + first-video-chunk). During that window
 *   our loader spinner is visible instead of the animation.
 *
 *   By dynamically injecting a hidden iframe with the SAME embed URL as
 *   soon as the pointer hovers the CTA (or the button receives focus via
 *   keyboard), we force the browser + Vimeo to:
 *     • run DNS/TLS/preconnect for player.vimeo.com and i.vimeocdn.com
 *     • cache the Vimeo player JS bundle
 *     • fetch the video config JSON
 *     • start buffering the first video segment
 *
 *   When the user then clicks "Video" (usually 300–1500 ms later), the
 *   real iframe uses the warm cache and the loader flashes for a frame
 *   at most — effectively perceived as instant.
 *
 * Non-goals:
 *   • Autoplay audio — the injected URL keeps ``muted=1`` so browsers stay
 *     happy and no sound leaks.
 *   • Multiple prefetches for the same URL — we cache each URL forever
 *     until the tab is closed (idempotent).
 *   • Blocking network for other resources — the iframe uses
 *     ``loading="lazy"`` fallback and is capped in ``requestIdleCallback``.
 */
import { parseVideoUrl } from '../components/VideoLinkInput';

// URL → HTMLIFrameElement (or ``true`` while pending) so repeated hovers
// don't spawn new iframes.
const prefetched = new Map();

function buildEmbedUrl(providerVideoUrl) {
  const parsed = parseVideoUrl(providerVideoUrl);
  if (!parsed) return null;
  if (parsed.provider === 'vimeo') {
    // Mirror the exact params PhonemeAssetMedia will use so the browser
    // and Vimeo cache the SAME URL and its response.
    return `${parsed.embed}?autoplay=1&muted=1&loop=1&controls=0&background=1&byline=0&title=0&portrait=0`;
  }
  if (parsed.provider === 'youtube') {
    const params = new URLSearchParams({
      autoplay: '1', mute: '1', controls: '0', loop: '1',
      playlist: parsed.id, modestbranding: '1', rel: '0',
      playsinline: '1', iv_load_policy: '3', disablekb: '1', fs: '0',
    });
    return `${parsed.embed}?${params.toString()}`;
  }
  return null;
}

function injectHiddenIframe(embedUrl) {
  if (typeof document === 'undefined') return null;
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.title = 'video prefetch';
  iframe.allow = 'autoplay; encrypted-media';
  // Off-screen, size 1×1, no border. Keep it painting-eligible so the
  // browser doesn't throttle it, but invisible to sighted + AT users.
  iframe.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:-9999px',
    'width:1px',
    'height:1px',
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'visibility:hidden',
  ].join(';');
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * prefetchVimeo(providerVideoUrl)
 *   Idempotent. Safe to call from onMouseEnter / onFocus / onTouchStart.
 *   Silently no-ops for unsupported providers, missing DOM, or repeats.
 */
export function prefetchVimeo(providerVideoUrl) {
  if (!providerVideoUrl) return;
  const embedUrl = buildEmbedUrl(providerVideoUrl);
  if (!embedUrl) return;
  if (prefetched.has(embedUrl)) return;
  prefetched.set(embedUrl, true);

  const run = () => {
    const el = injectHiddenIframe(embedUrl);
    if (el) prefetched.set(embedUrl, el);
  };

  // Defer to idle so we never contend with the click that comes right
  // after the hover (browsers dispatch mouseenter → click within ~50 ms
  // when the user is decisive).
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 250 });
  } else {
    setTimeout(run, 16);
  }
}
