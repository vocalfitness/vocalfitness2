import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Check, Crown, Sparkles, X, Volume2, BookOpen, GraduationCap,
  Mail, MessageCircle, ArrowRight
} from 'lucide-react';
import { BACKEND_URL } from '../lib/backend';

/**
 * LMSPremiumPaywall — full-screen / modal overlay shown when an anonymous
 * or lead user tries to open a premium phoneme card.
 *
 * The component supports two render modes via the `variant` prop:
 *   - 'modal'      → overlay on top of the underlying page (closable)
 *   - 'fullscreen' → covers the whole viewport (no close button; used as
 *                    a route-level guard inside PhonemeCardPage)
 *
 * The CTA is intentionally soft: we collect an interested-prospect email
 * via POST /api/lms/interest (a free, non-Stripe lead capture for now).
 * Stripe wiring can be added later without changing this component.
 */

const BENEFITS = [
  { icon: BookOpen,    title: 'Tutte le 20+ phoneme card', desc: 'Vocali, dittonghi e consonanti — sezione sagittale, hotspot anatomici, audio per ogni esempio.' },
  { icon: Volume2,     title: 'Audio del Prof. Dapper',     desc: 'Ogni parola e frase registrata con la voce ufficiale del docente, US e UK.' },
  { icon: GraduationCap, title: 'Laboratorio Pink Trombone',desc: 'Vocal tract sintetizzatore live integrato in ogni card per esercitare la postura articolatoria.' },
  { icon: Sparkles,    title: 'Aggiornamenti continui',     desc: 'Nuove card sbloccate ogni mese — il catalogo cresce automaticamente.' },
];

const TIERS = [
  {
    id: 'monthly',
    label: 'Mensile',
    price: '€19',
    period: '/ mese',
    sub: 'Rinnovo automatico, disdici quando vuoi',
    cta: 'Inizia',
    highlight: false,
  },
  {
    id: 'annual',
    label: 'Annuale',
    price: '€149',
    period: '/ anno',
    sub: 'Equivalente a €12,40/mese · 35% di sconto',
    cta: 'Risparmia 35%',
    highlight: true,
    badge: 'Più scelto',
  },
];

