import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Check, Briefcase, GraduationCap, Globe2, Sparkles, ArrowRight, User, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { BACKEND_URL } from '../lib/backend';

const TOTAL_STEPS = 5;
const API = `${BACKEND_URL}/api`;

const COPY = {
  en: {
    title: 'Diagnostic Assessment Onboarding',
    subtitle: 'A 90-second intake — your personalised plan starts here.',
    step: 'Step',
    of: 'of',
    next: 'Continue',
    back: 'Back',
    submit: 'Submit & finalise',
    submitting: 'Submitting…',
    success_title: 'Your assessment is booked.',
    success_sub: 'We have received your profile and just sent you a magic-link email. Use it to access your VocalFitness Members Area instantly — no password required.',
    success_cta_login: 'Go to Login',
    success_cta_close: 'Close',
    s1: {
      eyebrow: 'Step 1 · Personal',
      title: 'Tell us about you',
      sub: 'Basic contact details — used only for your assessment booking.',
      name: 'Full name',
      email: 'Email address',
      phone: 'Phone (with country code)',
      placeholder_name: 'e.g. Mario Rossi',
      placeholder_email: 'mario@company.com',
      placeholder_phone: '+39 ...'
    },
    s2: {
      eyebrow: 'Step 2 · CEFR Self-Assessment',
      title: 'Your current spoken-English level',
      sub: 'Pick the band that best describes how you speak today. We\'ll fine-tune during the diagnostic.',
      levels: [
        { value: 'A1', label: 'A1 — Beginner', desc: 'Basic phrases, very limited spoken interaction.' },
        { value: 'A2', label: 'A2 — Elementary', desc: 'Simple exchanges, slow and effortful speaking.' },
        { value: 'B1', label: 'B1 — Intermediate', desc: 'Everyday topics, hesitant in professional contexts.' },
        { value: 'B2', label: 'B2 — Upper-Intermediate', desc: 'Comfortable but with noticeable accent or rhythm gaps.' },
        { value: 'C1', label: 'C1 — Advanced', desc: 'Fluent, occasional articulation or prosody refinement needed.' },
        { value: 'C2', label: 'C2 — Proficient', desc: 'Near-native, seeking executive presence polish.' }
      ]
    },
    s3: {
      eyebrow: 'Step 3 · Role & Sector',
      title: 'Where you operate professionally',
      sub: 'This helps us calibrate vocabulary, register and use cases.',
      role_label: 'Your role',
      sector_label: 'Industry / sector',
      roles: [
        { value: 'executive', label: 'Executive / C-Level', icon: Briefcase },
        { value: 'manager', label: 'Manager / Team Lead', icon: User },
        { value: 'professional', label: 'Professional / Specialist', icon: Sparkles },
        { value: 'sales', label: 'Sales / Customer-Facing', icon: ArrowRight },
        { value: 'academic', label: 'Academic / Research', icon: GraduationCap },
        { value: 'student', label: 'Student / Early Career', icon: User },
        { value: 'entrepreneur', label: 'Entrepreneur / Founder', icon: Building2 },
        { value: 'other', label: 'Other', icon: User }
      ],
      sectors: [
        'Technology & Software', 'Finance & Banking', 'Healthcare & Pharma',
        'Manufacturing & Industrial', 'Consulting & Professional Services',
        'Legal', 'Media & Entertainment', 'Education & Academia',
        'Retail & E-commerce', 'Energy & Utilities', 'Public Sector', 'Other'
      ]
    },
    s4: {
      eyebrow: 'Step 4 · Native Language',
      title: 'Your native language',
      sub: 'Helps us anticipate articulatory transfer patterns specific to your L1.',
      languages: [
        'Italian', 'Spanish', 'French', 'German', 'Portuguese',
        'Russian', 'Mandarin Chinese', 'Japanese', 'Arabic',
        'Hindi', 'English (other regional accent)', 'Other'
      ],
      motivation_label: 'What is your primary goal? (optional)',
      motivation_placeholder: 'e.g. Lead international meetings with confidence, deliver lectures in English, polish executive presence...'
    },
    s5: {
      eyebrow: 'Step 5 · Review',
      title: 'Confirm your profile',
      sub: 'Review your answers below. We will use this to prepare your diagnostic session.',
      labels: {
        name: 'Name', email: 'Email', phone: 'Phone',
        level: 'CEFR Level', role: 'Role', sector: 'Sector',
        native: 'Native language', motivation: 'Goal'
      },
      consent: 'I agree to be contacted regarding my diagnostic assessment.'
    }
  },

  it: {
    title: 'Onboarding Valutazione Diagnostica',
    subtitle: 'Un intake di 90 secondi — il tuo piano personalizzato inizia qui.',
    step: 'Step',
    of: 'di',
    next: 'Continua',
    back: 'Indietro',
    submit: 'Invia e finalizza',
    submitting: 'Invio in corso…',
    success_title: 'La tua valutazione è prenotata.',
    success_sub: 'Abbiamo ricevuto il tuo profilo e ti abbiamo appena inviato una email con magic-link. Usalo per accedere subito alla tua Area Clienti VocalFitness — senza password.',
    success_cta_login: 'Vai al Login',
    success_cta_close: 'Chiudi',
    s1: {
      eyebrow: 'Step 1 · Personale',
      title: 'Parlaci di te',
      sub: 'Dati di contatto base — usati solo per la prenotazione della tua valutazione.',
      name: 'Nome completo',
      email: 'Indirizzo email',
      phone: 'Telefono (con prefisso internazionale)',
      placeholder_name: 'es. Mario Rossi',
      placeholder_email: 'mario@azienda.com',
      placeholder_phone: '+39 ...'
    },
    s2: {
      eyebrow: 'Step 2 · Auto-valutazione CEFR',
      title: 'Il tuo livello attuale di inglese parlato',
      sub: 'Scegli la banda che descrive meglio come parli oggi. Affineremo durante la diagnostica.',
      levels: [
        { value: 'A1', label: 'A1 — Principiante', desc: 'Frasi base, interazione orale molto limitata.' },
        { value: 'A2', label: 'A2 — Elementare', desc: 'Scambi semplici, parlato lento e faticoso.' },
        { value: 'B1', label: 'B1 — Intermedio', desc: 'Argomenti quotidiani, esitazione in contesti professionali.' },
        { value: 'B2', label: 'B2 — Intermedio Superiore', desc: 'A proprio agio ma con accento o ritmo migliorabili.' },
        { value: 'C1', label: 'C1 — Avanzato', desc: 'Fluente, occasionale rifinitura di articolazione o prosodia.' },
        { value: 'C2', label: 'C2 — Padronanza', desc: 'Quasi nativo, cerchi rifinitura di executive presence.' }
      ]
    },
    s3: {
      eyebrow: 'Step 3 · Ruolo & Settore',
      title: 'Dove operi professionalmente',
      sub: 'Ci aiuta a calibrare lessico, registro e casi d\'uso.',
      role_label: 'Il tuo ruolo',
      sector_label: 'Industria / settore',
      roles: [
        { value: 'executive', label: 'Executive / C-Level', icon: Briefcase },
        { value: 'manager', label: 'Manager / Team Lead', icon: User },
        { value: 'professional', label: 'Professionista / Specialista', icon: Sparkles },
        { value: 'sales', label: 'Sales / Client-Facing', icon: ArrowRight },
        { value: 'academic', label: 'Accademico / Ricerca', icon: GraduationCap },
        { value: 'student', label: 'Studente / Early Career', icon: User },
        { value: 'entrepreneur', label: 'Imprenditore / Founder', icon: Building2 },
        { value: 'other', label: 'Altro', icon: User }
      ],
      sectors: [
        'Tecnologia & Software', 'Finanza & Banking', 'Healthcare & Farmaceutico',
        'Manifatturiero & Industriale', 'Consulenza & Servizi Professionali',
        'Legale', 'Media & Entertainment', 'Educazione & Accademia',
        'Retail & E-commerce', 'Energia & Utilities', 'Settore Pubblico', 'Altro'
      ]
    },
    s4: {
      eyebrow: 'Step 4 · Lingua Madre',
      title: 'La tua lingua madre',
      sub: 'Ci aiuta ad anticipare i pattern articolatori specifici della tua L1.',
      languages: [
        'Italiano', 'Spagnolo', 'Francese', 'Tedesco', 'Portoghese',
        'Russo', 'Cinese Mandarino', 'Giapponese', 'Arabo',
        'Hindi', 'Inglese (altro accento regionale)', 'Altro'
      ],
      motivation_label: 'Qual è il tuo obiettivo principale? (facoltativo)',
      motivation_placeholder: 'es. Guidare meeting internazionali con sicurezza, fare lezioni in inglese, rifinire executive presence...'
    },
    s5: {
      eyebrow: 'Step 5 · Riepilogo',
      title: 'Conferma il tuo profilo',
      sub: 'Rivedi le risposte qui sotto. Le useremo per preparare la tua sessione diagnostica.',
      labels: {
        name: 'Nome', email: 'Email', phone: 'Telefono',
        level: 'Livello CEFR', role: 'Ruolo', sector: 'Settore',
        native: 'Lingua madre', motivation: 'Obiettivo'
      },
      consent: 'Acconsento ad essere contattato/a riguardo la mia valutazione diagnostica.'
    }
  }
};

