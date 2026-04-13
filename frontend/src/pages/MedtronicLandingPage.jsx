import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { 
  Building2, Users, Award, TrendingUp, CheckCircle, Target, Globe, 
  Sparkles, ArrowRight, Star, Shield, BookOpen, Mic, Brain, BarChart3,
  Volume2, Music, Waves, HeartPulse, FileCheck, Clock, Euro, Crown,
  ChevronDown, ChevronUp, Zap, GraduationCap, Languages, Play, Phone,
  Mail, MessageSquare, Download, Calendar, Check, X, ArrowUpRight
} from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';

const MedtronicLandingPage = () => {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Course Modules Data
  const courseModules = [
    {
      id: 'segmentals',
      title: 'Segmentali - I Suoni dell\'Inglese',
      subtitle: 'Vocali, Consonanti e Fonetica Articolatoria',
      color: 'blue',
      icon: Mic,
      hours: 20,
      cefr: 'A1-B1',
      description: 'Padronanza completa dei 44 fonemi inglesi attraverso training propriocettivo e condizionamento muscolare.',
      topics: [
        'Vocali pure e dittonghi - Il Tongue Arching Model',
        'Consonanti: plosive, fricative, affricative, nasali',
        'Contrasti di sonorità [+/- VOICE]',
        'Dental frication (/θ/, /ð/) - I suoni "TH"',
        'Rhoticity e allofoni della /r/ americana',
        'Lateral approximant e varianti allofoniche',
        'Unreleased stops e laryngeal agreement'
      ]
    },
    {
      id: 'suprasegmentals',
      title: 'Soprasegmentali - Prosodia e Ritmo',
      subtitle: 'Intonazione, Stress e Fluenza Naturale',
      color: 'emerald',
      icon: Waves,
      hours: 24,
      cefr: 'B1-C1',
      description: 'Acquisizione del ritmo stress-timed e delle curve intonative dell\'inglese per comunicazione efficace.',
      topics: [
        'Stress lessicale e post-lessicale',
        'Nuclear tonicity e sentence stress',
        'Rhythm patterns: stress-timed vs syllable-timed',
        'Intonational Phrases (IP) e chunking',
        'Tonality: pitch range e tonal contours',
        'ToBI notation per analisi prosodica',
        'Focus patterns: broad vs narrow focus',
        'Connected speech: linking, elision, assimilation'
      ]
    },
    {
      id: 'psychoacoustics',
      title: 'Psicoacustica e Percezione Sonora',
      subtitle: 'La Scienza dell\'Ascolto e dell\'Auto-correzione',
      color: 'purple',
      icon: Brain,
      hours: 12,
      cefr: 'B1-C2',
      description: 'Sviluppo della sensibilità uditiva per percepire e correggere autonomamente la propria pronuncia.',
      topics: [
        'Ear training: discriminazione fonemica',
        'Minimal pairs e contrasti fonemici critici',
        'Self-monitoring acustico in tempo reale',
        'Feedback loop propriocettivo-acustico',
        'Analisi spettrografica per auto-valutazione',
        'Critical listening per L1 interference'
      ]
    },
    {
      id: 'physiology',
      title: 'Fisiologia della Parola',
      subtitle: 'Anatomia Vocale e Meccanica Articolatoria',
      color: 'red',
      icon: HeartPulse,
      hours: 10,
      cefr: 'B1-B2',
      description: 'Comprensione profonda dell\'apparato fonatorio per controllo consapevole della produzione vocale.',
      topics: [
        'Il tratto vocale: anatomia funzionale',
        'Laringe e processo fonatorio',
        'Cavità orale, faringea e nasale',
        'Articolatori attivi e passivi',
        'Diaframma e supporto respiratorio',
        'Condizioni aerodinamiche per la fonazione'
      ]
    },
    {
      id: 'sovt',
      title: 'Condizionamento Muscolare SOVT',
      subtitle: 'Esercizi Semi-Occluded Vocal Tract',
      color: 'amber',
      icon: Volume2,
      hours: 16,
      cefr: 'Tutti',
      description: 'Protocolli di riscaldamento e condizionamento vocale per stamina e precisione articolatoria.',
      topics: [
        'Lip trills e tongue trills',
        'Humming e resonant voice exercises',
        'Straw phonation techniques',
        'Vocal sirens per range control',
        'Articulatory agility drills',
        'Cool-down protocols post-speaking intensivo',
        'Vocal stamina building progressivo'
      ]
    },
    {
      id: 'music',
      title: 'Notazione Musicale per la Prosodia',
      subtitle: 'Ritmo, Timing e Melodia del Parlato',
      color: 'pink',
      icon: Music,
      hours: 8,
      cefr: 'B2-C2',
      description: 'Utilizzo di principi musicali per padroneggiare il ritmo e la melodia dell\'inglese parlato.',
      topics: [
        'Durata sillabica e timing patterns',
        'Pitch contours come melodia',
        'Tempo e speech rate control',
        'Pausing strategico per emphasis',
        'Dynamics: volume variation per impatto',
        'Phrasing musicale nel public speaking'
      ]
    }
  ];

  // Assessment Methods
  const assessmentMethods = [
    {
      title: 'Intelligibility Audits',
      badge: 'Metrica Primaria',
      icon: Target,
      description: 'Valutazione sistematica della comprensibilità da parte di interlocutori madrelingua e non-madrelingua in contesti professionali reali.',
      metrics: ['Word Recognition Rate', 'Message Comprehension Score', 'First-Time Understanding Index', 'Cross-Cultural Intelligibility']
    },
    {
      title: 'Analisi Acustica e Spettrografica',
      badge: 'Metrica Scientifica',
      icon: BarChart3,
      description: 'Misurazione oggettiva dei parametri acustici attraverso software di analisi vocale professionale.',
      metrics: ['Formant Analysis (F1, F2, F3)', 'VOT (Voice Onset Time)', 'Pitch Range & Variability', 'Signal-to-Noise Ratio']
    },
    {
      title: 'Perceptual Self/Peer Ratings',
      badge: 'Valutazione 360°',
      icon: Users,
      description: 'Sistema di auto-valutazione e valutazione tra pari per sviluppare consapevolezza metacognitiva.',
      metrics: ['Self-Assessment Rubrics', 'Peer Review Sessions', 'Manager Feedback Integration', 'Pre/Post Comparison']
    },
    {
      title: 'Functional Task Performance',
      badge: 'Performance sul Campo',
      icon: CheckCircle,
      description: 'Valutazione attraverso simulazioni di task comunicativi reali nel contesto lavorativo Medtronic.',
      metrics: ['Presentation Delivery Score', 'Meeting Participation Index', 'Client Call Effectiveness', 'Email/Report Clarity']
    },
    {
      title: 'Proprioceptive & Behavioral Checklists',
      badge: 'Monitoraggio Continuo',
      icon: FileCheck,
      description: 'Tracciamento sistematico della consapevolezza corporea e dei progressi comportamentali.',
      metrics: ['Articulator Awareness Scale', 'Breath Support Index', 'Muscle Tension Monitoring', 'Speaking Confidence Score']
    }
  ];

  // Tools for tracking
  const trackingTools = [
    {
      name: 'VocalFitness Analyzer',
      description: 'Analisi spettrografica in tempo reale con feedback visivo immediato',
      features: ['19 parametri acustici', 'Confronto con modelli nativi', 'Progress tracking'],
      icon: Waves
    },
    {
      name: 'VocalFitness Pitch Coach',
      description: 'Monitoraggio della curva intonativa e del pitch range',
      features: ['Real-time pitch display', 'Target intonation patterns', 'Recording & playback'],
      icon: Music
    },
    {
      name: 'VocalFitness Ear Trainer',
      description: 'Esercizi di discriminazione fonemica personalizzati',
      features: ['Minimal pairs drills', 'Adaptive difficulty', 'Error pattern analysis'],
      icon: Volume2
    },
    {
      name: 'VocalFitness Stamina Tracker',
      description: 'Monitoraggio della resistenza vocale e del condizionamento',
      features: ['Daily workout logs', 'Fatigue indicators', 'Recovery protocols'],
      icon: HeartPulse
    }
  ];

  // Pricing tiers
  const pricingTiers = [
    {
      name: 'Speak Right 101',
      subtitle: 'Foundation Course',
      badge: 'CONSIGLIATO PER TUTTI',
      price: '79',
      period: '/dipendente/mese',
      minCommit: 'Minimo 6 mesi',
      highlight: true,
      description: 'Corso base obbligatorio per costruire solide fondamenta nella pronuncia inglese professionale.',
      features: [
        { text: 'Moduli Segmentali completi (20h)', included: true },
        { text: 'Soprasegmentali Base (12h)', included: true },
        { text: 'Condizionamento SOVT (8h)', included: true },
        { text: 'Fisiologia Essenziale (5h)', included: true },
        { text: 'VocalFitness App Access', included: true },
        { text: 'Assessment trimestrale', included: true },
        { text: 'Certificazione CEFR Aligned', included: true },
        { text: 'Psicoacustica Avanzata', included: false },
        { text: 'Notazione Musicale', included: false },
        { text: 'Executive Coaching 1:1', included: false }
      ],
      ideal: 'Blue Collar, Tier 1, Tier 2',
      savings: '21% rispetto a EF'
    },
    {
      name: 'Speak Right Pro',
      subtitle: 'Advanced Program',
      badge: 'MANAGEMENT',
      price: '119',
      period: '/dipendente/mese',
      minCommit: 'Minimo 6 mesi',
      highlight: false,
      description: 'Programma avanzato per middle management e ruoli con frequente interazione internazionale.',
      features: [
        { text: 'Tutto di Speak Right 101', included: true },
        { text: 'Soprasegmentali Avanzati (+12h)', included: true },
        { text: 'Psicoacustica completa (12h)', included: true },
        { text: 'Business English Module', included: true },
        { text: 'Presentation Skills', included: true },
        { text: 'Meeting & Negotiation English', included: true },
        { text: 'Assessment mensile', included: true },
        { text: 'Notazione Musicale', included: false },
        { text: 'Executive Coaching 1:1', included: false },
        { text: 'C-Suite Modules', included: false }
      ],
      ideal: 'Middle Management, Sales, Customer-facing',
      savings: 'ROI 3x vs corsi standard'
    },
    {
      name: 'Speak Right Executive',
      subtitle: 'C-Suite & VP Program',
      badge: 'LEADERSHIP',
      price: '249',
      period: '/executive/mese',
      minCommit: 'Minimo 12 mesi',
      highlight: false,
      description: 'Programma esclusivo per Board members, VP e senior executives con coaching personalizzato.',
      features: [
        { text: 'Tutto di Speak Right Pro', included: true },
        { text: 'Notazione Musicale (8h)', included: true },
        { text: 'Executive Coaching 1:1 (4h/mese)', included: true },
        { text: 'Public Speaking Mastery', included: true },
        { text: 'Media Training Accent', included: true },
        { text: 'Board Presentation Excellence', included: true },
        { text: 'Global Leadership Communication', included: true },
        { text: 'Concierge Support 24/7', included: true },
        { text: 'Private Assessment Sessions', included: true },
        { text: 'Harvard Case Study Integration', included: true }
      ],
      ideal: 'Board, VP, C-Suite, Senior Directors',
      savings: 'Investment in leadership impact'
    }
  ];

  // Implementation table
  const implementationTable = [
    { phase: 'Discovery & Assessment', duration: 'Settimana 1-2', activities: 'Audit iniziale, placement test CEFR, analisi bisogni per reparto', deliverable: 'Report Assessment + Piano Formativo' },
    { phase: 'Onboarding', duration: 'Settimana 3', activities: 'Setup piattaforma, assegnazione gruppi, kick-off session', deliverable: 'Accessi attivati + Welcome Kit' },
    { phase: 'Foundation', duration: 'Mese 1-2', activities: 'Segmentali core + SOVT basics + Fisiologia essenziale', deliverable: 'Milestone 1: Clear Articulation' },
    { phase: 'Development', duration: 'Mese 3-4', activities: 'Soprasegmentali + Psicoacustica + Business contexts', deliverable: 'Milestone 2: Natural Fluency' },
    { phase: 'Mastery', duration: 'Mese 5-6', activities: 'Consolidamento + Role-specific training + Final assessment', deliverable: 'Certificazione + Report ROI' }
  ];

  // FAQ
  const faqs = [
    {
      q: 'Perché Vocal Fitness invece di EF Education First?',
      a: 'EF offre un approccio generalista LMS con contenuti standardizzati. Vocal Fitness si concentra specificamente sulla pronuncia attraverso un metodo proprietario basato sulla scienza fonetica, producendo risultati misurabili in termini di intelligibilità - il parametro più critico per la comunicazione business. I nostri studenti raggiungono in 6 mesi quello che con metodi tradizionali richiede 18-24 mesi.'
    },
    {
      q: 'Come si integra con la formazione EF esistente?',
      a: 'Vocal Fitness complementa perfettamente i programmi EF esistenti. Mentre EF copre grammar, vocabulary e general skills, noi ci focalizziamo sull\'area spesso trascurata: la pronuncia e l\'intelligibilità. Molte aziende scelgono di integrare i nostri moduli come "acceleratore" per massimizzare l\'investimento già fatto in EF.'
    },
    {
      q: 'Quali risultati possiamo aspettarci e in quanto tempo?',
      a: 'Dopo 3 mesi: +40% intelligibility score medio. Dopo 6 mesi: +65% intelligibility, +30% confidence in speaking. Dopo 12 mesi: performance near-native per executive track. Tutti i risultati sono misurati attraverso il nostro protocollo di Intelligibility Audit.'
    },
    {
      q: 'Come funziona il deployment per un\'azienda grande come Medtronic?',
      a: 'Offriamo un modello scalabile: fase pilota con 50-100 dipendenti (3 mesi), poi rollout graduale per reparto/location. La piattaforma supporta fino a 10.000 utenti simultanei. Integrazione SSO disponibile con i vostri sistemi HR.'
    },
    {
      q: 'I contenuti sono personalizzabili per il settore pharma/medical?',
      a: 'Assolutamente. Creiamo moduli custom con terminologia specifica Medtronic, scenari di comunicazione con healthcare professionals, regolatori e pazienti. Il nostro team include consulenti con background in medical communications.'
    }
  ];

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const toggleModule = (id) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const moduleColors = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    pink: 'from-pink-500 to-pink-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Minimal Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">VocalFitness</span>
              <span className="text-cyan-400 text-sm ml-2">for Medtronic</span>
            </div>
          </div>
          <Button onClick={() => setIsQuoteFormOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6">
            <Phone className="w-4 h-4 mr-2" /> Contattaci
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Proposta Esclusiva per Medtronic EMEA</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Speak Right</span>
              <br />Classes for Medtronic
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Il programma di eccellenza nella pronuncia inglese che trasforma la comunicazione dei vostri 
              <span className="text-cyan-400 font-semibold"> dipendenti italiani</span> - dal Board al personale operativo.
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              Powered by the proprietary <span className="text-white font-medium">Vocal Fitness Method</span> by Prof. Steve Dapper - 
              l'alternativa scientifica ai corsi generalisti.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg">
                <Calendar className="w-5 h-5 mr-2" /> Prenota Demo Gratuita
              </Button>
              <Button variant="outline" size="lg" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg">
                <Download className="w-5 h-5 mr-2" /> Scarica Brochure
              </Button>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { value: '21%', label: 'Risparmio vs EF', icon: Euro },
              { value: '3x', label: 'Faster Results', icon: Zap },
              { value: '94%', label: 'Completion Rate', icon: GraduationCap },
              { value: 'CEFR', label: 'Aligned Certification', icon: Award }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center">
                <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Not EF Section */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perché <span className="text-red-400">Non</span> un Altro Corso Generico?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              €100/dipendente/mese per contenuti standardizzati senza focus sulla pronuncia?
              Ecco cosa manca ai provider tradizionali come EF:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <X className="w-6 h-6" /> Approccio Tradizionale (EF, etc.)
              </h3>
              <ul className="space-y-4">
                {[
                  'Contenuti generici "one-size-fits-all"',
                  'Zero focus su pronuncia e intelligibilità',
                  'LMS passivo con video pre-registrati',
                  'Nessun training fonetico propriocettivo',
                  'Assessment basato solo su grammar tests',
                  'Insegnanti non specializzati in fonetica',
                  'ROI difficile da misurare'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-400">
                    <X className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> Metodo VocalFitness
              </h3>
              <ul className="space-y-4">
                {[
                  'Curriculum scientifico basato su fonetica articolatoria',
                  'Focus primario su intelligibilità misurabile',
                  'Training propriocettivo e condizionamento muscolare',
                  'Esercizi SOVT per stamina vocale',
                  'Assessment multimodale (acustico, funzionale, percettivo)',
                  'Docenti certificati in fonetica applicata',
                  'ROI tracciabile con Intelligibility Audits'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Course Modules */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Syllabus <span className="text-cyan-400">Speak Right</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Un curriculum completo e modulare basato sul metodo proprietario del Prof. Dapper,
              allineato ai livelli CEFR e strutturato per progressione graduale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courseModules.map((module) => (
              <div key={module.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-all">
                <button onClick={() => toggleModule(module.id)} className="w-full p-6 text-left">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${moduleColors[module.color]} flex items-center justify-center`}>
                      <module.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{module.hours}h</span>
                      <span className="px-2 py-1 bg-cyan-500/20 rounded text-xs text-cyan-300">{module.cefr}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{module.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{module.subtitle}</p>
                  <p className="text-sm text-slate-500">{module.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                    <span className="text-xs text-slate-500">Clicca per dettagli</span>
                    {expandedModule === module.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                {expandedModule === module.id && (
                  <div className="px-6 pb-6 border-t border-slate-700/50">
                    <ul className="space-y-2 mt-4">
                      {module.topics.map((topic, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment Methods */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Key Assessment Methods
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Sistema di valutazione multimodale per misurare oggettivamente il progresso
              e garantire il ROI del vostro investimento formativo.
            </p>
          </div>

          <div className="space-y-6">
            {assessmentMethods.map((method, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{method.title}</h3>
                      <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs font-medium text-cyan-300">{method.badge}</span>
                    </div>
                    <p className="text-slate-400 mb-4">{method.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {method.metrics.map((metric, j) => (
                        <span key={j} className="px-3 py-1.5 bg-slate-700/50 rounded-lg text-sm text-slate-300">{metric}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tools & Apps per il <span className="text-cyan-400">Progress Tracking</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Suite integrata di strumenti VocalFitness per monitoraggio continuo,
              feedback in tempo reale e stamina tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trackingTools.map((tool, i) => (
              <div key={i} className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                  <tool.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{tool.description}</p>
                <ul className="space-y-2">
                  {tool.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle className="w-3 h-3 text-cyan-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Implementation Table */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Implementation Roadmap
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Piano di deployment strutturato in 6 mesi per massimizzare adoption e risultati.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-cyan-400 font-semibold">Fase</th>
                  <th className="text-left py-4 px-4 text-cyan-400 font-semibold">Timeline</th>
                  <th className="text-left py-4 px-4 text-cyan-400 font-semibold">Attività</th>
                  <th className="text-left py-4 px-4 text-cyan-400 font-semibold">Deliverable</th>
                </tr>
              </thead>
              <tbody>
                {implementationTable.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="py-4 px-4 font-medium text-white">{row.phase}</td>
                    <td className="py-4 px-4 text-cyan-300">{row.duration}</td>
                    <td className="py-4 px-4 text-slate-400">{row.activities}</td>
                    <td className="py-4 px-4 text-slate-300">{row.deliverable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Piani e <span className="text-cyan-400">Investimento</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Pricing trasparente e competitivo. Strutturato per coprire tutti i livelli organizzativi
              con un risparmio significativo rispetto ai provider tradizionali.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, i) => (
              <div key={i} className={`relative rounded-3xl overflow-hidden ${tier.highlight ? 'bg-gradient-to-b from-cyan-500/20 to-slate-800 border-2 border-cyan-500/50' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                {tier.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-cyan-500 text-center py-2 text-sm font-bold text-white">
                    {tier.badge}
                  </div>
                )}
                <div className={`p-8 ${tier.highlight ? 'pt-14' : ''}`}>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                    <p className="text-slate-400 text-sm">{tier.subtitle}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">€{tier.price}</span>
                    <span className="text-slate-400">{tier.period}</span>
                    <p className="text-xs text-slate-500 mt-1">{tier.minCommit}</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">{tier.description}</p>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Ideale per:</p>
                    <p className="text-sm text-cyan-300 mb-3">{tier.ideal}</p>
                    <p className="text-xs text-emerald-400 font-medium">{tier.savings}</p>
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <Button onClick={() => setIsQuoteFormOpen(true)} className={`w-full ${tier.highlight ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    Richiedi Preventivo
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-4">Sconti volume disponibili per deployment su larga scala</p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="px-4 py-2 bg-slate-800 rounded-lg">
                <span className="text-cyan-400 font-bold">100-500</span> <span className="text-slate-400">dipendenti: -10%</span>
              </div>
              <div className="px-4 py-2 bg-slate-800 rounded-lg">
                <span className="text-cyan-400 font-bold">500-1000</span> <span className="text-slate-400">dipendenti: -15%</span>
              </div>
              <div className="px-4 py-2 bg-slate-800 rounded-lg">
                <span className="text-cyan-400 font-bold">1000+</span> <span className="text-slate-400">dipendenti: -20%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Domande Frequenti
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <button onClick={() => toggleFaq(i)} className="w-full p-6 text-left flex items-center justify-between">
                  <span className="font-medium text-white pr-4">{faq.q}</span>
                  {expandedFaq === i ? <ChevronUp className="w-5 h-5 text-cyan-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-6 text-slate-400 border-t border-slate-700/50 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-3xl p-12">
            <Crown className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pronto a Trasformare la Comunicazione di Medtronic Italia?
            </h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Filippo Pardossi ha già sperimentato i risultati. Ora è il momento di portare
              l'eccellenza Vocal Fitness a tutto il team EMEA.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-6 text-lg">
                <Calendar className="w-5 h-5 mr-2" /> Prenota Call con HR Team
              </Button>
              <Button variant="outline" size="lg" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg">
                <Mail className="w-5 h-5 mr-2" /> corporate@vocalfitness.org
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">VocalFitness</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 VocalFitness by Prof. Steve Dapper. Proposta confidenziale per Medtronic.
            </p>
            <div className="flex gap-4">
              <a href="mailto:corporate@vocalfitness.org" className="text-slate-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="tel:+390000000000" className="text-slate-400 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Quote Form Modal */}
      {isQuoteFormOpen && (
        <CorporateQuoteForm 
          isOpen={isQuoteFormOpen} 
          onClose={() => setIsQuoteFormOpen(false)} 
          prefilledCompany="Medtronic"
        />
      )}
    </div>
  );
};

export default MedtronicLandingPage;
