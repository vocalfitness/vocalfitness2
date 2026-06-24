import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import {
  ArrowRight, Calendar, Check, Mail, Download, Mic2, Crown, Users, Layers,
  GraduationCap, Star, Award, Play, MessageCircle, Building2, Globe,
  BarChart3, Clock, FileCheck, Sparkles, ShieldCheck, ChevronRight
} from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';

/* =========================================================================
 *  ErnstYoungLandingPage
 *  ------------------------------------------------------------------------
 *  Dedicated executive landing page that mirrors the commercial proposal
 *  sent to Ernst & Young (EY) Italia · attn. Layla Cannizzaro — 24/06/2026.
 *  Visual language is aligned with the existing Medtronic proposal page
 *  and the public SpeakRight 101 / HomePage of vocalfitness.org:
 *   – slate / blue / indigo brand gradient
 *   – generous typography, hairline eyebrows, scroll-triggered reveals
 *   – three-tier pricing architecture is the centrepiece of the page
 *  No EY trademarks or visual marks are used — text references only.
 * ======================================================================= */

// ---------- Scroll-triggered reveal hook (single observer per ref) -------
const useReveal = () => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setShow(true);
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    ob.observe(node);
    return () => ob.disconnect();
  }, []);
  return [ref, show];
};

// ---------- Assets reused from existing brand pages ----------------------
const VIDEOS = {
  hero:     'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/qo5q7c4c_ad501a89-967e-48e3-99fd-4f1d12412ba5.mp4',
  method:   'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/mo03g0sv_849bf25e-793e-43a4-b188-09197516b84b.mp4',
};
const IMAGES = {
  dapper:   'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/lil21e7s__mg_2586.PNG',
};
const PROPOSAL_PDF = 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/aytlq3w2_proposta_commerciale_E%26Y_Layla_Cannizzaro.pdf';

// ---------- Three-tier pricing architecture (verbatim from PDF) ----------
const TIERS = [
  {
    id: 'executive-elite',
    eyebrow: 'Level 1',
    name: 'Executive Elite',
    tagline: 'In-Person One-to-One Coaching',
    target: 'Partner · C-Suite · Executive Director esposti a board e pitch internazionali',
    headline: 'Presenza fisica del Professor Steve Dapper presso la vostra sede aziendale per sessioni di condizionamento biomeccanico in tempo reale.',
    color: 'from-amber-400 via-amber-500 to-orange-500',
    softBg: 'from-amber-50 to-orange-50',
    border: 'border-amber-300',
    ring: 'ring-amber-200',
    icon: Crown,
    accent: 'text-amber-600',
    plans: [
      { label: 'Modulo Base',     sessions: '12 sessioni individuali in presenza · 60 min', price: '1.920', note: '+ Accesso Full alla Piattaforma' },
      { label: 'Modulo Advanced', sessions: '14 sessioni individuali in presenza · 60 min', price: '2.240', note: '+ Accesso Full alla Piattaforma' },
    ],
    footnote: 'Video-lezioni di supporto e materiali di laboratorio guidati inclusi e fruibili in modalità asincrona all\u2019interno del portale.',
  },
  {
    id: 'blended-performance',
    eyebrow: 'Level 2',
    name: 'Blended Performance',
    tagline: 'Live Video & Hybrid Corporate Training',
    target: 'Senior Manager · Manager · Team di Consulenza',
    headline: 'Modello dinamico che unisce digital conditioning e interazione diretta con il docente, ottimizzando il budget aziendale per gruppi omogenei.',
    color: 'from-blue-500 via-blue-600 to-indigo-600',
    softBg: 'from-blue-50 to-indigo-50',
    border: 'border-blue-300',
    ring: 'ring-blue-200',
    icon: Users,
    accent: 'text-blue-600',
    plans: [
      { label: 'Pacchetto "Core Team"', sessions: 'Fino a 5 partecipanti · 12 sessioni live · 60 min', price: '3.800', note: 'Accesso piattaforma e-learning illimitato · 12 mesi', premium: 'Kick-off in presenza presso la vostra sede su richiesta' },
      { label: 'Pacchetto "Division"',  sessions: 'Fino a 15 partecipanti · classe virtuale · 12 sessioni live', price: '6.500', note: 'Accesso piattaforma e-learning illimitato · 12 mesi' },
    ],
    footnote: 'Video-collegamento diretto ed esclusivo con il docente per il monitoraggio e la correzione della dizione in tempo reale.',
  },
  {
    id: 'digital-scaling',
    eyebrow: 'Level 3',
    name: 'Digital Enterprise Scaling',
    tagline: 'Accesso Esclusivo alla Piattaforma E-Learning',
    target: 'Staff · Consultant · Piano di diffusione su larga scala (Self-Study)',
    headline: 'Accesso completo e indipendente per 12 mesi alla piattaforma proprietaria per lo studio autonomo e asincrono del metodo SpeakRight\u00A0101.',
    color: 'from-violet-500 via-indigo-500 to-blue-500',
    softBg: 'from-indigo-50 to-violet-50',
    border: 'border-indigo-300',
    ring: 'ring-indigo-200',
    icon: Layers,
    accent: 'text-indigo-600',
    plans: [
      { label: 'Tier Small',  sessions: 'Fino a 50 licenze attive',          price: '190', priceSuffix: '/ anno per dipendente', note: 'IVA esclusa' },
      { label: 'Tier Medium', sessions: 'Da 51 a 200 licenze attive',         price: '140', priceSuffix: '/ anno per dipendente', note: 'IVA esclusa' },
      { label: 'Tier Large',  sessions: 'Oltre 200 licenze',                  price: '— accordo quadro',  note: 'Scontistica dedicata su volume', custom: true },
    ],
    footnote: 'Tre tier strutturati sui volumi di EY Italia. Quotazione flat per il Tier Large definita in sede di accordo quadro.',
  },
];

