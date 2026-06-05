import React from 'react';
import { X, Mail } from 'lucide-react';
import { sanitizeRichHtml } from './RichTextEditor';

/**
 * Renders an iframe-isolated preview that mirrors the exact HTML template
 * the backend sends via SMTP (see /app/backend/server.py::send_notification_email).
 * Keep both templates in sync.
 */
const buildEmailHtml = ({ html, plain, senderName, typeLabel, ctaUrl }) => {
  const messageHtml =
    html && html.trim()
      ? sanitizeRichHtml(html)
      : (plain || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:20px;text-align:center;">
      <h2 style="color:#f59e0b;margin:0;">VocalFitness</h2>
    </div>
    <div style="padding:24px;">
      <p style="color:#64748b;font-size:14px;">Hai ricevuto un nuovo ${typeLabel.toLowerCase()} da <strong>${senderName}</strong>:</p>
      <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:16px 20px;margin:16px 0;border-radius:0 8px 8px 0;">
        <div style="margin:0;color:#1e293b;white-space:pre-wrap;word-break:break-word;font-family:Arial,sans-serif;line-height:1.6;">${messageHtml}</div>
      </div>
      <a href="${ctaUrl}"
         style="display:inline-block;background:#f59e0b;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">
        Vai all'Area Riservata
      </a>
    </div>
  </div>
</body></html>`;
};

export const EmailPreviewModal = ({
  isOpen,
  onClose,
  contentHtml,
  contentPlain,
  recipientEmail,
  recipientName,
  senderName = 'VocalFitness Admin',
  messageType = 'text',
}) => {
  if (!isOpen) return null;

  const typeLabel =
    { text: 'Messaggio', audio: 'Audio', video: 'Video', task: 'Compito', file: 'File' }[messageType] || 'Messaggio';

  const ctaUrl = `${window.location.origin}/area-clienti`;
  const subject = `VocalFitness - Nuovo ${typeLabel} da ${senderName}`;
  const html = buildEmailHtml({
    html: contentHtml,
    plain: contentPlain,
    senderName,
    typeLabel,
    ctaUrl,
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      data-testid="email-preview-modal"
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-bold">Anteprima email</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            data-testid="email-preview-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta info */}
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/40 text-sm space-y-1">
          <div className="flex gap-2">
            <span className="text-slate-500 w-20 shrink-0">Da:</span>
            <span className="text-slate-200">{senderName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 w-20 shrink-0">A:</span>
            <span className="text-slate-200">
              {recipientName ? `${recipientName} ` : ''}
              {recipientEmail ? (
                <span className="text-slate-400">&lt;{recipientEmail}&gt;</span>
              ) : (
                <span className="text-amber-400 text-xs">(nessuna email impostata per il destinatario)</span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 w-20 shrink-0">Oggetto:</span>
            <span className="text-slate-200 font-medium">{subject}</span>
          </div>
        </div>

        {/* Iframe sandbox preview */}
        <div className="flex-1 overflow-auto bg-slate-200 p-4">
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className="w-full h-[480px] bg-white rounded-lg shadow border-0"
            data-testid="email-preview-iframe"
          />
        </div>

        {/* Footer note */}
        <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-400">
          Questa è l'anteprima esatta del template HTML inviato via Zoho SMTP. Il link "Area Riservata"
          punta a <code className="text-amber-400">{ctaUrl}</code>.
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