const initialData = {
  name: '', email: '', phone: '',
  englishLevel: '',
  role: '', sector: '',
  nativeLanguage: '', motivation: '',
  consent: false
};

const OnboardingWizard = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const t = COPY[language] || COPY.en;
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      // Reset on open
      setStep(1);
      setData(initialData);
      setSubmitted(false);
      setError(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const isStepValid = () => {
    if (step === 1) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      return data.name.trim().length >= 2 && emailOk && data.phone.trim().length >= 6;
    }
    if (step === 2) return !!data.englishLevel;
    if (step === 3) return !!data.role && !!data.sector;
    if (step === 4) return !!data.nativeLanguage;
    if (step === 5) return data.consent;
    return false;
  };

  const next = () => { if (isStepValid()) setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const submit = async () => {
    if (!isStepValid()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        sector: data.sector,
        englishLevel: data.englishLevel,
        age: '',
        preferredDay: '',
        preferredTime: '',
        message: data.motivation,
        type: 'onboarding',
        language,
        role: data.role,
        nativeLanguage: data.nativeLanguage,
        motivation: data.motivation,
        source: 'onboarding_wizard'
      };
      await axios.post(`${API}/booking`, payload);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="onboarding-wizard-modal"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="relative px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-white via-blue-50/40 to-white">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors"
            data-testid="onboarding-close"
          >
            <X size={18} />
          </button>

          <p className="text-blue-600 font-semibold uppercase tracking-[0.2em] text-[10px] mb-2">
            {t.step} {step} {t.of} {TOTAL_STEPS}
          </p>
          <h2 id="onboarding-wizard-title" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
            {t.title}
          </h2>
          <p className="text-sm text-slate-600">{t.subtitle}</p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i + 1 < step ? 'bg-blue-600 flex-1' :
                  i + 1 === step ? 'bg-blue-500 flex-[2]' :
                  'bg-slate-200 flex-1'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          {submitted ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-6">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">{t.success_title}</h3>
              <p className="text-slate-600 max-w-md mb-8">{t.success_sub}</p>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <a href="/login" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" data-testid="onboarding-success-login">
                    {t.success_cta_login}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700">
                  {t.success_cta_close}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <Step header={t.s1} data-testid="onboarding-step-1">
                  <div className="space-y-4">
                    <Field label={t.s1.name}>
                      <input
                        type="text" value={data.name} onChange={(e) => update('name', e.target.value)}
                        placeholder={t.s1.placeholder_name}
                        className="vf-input"
                        data-testid="onboarding-input-name"
                      />
                    </Field>
                    <Field label={t.s1.email}>
                      <input
                        type="email" value={data.email} onChange={(e) => update('email', e.target.value)}
                        placeholder={t.s1.placeholder_email}
                        className="vf-input"
                        data-testid="onboarding-input-email"
                      />
                    </Field>
                    <Field label={t.s1.phone}>
                      <input
                        type="tel" value={data.phone} onChange={(e) => update('phone', e.target.value)}
                        placeholder={t.s1.placeholder_phone}
                        className="vf-input"
                        data-testid="onboarding-input-phone"
                      />
                    </Field>
                  </div>
                </Step>
              )}

              {step === 2 && (
                <Step header={t.s2} data-testid="onboarding-step-2">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {t.s2.levels.map((lvl) => (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => update('englishLevel', lvl.value)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
                          data.englishLevel === lvl.value
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                        data-testid={`onboarding-level-${lvl.value}`}
                      >
                        <div className="font-bold text-slate-900 mb-1">{lvl.label}</div>
                        <div className="text-xs text-slate-600 leading-relaxed">{lvl.desc}</div>
                      </button>
                    ))}
                  </div>
                </Step>
              )}

              {step === 3 && (
                <Step header={t.s3} data-testid="onboarding-step-3">
                  <Field label={t.s3.role_label}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {t.s3.roles.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => update('role', r.value)}
                            className={`p-3 rounded-xl border-2 transition-all text-xs flex flex-col items-center gap-2 ${
                              data.role === r.value
                                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'
                            }`}
                            data-testid={`onboarding-role-${r.value}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-semibold leading-tight text-center">{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label={t.s3.sector_label} className="mt-5">
                    <select
                      value={data.sector}
                      onChange={(e) => update('sector', e.target.value)}
                      className="vf-input"
                      data-testid="onboarding-select-sector"
                    >
                      <option value="">—</option>
                      {t.s3.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </Step>
              )}

              {step === 4 && (
                <Step header={t.s4} data-testid="onboarding-step-4">
                  <Field label={t.s4.languages[0]}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {t.s4.languages.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => update('nativeLanguage', l)}
                          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                            data.nativeLanguage === l
                              ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'
                          }`}
                          data-testid={`onboarding-language-${l.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          <Globe2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{l}</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label={t.s4.motivation_label} className="mt-5">
                    <textarea
                      value={data.motivation}
                      onChange={(e) => update('motivation', e.target.value)}
                      placeholder={t.s4.motivation_placeholder}
                      rows={3}
                      className="vf-input resize-none"
                      data-testid="onboarding-textarea-motivation"
                    />
                  </Field>
                </Step>
              )}

              {step === 5 && (
                <Step header={t.s5} data-testid="onboarding-step-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-200">
                    <Row label={t.s5.labels.name} value={data.name} />
                    <Row label={t.s5.labels.email} value={data.email} />
                    <Row label={t.s5.labels.phone} value={data.phone} />
                    <Row label={t.s5.labels.level} value={data.englishLevel} highlight />
                    <Row label={t.s5.labels.role} value={data.role} />
                    <Row label={t.s5.labels.sector} value={data.sector} />
                    <Row label={t.s5.labels.native} value={data.nativeLanguage} highlight />
                    {data.motivation && <Row label={t.s5.labels.motivation} value={data.motivation} />}
                  </div>

                  <label className="flex items-start gap-3 mt-5 cursor-pointer p-4 rounded-2xl border border-slate-200 hover:border-blue-400 transition-colors">
                    <input
                      type="checkbox" checked={data.consent}
                      onChange={(e) => update('consent', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      data-testid="onboarding-consent-checkbox"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">{t.s5.consent}</span>
                  </label>

                  {error && (
                    <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      {error}
                    </p>
                  )}
                </Step>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <Button
              variant="outline" onClick={back} disabled={step === 1 || submitting}
              className="border-slate-300 text-slate-700 hover:bg-white hover:border-blue-500 hover:text-blue-700 disabled:opacity-40"
              data-testid="onboarding-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t.back}
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={next} disabled={!isStepValid()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="onboarding-next"
              >
                {t.next}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={submit} disabled={!isStepValid() || submitting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 disabled:opacity-50"
                data-testid="onboarding-submit"
              >
                {submitting ? t.submitting : t.submit}
                {!submitting && <Check className="w-4 h-4 ml-1" />}
              </Button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .vf-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: white;
          border: 1.5px solid rgb(203, 213, 225);
          border-radius: 0.75rem;
          color: rgb(15, 23, 42);
          font-size: 0.95rem;
          transition: all 0.2s ease;
          outline: none;
        }
        .vf-input:hover { border-color: rgb(148, 163, 184); }
        .vf-input:focus { border-color: rgb(37, 99, 235); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .vf-input::placeholder { color: rgb(148, 163, 184); }
      `}</style>
    </div>,
    document.body
  );
};

// Sub-components for cleaner JSX
const Step = ({ header, children, ...rest }) => (
  <div {...rest}>
    <p className="text-blue-600 font-semibold uppercase tracking-[0.2em] text-[10px] mb-2">{header.eyebrow}</p>
    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">{header.title}</h3>
    <p className="text-sm text-slate-600 mb-6">{header.sub}</p>
    {children}
  </div>
);

const Field = ({ label, className = '', children }) => (
  <div className={className}>
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-[0.15em] mb-2">{label}</label>
    {children}
  </div>
);

const Row = ({ label, value, highlight = false }) => (
  <div className="flex items-start justify-between gap-4 px-4 py-3">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] shrink-0">{label}</span>
    <span className={`text-sm text-right break-words ${highlight ? 'text-blue-700 font-bold' : 'text-slate-900 font-medium'}`}>
      {value || '—'}
    </span>
  </div>
);

export default OnboardingWizard;