const TARGET_PILLS = ['Partner', 'C-Suite', 'Executive Director', 'Senior Manager', 'Consultant', 'Staff'];

// =========================================================================
const ErnstYoungLandingPage = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse  = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  const [heroRef, heroIn]       = useReveal();
  const [premRef, premIn]       = useReveal();
  const [tiersRef, tiersIn]     = useReveal();
  const [dapperRef, dapperIn]   = useReveal();
  const [methodRef, methodIn]   = useReveal();
  const [notesRef, notesIn]     = useReveal();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" data-testid="ey-landing-page">
      {/* ---------- Page-scoped CSS (animations only) ----------------- */}
      <style>{`
        @keyframes ey-slide-up   { from { opacity:0; transform: translateY(40px); } to { opacity:1; transform:none; } }
        @keyframes ey-slide-l    { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform:none; } }
        @keyframes ey-slide-r    { from { opacity:0; transform: translateX(-40px); } to { opacity:1; transform:none; } }
        @keyframes ey-scale-in   { from { opacity:0; transform: scale(.92); } to { opacity:1; transform: scale(1); } }
        @keyframes ey-float      { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-14px);} }
        @keyframes ey-grad-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes ey-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(59,130,246,.35);} 70% { box-shadow: 0 0 0 18px rgba(59,130,246,0);} 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0);} }
        .ey-reveal-up { animation: ey-slide-up .7s ease-out both; }
        .ey-reveal-l  { animation: ey-slide-l  .7s ease-out both; }
        .ey-reveal-r  { animation: ey-slide-r  .7s ease-out both; }
        .ey-reveal-sc { animation: ey-scale-in .55s ease-out both; }
        .ey-float     { animation: ey-float 6s ease-in-out infinite; }
        .ey-grad      { background-size: 200% 200%; animation: ey-grad-shift 12s ease infinite; }
        .ey-pulse     { animation: ey-pulse-ring 2.4s ease-out infinite; }
        .ey-delay-1 { animation-delay: .12s; } .ey-delay-2 { animation-delay: .24s; }
        .ey-delay-3 { animation-delay: .36s; } .ey-delay-4 { animation-delay: .48s; }
        .ey-delay-5 { animation-delay: .60s; }
        .ey-lift { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
        .ey-lift:hover { transform: translateY(-6px); box-shadow: 0 24px 48px -16px rgba(15,23,42,.18); }
      `}</style>

      {/* ---------- Drifting background blobs ------------------------- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[28rem] h-[28rem] bg-blue-500/5 rounded-full blur-3xl"
          style={{ top: '8%', left: '4%', transform: `translate(${mouse.x * 0.018}px, ${mouse.y * 0.018}px)` }}
        />
        <div
          className="absolute w-[22rem] h-[22rem] bg-indigo-500/5 rounded-full blur-3xl"
          style={{ top: '58%', right: '6%', transform: `translate(${-mouse.x * 0.014}px, ${-mouse.y * 0.014}px)` }}
        />
      </div>

      {/* ---------- Sticky header ------------------------------------- */}
      <header className={`bg-white/85 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-50 transition-shadow duration-300 ${scrollY > 40 ? 'shadow-md' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group" data-testid="ey-logo">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-slate-900 font-bold text-lg">VocalFitness</span>
              <span className="block text-blue-600 text-xs font-medium tracking-wide">Proposta Esecutiva · EY Italia</span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#offerta"
              className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              data-testid="ey-nav-offerta"
            >
              Architettura dell&rsquo;Offerta
            </a>
            <Button
              onClick={() => setQuoteOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.03]"
              data-testid="ey-header-cta"
            >
              Prenota chiamata
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- 1. HERO ------------------------------------------ */}
      <section ref={heroRef} className="relative min-h-[88vh] flex items-center py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-white ey-grad" />
        <div className="absolute top-24 right-16 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
             style={{ transform: `translateY(${scrollY * 0.09}px)` }} />
        <div className="absolute bottom-16 left-8  w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl"
             style={{ transform: `translateY(${scrollY * -0.12}px)` }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className={heroIn ? 'ey-reveal-r' : 'opacity-0'}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.18em] text-xs flex items-center gap-3">
              <span className="w-8 h-[2px] bg-blue-600"></span>
              Proposta Commerciale Esecutiva · 24 Giugno 2026
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-[1.05]">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
                Protocolli Specialistici di Pronuncia e Executive&nbsp;Presence
              </span>
              <br />
              <span className="text-blue-600">per Ernst &amp; Young Italia</span>
            </h1>

            <div className={`bg-white/85 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 mb-8 shadow-xl ${heroIn ? 'ey-reveal-up ey-delay-1' : 'opacity-0'}`}>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Alla cortese attenzione di</p>
              <p className="text-2xl font-bold text-slate-800 mb-1">Layla Cannizzaro</p>
              <p className="text-slate-600">Team Risorse Umane &amp; Formazione · EY Italia</p>
            </div>

            <div className={`flex flex-wrap gap-3 ${heroIn ? 'ey-reveal-up ey-delay-2' : 'opacity-0'}`}>
              <Button
                onClick={() => setQuoteOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-7 py-6 text-base shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.03] group"
                data-testid="ey-hero-cta-call"
              >
                Programma una chiamata con il Prof. Dapper
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-slate-300 text-slate-800 hover:bg-slate-50 px-7 py-6 text-base hover:border-blue-500 transition-all duration-300"
                onClick={() => window.open(PROPOSAL_PDF, '_blank')}
                data-testid="ey-hero-cta-pdf"
              >
                <Download className="w-5 h-5 mr-2" /> Scarica proposta PDF
              </Button>
            </div>
          </div>

          <div className={`relative hidden lg:block ${heroIn ? 'ey-reveal-l ey-delay-1' : 'opacity-0'}`}>
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/60 ey-pulse">
              <video src={VIDEOS.hero} autoPlay loop muted playsInline className="w-full h-[460px] object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl ey-float">
              <Play className="w-4 h-4 inline mr-2" />
              Sessione Live · Vocal Fitness
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100">
              <p className="text-3xl font-black text-blue-600">3</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Tier Strutturati</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2. TARGET BANNER --------------------------------- */}
      <section className="relative py-14 bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: `radial-gradient(circle at ${mouse.x}px ${mouse.y}px, rgba(255,255,255,0.18) 0%, transparent 50%)` }}
        />
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <p className="text-blue-200 text-xs uppercase tracking-[0.22em] mb-4">Per ogni livello dell&rsquo;organizzazione EY</p>
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {TARGET_PILLS.map((t, i) => (
              <span
                key={i}
                className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm md:text-base font-semibold hover:bg-white/20 transition-colors cursor-default"
                data-testid={`ey-target-${i}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 3. PREMESSA METODOLOGICA ------------------------- */}
      <section ref={premRef} className="py-24 bg-white relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`text-center mb-12 ${premIn ? 'ey-reveal-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-[0.18em] text-xs">Premessa Metodologica</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Il layer specialistico definitivo<br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">su dizione e Executive Presence</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Il syllabus di VocalFitness integra nativamente il framework <strong className="text-slate-900">CEFR</strong>: i nostri moduli sono perfettamente integrabili e complementari con qualsiasi fornitore di formazione linguistica generale già attivo in EY (corsi tradizionali di stampo scolastico o generalista).
              <br/><br/>
              Ci poniamo come il <em>layer</em> specialistico definitivo sulla <strong className="text-slate-900">dizione</strong>, l&rsquo;<strong className="text-slate-900">efficacia fonetica</strong> e lo sviluppo dell&rsquo;<strong className="text-slate-900">Executive Presence</strong> del top management.
            </p>
          </div>

          <div className={`grid md:grid-cols-3 gap-5 ${premIn ? 'ey-reveal-up ey-delay-2' : 'opacity-0'}`}>
            {[
              { icon: ShieldCheck, title: 'CEFR-Native', body: 'Allineamento nativo al Common European Framework — A2 → C2.' },
              { icon: Sparkles,    title: 'Specialistico', body: 'Dizione, fonetica articolatoria, prosodia, Executive Presence.' },
              { icon: Layers,      title: 'Complementare', body: 'Si integra con qualunque programma linguistico generalista già attivo in EY.' },
            ].map((b, i) => (
              <div key={i} className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-6 ey-lift">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-bold text-slate-900 mb-1">{b.title}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. ARCHITETTURA DELL'OFFERTA (CORE) -------------- */}
      <section id="offerta" ref={tiersRef} className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-14 ${tiersIn ? 'ey-reveal-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-[0.18em] text-xs">Architettura dell&rsquo;Offerta Economica</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">Tre livelli. Una stessa eccellenza fonetica.</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Dalla coaching one-to-one in presenza al deploy enterprise-wide sulla nostra piattaforma proprietaria — costruita per scalare in coerenza con la struttura di EY Italia.
            </p>
          </div>

          <div className="space-y-8" data-testid="ey-tiers">
            {TIERS.map((tier, idx) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.id}
                  className={`relative rounded-3xl border-2 ${tier.border} bg-white shadow-xl ey-lift overflow-hidden ${tiersIn ? `ey-reveal-up ey-delay-${idx+1}` : 'opacity-0'}`}
                  data-testid={`ey-tier-${tier.id}`}
                >
                  {/* Top color band */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${tier.color}`} />

                  <div className="grid lg:grid-cols-12 gap-0">
                    {/* Header column */}
                    <div className={`lg:col-span-4 p-8 lg:p-10 bg-gradient-to-br ${tier.softBg} border-r border-slate-200/60 flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center gap-3 mb-5">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${tier.accent}`}>{tier.eyebrow}</p>
                            <p className="text-xs text-slate-500">{tier.tagline}</p>
                          </div>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-3">{tier.name}</h3>
                        <p className="text-sm text-slate-600 mb-4"><span className="font-semibold text-slate-800">Target:</span> {tier.target}</p>
                        <p className="text-slate-700 leading-relaxed text-sm">{tier.headline}</p>
                      </div>
                    </div>

                    {/* Plans column */}
                    <div className="lg:col-span-8 p-8 lg:p-10">
                      <div className="space-y-4">
                        {tier.plans.map((p, j) => (
                          <div
                            key={j}
                            className={`rounded-2xl border border-slate-200 bg-white px-5 py-5 md:px-6 md:py-6 hover:border-slate-300 transition-colors`}
                            data-testid={`ey-tier-${tier.id}-plan-${j}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs uppercase tracking-wider font-bold ${tier.accent} mb-1`}>{p.label}</p>
                                <p className="font-semibold text-slate-900 leading-snug">{p.sessions}</p>
                                {p.note && <p className="text-sm text-slate-500 mt-1">{p.note}</p>}
                                {p.premium && (
                                  <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                                    <Sparkles className="w-3.5 h-3.5" /> Nota Premium: {p.premium}
                                  </p>
                                )}
                              </div>
                              <div className="md:text-right shrink-0">
                                {p.custom ? (
                                  <p className={`text-2xl md:text-3xl font-black ${tier.accent}`}>{p.price}</p>
                                ) : (
                                  <>
                                    <p className="text-3xl md:text-4xl font-black text-slate-900 leading-none">
                                      <span className="text-base font-semibold align-top mr-0.5 text-slate-500">€</span>
                                      {p.price}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                      {p.priceSuffix ? p.priceSuffix : '+ IVA · complessivi'}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {tier.footnote && (
                        <p className="text-xs text-slate-500 mt-5 leading-relaxed italic">
                          {tier.footnote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 5. METHOD STRIP ---------------------------------- */}
      <section ref={methodRef} className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className={`hidden lg:block ${methodIn ? 'ey-reveal-r' : 'opacity-0'}`}>
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <video src={VIDEOS.method} autoPlay loop muted playsInline className="w-full h-[480px] object-cover" />
            </div>
          </div>
          <div className={methodIn ? 'ey-reveal-l ey-delay-1' : 'opacity-0'}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-[0.18em] text-xs">Il Metodo · SpeakRight 101</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">Condizionamento biomeccanico, non solo lingua.</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              Il metodo VocalFitness combina <strong className="text-slate-900">fonetica articolatoria</strong>, <strong className="text-slate-900">training prosodico</strong> e <strong className="text-slate-900">condizionamento biomeccanico</strong> degli organi fonatori in un unico protocollo strutturato — quello che separa un manager fluente da un manager <em>autorevole</em> sul palco internazionale.
            </p>
            <ul className="space-y-3">
              {[
                'Monitoraggio continuo dei progressi su ogni livello',
                'Rilascio di materiali digitali di laboratorio',
                'Allineamento nativo al framework CEFR (A2 → C2)',
                'Piattaforma e-learning proprietaria con accesso 12 mesi',
              ].map((it, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <p className="text-slate-700">{it}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- 6. PROFESSOR DAPPER ------------------------------ */}
      <section ref={dapperRef} className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className={`text-center mb-14 ${dapperIn ? 'ey-reveal-up' : 'opacity-0'}`}>
            <p className="text-blue-400 text-xs uppercase tracking-[0.22em] mb-3 font-semibold">Autore del Metodo</p>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-3">Professor Steve Dapper</h2>
            <p className="text-slate-400 text-lg">Linguist &amp; Experimental Phonetician · VocalFitness International</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10 items-start">
            <div className={`lg:col-span-1 ${dapperIn ? 'ey-reveal-r ey-delay-1' : 'opacity-0'}`}>
              <div className="relative group">
                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700 group-hover:border-blue-500 transition-all duration-500">
                  <img src={IMAGES.dapper} alt="Professor Steve Dapper" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xl">
                  30+ Anni di Esperienza
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-5">
              {[
                {
                  icon: GraduationCap, title: 'Credenziali Accademiche',
                  body: 'Professore universitario di <strong class="text-white">Fonetica Articolatoria Inglese</strong> all\u2019Università eCampus e collaboratore scientifico presso il <strong class="text-white">Laboratorio di Fonetica LFSAG dell\u2019Università di Torino</strong>. <em>Certified coach</em> in biomeccanica e condizionamento corporeo (Università di Tampa, Florida, USA). Fondatore del metodo proprietario <span class="text-blue-400 font-bold">Vocal Fitness</span>.',
                  delay: 'ey-delay-1'
                },
                {
                  icon: Award, title: 'Pratica Applicata',
                  body: 'Tre decenni di lavoro tra ricerca, didattica e training applicato in ambienti accademici, broadcast, performance e <strong class="text-white">corporate</strong> — con un portfolio di executive, professionisti e personalità pubbliche allenati nella performance orale dell\u2019inglese.',
                  delay: 'ey-delay-2'
                },
                {
                  icon: Star, title: 'Collaborazioni di Settore',
                  body: 'Consulente e autore per etichette discografiche, radio, TV e produzioni audiovisive. Tra le collaborazioni: <strong class="text-white">Eros Ramazzotti</strong>, <strong class="text-white">Mario Biondi</strong>, Radio 105, Radio Norba, Sky TV. Insegnamento alle più note Influencer Houses italiane (House of Talent, ChillHouse, Defhouse).',
                  delay: 'ey-delay-3'
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className={`bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-500 ey-lift ${dapperIn ? `ey-reveal-up ${b.delay}` : 'opacity-0'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg">{b.title}</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: b.body }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 7. NOTE EDITORIALI & VALIDITÀ -------------------- */}
      <section ref={notesRef} className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`text-center mb-12 ${notesIn ? 'ey-reveal-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-[0.18em] text-xs">Note Editoriali e di Consegna</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Trasparenza prima della firma.</h2>
          </div>

          <div className={`grid md:grid-cols-2 gap-6 ${notesIn ? 'ey-reveal-up ey-delay-1' : 'opacity-0'}`}>
            <div className="rounded-3xl border border-slate-200 p-8 bg-gradient-to-b from-slate-50 to-white ey-lift">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Materiali Inclusi</h3>
              <p className="text-slate-600 leading-relaxed">
                Ogni livello di offerta garantisce il <strong className="text-slate-900">monitoraggio continuo dei progressi</strong> e il rilascio dei materiali digitali di laboratorio, accessibili senza limitazioni per l&rsquo;intera durata del programma.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-8 bg-gradient-to-b from-slate-50 to-white ey-lift">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Validità dell&rsquo;Offerta</h3>
              <p className="text-slate-600 leading-relaxed">
                La presente proposta è valida per <strong className="text-slate-900">60 giorni</strong> dalla data di emissione (24 Giugno 2026).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 8. FINAL CTA ------------------------------------- */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <p className="text-blue-300 text-xs uppercase tracking-[0.22em] mb-3 font-semibold">Passo Successivo</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Pronti ad allineare la voce di EY Italia<br className="hidden md:block" /> al suo posizionamento globale?
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            Una chiamata di 30 minuti con il Professor Steve Dapper per discutere il fit, validare la roadmap e definire il pilot più adatto alla struttura EY.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Button
              onClick={() => setQuoteOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-10 py-7 text-lg shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group"
              data-testid="ey-final-cta-call"
            >
              <Calendar className="w-6 h-6 mr-3" />
              Programma chiamata 30 min
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-slate-600 text-white hover:bg-slate-800 hover:border-blue-500 px-10 py-7 text-lg transition-all duration-300"
              onClick={() => window.open(PROPOSAL_PDF, '_blank')}
              data-testid="ey-final-cta-pdf"
            >
              <Download className="w-6 h-6 mr-3" /> Scarica proposta completa
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-10">
            <p className="text-slate-400 mb-6 text-base">VocalFitness International by Steve Dapper</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-400">
              <a href="mailto:steve@vocalfitness.org" className="flex items-center gap-3 hover:text-white transition-colors group" data-testid="ey-contact-email">
                <div className="w-11 h-11 bg-slate-800 group-hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                steve@vocalfitness.org
              </a>
              <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group" data-testid="ey-contact-whatsapp">
                <div className="w-11 h-11 bg-slate-800 group-hover:bg-green-600 rounded-xl flex items-center justify-center transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                +39 351 576 5749
              </a>
              <a href="https://vocalfitness.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group" data-testid="ey-contact-web">
                <div className="w-11 h-11 bg-slate-800 group-hover:bg-indigo-600 rounded-xl flex items-center justify-center transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                vocalfitness.org
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ------------------------------------------- */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold">VocalFitness International</p>
              <p className="text-slate-500 text-xs">Strada del Carasoo, 30 · 6535 Roveredo GR · Svizzera</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-right">
            Proposta riservata · Ernst &amp; Young Italia · 24 Giugno 2026
          </p>
        </div>
      </footer>

      {quoteOpen && (
        <CorporateQuoteForm isOpen={quoteOpen} onClose={() => setQuoteOpen(false)} />
      )}
    </div>
  );
};

export default ErnstYoungLandingPage;
