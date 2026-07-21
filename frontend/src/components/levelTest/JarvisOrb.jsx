import React from 'react';
import { Volume2, Play } from 'lucide-react';

/**
 * JarvisOrb — audio-reactive orb PLACEHOLDER (M1 mock).
 *
 * Inherits the phoneme-card signal language: deep slate core with an ORANGE
 * glow when "speaking" (the brand signal colour), cyan structural rings when
 * idle. In M1 there is no real audio — `speaking` is toggled by a mock timer
 * in the parent. M2 wires this to a pre-generated ElevenLabs clip + Web Audio
 * amplitude analyser (replaceable via the same `speaking` prop contract).
 */
export const JarvisOrb = ({ speaking = false, size = 132, onReplay, hasAudio = false }) => {
  return (
    <div className="relative inline-flex flex-col items-center" data-testid="jarvis-orb">
      <style>{`
        @keyframes ltOrbIdle {
          0%,100% { box-shadow: 0 0 24px rgba(34,211,238,0.30), inset 0 0 20px rgba(34,211,238,0.14); }
          50%     { box-shadow: 0 0 40px rgba(34,211,238,0.50), inset 0 0 30px rgba(34,211,238,0.22); }
        }
        @keyframes ltOrbSpeak {
          0%,100% { box-shadow: 0 0 26px rgba(251,146,60,0.55), inset 0 0 20px rgba(251,146,60,0.30); transform: scale(1); }
          50%     { box-shadow: 0 0 60px rgba(251,146,60,0.95), inset 0 0 34px rgba(251,146,60,0.5); transform: scale(1.045); }
        }
        @keyframes ltRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ltBar {
          0%,100% { transform: scaleY(0.35); }
          50%     { transform: scaleY(1); }
        }
        .lt-orb-idle  { animation: ltOrbIdle 3.6s ease-in-out infinite; }
        .lt-orb-speak { animation: ltOrbSpeak 1.1s ease-in-out infinite; }
        .lt-ring-spin { animation: ltRingSpin 16s linear infinite; }
      `}</style>

      {/* Rotating HUD ring */}
      <div
        className="absolute rounded-full border border-dashed lt-ring-spin pointer-events-none"
        style={{
          width: size + 26,
          height: size + 26,
          top: -13,
          borderColor: speaking ? 'rgba(251,146,60,0.5)' : 'rgba(34,211,238,0.35)',
        }}
      />

      {/* Core orb */}
      <div
        className={`relative rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
          speaking ? 'lt-orb-speak border-orange-400' : 'lt-orb-idle border-cyan-400/60'
        }`}
        style={{
          width: size,
          height: size,
          background:
            'radial-gradient(circle at 50% 40%, rgba(15,23,42,0.4) 0%, rgba(2,6,23,0.95) 72%)',
        }}
      >
        {/* Waveform bars when speaking, mic glyph when idle */}
        {speaking ? (
          <div className="flex items-end gap-1 h-1/3">
            {[0.5, 0.9, 0.6, 1, 0.7, 0.45].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-orange-400"
                style={{
                  height: `${h * 100}%`,
                  boxShadow: '0 0 8px rgba(251,146,60,0.85)',
                  animation: 'ltBar 0.7s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <Volume2 className="text-cyan-300/80" size={size * 0.28} />
        )}
      </div>

      {/* Replay control (mock) */}
      {onReplay && (
        <button
          type="button"
          onClick={onReplay}
          data-testid="jarvis-orb-replay"
          className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-cyan-200/80 hover:text-orange-300 transition-colors"
        >
          <Play size={13} />
          {hasAudio ? 'Riascolta' : 'Riascolta (demo)'}
        </button>
      )}
    </div>
  );
};

export default JarvisOrb;
