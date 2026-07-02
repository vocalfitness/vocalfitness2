import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, LayoutList, Target, Wand2, Info, MousePointer2,
  Video, Image as ImageIcon, Volume2, Type, Sparkles, GraduationCap,
  MapPin, ChevronDown, ChevronRight, ExternalLink, Lightbulb, AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';

/**
 * PhonemeCmsHelpPage
 * ────────────────────
 * Onboarding / documentation for the phoneme CMS. Written in Italian for
 * the Prof. Dapper team. Uses anchor navigation + collapsible sections so
 * it doubles as a reference guide once the initial onboarding is done.
 */
const TOC = [
  { id: 'overview',     label: 'Panoramica' },
  { id: 'list',         label: 'Vista Lista schede' },
  { id: 'roadmap',      label: 'Vista Roadmap produzione' },
  { id: 'bulk-seed',    label: 'Popolamento rapido' },
  { id: 'editor',       label: 'Editor della scheda' },
  { id: 'preview',      label: 'Anteprima live' },
  { id: 'workflow',     label: 'Workflow completo (step-by-step)' },
  { id: 'tips',         label: 'Suggerimenti pedagogici' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
];

export default function PhonemeCmsHelpPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-cyan-500/15">
        <div className="max-w-[1200px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/phonemes" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 transition" data-testid="help-back-link">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">Phoneme CMS</span>
            </Link>
            <span className="text-cyan-500/30">|</span>
            <div className="inline-flex items-center gap-2 text-cyan-100">
              <BookOpen className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold uppercase tracking-wider">Documentazione</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-8 grid lg:grid-cols-[220px,1fr] gap-8">
        {/* TOC */}
        <nav className="lg:sticky lg:top-[80px] lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-3">Sommario</p>
          <ul className="space-y-1">
            {TOC.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="block text-sm text-slate-400 hover:text-cyan-200 py-1 transition"
                  data-testid={`help-toc-${entry.id}`}
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-1">Video tour</p>
            <p className="text-xs text-slate-400 mb-2">
              Coming soon — un video di 3 min con il flusso completo.
            </p>
            <span className="text-[10px] text-slate-500 italic">Nel frattempo, i comandi principali sono documentati sotto.</span>
          </div>
        </nav>

        {/* Content */}
        <article className="min-w-0 prose-invert">
          <header className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-bold">CMS · Guida utente</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-white">Come popolare le schede fonetiche</h1>
            <p className="mt-3 text-slate-400 leading-relaxed max-w-2xl">
              Il Phoneme CMS ti permette di creare, modificare e pubblicare tutte le 44 (UK) / 43 (US) schede fonetiche della{' '}
              <Link to="/lms/phonemes" className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">Phonetic Library</Link>{' '}
              direttamente dall&apos;interfaccia — senza toccare codice.
            </p>
          </header>

          {/* ═════════ OVERVIEW ═════════ */}
          <Section id="overview" title="Panoramica" icon={<Info className="w-5 h-5" />}>
            <p>
              Ogni scheda fonetica contiene una decina di blocchi didattici:
              simbolo IPA, immagini anatomiche, hotspot articolatori interattivi, audio ElevenLabs
              (voce clonata del Prof. Dapper), video-lezione YouTube, frase mnemonica, ~30 parole
              comuni, e diverse tabelle grafiche (spellings, features, knobs, muscoli facciali…).
            </p>
            <p>Il CMS ti fornisce tre viste principali:</p>
            <ul>
              <li><b className="text-cyan-200">Lista schede</b> — l&apos;elenco tabellare delle schede già in database, con azioni rapide (modifica, duplica, pubblica, elimina).</li>
              <li><b className="text-orange-200">Roadmap produzione</b> — l&apos;inventario completo dei 44 fonemi con completezza in % e priorità pedagogica.</li>
              <li><b className="text-emerald-200">Editor</b> — la form completa a sezioni collassabili, con anteprima live sulla destra.</li>
            </ul>
            <CalloutInfo>
              Accesso: solo utenti con ruolo <code>admin</code>. La rotta è{' '}
              <Link to="/admin/phonemes" className="text-cyan-300 hover:text-cyan-200 underline">/admin/phonemes</Link>.
            </CalloutInfo>
          </Section>

          {/* ═════════ LIST ═════════ */}
          <Section id="list" title="Vista Lista schede" icon={<LayoutList className="w-5 h-5" />}>
            <p>La lista mostra tutte le schede attualmente in database, con:</p>
            <ul>
              <li><b>Stats hero</b> — Totale, Pubblicate, Bozze in cima alla pagina.</li>
              <li><b>Ricerca</b> per id, IPA o parole di esempio.</li>
              <li><b>Filtri</b> Tutte / Pubblicate / Bozze.</li>
              <li>Ogni riga mostra il glifo IPA, esempi, contatore hotspot/parole, badge audio + video.</li>
            </ul>
            <p><b>Azioni per riga</b> (da sinistra a destra):</p>
            <ul>
              <li>🔗 <b>Apri anteprima pubblica</b> in una nuova tab</li>
              <li>👁 <b>Pubblica / Rimuovi dalla pubblicazione</b> — toggle immediato</li>
              <li>📋 <b>Duplica</b> — crea una copia in stato bozza (id <code>...-copy</code>) e apre l&apos;editor</li>
              <li>🗑 <b>Elimina</b> — con conferma</li>
              <li>✏ <b>Modifica</b> — apre l&apos;editor</li>
            </ul>
          </Section>

          {/* ═════════ ROADMAP ═════════ */}
          <Section id="roadmap" title="Vista Roadmap produzione" icon={<Target className="w-5 h-5" />}>
            <p>
              La roadmap è la vera <b>bussola</b> del progetto: mostra tutti i 44 fonemi ufficiali
              dell&apos;inglese standard (dal <code>PHONEME_CATALOGUE</code>) con lo stato reale nel DB.
            </p>
            <p><b>Cosa vedi:</b></p>
            <ul>
              <li><b>Progress ring</b> centrale — % di schede al 100%</li>
              <li><b>4 stat cards</b> — Totali · Iniziate (con %) · Pubblicate · Complete 100%</li>
              <li>
                <b>Priorità pedagogica</b>:{' '}
                <span className="text-red-300 font-bold">P0 ALTA</span> (short-monophthong + fricative,
                i più critici per italiani),{' '}
                <span className="text-amber-300 font-bold">P1 MEDIA</span> (long/plosive/affricate),{' '}
                <span className="text-slate-300 font-bold">P2 BASSA</span> (dittonghi + nasali + approximant).
              </li>
              <li>
                <b>Checklist a 6 criteri</b> per ogni scheda: Card in DB · Hotspot ≥5 · Parole ≥20 ·
                Audio · Video-lezione · Pubblicata.
              </li>
              <li>
                <b>CTA contestuale</b>: <span className="text-orange-300">Crea scheda</span> (arancione) se
                non esiste, <span className="text-cyan-300">Continua produzione</span> se &lt;100%,{' '}
                <span className="text-emerald-300">Ottimizza</span> se al 100%.
              </li>
            </ul>
            <CalloutInfo>
              <b>Ordine consigliato di produzione</b>: dall&apos;alto verso il basso. La lista è già ordinata per priorità
              decrescente, poi per completezza. Concentrati sulle P0 → P1 → P2.
            </CalloutInfo>
          </Section>

          {/* ═════════ BULK SEED ═════════ */}
          <Section id="bulk-seed" title="Popolamento rapido (bulk seed)" icon={<Wand2 className="w-5 h-5" />}>
            <p>
              Nel blocco &quot;Popolamento rapido&quot; della roadmap, il bottone{' '}
              <b className="text-orange-300">&quot;Crea N scheletri&quot;</b> genera in ~15 secondi tutte le schede
              mancanti come <b>bozze pre-compilate</b> con:
            </p>
            <ul>
              <li>id (slug canonico), IPA, displayIpa</li>
              <li>categoria + sotto-categoria</li>
              <li>3 parole di esempio (Wells lexical set)</li>
              <li>3 <code>commonWords</code> stub pronti da rifinire</li>
              <li>dialetti derivati dal <code>dialectScope</code> del catalogo</li>
            </ul>
            <CalloutInfo>
              Le schede create <b>non sono pubblicate</b> finché non le rifinisci manualmente.
              Puoi rieseguire il bulk seed più volte — creerà solo quelle ancora mancanti (idempotente).
            </CalloutInfo>
          </Section>

          {/* ═════════ EDITOR ═════════ */}
          <Section id="editor" title="Editor della scheda" icon={<GraduationCap className="w-5 h-5" />}>
            <p>
              L&apos;editor si apre cliccando <b>Modifica</b> in lista, <b>Continua produzione</b> dal roadmap,
              o <b>Nuova scheda</b> nella top bar. È strutturato in sezioni <b>collassabili</b>:
            </p>

            <SubSection title="1. Informazioni principali" icon={<Info className="w-4 h-4" />}>
              <p>Metadati base:</p>
              <ul>
                <li><b>ID</b> — slug URL (es: <code>u-foot</code>). Non modificabile dopo la creazione.</li>
                <li><b>Categoria</b> — Vocale / Dittongo / Consonante</li>
                <li><b>IPA</b> e <b>Display IPA</b> — es: <code>ʊ</code> e <code>/ʊ/</code></li>
                <li><b>Sotto-categoria</b> — short-lax, long-tense, plosive, fricative, ecc.</li>
                <li><b>Ordinamento</b> — numero: più basso = appare prima nella library</li>
                <li><b>Esempi</b> — chip input (premi Invio per aggiungerne uno)</li>
                <li><b>Pubblicata</b> — toggle. Se off, la scheda è in bozza e non appare nella library pubblica.</li>
              </ul>
            </SubSection>

            <SubSection title="2. Video-lezione" icon={<Video className="w-4 h-4" />}>
              <p>Opzionale. Se compilata, la scheda mostra un player YouTube cinematografico con overlay finale che invita alla registrazione.</p>
              <ul>
                <li><b>YouTube Video ID</b> — solo l&apos;ID, non l&apos;URL completo. Da <code>https://youtu.be/0-aau56RM9I</code> → prendi <code>0-aau56RM9I</code>.</li>
                <li><b>Titolo</b> — mostrato sopra il player.</li>
              </ul>
            </SubSection>

            <SubSection title="3. Immagini della scheda" icon={<ImageIcon className="w-4 h-4" />}>
              <p>4 URL o file da caricare:</p>
              <ul>
                <li><b>Side view</b> — vista sagittale, sfondo card principale + editor hotspot</li>
                <li><b>Front view</b> — attivazione muscoli facciali</li>
                <li><b>Front view — clean</b> — ritaglio circolare per la miniatura HUD</li>
                <li><b>Articulatory deep-dive</b> — modal di dettaglio</li>
              </ul>
              <CalloutInfo>
                Puoi trascinare i file direttamente sul campo, cliccare &quot;Upload&quot;, oppure incollare un URL esistente. Storage: <code>/api/uploads/</code>.
              </CalloutInfo>
            </SubSection>

            <SubSection title="4. Generatore audio ElevenLabs" icon={<Wand2 className="w-4 h-4" />}>
              <p>
                Il cuore della produttività audio. Analizza automaticamente il card e genera:
              </p>
              <ul>
                <li><b>2 audio isolati</b> del fonema (AmE + RP)</li>
                <li><b>6 frasi di esempio</b> (3 × 2 dialetti)</li>
                <li><b>1 frase mnemonica</b></li>
                <li><b>Fino a 30 parole comuni</b></li>
              </ul>
              <p>
                Un click su <b>&quot;Genera N&quot;</b> lancia una coda con concorrenza 2 (rispettando i rate limit ElevenLabs).
                Ogni riga ha checkbox + status icon + audio preview inline + refresh singolo.
                Usa &quot;Seleziona mancanti&quot; / &quot;Deseleziona&quot; per gruppo per accelerare.
              </p>
            </SubSection>

            <SubSection title="5. Frasi di esempio + frase mnemonica + guida" icon={<Type className="w-4 h-4" />}>
              <p>
                Le 3 frasi mostrate sotto la card + la frase mnemonica al centro.
                Ogni riga ha un ChipInput per le parole da evidenziare in arancione (highlights).
                La <b>guida alla pronuncia</b> è un Repeater di passaggi (Jaw, Lips, Tongue, ...) — trascina le frecce ▲▼ per riordinare.
              </p>
            </SubSection>

            <SubSection title="6. Hotspot anatomici (editor visuale)" icon={<MousePointer2 className="w-4 h-4" />}>
              <p><b>Il pezzo più impressionante dell&apos;editor.</b> Modalità Visuale (default) vs Tabellare.</p>
              <p>In modalità visuale:</p>
              <ul>
                <li><b>Clicca su un&apos;area vuota</b> dell&apos;immagine sagittale → crea un nuovo hotspot in quella posizione</li>
                <li><b>Clicca su un puntino</b> → apre pannello destro con tutti i campi (label, title, role, detail, anatomia, kinetic cue)</li>
                <li><b>Trascina un puntino</b> → aggiorna le coordinate X/Y in tempo reale</li>
                <li>Toggle &quot;Mostra/Nascondi etichette&quot; per lavorare con più dettaglio</li>
              </ul>
              <CalloutInfo>
                Suggerimento: parti dagli hotspot passive (Alveolar ridge, Hard palate) → poi active (Dorsum, Blade) →
                infine lipping/velum/pharynx. Segui la topografia dall&apos;alto verso il basso.
              </CalloutInfo>
            </SubSection>

            <SubSection title="7. Parole comuni" icon={<BookOpen className="w-4 h-4" />}>
              <p>Repeater compatto con 3 colonne: parola · IPA · URL audio. Consigliate 20–30 parole per scheda.</p>
            </SubSection>

            <SubSection title="8. Sezioni grafiche" icon={<Sparkles className="w-4 h-4" />}>
              <p>Le sezioni <b>Ortografia</b>, <b>Grafico frequenza</b>, <b>Features</b>, <b>Manopole</b>, <b>Muscoli facciali</b>, <b>Classificazione</b>, <b>Curiosità</b>, <b>Posizione vowel chart</b> hanno tutte Repeater dedicati. Per la vowel chart position puoi anche <b>cliccare direttamente</b> sulla mini-griglia per impostare X/Y visivamente.</p>
            </SubSection>

            <SubSection title="Expert mode (JSON)" icon={<AlertCircle className="w-4 h-4" />}>
              <p>Come ultima sezione trovi un textarea JSON con tutti i dati grafici. È un&apos;<b>escape hatch</b> per import/export massivi o edge case. Se lo modifichi, le modifiche fatte qui sostituiscono quelle degli editor sopra.</p>
            </SubSection>
          </Section>

          {/* ═════════ LIVE PREVIEW ═════════ */}
          <Section id="preview" title="Anteprima live (sidebar destra)" icon={<Info className="w-5 h-5" />}>
            <p>
              La colonna di destra dell&apos;editor mostra un&apos;<b>anteprima in tempo reale</b> che si aggiorna
              mentre digiti. Include:
            </p>
            <ul>
              <li>Glifo IPA, esempio principale, categoria, dialetti</li>
              <li>Immagine sagittale con i puntini hotspot già posizionati</li>
              <li>Checklist a 6 criteri (Metadata / Hotspot / Parole / Audio / Video / Pubblicata)</li>
              <li>Preview delle 3 frasi di esempio con highlight</li>
              <li>Preview della frase mnemonica</li>
              <li>Chip per ogni parola comune (verde se ha audio, grigia se no)</li>
              <li>Barra di completezza in %</li>
            </ul>
            <p>Cliccando <b>&quot;Apri pubblica&quot;</b> in cima all&apos;anteprima si apre la card pubblica in una nuova tab (solo se già salvata).</p>
          </Section>

          {/* ═════════ WORKFLOW ═════════ */}
          <Section id="workflow" title="Workflow completo (step-by-step)" icon={<Target className="w-5 h-5" />}>
            <p>Dal fonema mancante al pubblicato, in ~5 minuti:</p>
            <ol className="space-y-3">
              <li>
                <b>1. Roadmap</b> → clicca &quot;Popolamento rapido&quot; (una volta sola per popolare tutti gli scheletri) O
                clicca la P0 più critica.
              </li>
              <li>
                <b>2. Editor apre pre-compilato</b> — id, IPA, categoria, esempi già impostati dal catalogo.
              </li>
              <li>
                <b>3. Upload immagini</b> (sezione 3) — trascina i 4 file anatomici, ~30 sec.
              </li>
              <li>
                <b>4. Bulk audio</b> (sezione 4) — clicca &quot;Genera N&quot; con tutte le voci selezionate. In ~90 sec hai tutti gli MP3 pronti.
              </li>
              <li>
                <b>5. Hotspot visuali</b> (sezione 6) — clicca sull&apos;immagine per posizionare i 8–10 punti articolatori chiave, poi compila il pannello destro per ognuno. ~90 sec.
              </li>
              <li>
                <b>6. Frasi + mnemonica + guida</b> (sezioni 5) — 3 frasi di esempio, una frase mnemonica memorabile, 6-7 passaggi articolatori. ~2 min.
              </li>
              <li>
                <b>7. Verifica dall&apos;anteprima live</b> a destra — checklist a 6 criteri, se tutte verdi sei a posto.
              </li>
              <li>
                <b>8. Salva e pubblica</b> — bottone verde in fondo. La scheda va live su <code>/lms/phoneme/{'{id}'}</code>.
              </li>
            </ol>
          </Section>

          {/* ═════════ TIPS ═════════ */}
          <Section id="tips" title="Suggerimenti pedagogici" icon={<Lightbulb className="w-5 h-5" />}>
            <ul>
              <li>
                <b>Frase mnemonica</b>: 6-8 parole, tutte contenenti il fonema target. Ripetibile 5×.
                Es: &quot;Pull the wool, push the hood, put the foot.&quot;
              </li>
              <li>
                <b>Hotspot</b>: 8-10 è il numero ideale. Sotto ne bastano, sopra confondono. Sempre:
                Alveolar ridge / Hard palate / Apex / Blade / Dorsum / Lips / Velum / Pharynx / Larynx.
              </li>
              <li>
                <b>Common words</b>: mix di frequenti (look, put, foot) + business-relevant (should, could, would) + curiose (bullfight, cookie).
              </li>
              <li>
                <b>Kinetic cue</b>: descrivi una sensazione motoria concreta che lo studente può replicare. &quot;Imagine…&quot;, &quot;Feel…&quot;, &quot;Place…&quot;
              </li>
              <li>
                <b>Highlights</b>: nelle frasi di esempio, evidenzia SEMPRE la parola contenente il fonema target.
              </li>
            </ul>
          </Section>

          {/* ═════════ TROUBLESHOOTING ═════════ */}
          <Section id="troubleshoot" title="Troubleshooting" icon={<AlertCircle className="w-5 h-5" />}>
            <dl className="space-y-4">
              <div>
                <dt className="text-cyan-200 font-bold">L&apos;anteprima pubblica non si apre / mostra 404</dt>
                <dd className="text-slate-400 mt-1">La scheda deve essere <b>Pubblicata</b> (toggle nella sezione Informazioni principali) per essere visibile in <code>/lms/phoneme/{'{id}'}</code>. Le bozze sono visibili solo dall&apos;admin.</dd>
              </div>
              <div>
                <dt className="text-cyan-200 font-bold">L&apos;audio non parte</dt>
                <dd className="text-slate-400 mt-1">
                  Verifica che l&apos;URL nel campo audio inizi con <code>/api/uploads/…</code> o sia un URL HTTPS pubblico.
                  Il player HTML5 non riproduce URL relativi senza il base URL.
                </dd>
              </div>
              <div>
                <dt className="text-cyan-200 font-bold">Il bulk audio si ferma dopo poche clip</dt>
                <dd className="text-slate-400 mt-1">
                  Probabile rate-limit ElevenLabs. Aspetta 30 sec e clicca di nuovo &quot;Genera&quot; sui rimanenti. La coda skippa in automatico gli item già completati.
                </dd>
              </div>
              <div>
                <dt className="text-cyan-200 font-bold">Video-lezione mostra &quot;Video unavailable&quot;</dt>
                <dd className="text-slate-400 mt-1">
                  Nell&apos;editor di anteprima in modalità headless capita — nel browser vero funziona. Verifica sempre in una tab normale.
                </dd>
              </div>
              <div>
                <dt className="text-cyan-200 font-bold">Ho perso delle modifiche</dt>
                <dd className="text-slate-400 mt-1">
                  In alto a destra c&apos;è l&apos;indicatore &quot;● Modifiche non salvate&quot; in ambra. Salva spesso con il bottone &quot;Salva come bozza&quot; nel footer.
                </dd>
              </div>
            </dl>
          </Section>

          <div className="mt-12 flex flex-wrap items-center gap-3 pt-8 border-t border-slate-800">
            <Link to="/admin/phonemes">
              <Button className="bg-cyan-600 hover:bg-cyan-500">
                <LayoutList className="w-4 h-4 mr-1.5" />
                Torna al Phoneme CMS
              </Button>
            </Link>
            <Link to="/lms/phonemes" target="_blank" rel="noreferrer">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Apri Phonetic Library pubblica
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Section({ id, title, icon, children }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24" data-testid={`help-section-${id}`}>
      <h2 className="flex items-center gap-2.5 text-2xl font-black text-white mb-4 pb-2 border-b border-cyan-500/20">
        <span className="text-cyan-300">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-slate-300 leading-relaxed text-sm [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-200 [&_code]:text-xs">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900 transition text-left"
      >
        <span className="inline-flex items-center gap-2 text-cyan-100 font-bold text-sm">
          <span className="text-cyan-400">{icon}</span>
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function CalloutInfo({ children }) {
  return (
    <div className="my-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-cyan-100 flex items-start gap-2">
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-300" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
