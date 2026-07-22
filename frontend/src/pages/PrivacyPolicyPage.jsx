import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Informativa privacy — Level Test lead capture (M2.5).
// Titolare stabilito in SVIZZERA → quadro NORMATIVO DOPPIO: GDPR (UE 2016/679,
// art. 3.2 offerta di servizi a interessati nell'Unione) + LPD svizzera (nLPD,
// in vigore dal 1° settembre 2023). Autorità: Garante (IT/UE) + IFPDT (CH).
const SECTIONS = [
  {
    h: '1. Titolare del trattamento',
    p: 'Il titolare del trattamento è Steve Dapper — Speech Pathologist, Via Toveda 3, ' +
       '6535 Roveredo (Svizzera). Per qualsiasi richiesta relativa ai tuoi dati puoi scrivere a ' +
       'privacy@vocalfitness.org.',
  },
  {
    h: '2. Quadro normativo applicabile',
    p: 'Il titolare è stabilito in Svizzera. Al presente trattamento si applicano congiuntamente: ' +
       '(a) il Regolamento (UE) 2016/679 (GDPR), in quanto il servizio è offerto a interessati ' +
       'situati nell’Unione europea (art. 3.2 GDPR); e (b) la Legge federale svizzera sulla ' +
       'protezione dei dati (nLPD), in vigore dal 1° settembre 2023, quale normativa del Paese di ' +
       'stabilimento del titolare.',
  },
  {
    h: '3. Quali dati raccogliamo',
    p: 'Nel test di pronuncia raccogliamo: nome, indirizzo email, tipologia di utente ' +
       '(privato/azienda) e, per gli utenti aziendali, il nome dell’azienda e un recapito ' +
       'telefonico. Raccogliamo inoltre i risultati del test (punteggi di pronuncia per suono, ' +
       'primo tentativo e migliore, e il livello complessivo). L’audio registrato durante il ' +
       'test viene analizzato in tempo reale e NON viene in alcun modo conservato.',
  },
  {
    h: '4. Finalità e base giuridica',
    p: 'Trattiamo i tuoi dati per: (a) mostrarti il report completo del tuo livello di pronuncia; ' +
       '(b) — solo se hai prestato l’apposito consenso marketing, distinto e facoltativo — ' +
       'ricontattarti via email o telefono in merito ai percorsi Vocal Fitness. La base giuridica ' +
       'è il tuo consenso (art. 6.1.a GDPR; art. 6 nLPD), revocabile in qualsiasi momento senza ' +
       'pregiudicare la liceità del trattamento precedente.',
  },
  {
    h: '5. Conservazione',
    p: 'Conserviamo i dati per il tempo necessario alle finalità sopra indicate e comunque non ' +
       'oltre 24 mesi dall’ultimo contatto, salvo diversi obblighi di legge. Alla revoca del ' +
       'consenso i dati trattati per la relativa finalità vengono cancellati.',
  },
  {
    h: '6. Trasferimento e comunicazione dei dati',
    p: 'I dati sono trattati in Svizzera. Per la Svizzera la Commissione europea ha adottato una ' +
       'decisione di adeguatezza: il trasferimento di dati personali dall’UE verso la Svizzera è ' +
       'quindi lecito e non richiede garanzie aggiuntive. I dati possono essere trattati da ' +
       'fornitori tecnici (hosting, invio email) che agiscono come responsabili del trattamento. ' +
       'Non vendiamo i tuoi dati a terzi.',
  },
  {
    h: '7. I tuoi diritti e reclami',
    p: 'Puoi esercitare in ogni momento i diritti previsti dagli artt. 15-22 GDPR e dalla nLPD: ' +
       'accesso, rettifica, cancellazione, limitazione, portabilità e opposizione, oltre alla ' +
       'revoca del consenso (privacy@vocalfitness.org). Puoi inoltre proporre reclamo all’autorità ' +
       'di controllo competente: in Italia/UE il Garante per la protezione dei dati personali; in ' +
       'Svizzera l’IFPDT (Incaricato federale della protezione dei dati e della trasparenza).',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" data-testid="privacy-policy-page">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-14">
        <Link
          to="/level-test"
          data-testid="privacy-back-link"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-cyan-300 hover:text-orange-300 transition-colors"
        >
          <ArrowLeft size={16} /> Torna al test
        </Link>
        <h1 className="mt-8 text-3xl sm:text-4xl font-black text-white">Informativa sulla privacy</h1>
        <p className="mt-3 text-sm text-slate-400">
          Come trattiamo i dati raccolti nel test di pronuncia Vocal Fitness, ai sensi del
          Regolamento (UE) 2016/679 (GDPR) e della Legge federale svizzera sulla protezione dei
          dati (nLPD).
        </p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold text-cyan-100">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/90">{s.p}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 text-[11px] text-slate-600">Ultimo aggiornamento: giugno 2026 · versione lt-1.0</p>
      </div>
    </div>
  );
}