const LMSPremiumPaywall = ({
  cardId = '',
  cardLabel = '',
  variant = 'modal',
  onClose,
  showLoginLink = true,
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedTier, setSelectedTier] = useState('annual');

  // Lock scroll while modal is open
  useEffect(() => {
    if (variant !== 'modal') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [variant]);

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const cleanEmail = (email || '').trim();
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(cleanEmail)) {
      setStatus('error');
      setErrorMsg('Inserisci un indirizzo email valido');
      return;
    }
    setStatus('sending'); setErrorMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/lms/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: (name || '').trim() || null,
          card_id: cardId || null,
          tier: selectedTier,
          source: 'paywall_modal',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Invio non riuscito');
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Errore di rete, riprova fra un istante.');
    }
  };

  const containerClass = variant === 'fullscreen'
    ? 'fixed inset-0 z-[60] overflow-y-auto bg-[#04070d]'
    : 'fixed inset-0 z-[60] overflow-y-auto bg-slate-950/85 backdrop-blur-sm';

  return (
    <div
      className={containerClass}
      role="dialog"
      aria-modal="true"
      data-testid="lms-paywall"
    >
      <style>{`
        @keyframes paywall-enter {
          from { opacity:0; transform: translateY(24px) scale(.97); }
          to   { opacity:1; transform: none; }
        }
        .paywall-enter { animation: paywall-enter .45s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes paywall-aura {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
          50%     { box-shadow: 0 0 60px 0 rgba(251,146,60,0.20); }
        }
        .paywall-aura { animation: paywall-aura 4.5s ease-in-out infinite; }
      `}</style>

      <div className="min-h-full flex items-center justify-center p-4 md:p-8">
        <div className="paywall-enter relative w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 rounded-3xl shadow-2xl overflow-hidden paywall-aura">
          {/* Ambient gradient */}
          <div className="absolute inset-0 pointer-events-none opacity-60"
               style={{ background: 'radial-gradient(circle at 100% 0%, rgba(251,146,60,0.18) 0%, transparent 55%), radial-gradient(circle at 0% 100%, rgba(34,211,238,0.12) 0%, transparent 50%)' }} />

          {variant === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              data-testid="lms-paywall-close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="relative p-7 md:p-10 lg:p-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                <Lock className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-orange-300">
                  Contenuto Premium
                </p>
                {cardLabel && (
                  <p className="text-sm text-slate-300">
                    Scheda <span className="font-bold text-white">{cardLabel}</span>
                  </p>
                )}
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
              Sblocca l&rsquo;intera<br className="hidden md:block" />
              <span className="bg-gradient-to-r from-orange-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent">phoneme library</span> di Steve Dapper
            </h2>
            <p className="text-slate-400 text-base md:text-lg mb-8 max-w-2xl">
              La prima card <span className="text-emerald-300 font-bold">/ʊ/ FOOT</span> è gratuita, sempre. Per accedere alle altre card complete con audio professionale, hotspot anatomici e laboratorio Pink Trombone, scegli un piano.
            </p>

            {/* Benefits grid */}
            <div className="grid sm:grid-cols-2 gap-3 mb-8" data-testid="lms-paywall-benefits">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <b.icon className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm mb-0.5">{b.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tier selector */}
            <div className="grid md:grid-cols-2 gap-3 mb-8" data-testid="lms-paywall-tiers">
              {TIERS.map((t) => {
                const active = selectedTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTier(t.id)}
                    data-testid={`lms-paywall-tier-${t.id}`}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                      active
                        ? 'border-orange-400 bg-orange-500/10 shadow-[0_0_30px_rgba(251,146,60,0.18)]'
                        : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                    }`}
                  >
                    {t.badge && (
                      <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 text-[10px] font-bold uppercase tracking-wider shadow-lg">
                        <Crown className="w-3 h-3" /> {t.badge}
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-orange-300' : 'text-slate-400'}`}>{t.label}</p>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-orange-400 bg-orange-400' : 'border-slate-600'}`}>
                        {active && <Check className="w-3 h-3 text-slate-900" strokeWidth={4} />}
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white leading-none">
                      {t.price}<span className="text-base font-semibold text-slate-400 ml-1">{t.period}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5">{t.sub}</p>
                  </button>
                );
              })}
            </div>

            {/* Lead-capture form */}
            {status === 'sent' ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex items-start gap-3" data-testid="lms-paywall-success">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-slate-900" strokeWidth={3} />
                </div>
                <div>
                  <p className="font-bold text-emerald-200">Richiesta ricevuta!</p>
                  <p className="text-sm text-emerald-100/80 mt-1">
                    Ti contatteremo a <span className="font-semibold text-white">{email}</span> entro 24 ore per attivare l&rsquo;accesso premium e indirizzarti al pagamento (€{selectedTier === 'annual' ? '149/anno' : '19/mese'}).
                  </p>
                  {variant === 'modal' && onClose && (
                    <button type="button" onClick={onClose} className="mt-3 text-xs font-bold text-emerald-300 hover:text-white underline underline-offset-2">
                      Chiudi
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3" data-testid="lms-paywall-form">
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Il tuo nome (facoltativo)"
                    maxLength={120}
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 outline-none transition-all"
                    data-testid="lms-paywall-name-input"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    maxLength={180}
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 outline-none transition-all"
                    data-testid="lms-paywall-email-input"
                  />
                </div>

                {status === 'error' && errorMsg && (
                  <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2" data-testid="lms-paywall-error">{errorMsg}</div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold shadow-[0_10px_30px_rgba(251,146,60,0.40)] hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(251,146,60,0.55)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="lms-paywall-submit"
                >
                  {status === 'sending' ? 'Invio in corso…' : (
                    <>
                      <Crown className="w-5 h-5" />
                      Sblocca con il piano {selectedTier === 'annual' ? 'Annuale' : 'Mensile'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom row: login link + customer-care */}
            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {showLoginLink && (
                <button
                  type="button"
                  onClick={() => { onClose?.(); navigate('/login'); }}
                  className="text-cyan-300 hover:text-white font-semibold transition-colors"
                  data-testid="lms-paywall-login-link"
                >
                  Hai già un account? Accedi →
                </button>
              )}
              <div className="flex items-center gap-4 text-slate-500">
                <a href="mailto:steve@vocalfitness.org" className="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> steve@vocalfitness.org
                </a>
                <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-emerald-300 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LMSPremiumPaywall;
