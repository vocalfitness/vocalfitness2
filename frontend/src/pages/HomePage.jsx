import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StickyCTA from '../components/StickyCTA';
import ExitIntentPopup from '../components/ExitIntentPopup';
import BookingFormModal from '../components/BookingFormModal';
import CorporateQuoteForm from '../components/CorporateQuoteForm';
import OnboardingWizard from '../components/OnboardingWizard';
import TestimonialsSection from '../components/TestimonialsSection';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { bioBlocks as professorBioBlocks } from '../data/professorBio';
import {
  ArrowRight, Check, Mail, MessageCircle, Calendar, Play,
  Mic2, AudioWaveform, Activity, GraduationCap, Briefcase, Award,
  Building2, Users, Globe, Layers, Headphones,
  Presentation, Sparkles, Stethoscope,
  Library, Microscope, Volume2, ChevronDown, HelpCircle
} from 'lucide-react';

// ============================================================
// Bilingual content (IT / EN)
// ============================================================
const COPY = {
  en: {
    hero: {
      eyebrow: 'The VocalFitness Method',
      h1a: 'A scientific method',
      h1b: 'for spoken English,',
      h1c: 'clarity and communication performance.',
      sub_pre: 'VocalFitness is an advanced spoken-English method built on ',
      sub_a: 'articulatory phonetics',
      sub_b: 'prosody training',
      sub_c: 'mechanical conditioning',
      sub_post: ' of the speech organs — designed for executives, professionals, academics and institutions who need real spoken-performance results.',
      cta_corp: 'Corporate & Institutional Enquiry',
      cta_ind: 'Individual Programme',
      legacy_label: 'Legacy programme',
      legacy_text: 'Speak English Like a CEO in 10 Sessions',
      badge_session: 'Live Method Session',
      badge_cefr: 'CEFR',
      badge_cefr_sub: 'A1 → C2 Coverage'
    },
    credibility: {
      intro: 'Built on a scientific foundation · trusted across academic, institutional and corporate contexts',
      markers: [
        'Articulatory Phonetics',
        'CEFR A1 — C2',
        'Academic Applications',
        'Corporate Programmes',
        'Institutional Use',
        'Developed by Steve Dapper'
      ]
    },
    trusted: {
      eyebrow: 'Trusted Across Industry & Academia',
      title_a: 'Adopted by global organisations',
      title_b: 'and recognised institutions.',
      sub: 'A method validated in real corporate environments and aligned with leading academic and institutional partners.',
      industry_label: 'Corporate Clients',
      institutions_label: 'Academic & Institutional Partners',
      additional_label: 'Additional clients',
      footer_pre: 'A combined portfolio of ',
      footer_em: '50+ multinationals, market leaders and academic institutions',
      footer_post: ' across Europe, the United States and global markets.'
    },
    what: {
      eyebrow: 'What VocalFitness Is',
      title_a: 'A specialist layer for ',
      title_b: 'spoken-English performance.',
      p1_pre: 'Most English-language programmes train grammar, vocabulary, listening and reading effectively — yet they are often ',
      p1_em: 'incomplete on their own',
      p1_post: ' when the goal is fluent, intelligible, high-quality spoken communication.',
      p2_pre: 'VocalFitness addresses this missing layer through ',
      p2_a: 'articulatory phonetics',
      p2_b: 'prosody training',
      p2_c: 'mechanical conditioning',
      p2_post: ' of the speech organs — producing measurable improvements in clarity, rhythm and communication performance.',
      pillars: [
        { title: 'Articulatory Phonetics', desc: 'Precise mechanical training on segmentals — how each English sound is physically produced. The foundation for accuracy and intelligibility at every CEFR level.' },
        { title: 'Prosody & Suprasegmentals', desc: 'Rhythm, stress, intonation and connected speech — the dimension of spoken English that listeners actually parse, and the layer most traditional methods leave undertrained.' },
        { title: 'Mechanical Conditioning', desc: 'Structured, progressive conditioning of the speech organs. Borrowed from a biomechanical training tradition and adapted to the specific demands of English speech production.' },
        { title: 'Psychoacoustics & Perception', desc: 'How listeners decode spoken English. Training is calibrated against listener perception, not abstract textbook rules — so improvement translates directly to real conversations.' }
      ]
    },
    method: {
      eyebrow: 'How The Method Works',
      title: 'A structured, five-stage protocol.',
      sub: 'Each stage is independently measurable. The full protocol is modular: organisations can adopt the complete programme or integrate selected stages alongside existing English-learning pathways.',
      stages: [
        { num: '01', title: 'Diagnostic', desc: 'Acoustic and articulatory baseline assessment of the speaker\'s current spoken-English profile.' },
        { num: '02', title: 'Articulation', desc: 'Targeted training on segmentals — the precise mechanics of individual sounds and intelligibility.' },
        { num: '03', title: 'Prosody', desc: 'Suprasegmental work on rhythm, stress, intonation and natural spoken flow.' },
        { num: '04', title: 'Conditioning', desc: 'Mechanical conditioning of the speech organs through structured, progressive practice.' },
        { num: '05', title: 'Application', desc: 'Integration into real professional contexts: meetings, presentations, customer-facing communication.' }
      ],
      stage_label: 'STAGE'
    },
    audience: {
      eyebrow: 'Who It Is For',
      title: 'Built for high-stakes spoken communication.',
      sub: 'Wherever spoken English carries real consequence — credibility, deals, lectures, leadership — VocalFitness provides the specialist training that traditional methods rarely include.',
      items: [
        { title: 'Executives & Leadership', desc: 'Authority, clarity and gravitas in board-level communication, international meetings and public speaking.' },
        { title: 'Professionals & Sales Teams', desc: 'Confident, intelligible delivery in customer-facing conversations, calls and negotiations.' },
        { title: 'Academic & Research Staff', desc: 'Lecture delivery, conference presentations and seminar discourse with native-level prosodic control.' },
        { title: 'Institutions & Organisations', desc: 'A specialist spoken-English layer that integrates into existing language curricula and training plans.' }
      ]
    },
    integration: {
      eyebrow: 'Strategic Positioning',
      title_a: 'Designed to integrate,',
      title_b: 'not to replace.',
      p1: 'VocalFitness is not a substitute for a school, publisher, English course or institutional programme. It is a specialist spoken-English layer that sits alongside what already works — and strengthens what traditional methods often leave undertrained.',
      bullets: [
        'Integrates with existing programmes and curricula.',
        'Complements established English-learning pathways.',
        'Adds the missing spoken-performance layer.',
        'Can be adopted without replacing your current provider.',
        'Works alongside existing classes, courses and teachers.',
        'Extends traditional instruction with articulatory and prosodic training.'
      ],
      card_title: 'Integration Logic',
      layer_label: 'LAYER',
      outcome_label: 'OUTCOME',
      layers: [
        { left: 'Existing English programme', right: 'General language competence' },
        { left: 'VocalFitness layer', right: 'Spoken clarity & performance' },
        { left: 'Combined adoption', right: 'Complete communication outcome' }
      ],
      footer_pre: 'Programmes such as ',
      footer_em: 'SpeakRight 101',
      footer_post: ' are delivered as integration-ready modules, not as a total replacement for current providers.'
    },
    programmes: {
      eyebrow: 'Corporate & Institutional Programmes',
      title: 'Modular by design. Deployed at scale.',
      sub: 'Organisations can adopt the full protocol or integrate individual modules. Each module is independently measurable and aligned to CEFR descriptors, so impact is tracked the same way as your current language KPIs.',
      flagship_label: 'Flagship Programme',
      flagship_title: 'SpeakRight 101',
      flagship_desc: 'A 5-module, 25-hour programme covering anatomy, perception, segmentals, suprasegmentals and integration. Available as an integration layer for existing learning ecosystems.',
      modules: [
        { num: '01', title: 'Anatomy & Physiology', hours: '4h', focus: 'Foundations' },
        { num: '02', title: 'Psychoacoustics', hours: '4h', focus: 'Perception' },
        { num: '03', title: 'Segmentals', hours: '6h', focus: 'A2 — B1', highlight: true },
        { num: '04', title: 'Suprasegmentals', hours: '6h', focus: 'B1 — B2', highlight: true },
        { num: '05', title: 'Application', hours: '5h', focus: 'Real contexts' }
      ],
      cta: 'Discuss a programme for your organisation'
    },
    cefr: {
      eyebrow: 'CEFR & Outcomes',
      title: 'Mapped to CEFR. Measured in performance.',
      sub: 'The protocol is structured around the Common European Framework of Reference, with explicit outcomes for each band — from foundational articulation at A1 to executive-level prosody and register control at C2.',
      cefr_label: 'CEFR',
      levels: [
        { level: 'A1 — A2', focus: 'Foundational articulation', desc: 'Sound accuracy, basic intelligibility, fundamental rhythm patterns.' },
        { level: 'B1 — B2', focus: 'Spoken fluency', desc: 'Stress placement, natural connected speech, conversational confidence in professional settings.' },
        { level: 'C1 — C2', focus: 'Performance & nuance', desc: 'Executive presence, persuasive prosody, register control, accent neutrality on demand.' }
      ],
      outcomes: [
        { stat: 25, suffix: 'h', label: 'Complete protocol' },
        { stat: 5, suffix: '', label: 'Modular pillars' },
        { stat: 6, suffix: '', label: 'CEFR bands covered' }
      ]
    },
    proof: {
      eyebrow: 'Selected Contexts',
      title: 'Adopted across the contexts where spoken English carries weight.',
      sub: 'The method is applied across academic, institutional and corporate environments — wherever measurable spoken-performance outcomes are required.',
      contexts: [
        { title: 'Multinational Corporations', desc: 'Spoken-performance modules deployed across executive, management and end-function populations.' },
        { title: 'Universities & Academies', desc: 'Articulatory phonetics training adopted alongside established English-language programmes.' },
        { title: 'Publishers & Training Providers', desc: 'White-label spoken-English layer integrated into existing learning ecosystems.' },
        { title: 'Cross-border Teams', desc: 'Intelligibility and prosody training for distributed international workforces.' }
      ]
    },
    dapper: {
      eyebrow: 'Method Author',
      title: 'Professor Steve Dapper',
      sub: 'Founder of the VocalFitness Method',
      badge: '30+ Years · Voice & Phonetics',
      blocks: [
        { title: 'Academic Foundations', body: professorBioBlocks.en.blocks[0].body },
        { title: 'Method Development', body: professorBioBlocks.en.blocks[1].body },
        { title: 'Applied Practice', body: professorBioBlocks.en.blocks[2].body }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Domande Ricorrenti',
      sub: 'Le risposte alle domande più frequenti sul metodo, sul programma Speak Right 101 e sulle modalità di erogazione.',
      items: [
        {
          q: 'Who is Vocal Fitness for?',
          a: 'For executives, managers, professionals, academics and public figures who want to improve spoken English in a structured way — pronunciation, prosody, intelligibility and communication performance. Suitable for both B2B corporate programmes and individual journeys.'
        },
        {
          q: 'How many CEFR levels does the method cover?',
          a: 'Speak Right 101 covers all CEFR levels, from A2 (Elementary) up to C2 (Mastery), with a structured protocol of 12 lessons of 60 minutes each based on articulatory phonetics, prosody training and biomechanical conditioning.'
        },
        {
          q: 'Is it a traditional English course?',
          a: 'No. Vocal Fitness does not teach grammar or vocabulary: it is a scientific method focused on the oral production of English — articulation, prosody and mechanical conditioning of the speech organs. It integrates with (and does not replace) existing English programmes.'
        },
        {
          q: 'In which formats is the programme delivered?',
          a: 'Online 1:1, One-to-Some (small groups), One-to-Many (extended classroom) or Blended (online + on-site sessions at the client\'s location). All live sessions are recorded in HD on our proprietary platform and remain available for 12 months.'
        },
        {
          q: 'Is there a final certificate?',
          a: 'Yes. Upon completion of the programme, the participant receives the "Vocal Fitness — Speak Right 101" certificate, recognised by Vocal Fitness and signed by Prof. Steve Dapper.'
        },
        {
          q: 'Can you try before purchasing?',
          a: 'Yes. A free initial assessment is included, with an individual CEFR diagnostic and a sample session, in order to define baseline, objectives and format of the programme before the start.'
        }
      ]
    },
    finalCta: {
      eyebrow: 'Begin',
      title: 'Two paths into the method.',
      sub: 'Whether you represent an organisation evaluating an integration layer for spoken English, or you are an individual professional pursuing your own communication performance — the method begins here.',
      corp_eyebrow: 'Path A · Organisations',
      corp_title: 'Corporate & Institutional Enquiry',
      corp_desc: 'For companies, universities, academies, publishers and training providers evaluating VocalFitness as an integration layer or modular programme. Receive a tailored proposal within 48 hours.',
      corp_btn: 'Request a corporate proposal',
      ind_eyebrow: 'Path B · Individuals',
      ind_title: 'Individual Programme',
      ind_desc: 'For executives, professionals, academics and performers pursuing personal training in spoken-English performance. Begin with a complimentary diagnostic assessment.',
      ind_btn: 'Book a diagnostic assessment',
      whatsapp: '+39 351 576 5749 · WhatsApp'
    }
  },

  it: {
    hero: {
      eyebrow: 'Il Metodo VocalFitness',
      h1a: 'Un metodo scientifico',
      h1b: 'per l\'inglese parlato,',
      h1c: 'chiarezza e performance comunicativa.',
      sub_pre: 'VocalFitness è un metodo avanzato per l\'inglese parlato fondato su ',
      sub_a: 'fonetica articolatoria',
      sub_b: 'training prosodico',
      sub_c: 'condizionamento meccanico',
      sub_post: ' degli organi fonatori — pensato per executive, professionisti, accademici e istituzioni che necessitano di risultati reali nella comunicazione orale.',
      cta_corp: 'Richiesta Corporate & Istituzionale',
      cta_ind: 'Programma Individuale',
      legacy_label: 'Programma legacy',
      legacy_text: 'Speak English Like a CEO in 10 Sessions',
      badge_session: 'Sessione del Metodo dal vivo',
      badge_cefr: 'CEFR',
      badge_cefr_sub: 'Copertura A1 → C2'
    },
    credibility: {
      intro: 'Costruito su fondamenta scientifiche · adottato in contesti accademici, istituzionali e corporate',
      markers: [
        'Fonetica Articolatoria',
        'CEFR A1 — C2',
        'Applicazioni Accademiche',
        'Programmi Corporate',
        'Uso Istituzionale',
        'Sviluppato da Steve Dapper'
      ]
    },
    trusted: {
      eyebrow: 'Adottato in Industria & Accademia',
      title_a: 'Scelto da organizzazioni globali',
      title_b: 'e istituzioni riconosciute.',
      sub: 'Un metodo validato in contesti corporate reali e allineato a partner accademici e istituzionali di riferimento.',
      industry_label: 'Clienti Corporate',
      institutions_label: 'Partner Accademici & Istituzionali',
      additional_label: 'Altri clienti',
      footer_pre: 'Un portfolio combinato di ',
      footer_em: '50+ multinazionali, leader di mercato e istituzioni accademiche',
      footer_post: ' tra Europa, Stati Uniti e mercati globali.'
    },
    what: {
      eyebrow: 'Cos\'è VocalFitness',
      title_a: 'Un layer specialistico per ',
      title_b: 'la performance dell\'inglese parlato.',
      p1_pre: 'Gran parte dei programmi di inglese forma efficacemente grammatica, vocabolario, listening e reading — ma risulta spesso ',
      p1_em: 'incompleta da sola',
      p1_post: ' quando l\'obiettivo è una comunicazione orale fluente, intelligibile e di alta qualità.',
      p2_pre: 'VocalFitness colma questo layer mancante attraverso ',
      p2_a: 'fonetica articolatoria',
      p2_b: 'training prosodico',
      p2_c: 'condizionamento meccanico',
      p2_post: ' degli organi fonatori — producendo miglioramenti misurabili in chiarezza, ritmo e performance comunicativa.',
      pillars: [
        { title: 'Fonetica Articolatoria', desc: 'Training meccanico di precisione sui segmentali — il modo in cui ogni suono dell\'inglese viene fisicamente prodotto. La base per accuratezza e intelligibilità a ogni livello CEFR.' },
        { title: 'Prosodia & Soprasegmentali', desc: 'Ritmo, accento, intonazione e parlato connesso — la dimensione dell\'inglese parlato che gli ascoltatori realmente decodificano, e il layer che la maggior parte dei metodi tradizionali lascia poco allenato.' },
        { title: 'Condizionamento Meccanico', desc: 'Condizionamento strutturato e progressivo degli organi fonatori. Mutuato da una tradizione di training biomeccanico e adattato alle specifiche esigenze della produzione del parlato inglese.' },
        { title: 'Psicoacustica & Percezione', desc: 'Come gli ascoltatori decodificano l\'inglese parlato. Il training è calibrato sulla percezione dell\'ascoltatore, non su regole astratte da manuale — così il miglioramento si traduce direttamente in conversazioni reali.' }
      ]
    },
    method: {
      eyebrow: 'Come Funziona il Metodo',
      title: 'Un protocollo strutturato in cinque fasi.',
      sub: 'Ogni fase è misurabile in modo indipendente. Il protocollo completo è modulare: le organizzazioni possono adottare il programma intero o integrare fasi selezionate accanto ai percorsi di inglese esistenti.',
      stages: [
        { num: '01', title: 'Diagnostica', desc: 'Valutazione baseline acustica e articolatoria del profilo attuale di inglese parlato del soggetto.' },
        { num: '02', title: 'Articolazione', desc: 'Training mirato sui segmentali — la meccanica precisa dei singoli suoni e dell\'intelligibilità.' },
        { num: '03', title: 'Prosodia', desc: 'Lavoro soprasegmentale su ritmo, accento, intonazione e flusso naturale del parlato.' },
        { num: '04', title: 'Condizionamento', desc: 'Condizionamento meccanico degli organi fonatori attraverso pratica strutturata e progressiva.' },
        { num: '05', title: 'Applicazione', desc: 'Integrazione in contesti professionali reali: meeting, presentazioni, comunicazione client-facing.' }
      ],
      stage_label: 'FASE'
    },
    audience: {
      eyebrow: 'A Chi è Rivolto',
      title: 'Costruito per la comunicazione orale ad alta posta in gioco.',
      sub: 'Ovunque l\'inglese parlato abbia conseguenze reali — credibilità, trattative, lezioni, leadership — VocalFitness fornisce il training specialistico che i metodi tradizionali raramente includono.',
      items: [
        { title: 'Executive & Leadership', desc: 'Autorità, chiarezza e gravitas nella comunicazione board-level, nei meeting internazionali e nel public speaking.' },
        { title: 'Professionisti & Sales Team', desc: 'Delivery sicuro e intelligibile in conversazioni client-facing, call e negoziazioni.' },
        { title: 'Personale Accademico & Ricerca', desc: 'Delivery di lezioni, presentazioni a convegni e seminari con controllo prosodico di livello nativo.' },
        { title: 'Istituzioni & Organizzazioni', desc: 'Un layer specialistico di inglese parlato che si integra in curricula linguistici e piani formativi esistenti.' }
      ]
    },
    integration: {
      eyebrow: 'Posizionamento Strategico',
      title_a: 'Progettato per integrarsi,',
      title_b: 'non per sostituire.',
      p1: 'VocalFitness non è un sostituto di una scuola, di un editore, di un corso di inglese o di un programma istituzionale. È un layer specialistico di inglese parlato che si affianca a ciò che già funziona — e rafforza ciò che i metodi tradizionali spesso lasciano poco allenato.',
      bullets: [
        'Si integra con programmi e curricula esistenti.',
        'Complementa i percorsi di apprendimento dell\'inglese consolidati.',
        'Aggiunge il layer mancante della performance orale.',
        'Adottabile senza sostituire il provider attuale.',
        'Opera accanto a classi, corsi e docenti esistenti.',
        'Estende l\'istruzione tradizionale con training articolatorio e prosodico.'
      ],
      card_title: 'Logica di Integrazione',
      layer_label: 'LAYER',
      outcome_label: 'OUTCOME',
      layers: [
        { left: 'Programma di inglese esistente', right: 'Competenza linguistica generale' },
        { left: 'Layer VocalFitness', right: 'Chiarezza & performance orale' },
        { left: 'Adozione combinata', right: 'Risultato comunicativo completo' }
      ],
      footer_pre: 'Programmi come ',
      footer_em: 'SpeakRight 101',
      footer_post: ' sono erogati come moduli pronti all\'integrazione, non come sostituzione totale dei provider attuali.'
    },
    programmes: {
      eyebrow: 'Programmi Corporate & Istituzionali',
      title: 'Modulare per design. Deployabile su scala.',
      sub: 'Le organizzazioni possono adottare l\'intero protocollo o integrare singoli moduli. Ogni modulo è misurabile in modo indipendente e allineato ai descrittori CEFR, così l\'impatto si traccia con gli stessi KPI linguistici già in uso.',
      flagship_label: 'Programma Flagship',
      flagship_title: 'SpeakRight 101',
      flagship_desc: 'Un programma da 5 moduli e 25 ore che copre anatomia, percezione, segmentali, soprasegmentali e integrazione. Disponibile come layer di integrazione per ecosistemi formativi esistenti.',
      modules: [
        { num: '01', title: 'Anatomia & Fisiologia', hours: '4h', focus: 'Fondamenta' },
        { num: '02', title: 'Psicoacustica', hours: '4h', focus: 'Percezione' },
        { num: '03', title: 'Segmentali', hours: '6h', focus: 'A2 — B1', highlight: true },
        { num: '04', title: 'Soprasegmentali', hours: '6h', focus: 'B1 — B2', highlight: true },
        { num: '05', title: 'Applicazione', hours: '5h', focus: 'Contesti reali' }
      ],
      cta: 'Discuti un programma per la tua organizzazione'
    },
    cefr: {
      eyebrow: 'CEFR & Outcome',
      title: 'Mappato sul CEFR. Misurato in performance.',
      sub: 'Il protocollo è strutturato sul Common European Framework of Reference, con outcome espliciti per ogni banda — dall\'articolazione foundational ad A1 fino alla prosodia e al controllo di registro executive a C2.',
      cefr_label: 'CEFR',
      levels: [
        { level: 'A1 — A2', focus: 'Articolazione foundational', desc: 'Accuratezza dei suoni, intelligibilità di base, pattern ritmici fondamentali.' },
        { level: 'B1 — B2', focus: 'Fluenza orale', desc: 'Posizionamento dell\'accento, parlato connesso naturale, sicurezza conversazionale in contesti professionali.' },
        { level: 'C1 — C2', focus: 'Performance & sfumatura', desc: 'Executive presence, prosodia persuasiva, controllo di registro, neutralità d\'accento on demand.' }
      ],
      outcomes: [
        { stat: 25, suffix: 'h', label: 'Protocollo completo' },
        { stat: 5, suffix: '', label: 'Pilastri modulari' },
        { stat: 6, suffix: '', label: 'Bande CEFR coperte' }
      ]
    },
    proof: {
      eyebrow: 'Contesti Selezionati',
      title: 'Adottato nei contesti dove l\'inglese parlato pesa davvero.',
      sub: 'Il metodo viene applicato in ambienti accademici, istituzionali e corporate — ovunque siano richiesti outcome misurabili di performance orale.',
      contexts: [
        { title: 'Multinazionali', desc: 'Moduli di performance orale deployati su popolazioni executive, management e end-function.' },
        { title: 'Università & Accademie', desc: 'Training di fonetica articolatoria adottato accanto a programmi di inglese consolidati.' },
        { title: 'Editori & Provider Formativi', desc: 'Layer di inglese parlato in white-label integrato in ecosistemi formativi esistenti.' },
        { title: 'Team Cross-border', desc: 'Training di intelligibilità e prosodia per workforce internazionali distribuite.' }
      ]
    },
    dapper: {
      eyebrow: 'Autore del Metodo',
      title: 'Professor Steve Dapper',
      sub: 'Fondatore del Metodo VocalFitness',
      badge: '30+ Anni · Voce & Fonetica',
      blocks: [
        { title: 'Fondamenta Accademiche', body: professorBioBlocks.it.blocks[0].body },
        { title: 'Sviluppo del Metodo', body: professorBioBlocks.it.blocks[1].body },
        { title: 'Pratica Applicata', body: professorBioBlocks.it.blocks[2].body }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Domande Ricorrenti',
      sub: 'Le risposte alle domande più frequenti sul metodo, sul programma Speak Right 101 e sulle modalità di erogazione.',
      items: [
        {
          q: 'A chi è rivolto Vocal Fitness?',
          a: 'A executive, manager, professionisti, accademici e personalità pubbliche che vogliono migliorare in modo strutturato l\'inglese parlato — pronuncia, prosodia, intelligibilità e performance comunicativa. Adatto sia a programmi B2B aziendali sia a percorsi individuali.'
        },
        {
          q: 'Quanti livelli CEFR copre il metodo?',
          a: 'Speak Right 101 copre tutti i livelli CEFR, da A2 (Elementary) fino a C2 (Mastery), con un protocollo strutturato di 12 lezioni da 60 minuti basato su fonetica articolatoria, training prosodico e condizionamento biomeccanico.'
        },
        {
          q: 'È un corso d\'inglese tradizionale?',
          a: 'No. Vocal Fitness non insegna grammatica o vocabolario: è un metodo scientifico focalizzato sulla produzione orale dell\'inglese — articolazione, prosodia e condizionamento meccanico degli organi fonatori. Si integra con (e non sostituisce) i programmi di inglese esistenti.'
        },
        {
          q: 'In quali modalità si svolge il programma?',
          a: 'Online 1:1, One-to-Some (piccoli gruppi), One-to-Many (aule estese) o Blended (online + sessioni in presenza presso la sede del cliente). Tutte le sessioni live sono in HD su piattaforma proprietaria e restano disponibili come registrazione per 12 mesi.'
        },
        {
          q: 'È previsto un certificato finale?',
          a: 'Sì. Al completamento del programma viene rilasciato il certificato "Vocal Fitness — Speak Right 101", riconosciuto dall\'organizzazione Vocal Fitness e firmato dal Prof. Steve Dapper.'
        },
        {
          q: 'Si può provare prima di acquistare?',
          a: 'Sì. È inclusa una valutazione iniziale gratuita con assessment CEFR diagnostico individuale e una sample session, così da definire baseline, obiettivi e formato del percorso prima dell\'avvio.'
        }
      ]
    },
    finalCta: {
      eyebrow: 'Inizia',
      title: 'Due percorsi nel metodo.',
      sub: 'Che tu rappresenti un\'organizzazione che valuta un layer di integrazione per l\'inglese parlato, o sia un professionista individuale che persegue la propria performance comunicativa — il metodo inizia qui.',
      corp_eyebrow: 'Percorso A · Organizzazioni',
      corp_title: 'Richiesta Corporate & Istituzionale',
      corp_desc: 'Per aziende, università, accademie, editori e provider formativi che valutano VocalFitness come layer di integrazione o programma modulare. Ricevi una proposta su misura entro 48 ore.',
      corp_btn: 'Richiedi una proposta corporate',
      ind_eyebrow: 'Percorso B · Individuali',
      ind_title: 'Programma Individuale',
      ind_desc: 'Per executive, professionisti, accademici e performer che perseguono un training personale di performance orale dell\'inglese. Inizia con una valutazione diagnostica gratuita.',
      ind_btn: 'Prenota una valutazione diagnostica',
      whatsapp: '+39 351 576 5749 · WhatsApp'
    }
  }
};

// ============================================================
// Hooks & helpers
// ============================================================
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    if (node) observer.observe(node);
    return () => {
      if (node) observer.unobserve(node);
    };
  }, []);

  return [ref, isVisible];
};

