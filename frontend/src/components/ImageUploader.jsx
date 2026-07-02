import React, { useRef, useState } from 'react';
import { Upload, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

/**
 * ImageUploader — hybrid URL + drag/drop file input.
 *
 * Behaviour:
 *   • Editable text input holds the current URL.
 *   • Adjacent "Upload" button opens a file picker.
 *   • Drag & drop an image onto the field to upload immediately.
 *   • On successful upload → auto-fills the URL field with the returned
 *     `/api/uploads/…` path from the existing `/api/admin/upload` endpoint.
 *
 * Props:
 *   value       — current URL string
 *   onChange(url) — called with the new URL
 *   placeholder — text placeholder
 *   testId      — data-testid root
 */
export default function ImageUploader({ value = '', onChange, placeholder, testId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk]         = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const API = process.env.REACT_APP_BACKEND_URL;

  const upload = async (file) => {
    if (!file) return;
    setError(''); setOk(false); setUploading(true);
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
    if (file && file.type.startsWith('image/')) upload(file);
    else setError('Solo immagini. Trascina un file .png / .jpg / .webp / .svg.');
  };

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
            placeholder={placeholder || 'https://… oppure trascina un file qui'}
            className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs pr-16"
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

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
            <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</>
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
          <img
            src={value}
            alt="anteprima"
            className="w-16 h-16 object-cover rounded-md border border-slate-800 bg-slate-950"
            onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
            data-testid={`${testId}-preview`}
          />
          <p className="text-[10px] text-slate-500 italic truncate max-w-[400px]">{value}</p>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-300 flex items-center gap-1" data-testid={`${testId}-error`}>
          <X className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}
