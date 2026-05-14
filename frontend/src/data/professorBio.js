/**
 * Professor Steve Dapper — Centralized Bio Data
 *
 * Single source of truth for all institutional copy about Prof. Steve Dapper.
 * Edit this file to update bio text across:
 *   - HomePage.jsx (IT + EN sections)
 *   - MedtronicLandingPage.jsx (EN rich-text bio)
 *
 * ⚠️ MANUAL SYNC REQUIRED:
 * The JSON-LD structured data Person.description in `/app/frontend/public/index.html`
 * is built into the static HTML at build time and CANNOT be imported from JS.
 * Whenever you change `descriptionPlain.it` below, ALSO update the corresponding
 * `description` field inside the JSON-LD `Person` block in index.html.
 */

// ---- Identity / Display ----
export const professorIdentity = {
  fullName: 'Steve Dapper',
  displayTitle: 'Professor Steve Dapper',
  honorific: 'Prof.',
  jobTitle: {
    en: 'Professor of Articulatory Phonetics & Founder of Vocal Fitness',
    it: 'Professore di Fonetica Articolatoria & Fondatore di Vocal Fitness',
  },
  badge: {
    en: '30+ Years · Voice & Phonetics',
    it: '30+ Anni · Voce & Fonetica',
  },
  yearsLabel: {
    en: '30+ Years Experience',
    it: '30+ Anni di Esperienza',
  },
};

// ---- Academic Credentials ----
// Plain text (used in HomePage cards and JSON-LD)
export const academicCredentials = {
  en: 'University Professor of English Articulatory Phonetics at Università eCampus and scientific collaborator at the LFSAG Phonetics Laboratory of the University of Turin. Certified coach in biomechanics and body conditioning (University of Tampa, Florida, USA).',
  it: 'Professore Universitario di Fonetica Articolatoria Inglese all\'Università eCampus e collaboratore scientifico presso il Laboratorio di Fonetica LFSAG dell\'Università di Torino. Certified coach in biomeccanica e condizionamento corporeo (Università di Tampa, Florida, USA).',
};

// Rich HTML variant (Medtronic page bio — keeps highlight spans)
export const academicCredentialsHTML = {
  en: '<span class="text-white font-semibold">University Professor of English Articulatory Phonetics</span> at Università eCampus and <span class="text-white font-semibold">scientific collaborator at the LFSAG Phonetics Laboratory</span> of the University of Turin. Multi-instrumentalist musician, linguist, and <span class="text-white font-semibold">certified coach in biomechanics and body conditioning</span> from the University of Tampa (Florida, USA). Founder of the proprietary <span class="text-blue-400 font-bold">Vocal Fitness method</span> for spoken English learning.',
};

// ---- Method Development ----
export const methodDevelopment = {
  en: 'Founder of the proprietary VocalFitness method for spoken English — combining articulatory phonetics, prosody training and biomechanical conditioning of the speech organs into a single, structured protocol.',
  it: 'Fondatore del metodo proprietario VocalFitness per l\'inglese parlato — combinazione di fonetica articolatoria, training prosodico e condizionamento biomeccanico degli organi fonatori in un unico protocollo strutturato.',
};

// ---- Applied Practice ----
export const appliedPractice = {
  en: 'Three decades of work spanning research, teaching and applied training across academic, broadcast, performance and corporate environments — with a portfolio of executives, professionals and public figures trained in spoken-English performance.',
  it: 'Tre decenni di lavoro tra ricerca, didattica e training applicato in ambienti accademici, broadcast, performance e corporate — con un portfolio di executive, professionisti e personalità pubbliche allenati nella performance orale dell\'inglese.',
};

// ---- HomePage Bio Blocks (3-card structure) ----
export const bioBlocks = {
  en: {
    eyebrow: 'Method Author',
    title: professorIdentity.displayTitle,
    sub: 'Founder of the VocalFitness Method',
    badge: professorIdentity.badge.en,
    blocks: [
      { title: 'Academic Foundations', body: academicCredentials.en },
      { title: 'Method Development', body: methodDevelopment.en },
      { title: 'Applied Practice', body: appliedPractice.en },
    ],
  },
  it: {
    eyebrow: 'Autore del Metodo',
    title: professorIdentity.displayTitle,
    sub: 'Fondatore del Metodo VocalFitness',
    badge: professorIdentity.badge.it,
    blocks: [
      { title: 'Fondamenta Accademiche', body: academicCredentials.it },
      { title: 'Sviluppo del Metodo', body: methodDevelopment.it },
      { title: 'Pratica Applicata', body: appliedPractice.it },
    ],
  },
};

// ---- JSON-LD reference (for documentation only — not auto-injected) ----
export const jsonLdDescription = {
  en: `Professor of English Articulatory Phonetics at Università eCampus, scientific collaborator at the LFSAG Phonetics Laboratory of the University of Turin. Certified coach in biomechanics and body conditioning (University of Tampa, Florida, USA). Founder of the Vocal Fitness method.`,
  it: `Professore universitario di Fonetica Articolatoria Inglese all'Università eCampus, collaboratore scientifico presso il Laboratorio di Fonetica LFSAG dell'Università di Torino. Certified coach in biomeccanica e condizionamento corporeo (Università di Tampa, Florida, USA). Fondatore del metodo Vocal Fitness.`,
};
