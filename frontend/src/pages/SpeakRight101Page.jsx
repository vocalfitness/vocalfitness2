import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StickyCTA from '../components/StickyCTA';
import OnboardingWizard from '../components/OnboardingWizard';
import CorporateQuoteForm from '../components/CorporateQuoteForm';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import {
  GraduationCap, Award, Mic2, AudioWaveform, Activity,
  Users, User, Building2, Layers, Check, X, ArrowRight,
  Calendar, ChevronDown, HelpCircle, Sparkles, Globe,
  Video, FileText, Clock
} from 'lucide-react';

// =========================================
// Bilingual COPY (IT default · EN alternate)
// =========================================
const COPY = {
  en: {
    hero: {
      eyebrow: 'Speak Right 101 · Vocal Fitness Method',
      title: 'A scientific protocol for spoken English.',
      sub: 'Structured pronunciation course covering all CEFR levels from A2 to C2 — 12 sessions of 60 minutes based on articulatory phonetics, prosody training and biomechanical conditioning of the speech organs.',
      ctaPrimary: 'Book a free assessment',
      ctaSecondary: 'Request a corporate proposal',
      badge: 'Founded by Prof. Steve Dapper'
    },
    facts: {
      eyebrow: 'Programme at a Glance',
      title: 'What makes Speak Right 101 different.',
      items: [
        { icon: Clock,         title: '12 lessons × 60 min', body: 'Structured protocol — twelve sessions of one hour each, scheduled at your operational pace.' },
        { icon: GraduationCap, title: 'CEFR A2 → C2',         body: 'Covers every CEFR level. Diagnostic assessment defines your starting baseline and target outcome.' },
        { icon: Award,         title: 'Final certificate',    body: 'Vocal Fitness — Speak Right 101 certificate signed by Prof. Steve Dapper at completion.' },
        { icon: Video,         title: 'HD proprietary platform', body: 'Live sessions in HD on our proprietary platform; recordings available for 12 months.' },
        { icon: Sparkles,      title: 'Free initial trial',    body: 'CEFR diagnostic assessment + sample session included before any commitment.' },
        { icon: Globe,         title: 'Delivered in EN & IT',  body: 'Bilingual delivery: instruction in English with Italian scaffolding when needed.' }
      ]
    },
    modes: {
      eyebrow: 'Delivery Formats',
      title: 'Four formats. One method.',
      sub: 'Choose the configuration that fits your operational reality — individual, small team or extended classroom, online or blended.',
      items: [
        { icon: User,      title: 'Online 1:1',           body: 'Individual live sessions in HD on the Vocal Fitness proprietary platform. Maximum personalisation of articulation work.' },
        { icon: Users,     title: 'One-to-Some',          body: 'Small live groups (peer-calibrated). Ideal for executive teams sharing similar phonetic challenges.' },
        { icon: Building2, title: 'One-to-Many',          body: 'Extended classroom format. Designed for academies, university programmes and large corporate populations.' },
        { icon: Layers,    title: 'Blended (Online + On-site)', body: 'Hybrid programme: online HD sessions plus in-person sessions at the client\'s location.' }
      ]
    },
    teaches: {
      eyebrow: 'Method Content',
      title: 'What you will work on.',
      items: [
        'English Pronunciation',
        'Articulatory Phonetics',
        'Prosody',
        'Intelligibility',
        'Spoken English Performance',
        'Biomechanical Voice Conditioning',
        'Executive Communication in English'
      ]
    },
    comparison: {
      eyebrow: 'Method Positioning',
      title: 'Speak Right 101 vs. a traditional English course.',
      sub: 'A focused, scientific layer on spoken English — designed to complement, not replace, the English course you already follow.',
      colA: 'Speak Right 101',
      colB: 'Traditional English course',
      rows: [
        { criterion: 'Primary focus',          a: 'Oral production: pronunciation, articulation, prosody', b: 'Grammar, reading, vocabulary' },
        { criterion: 'Scientific foundation',  a: 'Articulatory phonetics + biomechanical conditioning',  b: 'Communicative / general-purpose methods' },
        { criterion: 'Diagnostic assessment',  a: 'Free CEFR-based individual diagnostic + sample session', b: 'Generic placement test (often paid)' },
        { criterion: 'Delivery formats',       a: '4 formats (1:1, One-to-Some, One-to-Many, Blended)',   b: 'One fixed classroom format' },
        { criterion: 'Platform & replays',     a: 'Proprietary HD platform · 12-month replays',           b: 'Live-only or limited LMS access' },
        { criterion: 'Output certificate',     a: 'Measurable spoken-English performance certificate',    b: 'Generic CEFR level certificate' },
        { criterion: 'Integration',            a: 'Additive layer — works alongside existing programmes', b: 'Replacement programme' },
        { criterion: 'Programme length',       a: '12 focused sessions × 60 min',                          b: '30–100+ hours per CEFR level' }
      ],
      cta: 'Speak Right 101 is a method, not a school. It integrates with what you already do.'
    },
    instructor: {
      eyebrow: 'Instructor',
      title: 'Prof. Steve Dapper',
      body: 'University Professor of English Articulatory Phonetics at Università eCampus and scientific collaborator at the LFSAG Phonetics Laboratory of the University of Turin. Certified coach in biomechanics and body conditioning (University of Tampa, Florida, USA). Founder of the proprietary Vocal Fitness method for spoken English.',
      cta: 'Read full bio'
    },
    demo: {
      eyebrow: 'Try the method',
      title: 'Inside the Phonetic Lab.',
      sub: 'A live preview of how the method is delivered: an interactive phoneme card with anatomy hotspots, prosody indicators and Prof. Dapper\'s audio samples. Currently featuring the /ʊ/ phoneme (FOOT · BOOK · PUT).',
      cta: 'Open the /ʊ/ interactive card',
      hint: 'Public preview · no registration required'
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Frequently asked questions',
      items: [
        { q: 'How long does the programme last?', a: 'Twelve sessions of 60 minutes. Calendar pace is agreed with the client — typical durations range from 6 to 12 weeks.' },
        { q: 'What is the prerequisite level?',    a: 'Minimum CEFR A2 (Elementary). The diagnostic assessment confirms baseline and defines outcome target.' },
        { q: 'Is the platform accessible later?',  a: 'Yes — all HD live sessions are recorded on our proprietary platform and remain available for 12 months.' },
        { q: 'Is there a final certificate?',      a: 'Yes — the "Vocal Fitness — Speak Right 101" certificate is issued at completion.' },
        { q: 'Can I try before committing?',       a: 'Yes — a CEFR diagnostic assessment and a sample session are included free of charge.' }
      ]
    },
    finalCta: {
      eyebrow: 'Begin',
      title: 'Start with a free diagnostic assessment.',
      sub: 'Define your baseline, target and delivery format with no commitment.',
      btnPrimary: 'Book the free assessment',
      btnSecondary: 'Corporate enquiry'
    }
  },

  it: {
    hero: {
      eyebrow: 'Speak Right 101 · Metodo Vocal Fitness',
      title: 'Un protocollo scientifico per l\'inglese parlato.',
      sub: 'Corso strutturato di pronuncia inglese su tutti i livelli del CEFR, da A2 a C2 — 12 sessioni da 60 minuti basate su fonetica articolatoria, training prosodico e condizionamento biomeccanico degli organi fonatori.',
      ctaPrimary: 'Prenota valutazione gratuita',
      ctaSecondary: 'Richiedi una proposta corporate',
      badge: 'Fondato dal Prof. Steve Dapper'
    },
    facts: {
      eyebrow: 'Il Programma in Sintesi',
      title: 'Cosa rende diverso Speak Right 101.',
      items: [
        { icon: Clock,         title: '12 lezioni × 60 min', body: 'Protocollo strutturato — dodici sessioni da un\'ora ciascuna, programmate al tuo ritmo operativo.' },
        { icon: GraduationCap, title: 'CEFR A2 → C2',         body: 'Copre tutti i livelli CEFR. La valutazione diagnostica definisce baseline e outcome target.' },
        { icon: Award,         title: 'Certificato finale',    body: 'Certificato Vocal Fitness — Speak Right 101 firmato dal Prof. Steve Dapper al completamento.' },
        { icon: Video,         title: 'Piattaforma HD proprietaria', body: 'Sessioni live in HD su piattaforma proprietaria; registrazioni disponibili per 12 mesi.' },
        { icon: Sparkles,      title: 'Valutazione iniziale gratuita', body: 'Assessment diagnostico CEFR + sample session inclusi prima di qualsiasi impegno.' },
        { icon: Globe,         title: 'Erogazione EN & IT',    body: 'Modalità bilingue: istruzione in inglese con scaffolding in italiano quando necessario.' }
      ]
    },
    modes: {
      eyebrow: 'Formati di Erogazione',
      title: 'Quattro formati. Un solo metodo.',
      sub: 'Scegli la configurazione che si adatta alla tua realtà operativa — individuale, piccolo team o aula estesa, online o blended.',
      items: [
        { icon: User,      title: 'Online 1:1',           body: 'Sessioni live individuali in HD sulla piattaforma proprietaria Vocal Fitness. Massima personalizzazione del lavoro articolatorio.' },
        { icon: Users,     title: 'One-to-Some',          body: 'Piccoli gruppi live (peer-calibrati). Ideale per team executive con sfide fonetiche simili.' },
        { icon: Building2, title: 'One-to-Many',          body: 'Formato aula estesa. Pensato per accademie, programmi universitari e popolazioni corporate ampie.' },
        { icon: Layers,    title: 'Blended (Online + Presenza)', body: 'Programma ibrido: sessioni online HD più sessioni in presenza presso la sede del cliente.' }
      ]
    },
    teaches: {
      eyebrow: 'Contenuti del Metodo',
      title: 'Su cosa lavorerai.',
      items: [
        'Pronuncia Inglese',
        'Fonetica Articolatoria',
        'Prosodia',
        'Intelligibilità',
        'Performance Orale dell\'Inglese',
        'Condizionamento Biomeccanico Vocale',
        'Executive Communication in Inglese'
      ]
    },
    comparison: {
      eyebrow: 'Posizionamento del Metodo',
      title: 'Speak Right 101 vs. un corso d\'inglese tradizionale.',
      sub: 'Un layer scientifico focalizzato sull\'inglese parlato — pensato per integrare, non sostituire, il corso d\'inglese che già segui.',
      colA: 'Speak Right 101',
      colB: 'Corso d\'inglese tradizionale',
      rows: [
        { criterion: 'Focus primario',            a: 'Produzione orale: pronuncia, articolazione, prosodia',  b: 'Grammatica, lettura, vocabolario' },
        { criterion: 'Fondamento scientifico',    a: 'Fonetica articolatoria + condizionamento biomeccanico', b: 'Metodi comunicativi / generalisti' },
        { criterion: 'Valutazione diagnostica',   a: 'Diagnostica CEFR individuale gratuita + sample session', b: 'Test d\'ingresso generico (spesso a pagamento)' },
        { criterion: 'Formati di erogazione',     a: '4 formati (1:1, One-to-Some, One-to-Many, Blended)',     b: 'Un solo formato aula' },
        { criterion: 'Piattaforma & repliche',    a: 'Piattaforma HD proprietaria · replay 12 mesi',           b: 'Live only o accesso LMS limitato' },
        { criterion: 'Certificato finale',        a: 'Certificato di performance orale misurabile',            b: 'Certificato di livello CEFR generico' },
        { criterion: 'Integrazione',              a: 'Layer additivo — convive con i programmi esistenti',     b: 'Programma sostitutivo' },
        { criterion: 'Durata del programma',      a: '12 sessioni focalizzate × 60 min',                        b: '30–100+ ore per livello CEFR' }
      ],
      cta: 'Speak Right 101 è un metodo, non una scuola. Si integra con quello che già fai.'
    },
    instructor: {
      eyebrow: 'Docente',
      title: 'Prof. Steve Dapper',
      body: 'Professore Universitario di Fonetica Articolatoria Inglese all\'Università eCampus e collaboratore scientifico presso il Laboratorio di Fonetica LFSAG dell\'Università di Torino. Certified coach in biomeccanica e condizionamento corporeo (Università di Tampa, Florida, USA). Fondatore del metodo proprietario Vocal Fitness per l\'inglese parlato.',
      cta: 'Leggi la bio completa'
    },
    demo: {
      eyebrow: 'Prova il metodo',
      title: 'Dentro il Phonetic Lab.',
      sub: 'Un\'anteprima dal vivo di come viene erogato il metodo: una scheda fonema interattiva con hotspot anatomici, indicatori prosodici e gli audio sample del Prof. Dapper. Attualmente disponibile il fonema /ʊ/ (FOOT · BOOK · PUT).',
      cta: 'Apri la scheda interattiva /ʊ/',
      hint: 'Anteprima pubblica · nessuna registrazione richiesta'
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Domande Ricorrenti',
      items: [
        { q: 'Quanto dura il programma?',          a: 'Dodici sessioni da 60 minuti. Il calendario è concordato con il cliente — durate tipiche da 6 a 12 settimane.' },
        { q: 'Qual è il livello prerequisito?',    a: 'CEFR A2 (Elementary) minimo. L\'assessment diagnostico conferma la baseline e definisce l\'outcome target.' },
        { q: 'La piattaforma è accessibile dopo?', a: 'Sì — tutte le sessioni live HD sono registrate sulla piattaforma proprietaria e disponibili per 12 mesi.' },
        { q: 'È previsto un certificato finale?',  a: 'Sì — il certificato "Vocal Fitness — Speak Right 101" è rilasciato al completamento.' },
        { q: 'Si può provare prima di acquistare?', a: 'Sì — assessment diagnostico CEFR e sample session inclusi gratuitamente.' }
      ]
    },
    finalCta: {
      eyebrow: 'Inizia',
      title: 'Parti con una valutazione diagnostica gratuita.',
      sub: 'Definisci baseline, target e formato di erogazione senza alcun impegno.',
      btnPrimary: 'Prenota la valutazione gratuita',
      btnSecondary: 'Richiesta corporate'
    }
  }
};

