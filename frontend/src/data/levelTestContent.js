/**
 * Level Test — content layer (LOCAL config, M1).
 *
 * Everything the user reads / every price / business rule lives here, keyed by
 * language + step, so the future migration to the backend CMS (§9) is a COPY,
 * not a rewrite. Structure/flow/logic stay in code (LevelTestPage / engine).
 *
 * Jarvis lines carry BOTH `text` and `audio` (§7 + §2): the copy is fixed, so
 * once finalised it is TTS-generated ONCE on the admin side (ElevenLabs) and
 * served as a static file. `audio: null` ⇒ M1 stub (no clip yet). Editing a
 * line means editing text AND regenerating its audio file — the pairing is
 * modelled here so text↔audio never drift apart.
 */

const jarvis = (text, audio = null) => ({ text, audio });

export const LEVEL_TEST_SEGMENTS = [
  { value: 'professional', label: 'Professionista / privato che vuole migliorare il proprio inglese', branch: 'A' },
  { value: 'performer', label: 'Cantante / attore / performer', branch: 'A', upsell: true },
  { value: 'student', label: 'Studente (università, accademia)', branch: 'A', entry: true },
  { value: 'corporate', label: 'HR / manager per un team o azienda', branch: 'B' },
  { value: 'other', label: 'Altro', branch: 'A' },
];

export const LEVEL_TEST_CONTENT = {
  it: {
    meta: {
      pageTitle: 'Scopri il tuo livello — Vocal Fitness',
      brand: 'Il metodo del Prof. Steve Dapper',
      disclaimer:
        'Il punteggio indica il tuo livello di pronuncia sulla scala Vocal Fitness, ispirata ai descrittori CEFR "Sound Articulation". Non è una certificazione CEFR ufficiale.',
    },
    steps: {
      welcome: {
        kicker: 'Test di pronuncia',
        heading: 'Non quanto sai l\u2019inglese. Come suona quando lo parli.',
        jarvis: jarvis(
          'Ciao, sono il metodo del Professor Steve Dapper. In pochi minuti ti mostro qualcosa che nessun test tradizionale ti dice: non quanto sai l\u2019inglese, ma come suona quando lo parli. Analizzeremo la tua pronuncia con la stessa fonetica che uso in aula \u2014 e alla fine saprai esattamente dove sei, e cosa ti separa dal livello successivo. Pronto? Cominciamo.'
        ),
        cta: 'Inizia',
        note: 'Nessun dato richiesto per iniziare. Bastano 3 minuti.',
      },
      mirror: {
        title: 'Lo specchio propriocettivo',
        jarvis: jarvis(
          'Prima cosa: voglio che ti osservi. Accendi la telecamera e guardati mentre pronunci \u2014 \u00e8 lo stesso specchio che uso con i miei allievi. Non ti registro, non ti giudico: imparerai a sentire la tua bocca. \u00c8 da l\u00ec che parte tutto.'
        ),
        enableCta: 'Accendi la telecamera',
        skipCta: 'Salta questo passo',
        privacy: 'La telecamera resta sul tuo dispositivo. Nessuna immagine viene inviata o salvata.',
      },
      aural: {
        title: 'Il tuo orecchio',
        jarvis: jarvis(
          'Ora mettiamo alla prova il tuo orecchio. Ascolta e dimmi quale suono hai sentito. \u00c8 da qui che nasce una buona pronuncia: prima si sente la differenza, poi la si produce.'
        ),
        prompt: 'Quale suono hai sentito?',
        replay: 'Riascolta',
      },
      isolated: {
        title: 'Il suono isolato',
        jarvis: jarvis(
          'Adesso tocca a te. Pronuncia questo suono e osserva la tua voce prendere forma sullo schermo. Non serve essere perfetti \u2014 serve provarci.'
        ),
        recordCta: 'Registra il suono',
      },
      phrase: {
        title: 'La frase',
        jarvis: jarvis(
          'Ottimo. Ora una frase intera, costruita attorno a un suono chiave. Leggila con naturalezza, come la diresti davvero.'
        ),
        recordCta: 'Registra la frase',
      },
      partial: {
        title: 'Primo sguardo',
        jarvis: jarvis(
          'Interessante. C\u2019\u00e8 un suono che ti sta frenando pi\u00f9 di quanto pensi \u2014 e la buona notizia \u00e8 che si allena. Vuoi vedere il quadro completo e sapere esattamente dove intervenire?'
        ),
        teaserHeading: 'Sei pi\u00f9 vicino di quanto pensi',
        unlockCta: 'Sblocca il report completo',
      },
      gate: {
        title: 'Il tuo report completo',
        jarvis: jarvis(
          'Lasciami la tua email e ti apro il report completo: il tuo livello sulla scala Vocal Fitness, il confronto tra il tuo accento e i due standard \u2014 americano e britannico \u2014 e i tre suoni su cui lavorare per primi.'
        ),
        emailLabel: 'La tua email',
        emailPlaceholder: 'nome@email.com',
        segmentQuestion: 'Chi sei?',
        cefrQuestion: 'Hai gi\u00e0 un livello certificato? (facoltativo)',
        cefrOptions: ['Nessuno / non so', 'A1\u2013A2', 'B1', 'B2', 'C1', 'C2'],
        consentPrivacy: 'Ho letto e accetto l\u2019informativa sulla privacy.',
        consentMarketing: 'Acconsento a essere ricontattato via email/telefono sui percorsi Vocal Fitness.',
        submitCta: 'Mostrami il verdetto',
      },
      verdict: {
        title: 'Il tuo verdetto',
        cefrLabelPrefix: 'Livello Vocal Fitness',
        bidialectHeading: 'Il tuo accento tra due mondi',
        focusHeading: 'I tre suoni su cui lavorare per primi',
        asyncCefrNote:
          'Se hai gi\u00e0 una certificazione: attesta la tua competenza generale; questa analisi misura la pronuncia nello specifico. Ecco dove i due si incontrano.',
        branchA: {
          heading: 'Il tuo percorso: Phonetic Lab',
          body: 'Allena la pronuncia al tuo ritmo, con il metodo scientifico reso semplice e un risultato misurabile ad ogni sessione.',
          priceMonthly: '\u20ac19 / mese',
          priceYearly: '\u20ac149 / anno',
          yearlyBadge: '\u221235% \u00b7 pi\u00f9 scelto',
          freeNote: 'La prima card /\u028a/ FOOT \u00e8 gratis, per sempre.',
          cta: 'Sblocca il Phonetic Lab',
        },
        branchB: {
          heading: 'Una soluzione per il tuo team',
          body: 'ROI, executive presence e progresso misurabile del team, con l\u2019autorevolezza accademica del Prof. Dapper.',
          cta: 'Prenota una call con il Prof. Dapper',
          fields: {
            firstName: 'Nome',
            lastName: 'Cognome',
            phone: 'Cellulare',
            company: 'Azienda',
            role: 'Ruolo',
            teamSize: 'Dimensione team',
          },
          submitCta: 'Richiedi una proposta per il tuo team',
        },
      },
    },
  },
};

export const getLevelTestContent = (lang = 'it') =>
  LEVEL_TEST_CONTENT[lang] || LEVEL_TEST_CONTENT.it;
