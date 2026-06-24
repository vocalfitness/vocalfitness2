import React, { useState, useEffect, useRef } from 'react';

/**
 * VideoWithLoader
 * ------------------------------------------------------------------
 * Drop-in replacement for a plain <video> element that:
 *   - Mounts the actual <video> only when it scrolls into view
 *     (IntersectionObserver with 200px rootMargin pre-load buffer).
 *   - Shows a shimmer / spinner skeleton overlay until the video can
 *     play, then fades it out smoothly.
 *   - Sets the autoplay-friendly defaults (muted, playsInline, loop).
 *
 * Lifted verbatim from HomePage.jsx so any page that needs a hero or
 * inline preview video can share the same loading UX.
 */
export const VideoWithLoader = ({ src, className = '', wrapperClassName = '', poster, ...rest }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(node);
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      {/* Shimmer skeleton + spinner overlay (visible until video can play) */}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-700 ${loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(37,99,235,0.18) 50%, transparent 65%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-blue-700/70 font-semibold">
            Loading video
          </span>
        </div>
      </div>

      {inView && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          onCanPlay={() => setLoaded(true)}
          onLoadedData={() => setLoaded(true)}
          className={className}
          {...rest}
        />
      )}
    </div>
  );
};

export default VideoWithLoader;