// =========================================
// Component
// =========================================
const SpeakRight101Page = () => {
  const { language } = useLanguage();
  const t = COPY[language] || COPY.it;
  const isItalian = language === 'it';

  const [wizardOpen, setWizardOpen] = useState(false);
  const [corporateOpen, setCorporateOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  // Dynamic SEO meta + canonical (no react-helmet dependency)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = isItalian
      ? 'Speak Right 101 · Corso di Pronuncia Inglese CEFR A2→C2 | Vocal Fitness'
      : 'Speak Right 101 · English Pronunciation Course CEFR A2→C2 | Vocal Fitness';

    const setMeta = (selector, attr, value, createTag) => {
      let el = document.head.querySelector(selector);
      if (!el && createTag) {
        el = document.createElement(createTag.tag);
        Object.entries(createTag.attrs).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
      }
      if (el) el.setAttribute(attr, value);
      return el;
    };

    const desc = isItalian
      ? 'Speak Right 101 — Corso strutturato di pronuncia inglese su tutti i livelli del CEFR (A2 → C2). 12 lezioni da 60 minuti basate sul metodo Vocal Fitness. Valutazione iniziale gratuita, certificato finale, piattaforma HD proprietaria.'
      : 'Speak Right 101 — Structured English pronunciation course covering all CEFR levels (A2 → C2). 12 lessons of 60 minutes based on the Vocal Fitness method. Free initial assessment, final certificate, proprietary HD platform.';

    setMeta('meta[name="description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', 'https://www.vocalfitness.org/speak-right-101');
    setMeta('meta[property="og:url"]', 'content', 'https://www.vocalfitness.org/speak-right-101');
    setMeta('meta[property="og:title"]', 'content', isItalian
      ? 'Speak Right 101 — Corso di Pronuncia Inglese CEFR A2→C2'
      : 'Speak Right 101 — English Pronunciation Course CEFR A2→C2');
    setMeta('meta[property="og:description"]', 'content', desc);

    return () => { document.title = prevTitle; };
  }, [isItalian]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden text-slate-900">
      <Navbar />

      {/* HERO */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white" data-testid="sr101-hero">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }} />
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] font-semibold">{t.hero.eyebrow}</p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
            {t.hero.title}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10">
            {t.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button onClick={() => setWizardOpen(true)} size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-blue-500/20"
              data-testid="sr101-cta-primary">
              <Calendar className="w-4 h-4 mr-2" />
              {t.hero.ctaPrimary}
            </Button>
            <Button onClick={() => setCorporateOpen(true)} size="lg" variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-base font-semibold rounded-xl"
              data-testid="sr101-cta-secondary">
              <Building2 className="w-4 h-4 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
          <p className="text-sm text-slate-500">{t.hero.badge}</p>
        </div>
      </section>

      {/* FACTS / PROGRAMME AT A GLANCE */}
      <section className="py-20 lg:py-28 bg-white" data-testid="sr101-facts">
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.facts.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">{t.facts.title}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.facts.items.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="group bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500" data-testid={`sr101-fact-${i}`}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-md shadow-blue-500/20">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DELIVERY MODES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-blue-50/40 to-white" data-testid="sr101-modes">
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.modes.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-5">{t.modes.title}</h2>
            <p className="text-slate-600 text-lg leading-relaxed">{t.modes.sub}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {t.modes.items.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="group bg-white border border-slate-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500" data-testid={`sr101-mode-${i}`}>
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                      <Icon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{m.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{m.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEACHES */}
      <section className="py-20 lg:py-28 bg-white" data-testid="sr101-teaches">
        <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.teaches.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">{t.teaches.title}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {t.teaches.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-xl px-5 py-4" data-testid={`sr101-teach-${i}`}>
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-800 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden" data-testid="sr101-comparison">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }} />
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.comparison.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-5">
              {t.comparison.title}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">{t.comparison.sub}</p>
          </div>

          {/* Desktop / tablet: real table */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-200 shadow-xl shadow-blue-500/5 bg-white">
            <table className="w-full" data-testid="sr101-comparison-table">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/60 border-b border-slate-200">
                  <th className="text-left px-6 py-5 text-slate-700 font-bold text-sm uppercase tracking-wider w-1/3">&nbsp;</th>
                  <th className="text-left px-6 py-5 text-blue-700 font-black text-base">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      {t.comparison.colA}
                    </div>
                  </th>
                  <th className="text-left px-6 py-5 text-slate-500 font-semibold text-base">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                        <X className="w-4 h-4 text-slate-500" />
                      </div>
                      {t.comparison.colB}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.comparison.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/30 transition-colors`} data-testid={`sr101-comparison-row-${i}`}>
                    <td className="px-6 py-5 text-slate-600 font-semibold text-sm">{row.criterion}</td>
                    <td className="px-6 py-5 text-slate-900 font-medium">
                      <div className="flex items-start gap-2.5">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{row.a}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500">
                      <div className="flex items-start gap-2.5">
                        <X className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{row.b}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-5">
            {t.comparison.rows.map((row, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" data-testid={`sr101-comparison-mobile-${i}`}>
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{row.criterion}</p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-blue-700 font-bold mb-1">{t.comparison.colA}</p>
                      <p className="text-slate-900 text-sm">{row.a}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-70">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">{t.comparison.colB}</p>
                      <p className="text-slate-600 text-sm">{row.b}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-600 italic mt-10 max-w-2xl mx-auto leading-relaxed" data-testid="sr101-comparison-cta">
            {t.comparison.cta}
          </p>
        </div>
      </section>

      {/* DEMO — Phonetic Lab teaser */}
      <section className="py-20 lg:py-28 bg-slate-950 relative overflow-hidden" data-testid="sr101-demo">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px)',
          backgroundSize: '100% 4px'
        }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 lg:px-8 max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-cyan-300 text-[10px] uppercase tracking-[0.25em] font-bold">{t.demo.eyebrow}</p>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-5">
                {t.demo.title}
              </h2>
              <p className="text-cyan-100/80 text-lg leading-relaxed mb-7">{t.demo.sub}</p>
              <a
                href="/lms/phoneme/u-foot"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold shadow-lg shadow-cyan-500/30 hover:shadow-orange-500/40 transition-all duration-500 hover:scale-105 group"
                data-testid="sr101-demo-cta"
              >
                <span className="text-2xl">/ʊ/</span>
                <span>{t.demo.cta}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-cyan-400/60 text-xs mt-4 italic">{t.demo.hint}</p>
            </div>
            <div className="relative">
              <a
                href="/lms/phoneme/u-foot"
                className="block relative rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/30 transition-shadow duration-500 group"
                data-testid="sr101-demo-preview-image"
              >
                <img
                  src="https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/vznyakkp__%CA%8A_%20Foot%2016_9%20AmE.png"
                  alt="Vocal Fitness Phonetic Lab — /ʊ/ FOOT preview"
                  className="w-full h-auto group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 bg-cyan-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 group-hover:bg-orange-500 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Live preview
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* INSTRUCTOR */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-blue-50/30 to-white" data-testid="sr101-instructor">        <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-10 items-center">
            <div className="lg:col-span-1">
              <div className="rounded-3xl overflow-hidden shadow-xl border-2 border-white">
                <img
                  src="https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/2g3bdky8_steve_dapper_science_vibe.png"
                  alt="Professor Steve Dapper"
                  className="w-full h-auto object-cover"
                  data-testid="sr101-instructor-image"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.instructor.eyebrow}</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-6">{t.instructor.title}</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{t.instructor.body}</p>
              <a href="/#professor" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors" data-testid="sr101-instructor-link">
                {t.instructor.cta} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-white" data-testid="sr101-faq" id="faq">
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-blue-600 text-xs uppercase tracking-[0.25em] font-semibold">{t.faq.eyebrow}</p>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">{t.faq.title}</h2>
          </div>
          <div className="space-y-4">
            {t.faq.items.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-300 ${isOpen ? 'border-blue-400 shadow-lg shadow-blue-500/10' : ''}`}
                  data-testid={`sr101-faq-item-${i}`}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    aria-expanded={isOpen} aria-controls={`sr101-faq-answer-${i}`}
                    className="w-full flex items-center justify-between gap-6 px-7 py-6 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-2xl"
                    data-testid={`sr101-faq-toggle-${i}`}>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug pr-2">{item.q}</h3>
                    <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-blue-50 text-blue-600'}`}>
                      <ChevronDown className="w-5 h-5" />
                    </span>
                  </button>
                  <div id={`sr101-faq-answer-${i}`}
                    className={`grid transition-all duration-500 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-7 pb-6 text-slate-600 leading-relaxed text-base md:text-lg">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-blue-600 to-blue-700 relative overflow-hidden" data-testid="sr101-final-cta">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl relative z-10 text-center">
          <p className="text-blue-100 text-xs uppercase tracking-[0.25em] mb-5 font-semibold">{t.finalCta.eyebrow}</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-5">{t.finalCta.title}</h2>
          <p className="text-blue-50 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">{t.finalCta.sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setWizardOpen(true)} size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-6 text-base font-semibold rounded-xl shadow-xl"
              data-testid="sr101-final-cta-primary">
              <Calendar className="w-4 h-4 mr-2" />
              {t.finalCta.btnPrimary}
            </Button>
            <Button onClick={() => setCorporateOpen(true)} size="lg" variant="outline"
              className="border-white/40 text-white hover:bg-white/10 px-8 py-6 text-base font-semibold rounded-xl"
              data-testid="sr101-final-cta-secondary">
              <Building2 className="w-4 h-4 mr-2" />
              {t.finalCta.btnSecondary}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <StickyCTA />

      <OnboardingWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
      <CorporateQuoteForm isOpen={corporateOpen} onClose={() => setCorporateOpen(false)} />
    </div>
  );
};

export default SpeakRight101Page;
