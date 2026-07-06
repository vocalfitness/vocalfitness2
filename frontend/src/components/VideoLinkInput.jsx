import React, { useMemo } from 'react';
import { Link2, ExternalLink, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

/**
 * VideoLinkInput — URL input for external video providers.
 *
 * Recognises YouTube (youtu.be, youtube.com/watch, youtube.com/shorts),
 * Vimeo (vimeo.com/<id>) and generic MP4/WebM URLs. Shows an embed
 * preview inline when a supported provider is detected — otherwise
 * shows a plain link chip.
 *
 * Props:
 *   value       — current URL string
 *   onChange(url) — called with the new URL
 *   placeholder — text placeholder
 *   testId      — data-testid root
 */
export function parseVideoUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  // YouTube — youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/shorts/<id>, youtube.com/embed/<id>
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([A-Za-z0-9_-]{6,})/i,
  );
  if (yt) return { provider: 'youtube', id: yt[1], embed: `https://www.youtube.com/embed/${yt[1]}` };

  // Vimeo — vimeo.com/<numeric-id> or player.vimeo.com/video/<id>
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d{5,})/i);
  if (vm) return { provider: 'vimeo', id: vm[1], embed: `https://player.vimeo.com/video/${vm[1]}` };

  // Direct MP4 / WebM
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { provider: 'file', embed: url };

  return { provider: 'unknown', embed: null };
}

export default function VideoLinkInput({ value = '', onChange, placeholder, testId }) {
  const parsed = useMemo(() => parseVideoUrl(value), [value]);

  return (
    <div className="grid gap-1.5" data-testid={testId}>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder || 'https://www.youtube.com/watch?v=… · https://vimeo.com/… · MP4 URL'}
            className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs pl-8 pr-8"
            data-testid={`${testId}-input`}
          />
          {value && (
            <a
              href={value}
              target="_blank" rel="noreferrer"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
              title="Apri in nuova tab"
              data-testid={`${testId}-open`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {value && (
          <Button
            type="button"
            onClick={() => onChange?.('')}
            variant="ghost"
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-10 px-2"
            title="Rimuovi link"
            data-testid={`${testId}-clear`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {parsed && parsed.embed && (parsed.provider === 'youtube' || parsed.provider === 'vimeo') && (
        <div className="mt-1 aspect-video w-full max-w-md rounded-md overflow-hidden border border-slate-800 bg-black">
          <iframe
            src={parsed.embed}
            title={`${parsed.provider} preview`}
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full"
            data-testid={`${testId}-embed`}
          />
        </div>
      )}
      {parsed && parsed.provider === 'file' && parsed.embed && (
        <video
          src={parsed.embed}
          controls
          preload="metadata"
          className="mt-1 w-full max-w-md rounded-md border border-slate-800 bg-black"
          data-testid={`${testId}-file-preview`}
        />
      )}
      {value && !parsed && (
        <p className="text-[10px] text-amber-300/80 italic">
          URL non riconosciuto — verifica che sia YouTube / Vimeo o un link diretto .mp4/.webm/.mov.
        </p>
      )}

      <p className="text-[10px] text-slate-500 italic">
        Provider supportati: YouTube, Vimeo, o URL diretto MP4/WebM/MOV.
      </p>
    </div>
  );
}
