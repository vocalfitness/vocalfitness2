import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Informativa privacy — Level Test lead capture (M2.5).
// Struttura conforme agli artt. 13-14 GDPR (Reg. UE 2016/679).
// NB PRODOTTO: i dati specifici del titolare (ragione sociale, P.IVA, indirizzo,
// eventuale DPO) vanno finalizzati dal Prof./legale prima del go-live.
const SECTIONS = [
  {
    h: '1. Titolare del trattamento',
    p: 'Il titolare del trattamento dei dati è Vocal Fitness — Prof. Steve Dapper. ' +
       'Per qualsiasi richiesta relativa ai tuoi dati puoi scrivere a privacy@vocalfitness.org.',
  },
  {
    h: '2. Quali dati raccogliamo',
    p: 'Nel test di pronuncia raccogliamo: nome, indirizzo email, tipologia di utente ' +
       '(privato/azienda) e, per gli utenti aziendali, il nome dell’azienda e un recapito ' +
       'telefonico. Raccogliamo inoltre i risultati del test (punteggi di pronuncia per suono, ' +
       'primo tentativo e migliore, e il livello complessivo). L’audio registrato durante il ' +
       'test viene analizzato in tempo reale e NON viene conservato.',
  },
  {
    h: '3. Finalità e base giuridica',
    p: 'Trattiamo i tuoi dati per: (a) mostrarti il report completo del tuo livello di pronuncia; ' +
       '(b) — solo se hai prestato l’apposito consenso marketing — ricontattarti via email o ' +
       'telefono in merito ai percorsi Vocal Fitness. La base giuridica è il tuo consenso ' +
       '(art. 6.1.a GDPR), revocabile in qualsiasi momento.',
  },
  {
    h: '4. Conservazione',
    p: 'Conserviamo i dati per il tempo necessario alle finalità sopra indicate e comunque non ' +
       'oltre 24 mesi dall’ultimo contatto, salvo diversi obblighi di legge. Alla revoca del ' +
       'consenso i dati marketing vengono cancellati.',
  },
  {
    h: '5. Comunicazione dei dati',
    p: 'I dati possono essere trattati da fornitori tecnici (hosting, invio email) che agiscono ' +
       'come responsabili del trattamento. Non vendiamo i tuoi dati a terzi.',
  },
  {
    h: '6. I tuoi diritti',
    p: 'Puoi esercitare in ogni momento i diritti previsti dagli artt. 15-22 GDPR: accesso, ' +
       'rettifica, cancellazione, limitazione, portabilità e opposizione, oltre alla revoca del ' +
       'consenso e al reclamo al Garante per la protezione dei dati personali. Scrivi a ' +
       'privacy@vocalfitness.org.',
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
          Regolamento (UE) 2016/679 (GDPR).
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