const AnimatedCounter = ({ end, duration = 1800, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useScrollAnimation();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const stageIcons = [Stethoscope, Volume2, AudioWaveform, Activity, Presentation];
const pillarIcons = [Microscope, AudioWaveform, Activity, Headphones];
const audienceIcons = [Briefcase, Users, GraduationCap, Building2];
const contextIcons = [Building2, GraduationCap, Library, Globe];
const dapperIcons = [GraduationCap, Mic2, Award];

const cefrColors = ['from-blue-400 to-blue-500', 'from-blue-600 to-blue-600', 'from-blue-600 to-blue-800'];

// ============================================================
// VideoWithLoader — video with skeleton/shimmer + buffering indicator
// ============================================================
const VideoWithLoader = ({ src, className = '', wrapperClassName = '', poster, ...rest }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(node);
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      {/* Skeleton + shimmer + spinner overlay (visible until video can play) */}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-700 ${loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />
        <div
          className="absolute inset-0 vf-shimmer"
          style={{
            backgroundImage: 'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(37,99,235,0.18) 50%, transparent 65%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite'
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-blue-700/70 font-semibold">
            Loading video
          </span>
        </div>
      </div>

      {inView && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          onCanPlay={() => setLoaded(true)}
          onLoadedData={() => setLoaded(true)}
          className={className}
          {...rest}
        />
      )}
    </div>
  );
};

// ============================================================
// HomePage
// ============================================================
const HomePage = () => {
  const { language } = useLanguage();
  const t = COPY[language] || COPY.en;

  const [isCorpFormOpen, setIsCorpFormOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  const assets = {
    heroVideo: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/8id2qukm_57.1-invideo-seedance_2_0.mp4',
    methodVideo: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3w338a4f_56.1-invideo-seedance_2_0.mp4',
    integrationVideo: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/im62unh9_55.1-invideo-seedance_2_0.mp4',
    contextVideo: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/1dyvlit7_49.6-invideo-seedance_2_0.mp4',
    dapperVideo: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/2og0t2il_45.2-invideo-seedance_2_0.mp4',
    dapperPortrait: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/rnb654p3_35.2-invideo-nanobanana_2.png'
  };

  // Industry logos (uniform from vocalfitness.org CDN)
  const industryLogos = [
    { name: 'BASF', logo: 'https://cloud-1de12d.becdn.net/media/iW=258&iH=129&oX=0&oY=0&cW=258&cH=129/fde7d7897bc94923b604e7bbdbdb4ebf.png' },
    { name: 'Accenture', logo: 'https://cloud-1de12d.becdn.net/media/iW=186&iH=67&oX=0&oY=0&cW=186&cH=67/ad63d8b5dd6f42c132feb7830ee8635d.png' },
    { name: 'Dell', logo: 'https://cloud-1de12d.becdn.net/media/iW=204&iH=62&oX=0&oY=0&cW=204&cH=62/9bdf47c0e9c11b5ee82291427314fc43.png' },
    { name: 'Boston Consulting Group', logo: 'https://cloud-1de12d.becdn.net/media/iW=248&iH=57&oX=0&oY=0&cW=248&cH=57/9334e7569be83631b89f4ee7c5672352.png' },
    { name: 'Electrolux', logo: 'https://cloud-1de12d.becdn.net/media/iW=268&iH=62&oX=0&oY=0&cW=268&cH=62/c2d94e2324eff72aa501e32293a2b265.png' }
  ];

  const additionalClients = [
    'Mediaset',
    'Yamazaki Mazak',
    'Hitachi',
    'TEVA Pharmaceuticals',
    'DIPHARMA',
    'The Alfio Bardolla Group'
  ];

  const academicPartners = [
    'EF Education First',
    'Cambridge Assessment',
    'Oxford Alumni Business Courses',
    'Università di Torino — LFSAG',
    'Università eCampus',
    'MUR & MIUR',
    'DIESSE',
    'H-Farm & Link University',
    'Senato della Repubblica',
    'Harvard BS Roma'
  ];

  const [heroRef, heroVisible] = useScrollAnimation();
  const [credRef, credVisible] = useScrollAnimation();
  const [trustedRef, trustedVisible] = useScrollAnimation();
  const [whatRef, whatVisible] = useScrollAnimation();
  const [methodRef, methodVisible] = useScrollAnimation();
  const [whoRef, whoVisible] = useScrollAnimation();
  const [integrateRef, integrateVisible] = useScrollAnimation();
  const [progRef, progVisible] = useScrollAnimation();
  const [cefrRef, cefrVisible] = useScrollAnimation();
  const [proofRef, proofVisible] = useScrollAnimation();
  const [dapperRef, dapperVisible] = useScrollAnimation();
  const [faqRef, faqVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden text-slate-900">
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 30px rgba(37,99,235,0.25); } 50% { box-shadow: 0 0 50px rgba(37,99,235,0.5); } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-left { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-right { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .vf-marquee { animation: marquee 32s linear infinite; }
        .vf-marquee-track:hover .vf-marquee { animation-play-state: paused; }
        .vf-slide-up { animation: slide-up 0.8s ease-out forwards; }
        .vf-slide-left { animation: slide-left 0.9s ease-out forwards; }
        .vf-slide-right { animation: slide-right 0.9s ease-out forwards; }
        .vf-scale-in { animation: scale-in 0.7s ease-out forwards; }
        .vf-fade-in { animation: fade-in 0.9s ease-out forwards; }
        .vf-float { animation: float 6s ease-in-out infinite; }
        .vf-pulse-glow { animation: pulse-glow 3.5s ease-in-out infinite; }
        .vf-gradient { background-size: 200% 200%; animation: gradient-shift 10s ease infinite; }
        .vf-d-100 { animation-delay: 0.1s; }
        .vf-d-200 { animation-delay: 0.2s; }
        .vf-d-300 { animation-delay: 0.3s; }
        .vf-d-400 { animation-delay: 0.4s; }
        .vf-d-500 { animation-delay: 0.5s; }
        .vf-d-600 { animation-delay: 0.6s; }
        .vf-hover-lift { transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease; }
        .vf-hover-lift:hover { transform: translateY(-8px); box-shadow: 0 24px 48px rgba(15,23,42,0.12); }
        .vf-parallax { will-change: transform; }
        .vf-wave-bar { display: inline-block; width: 4px; margin: 0 2px; background: currentColor; border-radius: 2px; transform-origin: center; animation: wave 1.4s ease-in-out infinite; }

        /* Portrait premium effects */
        @keyframes portrait-breathe {
          0%, 100% { box-shadow: 0 12px 36px -8px rgba(37,99,235,0.18), 0 0 0 1px rgba(37,99,235,0.08); }
          50%      { box-shadow: 0 22px 56px -8px rgba(37,99,235,0.32), 0 0 0 1px rgba(37,99,235,0.18); }
        }
        @keyframes portrait-sheen {
          0%   { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(220%)  skewX(-18deg); }
        }
        .vf-portrait-frame { animation: portrait-breathe 5s ease-in-out infinite; transition: transform 0.7s cubic-bezier(.22,.61,.36,1), box-shadow 0.5s ease; }
        .vf-portrait-frame:hover { transform: translateY(-6px); box-shadow: 0 30px 70px -12px rgba(37,99,235,0.45), 0 0 0 2px rgba(37,99,235,0.35); }
        .vf-portrait-img { transition: transform 1.1s cubic-bezier(.22,.61,.36,1), filter 0.6s ease; }
        .vf-portrait-frame:hover .vf-portrait-img { transform: scale(1.08); filter: saturate(1.1) contrast(1.04); }
        .vf-portrait-sheen { position: absolute; top: 0; left: 0; width: 50%; height: 100%; background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.0) 35%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.0) 65%, transparent 100%); pointer-events: none; transform: translateX(-120%) skewX(-18deg); }
        .vf-portrait-frame:hover .vf-portrait-sheen { animation: portrait-sheen 1.4s ease-out forwards; }
        .vf-portrait-aura { position: absolute; inset: -14px; border-radius: 28px; background: radial-gradient(60% 60% at 50% 50%, rgba(37,99,235,0.22), transparent 70%); filter: blur(24px); opacity: 0; transition: opacity 0.6s ease; pointer-events: none; z-index: -1; }
        .vf-portrait-frame:hover ~ .vf-portrait-aura, .group:hover .vf-portrait-aura { opacity: 1; }
      `}</style>

      <Navbar />

      {/* Floating ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[28rem] h-[28rem] bg-blue-500/[0.04] rounded-full blur-3xl"
          style={{ top: '8%', left: '4%', transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)` }} />
        <div className="absolute w-[22rem] h-[22rem] bg-blue-500/[0.04] rounded-full blur-3xl"
          style={{ top: '55%', right: '6%', transform: `translate(${-mousePosition.x * 0.012}px, ${-mousePosition.y * 0.012}px)` }} />
      </div>

      {/* ========== 1. HERO ========== */}
      <section ref={heroRef} id="hero" className="relative min-h-[100vh] flex items-center pt-28 pb-20 overflow-hidden" data-testid="home-hero-section">
        {/* Light medical-style background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-white vf-gradient" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(to right, rgba(37,99,235,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        {/* Parallax accents */}
        <div className="absolute top-32 right-10 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl vf-parallax"
          style={{ transform: `translateY(${scrollY * 0.12}px)` }} />
        <div className="absolute bottom-10 left-10 w-56 h-56 bg-blue-300/15 rounded-full blur-3xl vf-parallax"
          style={{ transform: `translateY(${scrollY * -0.16}px)` }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className={`lg:col-span-7 ${heroVisible ? 'vf-slide-right' : 'opacity-0'}`}>
              <p className="text-blue-600 font-semibold mb-6 uppercase tracking-[0.2em] text-xs flex items-center gap-3" data-testid="home-hero-eyebrow">
                <span className="w-10 h-[1px] bg-blue-600"></span>
                {t.hero.eyebrow}
                <span className="inline-flex items-center gap-[2px] text-blue-600 ml-2" aria-hidden="true">
                  <span className="vf-wave-bar h-3" style={{ animationDelay: '0s' }}></span>
                  <span className="vf-wave-bar h-4" style={{ animationDelay: '0.15s' }}></span>
                  <span className="vf-wave-bar h-5" style={{ animationDelay: '0.3s' }}></span>
                  <span className="vf-wave-bar h-3" style={{ animationDelay: '0.45s' }}></span>
                </span>
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] mb-8 tracking-tight" data-testid="home-hero-headline">
                <span className="block text-slate-900">{t.hero.h1a}</span>
                <span className="block bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {t.hero.h1b}
                </span>
                <span className="block text-slate-700 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mt-3 font-bold">
                  {t.hero.h1c}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mb-10" data-testid="home-hero-sub">
                {t.hero.sub_pre}
                <span className="text-slate-900 font-semibold">{t.hero.sub_a}</span>,{' '}
                <span className="text-slate-900 font-semibold">{t.hero.sub_b}</span> {language === 'it' ? 'e' : 'and'}{' '}
                <span className="text-slate-900 font-semibold">{t.hero.sub_c}</span>
                {t.hero.sub_post}
              </p>

              <div className={`flex flex-col sm:flex-row gap-4 mb-8 ${heroVisible ? 'vf-slide-up vf-d-300' : 'opacity-0'}`}>
                <Button onClick={() => setIsCorpFormOpen(true)} size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-7 text-base shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.03] group"
                  data-testid="home-hero-cta-corporate">
                  <Building2 className="w-5 h-5 mr-2" />
                  {t.hero.cta_corp}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button onClick={() => setIsWizardOpen(true)} size="lg" variant="outline"
                  className="border-2 border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 px-8 py-7 text-base transition-all duration-300 hover:scale-[1.03]"
                  data-testid="home-hero-cta-individual">
                  <Calendar className="w-5 h-5 mr-2" />
                  {t.hero.cta_ind}
                </Button>
              </div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500" data-testid="home-hero-legacy-line">
                <span className="text-slate-600">{t.hero.legacy_label}</span> · {t.hero.legacy_text}
              </p>
            </div>

            <div className={`lg:col-span-5 hidden lg:block ${heroVisible ? 'vf-slide-left vf-d-200' : 'opacity-0'}`}>
              <div className="relative">
                <VideoWithLoader
                  src={assets.heroVideo}
                  aria-label="VocalFitness method live session preview"
                  className="w-full h-[520px] object-cover"
                  wrapperClassName="rounded-3xl overflow-hidden border-4 border-white shadow-[0_30px_80px_rgba(37,99,235,0.25)] vf-pulse-glow h-[520px]"
                  data-testid="home-hero-video"
                />
                <div className="absolute -bottom-5 -left-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-semibold shadow-2xl vf-float flex items-center gap-2 z-20">
                  <Play className="w-4 h-4" />
                  {t.hero.badge_session}
                </div>
                <div className="absolute -top-5 -right-5 bg-white text-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-100 z-20">
                  <p className="text-3xl font-black text-blue-600">{t.hero.badge_cefr}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{t.hero.badge_cefr_sub}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 2. CREDIBILITY STRIP ========== */}
      <section ref={credRef} className="relative py-12 bg-white border-b border-slate-200" data-testid="home-credibility-strip">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className={`text-center text-[11px] uppercase tracking-[0.25em] text-slate-500 mb-8 ${credVisible ? 'vf-fade-in' : 'opacity-0'}`}>
            {t.credibility.intro}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {t.credibility.markers.map((m, i) => (
              <div key={m} className={`flex items-center gap-2 text-slate-700 ${credVisible ? `vf-slide-up vf-d-${(i + 1) * 100}` : 'opacity-0'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span className="text-sm md:text-base font-semibold tracking-wide">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 2.5 TRUSTED BY INDUSTRY & ACADEMIA ========== */}
      <section ref={trustedRef} className="relative py-24 lg:py-28 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden" data-testid="home-trusted-section">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-300/8 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className={`max-w-3xl mx-auto text-center mb-16 ${trustedVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs">
              {t.trusted.eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              {t.trusted.title_a}{' '}
              <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent">
                {t.trusted.title_b}
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.trusted.sub}</p>
          </div>

          {/* Industry logos — infinite marquee */}
          <div className="mb-16">
            <p className={`text-center text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold mb-8 ${trustedVisible ? 'vf-fade-in vf-d-100' : 'opacity-0'}`}>
              {t.trusted.industry_label}
            </p>
            <div
              className="vf-marquee-track relative overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)'
              }}
            >
              <div className="vf-marquee flex gap-12 lg:gap-16 w-max">
                {[...industryLogos, ...industryLogos, ...industryLogos].map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    className="group flex items-center justify-center min-w-[180px] h-20 px-6"
                    data-testid={i < industryLogos.length ? `home-trusted-logo-${i}` : undefined}
                  >
                    <img
                      src={c.logo}
                      alt={`${c.name} logo`}
                      className="max-h-12 w-auto object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Additional text-based clients */}
            <div className={`mt-8 flex flex-wrap justify-center gap-2 ${trustedVisible ? 'vf-fade-in vf-d-500' : 'opacity-0'}`}>
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 self-center mr-2">
                {t.trusted.additional_label} —
              </span>
              {additionalClients.map((c) => (
                <span
                  key={c}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-500 hover:text-blue-700 hover:shadow-sm transition-all duration-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Academic & Institutional partners */}
          <div className="border-t border-slate-200 pt-12">
            <p className={`text-center text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold mb-8 ${trustedVisible ? 'vf-fade-in vf-d-200' : 'opacity-0'}`}>
              {t.trusted.institutions_label}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {academicPartners.map((p, i) => (
                <div
                  key={p}
                  className={`group relative px-5 py-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 ${trustedVisible ? `vf-slide-up vf-d-${((i % 5) + 2) * 100}` : 'opacity-0'}`}
                  data-testid={`home-trusted-partner-${i}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-blue-600 group-hover:scale-150 transition-transform" />
                    <span className="text-sm text-slate-700 font-medium leading-snug group-hover:text-blue-700 transition-colors">
                      {p}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className={`mt-16 text-center ${trustedVisible ? 'vf-fade-in vf-d-600' : 'opacity-0'}`}>
            <p className="text-slate-600 text-base md:text-lg">
              {t.trusted.footer_pre}
              <span className="text-slate-900 font-semibold">{t.trusted.footer_em}</span>
              {t.trusted.footer_post}
            </p>
          </div>
        </div>
      </section>

      {/* ========== 3. WHAT VOCALFITNESS IS ========== */}
      <section ref={whatRef} id="method" className="py-24 lg:py-32 bg-white relative" data-testid="home-what-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            <div className={`lg:col-span-5 lg:sticky lg:top-32 ${whatVisible ? 'vf-slide-right' : 'opacity-0'}`}>
              <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span>
                {t.what.eyebrow}
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-8 leading-[1.05] tracking-tight">
                {t.what.title_a}
                <span className="text-blue-700">{t.what.title_b}</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {t.what.p1_pre}
                <span className="font-semibold text-slate-900">{t.what.p1_em}</span>
                {t.what.p1_post}
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t.what.p2_pre}
                <span className="font-semibold text-slate-900">{t.what.p2_a}</span>,{' '}
                <span className="font-semibold text-slate-900">{t.what.p2_b}</span> {language === 'it' ? 'e' : 'and'}{' '}
                <span className="font-semibold text-slate-900">{t.what.p2_c}</span>
                {t.what.p2_post}
              </p>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {t.what.pillars.map((item, i) => {
                const Icon = pillarIcons[i];
                const delays = ['vf-d-100', 'vf-d-200', 'vf-d-300', 'vf-d-400'];
                return (
                  <div key={i}
                    className={`group bg-white border border-slate-200 rounded-3xl p-8 shadow-sm vf-hover-lift ${whatVisible ? `vf-slide-up ${delays[i]}` : 'opacity-0'}`}
                    data-testid={`home-what-pillar-${i}`}>
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 4. HOW THE METHOD WORKS ========== */}
      <section ref={methodRef} id="process" className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden" data-testid="home-process-section">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className={`max-w-3xl mb-20 ${methodVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
              <span className="w-8 h-[2px] bg-blue-600"></span>
              {t.method.eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              {t.method.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.method.sub}</p>
          </div>

          {/* Method showcase video — full-width banner */}
          <div className={`relative mb-16 ${methodVisible ? 'vf-scale-in vf-d-100' : 'opacity-0'}`}>
            <VideoWithLoader
              src={assets.methodVideo}
              aria-label="VocalFitness method demonstration session"
              className="w-full h-[280px] md:h-[360px] object-cover"
              wrapperClassName="rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-blue-500/10 h-[280px] md:h-[360px]"
              data-testid="home-method-video"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent pointer-events-none rounded-3xl" />
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3 z-20">
              <Play className="w-4 h-4 text-blue-600" />
              <span className="text-xs uppercase tracking-widest text-slate-700 font-semibold">
                {language === 'it' ? 'Metodo · Sessione dimostrativa' : 'Method · Demonstration Session'}
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {t.method.stages.map((step, i) => {
              const Icon = stageIcons[i];
              return (
                <div key={step.num}
                  className={`relative bg-white border border-slate-200 rounded-3xl p-7 vf-hover-lift ${methodVisible ? `vf-slide-up vf-d-${(i + 1) * 100}` : 'opacity-0'}`}
                  data-testid={`home-process-step-${i}`}>
                  <div className="text-[11px] font-mono tracking-widest text-blue-600 mb-4">{t.method.stage_label} {step.num}</div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-5 shadow-md">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  {i < t.method.stages.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-[2px] bg-gradient-to-r from-blue-300 to-transparent z-20" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== 5. WHO IT IS FOR ========== */}
      <section ref={whoRef} className="py-24 lg:py-32 bg-white" data-testid="home-audience-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${whoVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs">{t.audience.eyebrow}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              {t.audience.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.audience.sub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {t.audience.items.map((a, i) => {
              const Icon = audienceIcons[i];
              return (
                <div key={i}
                  className={`group relative overflow-hidden rounded-3xl p-10 bg-white border border-slate-200 hover:border-blue-400 vf-hover-lift ${whoVisible ? `vf-scale-in vf-d-${(i + 1) * 100}` : 'opacity-0'}`}
                  data-testid={`home-audience-${i}`}>
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100/60 rounded-full blur-3xl group-hover:bg-blue-200/80 transition-colors" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{a.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== 6. DESIGNED TO INTEGRATE ========== */}
      <section ref={integrateRef} id="integrate" className="py-24 lg:py-32 bg-gradient-to-br from-blue-700 via-blue-700 to-blue-800 relative overflow-hidden" data-testid="home-integration-section">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
        <div className="absolute inset-0 opacity-30" style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.15) 0%, transparent 40%)`
        }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className={`lg:col-span-7 ${integrateVisible ? 'vf-slide-right' : 'opacity-0'}`}>
              <p className="text-blue-200 font-semibold mb-4 uppercase tracking-[0.25em] text-xs">{t.integration.eyebrow}</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-8">
                {t.integration.title_a}<br />
                <span className="text-blue-200">{t.integration.title_b}</span>
              </h2>
              <p className="text-lg md:text-xl text-blue-50 leading-relaxed mb-6">{t.integration.p1}</p>
              <ul className="space-y-3 mt-8">
                {t.integration.bullets.map((item, i) => (
                  <li key={i}
                    className={`flex items-start gap-3 text-white/95 ${integrateVisible ? `vf-slide-up vf-d-${(i + 2) * 100}` : 'opacity-0'}`}>
                    <span className="mt-1.5 w-5 h-5 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-base md:text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`lg:col-span-5 space-y-5 ${integrateVisible ? 'vf-slide-left vf-d-300' : 'opacity-0'}`}>
              {/* Integration showcase video */}
              <VideoWithLoader
                src={assets.integrationVideo}
                aria-label="VocalFitness integration use case showcase"
                className="w-full h-[200px] object-cover"
                wrapperClassName="rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl h-[200px]"
                data-testid="home-integration-video"
              />

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{t.integration.card_title}</h3>
                </div>

                <div className="space-y-4">
                  {t.integration.layers.map((row, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex-1">
                        <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">{t.integration.layer_label} {i + 1}</p>
                        <p className="text-white font-semibold">{row.left}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-200 shrink-0" />
                      <div className="flex-1">
                        <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">{t.integration.outcome_label}</p>
                        <p className="text-white font-semibold">{row.right}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-blue-100/90 mt-6 leading-relaxed">
                  {t.integration.footer_pre}
                  <span className="font-bold text-white">{t.integration.footer_em}</span>
                  {t.integration.footer_post}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 7. CORPORATE & INSTITUTIONAL PROGRAMMES ========== */}
      <section ref={progRef} id="programmes" className="py-24 lg:py-32 bg-white" data-testid="home-programmes-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`grid lg:grid-cols-12 gap-12 items-end mb-16 ${progVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <div className="lg:col-span-7">
              <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span>
                {t.programmes.eyebrow}
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
                {t.programmes.title}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">{t.programmes.sub}</p>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{t.programmes.flagship_label}</p>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{t.programmes.flagship_title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{t.programmes.flagship_desc}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {t.programmes.modules.map((m, i) => (
              <div key={m.num}
                className={`rounded-3xl p-6 border-2 transition-all duration-500 vf-hover-lift ${m.highlight ? 'bg-gradient-to-br from-blue-50 to-blue-50 border-blue-300' : 'bg-white border-slate-200'} ${progVisible ? `vf-slide-up vf-d-${(i + 1) * 100}` : 'opacity-0'}`}
                data-testid={`home-module-${i}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-mono ${m.highlight ? 'text-blue-700' : 'text-slate-500'}`}>{m.num}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${m.highlight ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{m.hours}</span>
                </div>
                <h3 className={`font-bold text-lg mb-2 ${m.highlight ? 'text-blue-900' : 'text-slate-900'}`}>{m.title}</h3>
                <p className={`text-sm ${m.highlight ? 'text-blue-700' : 'text-slate-500'}`}>{m.focus}</p>
              </div>
            ))}
          </div>

          <div className={`mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center ${progVisible ? 'vf-fade-in vf-d-600' : 'opacity-0'}`}>
            <Button onClick={() => setIsCorpFormOpen(true)} size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-base shadow-xl"
              data-testid="home-programmes-cta">
              <Building2 className="w-5 h-5 mr-2" />
              {t.programmes.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ========== 8. CEFR & OUTCOMES ========== */}
      <section ref={cefrRef} id="results" className="py-24 lg:py-32 bg-slate-50" data-testid="home-cefr-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${cefrVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs">{t.cefr.eyebrow}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              {t.cefr.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.cefr.sub}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {t.cefr.levels.map((c, i) => (
              <div key={c.level}
                className={`relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-8 vf-hover-lift ${cefrVisible ? `vf-scale-in vf-d-${(i + 1) * 100}` : 'opacity-0'}`}
                data-testid={`home-cefr-${i}`}>
                <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${cefrColors[i]} mb-6`}></div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">{t.cefr.cefr_label}</p>
                <h3 className="text-3xl font-black text-slate-900 mb-2">{c.level}</h3>
                <p className={`bg-gradient-to-r ${cefrColors[i]} bg-clip-text text-transparent font-bold text-lg mb-4`}>
                  {c.focus}
                </p>
                <p className="text-slate-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-16 grid md:grid-cols-3 gap-6 ${cefrVisible ? 'vf-slide-up vf-d-400' : 'opacity-0'}`}>
            {t.cefr.outcomes.map((o, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
                <p className="text-5xl md:text-6xl font-black text-blue-700 mb-2">
                  <AnimatedCounter end={o.stat} suffix={o.suffix} />
                </p>
                <p className="text-slate-600 font-medium">{o.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 9. TESTIMONIALS (existing component, dark theme) ========== */}
      <TestimonialsSection />

      {/* ========== 10. PROOF / SELECTED CONTEXTS ========== */}
      <section ref={proofRef} className="py-24 lg:py-32 bg-white relative" data-testid="home-proof-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className={`lg:col-span-5 ${proofVisible ? 'vf-slide-right' : 'opacity-0'}`}>
              <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span>
                {t.proof.eyebrow}
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
                {t.proof.title}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">{t.proof.sub}</p>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 hidden lg:block">
                <video src={assets.contextVideo} autoPlay loop muted playsInline className="w-full h-[280px] object-cover" />
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
              {t.proof.contexts.map((c, i) => {
                const Icon = contextIcons[i];
                return (
                  <div key={c.title}
                    className={`group bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-3xl p-7 vf-hover-lift ${proofVisible ? `vf-slide-up vf-d-${(i + 1) * 100}` : 'opacity-0'}`}
                    data-testid={`home-proof-${i}`}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{c.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 11. STEVE DAPPER ========== */}
      <section ref={dapperRef} id="professor" className="py-24 lg:py-32 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden" data-testid="home-dapper-section">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className={`text-center mb-16 ${dapperVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 text-xs uppercase tracking-[0.25em] mb-4 font-semibold">{t.dapper.eyebrow}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-4">
              {t.dapper.title}
            </h2>
            <p className="text-slate-600 text-lg md:text-xl">{t.dapper.sub}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10 items-start">
            <div className={`lg:col-span-1 space-y-5 ${dapperVisible ? 'vf-slide-right vf-d-200' : 'opacity-0'}`}>
              <div className="relative group">
                {/* Soft outer aura (radial blue glow) */}
                <div className="vf-portrait-aura" aria-hidden="true" />
                {/* Portrait frame */}
                <div className="vf-portrait-frame relative rounded-3xl overflow-hidden border-2 border-white">
                  <img src={assets.dapperPortrait} alt="Professor Steve Dapper"
                    className="vf-portrait-img w-full h-auto object-cover"
                    data-testid="home-dapper-portrait" />
                  {/* Light sheen sweep on hover */}
                  <div className="vf-portrait-sheen" aria-hidden="true" />
                  {/* Bottom gradient for depth */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/30 via-slate-900/0 to-transparent pointer-events-none" aria-hidden="true" />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl uppercase tracking-widest z-10">
                  {t.dapper.badge}
                </div>
              </div>

              {/* Dapper showcase video */}
              <VideoWithLoader
                src={assets.dapperVideo}
                aria-label="Professor Steve Dapper teaching session"
                className="w-full h-[220px] object-cover"
                wrapperClassName="rounded-3xl overflow-hidden border-2 border-white shadow-xl"
                data-testid="home-dapper-video"
              />
            </div>

            <div className="lg:col-span-2 space-y-5">
              {t.dapper.blocks.map((b, i) => {
                const Icon = dapperIcons[i];
                const delays = ['vf-d-100', 'vf-d-200', 'vf-d-300'];
                return (
                  <div key={i}
                    className={`bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 vf-hover-lift ${dapperVisible ? `vf-slide-up ${delays[i]}` : 'opacity-0'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-slate-900 font-bold text-lg">{b.title}</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{b.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 11.5 FAQ ========== */}
      <section ref={faqRef} id="faq" className="py-24 lg:py-32 bg-white relative overflow-hidden" data-testid="home-faq-section">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        <div className="container mx-auto px-6 lg:px-8 max-w-5xl relative z-10">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${faqVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-blue-600 text-xs uppercase tracking-[0.25em] font-semibold">{t.faq.eyebrow}</p>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-5">
              {t.faq.title}
            </h2>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed">{t.faq.sub}</p>
          </div>

          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {t.faq.items.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                  className={`border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 ${faqVisible ? `vf-slide-up vf-d-${(i + 1) * 100}` : 'opacity-0'} ${isOpen ? 'border-blue-400 shadow-lg shadow-blue-500/10' : ''}`}
                  data-testid={`home-faq-item-${i}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    className="w-full flex items-center justify-between gap-6 px-7 py-6 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-2xl"
                    data-testid={`home-faq-toggle-${i}`}
                  >
                    <h3 itemProp="name" className="text-lg md:text-xl font-bold text-slate-900 leading-snug pr-2">
                      {item.q}
                    </h3>
                    <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-blue-50 text-blue-600'}`}>
                      <ChevronDown className="w-5 h-5" />
                    </span>
                  </button>
                  <div
                    id={`faq-answer-${i}`}
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                    className={`grid transition-all duration-500 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p itemProp="text" className="px-7 pb-6 text-slate-600 leading-relaxed text-base md:text-lg">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== 12. FINAL CTA — DUAL PATH ========== */}
      <section ref={ctaRef} className="py-24 lg:py-32 bg-white relative overflow-hidden" data-testid="home-final-cta-section">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${ctaVisible ? 'vf-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs">{t.finalCta.eyebrow}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              {t.finalCta.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.finalCta.sub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className={`group relative overflow-hidden rounded-3xl p-10 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 vf-hover-lift ${ctaVisible ? 'vf-slide-up vf-d-200' : 'opacity-0'}`} data-testid="home-cta-corporate-card">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <p className="text-blue-300 text-xs uppercase tracking-widest mb-3 font-semibold">{t.finalCta.corp_eyebrow}</p>
                <h3 className="text-3xl font-black text-white mb-4">{t.finalCta.corp_title}</h3>
                <p className="text-slate-300 leading-relaxed mb-8">{t.finalCta.corp_desc}</p>
                <Button onClick={() => setIsCorpFormOpen(true)} size="lg"
                  className="w-full bg-white text-slate-900 hover:bg-blue-50 px-8 py-6 text-base font-bold shadow-xl group-hover:scale-[1.02] transition-transform"
                  data-testid="home-cta-corporate-button">
                  {t.finalCta.corp_btn}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a href="mailto:corporate@vocalfitness.org" className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                  <Mail className="w-4 h-4" />
                  corporate@vocalfitness.org
                </a>
              </div>
            </div>

            <div className={`group relative overflow-hidden rounded-3xl p-10 bg-gradient-to-br from-blue-600 to-blue-700 vf-hover-lift ${ctaVisible ? 'vf-slide-up vf-d-300' : 'opacity-0'}`} data-testid="home-cta-individual-card">
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <p className="text-blue-100 text-xs uppercase tracking-widest mb-3 font-semibold">{t.finalCta.ind_eyebrow}</p>
                <h3 className="text-3xl font-black text-white mb-4">{t.finalCta.ind_title}</h3>
                <p className="text-blue-50 leading-relaxed mb-8">{t.finalCta.ind_desc}</p>
                <Button onClick={() => setIsWizardOpen(true)} size="lg"
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 px-8 py-6 text-base font-bold shadow-xl group-hover:scale-[1.02] transition-transform"
                  data-testid="home-cta-individual-button">
                  {t.finalCta.ind_btn}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 text-blue-100 hover:text-white text-sm transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  {t.finalCta.whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <StickyCTA />
      <ExitIntentPopup />

      {isCorpFormOpen && (
        <CorporateQuoteForm isOpen={isCorpFormOpen} onClose={() => setIsCorpFormOpen(false)} />
      )}
      <BookingFormModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <OnboardingWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};

export default HomePage;
