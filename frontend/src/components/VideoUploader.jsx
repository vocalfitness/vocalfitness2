import React, { useRef, useState } from 'react';
import { Upload, Loader2, Check, X, ExternalLink, Film } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

/**
 * VideoUploader — hybrid URL + drag/drop video input.
 *
 * Behaviour mirrors ImageUploader.jsx but restricted to video files.
 * The 10 MB per-file limit is enforced *client-side* before the request
 * hits the backend — matches the CMS product spec for phoneme media.
 * Backend still validates against its own hard cap (100 MB / 2 GB total).
 *
 * Props:
 *   value       — current URL string
 *   onChange(url) — called with the new URL
 *   placeholder — text placeholder
 *   testId      — data-testid root
 */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

export default function VideoUploader({ value = '', onChange, placeholder, testId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const API = process.env.REACT_APP_BACKEND_URL;

  const upload = async (file) => {
    if (!file) return;
    setError(''); setOk(false);

    // Client-side gate: extension + size (10 MB spec)
    const nameLower = (file.name || '').toLowerCase();
    if (!ALLOWED_EXTS.some((e) => nameLower.endsWith(e))) {
      setError(`Formato non supportato. Accettati: ${ALLOWED_EXTS.join(', ')}.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File troppo grande (${mb} MB). Massimo 10 MB.`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('vf_token') || ''}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      if (!data?.url) throw new Error('Risposta upload non valida');
      onChange?.(data.url);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const absoluteSrc = value && value.startsWith('/api/') ? `${API}${value}` : value;

  return (
    <div className="grid gap-1.5" data-testid={testId}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex items-stretch gap-2 rounded-md transition-all ${
          dragOver ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
        }`}
      >
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder || 'Trascina un video (max 10 MB), clicca Upload o incolla un URL'}
            className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs pr-16"
            data-testid={`${testId}-input`}
          />
          {value && (
            <a
              href={absoluteSrc}
              target="_blank" rel="noreferrer"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
              title="Apri in nuova tab"
              data-testid={`${testId}-open`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
          onChange={(e) => upload(e.target.files?.[0])}
          className="hidden"
          data-testid={`${testId}-file-input`}
        />
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="border-slate-700 text-slate-200 hover:bg-slate-800 h-10 whitespace-nowrap"
          data-testid={`${testId}-button`}
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Caricamento…</>
          ) : ok ? (
            <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />Caricato</>
          ) : (
            <><Film className="w-3.5 h-3.5 mr-1.5" />Video</>
          )}
        </Button>

        {value && (
          <Button
            type="button"
            onClick={() => onChange?.('')}
            variant="ghost"
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-10 px-2"
            title="Rimuovi URL"
            data-testid={`${testId}-clear`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {value && /^https?:\/\/|^\/api\//.test(value) && (
        <div className="flex items-center gap-2 mt-1">
          <video
            src={absoluteSrc}
            controls
            preload="metadata"
            className="w-40 h-24 rounded-md border border-slate-800 bg-slate-950 object-cover"
            onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
            data-testid={`${testId}-preview`}
          />
          <p className="text-[10px] text-slate-500 italic truncate max-w-[400px]">{value}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-500 italic">
        Massimo 10 MB per file · formati: MP4 · WebM · MOV · AVI · MKV.
      </p>

      {error && (
        <p className="text-[11px] text-red-300 flex items-center gap-1" data-testid={`${testId}-error`}>
          <X className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}
