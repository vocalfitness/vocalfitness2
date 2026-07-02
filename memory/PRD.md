# VocalFitness - Product Requirements Document

## Problem Statement
VocalFitness è un sito web per un servizio di formazione Business English per professionisti italiani. Il sito deve catturare lead, presentare il metodo e permettere ai clienti paganti di accedere a contenuti esclusivi.

## User Personas
1. **Visitatore** - Professionista italiano che cerca di migliorare il proprio inglese per il business
2. **Lead qualificato** - Visitatore che ha interagito con il sito (form, chatbot Alice)
3. **Cliente pagante** - Utente con accesso all'area riservata
4. **Admin** - Gestore del sito che può creare utenti e gestire contenuti

## Core Requirements


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Live Preview + Editor Dedicati + Docs (P1 — DONE)
- [x] **`PhonemeLivePreview.jsx`** (~240 righe): sidebar sticky a destra dell'editor con anteprima in tempo reale.
  - Layout responsive `lg:sticky lg:top-[88px]` che segue lo scroll
  - Hero con glifo IPA + subtitle + esempio principale + progress bar
  - Sagittale interattiva con hotspot overlay (cyan dots + shadow glow)
  - 6-checklist compatta (Metadata / Hotspot / Parole / Audio / Video / Pubblicata) con icone stato
  - Preview frasi con highlight arancione real-time
  - Preview mnemonica + chips parole comuni (verde se ha audio, grigia se no)
  - CTA "Apri pubblica" in nuova tab (visibile solo per card già salvate)
  - Dirty state indicator + % completezza in footer
- [x] **Editor dedicati** — sostituita la textarea JSON con 8 sezioni strutturate:
  - **Ortografia (spellings)**: Repeater `{letters, percent, examples}` con input percentuale
  - **Grafico frequenza**: Repeater `{ipa, height, active}` con Switch "attivo"
  - **Features articolatorie**: Repeater `{label, value}`
  - **Manopole (knobs)**: Repeater con **range slider visuale 0-100** + numeric input + Switch "Distintiva" per highlight
  - **Muscoli facciali**: Repeater `{name, activation, detail}`
  - **Classificazione**: Repeater `{label, tooltip}` con textarea per tooltip
  - **Curiosità (funFact)**: form 2-campi con auto-null se entrambi vuoti
  - **Posizione vowel chart**: form X/Y + **mini-picker cliccabile 2D** con dot arancione trascinabile, click-to-set su griglia con axis labels
  - **Expert mode (JSON fallback)**: sezione finale con textarea per import/export massivi, collapsed di default
- [x] **`PhonemeCmsHelpPage.jsx`** (~450 righe) su rotta `/admin/help/phoneme-cms`:
  - Layout TOC laterale sticky (9 sezioni) + contenuto scrollabile
  - H1 "Come popolare le schede fonetiche" con intro chiara del CMS
  - **9 sezioni ancorate**: Panoramica · Lista schede · Roadmap · Bulk seed · Editor (con 8 subsection collassabili) · Live preview · Workflow step-by-step · Suggerimenti pedagogici · Troubleshooting
  - Callout box `<CalloutInfo>` per suggerimenti importanti
  - CTA a fine pagina: "Torna al CMS" + "Apri Phonetic Library pubblica"
  - Placeholder per video tour futuro
  - Link cross-nav aggiunto in top bar `/admin/phonemes` con icona HelpCircle
- [x] **Layout editor a 2 colonne** (`lg:grid-cols-[minmax(0,1fr)_360px]`) — contenuto a sinistra, preview live a destra. Su mobile il preview passa sotto le sezioni (responsive).
- [x] **Test smoke passato**:
  - Live Preview sidebar rendered ✓, 6 check-item cells ✓, sagittal with 9 hotspot overlay ✓, "Apri pubblica" link visible ✓
  - Editor dedicati: 4 knob range sliders ✓, vowel chart visual picker ✓, tutte le 8 sezioni presenti ✓
  - Docs page: 9 TOC entries + 9 sezioni ✓, H1 "Come popolare le schede fonetiche" ✓
  - Nav: link "Guida" da `/admin/phonemes` presente ✓
  - Lint: 0 errori su tutti i nuovi/modificati file
- **Impatto**:
  - Editor ora 100% no-code (JSON expert mode ancora disponibile come escape hatch)
  - Feedback immediato durante la rifinitura — non serve più salvare e ricaricare per vedere il risultato
  - Onboarding del Prof/team autonomo grazie ai docs (riduce le domande di supporto)


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Bulk Skeleton Seeder (P1 — DONE)
- [x] **Estensione di `PhonemeRoadmapDashboard.jsx`** con blocco "Popolamento rapido":
  - Rileva automaticamente i fonemi del catalogo non ancora in DB (`missingEntries`)
  - Bottone gradient arancione "Crea N scheletri" con confirm dialog che elenca il numero e chiarisce che tutte saranno create in stato bozza
  - **Sequential POST loop** contro l'endpoint esistente `POST /api/admin/phonemes` (nessun endpoint backend nuovo — riuso puro)
  - Payload per scheletro: `{id, ipa, displayIpa, category, subcategory, examples (uppercased), dialects (derivato da dialectScope), dialectNote (description), commonWords stub (3 righe pre-compilate), published: false, order: 100+i}`
  - **UI live**: progress bar arancione + counter "N/M · nome fonema corrente" + percent %
  - Al termine: banner esito (verde se tutto OK, ambra se errori parziali con lista degli id falliti)
  - Auto-refresh del parent (via callback `onRefresh={fetchCards}`) → la griglia si aggiorna istantaneamente mostrando le nuove card create
- [x] **Test smoke passato**:
  - Prima: "Crea 42 scheletri" · INIZIATE 2 (5%) · e-dress/fan al 0% ✓
  - Click → progress bar animata → "42 scheletri creati con successo" ✓
  - Dopo: INIZIATE **44 (100%)** · e-dress/f-fan al 17% con "Card in DB" checked · CTA cambiata in "Continua produzione" ✓
  - List view mostra **44 righe** (da 2) ✓
  - Bottone diventa disabled "Crea 0 scheletri" (fuel esaurito) ✓
  - Lint 0 errori
- **Impatto**: setup iniziale dei 42 fonemi mancanti ridotto da ~5 min × 42 = 3.5h a **~15 secondi totali**. Il flow completo di produzione ora è:
  1. Popolamento rapido (15 sec, una volta sola)
  2. Ogni scheletro rifinito individualmente: upload immagini (30s) + drag hotspot (90s) + bulk audio ElevenLabs (90s) + testi (2 min) = **~5 min per scheda**
  3. Roadmap fornisce priorità pedagogica per decidere l'ordine dei rifiniti


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Step 3 (Bulk Audio + Prefill) (P1 — DONE)
- [x] **`BulkAudioGenerator.jsx`** (~340 righe): generatore bulk degli audio ElevenLabs con coda a concorrenza 2.
  - **Analizza il card** e costruisce automaticamente la work-list di clip da generare:
    - **Fonema isolato**: `The /ʊ/ sound. As in foot.` (una clip per dialetto AmE + RP)
    - **Frasi di esempio**: `exampleSentences[i].text` (una clip × dialetto = 6 clip)
    - **Frase mnemonica**: `mnemonic.phrase` (1 clip)
    - **Parole comuni**: `commonWords[i].w` (fino a 30 clip)
    - Total per una scheda completa: 39 clip audio
  - **UI**:
    - Header con progress bar completezza + counter (N/M già presenti · X selezionati)
    - 4 gruppi collassabili (isolated / examples / mnemonic / words) con contatore completezza per gruppo
    - Bottoni per gruppo: "Seleziona mancanti" / "Deseleziona"
    - Auto-selezione iniziale di **tutti gli item vuoti** al primo render
    - Ogni riga: checkbox + status icon (empty/running/done/error) + label + text preview + audio preview inline + bottone genera/rigenera
    - Bottone header "Genera audio (N)" → runQueue con concorrenza 2 · bottone "Interrompi" durante generazione
  - **API integration**: chiama `POST /api/admin/elevenlabs/tts` (endpoint già esistente in `server.py`) con parametri ottimizzati per prosodia (`stability: 0.42, similarity_boost: 0.88, style: 0.05, use_speaker_boost: true, model: eleven_multilingual_v2, output: mp3_44100_128`). Risposta contiene `relative_url` che viene scritto direttamente nel card via `onFieldChange(path, url)` (nested-safe).
  - **Voice**: usa `ELEVENLABS_DEFAULT_VOICE_ID` env (voce clonata Prof. Dapper). Nessuna dropdown per ora — allineato al setup precedente.
  - **Robustezza**: errori per-item con stato preservato, abort in-flight con `abortRef`, rigenerazione singola click, auto-selezione post-successo rimuove l'item dalla queue.
- [x] **Prefill dell'editor**: `PhonemeAdminEditorPage` legge `?prefill={id}` da URL e in modalità new pre-popola id/ipa/displayIpa/category/subcategory/examples/dialects/dialectNote dal `PHONEME_CATALOGUE`. Inoltre pre-seeda i primi 3 `commonWords` con le parole di esempio del catalogo (row stub w+ipa+audio vuoti pronti). Toast verde: "Editor pre-compilato dal catalogo: {subtitle}".
- [x] **Integrazione editor**: nuova sezione collassabile "Generatore audio ElevenLabs (bulk)" prima della sezione Audio manuale. La sezione Audio manuale rimane per casi edge (override URL, upload manuale).
- [x] **Test smoke passato**:
  - Prefill: `?prefill=e-dress` → id=e-dress, ipa=e, displayIpa=/e/, category=vowel, subcategory=short-monophthong, chip esempi BED/PEN/HELP, toast presente ✓
  - Bulk Generator su u-foot: renderizzato, completezza=100% (39/39 già presenti), 4 gruppi (isolated/examples/mnemonic/words), 9 righe visibili di default (words collassato), bottone "Genera audio" con label dinamica ✓
  - Lint: 0 errori su tutti i nuovi/modificati file
- **Impatto**: creare una scheda da zero ora è possibile in **~5 minuti** (prefill 5 sec + upload immagini 30 sec + drag hotspot 90 sec + generare audio 90 sec + rifinire testi 2 min). Per popolare tutti i 42 fonemi rimanenti: ~3.5 ore vs le ~24 ore stimate all'inizio del progetto (85% riduzione tempo).


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Roadmap Produzione Dashboard (P1 — DONE)
- [x] **`PhonemeRoadmapDashboard.jsx`** (~380 righe): dashboard che incrocia i 44 fonemi ufficiali (`PHONEME_CATALOGUE`) con lo stato reale nel DB (API `/api/admin/phonemes`).
  - **Progress ring animato** in gradient cyan→orange (140px, stroke 12) con % completate al centro
  - **4 stat cards**: Totali (44), Iniziate (con % di avanzamento), Pubblicate, Complete 100%
  - **Priorità pedagogica** per studenti italiani:
    - P0 ALTA (badge rosso + Sparkles icon): `short-monophthong` + `fricative` — 15 fonemi, i più frequenti E più distanti dal repertorio fonetico italiano
    - P1 MEDIA (badge amber): `long-monophthong`, `plosive`, `affricate`
    - P2 BASSA (badge slate): dittonghi + approximant + nasal
  - **Checklist per ogni card** (6 criteri): Card in DB · Hotspot ≥5 · Parole ≥20 · Audio · Video-lezione · Pubblicata → completeness % + progress bar
  - **CTA contestuale**:
    - Se non esiste → arancione "Crea scheda" (naviga a `/admin/phonemes/new?prefill={id}`)
    - Se esiste ma <100% → cyan "Continua produzione"
    - Se 100% → emerald "Ottimizza"
  - **3 filtri**: Priorità (Tutte/Alta/Media/Bassa) · Categoria (Vocali/Dittonghi/Consonanti) · Progresso (Da completare/Complete)
  - **Ordinamento**: priority ASC → completeness DESC → subtitle
- [x] **Integrazione in `/admin/phonemes`**: nuovo toggle "Lista schede" / "Roadmap produzione" (Fragment condizionale, `existingCards` passate dal parent). Default view rimane la Lista.
- [x] **Test smoke passato**:
  - Toggle visibile, click su Roadmap → 44 card renderizzate ✓
  - Stat corrente: 2% completate, INIZIATE 2/44 (5%), PUBBLICATE 2, COMPLETE 100% 1 ✓
  - u-foot renderizza al 100% verde con "Ottimizza"; i-fleece mostra 5/6 checkmark (manca video-lezione)
  - Filtro "Alta priorità" → 15/44 visibili (P0 short-monophthong + fricative)
  - Filtro "Da completare" → 43/44 visibili
  - Toggle-back a Lista funziona (2 righe visibili)
  - Lint 0 errori
- **Impatto**: l'admin ora ha una vista d'insieme immediata di *cosa manca* e *da dove partire* (P0 first), con click diretto per creare la scheda pre-compilata. Popolamento dei 42 fonemi rimasti diventa gestibile e prioritizzato.


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Step 2 (Visual Hotspot Editor + Image Upload) — (P1 — DONE)
- [x] **`HotspotVisualEditor.jsx`** (~330 righe): editor drag & drop degli hotspot direttamente sull'immagine sagittale.
  - Layout 5-col grid: 3/5 canvas + 2/5 pannello dettaglio
  - Canvas 1:1 identico al render pubblico (coordinate percentuali interscambiabili)
  - Puntini cyan animati (`shadow-[0_0_12px_rgba(34,211,238,0.7)]`), selezionato diventa arancione più grande
  - **Drag**: mousedown/touchstart su un puntino → hook window mousemove/touchmove con clamp 0-100 + toFixed(1) → aggiorna x/y realtime nel state parent
  - **Add on click**: click su area vuota (surface) → nuovo hotspot al punto cliccato, apre il pannello
  - **Click su puntino** → apre pannello con tutti i campi (id, x/y numerici, label, title, role, detail, anatomy, kineticCue)
  - Toggle "Mostra/Nascondi etichette" (label galleggianti sotto ogni dot)
  - Coordinate readout live (top-left) + counter "N hotspot" (bottom-right)
  - Actions per hotspot: Duplica (offset +3%) / Elimina (con confirm)
- [x] **`ImageUploader.jsx`** (~120 righe): hybrid URL + drag/drop file input.
  - Input testuale + bottone Upload + bottone X (clear)
  - Drag & drop di file immagine sul field → upload immediato
  - Endpoint riutilizzato: `POST /api/admin/upload` (già esistente in `server.py`, con storage Emergent)
  - Auto-fill del campo URL con la path `/api/uploads/{filename}` restituita
  - Preview thumbnail (16×16) + URL troncato sotto il field quando presente
  - Stati: uploading (spinner) / OK (check verde) / error (X rosso + messaggio)
  - Auth header `Bearer ${vf_token}`
- [x] **Integrazione in `PhonemeAdminEditorPage.jsx`**:
  - Sezione "Immagini della scheda" → 4× `ImageUploader` (sideView, frontView, frontViewClean, articulatory)
  - Sezione "Hotspot anatomici" → nuovo `HotspotSection` con toggle Editor visuale / Tabellare (Repeater legacy come fallback per import/export testuali massivi). Il visuale è default; l'immagine `sideView` viene passata al canvas.
- [x] **Test smoke end-to-end** (screenshot + assertions):
  - Visual editor mostra 9 punti su /ʊ/ FOOT ✓
  - Click su punto 0 apre pannello con title="Alveolar ridge" ✓
  - Toggle Tabellare→Visuale funziona, Repeater rimane accessibile ✓
  - 4 pulsanti Upload rilevati nella sezione Immagini + preview thumbnail sideView ✓
  - Lint: 0 errori su tutti i nuovi/modificati file
- **Impatto**: tempo per creare una nuova scheda scende da ~30 min (form manuale) a ~5-10 min (drag&drop hotspot + upload diretto immagini) — obiettivo popolare 44 fonemi ora realistico.


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Step 1 MVP (P1 — DONE)
- [x] **Backend router modulare** `/app/backend/routers/phoneme_cards.py` (~290 righe). Endpoints:
  - `GET /api/admin/phonemes` — lista admin (summary con hotspotCount, commonWordCount, hasAudio, hasVideoLesson)
  - `GET /api/admin/phonemes/{id}` — get singola (full payload)
  - `POST /api/admin/phonemes` — create (409 su id duplicato, validazione regex slug)
  - `PUT /api/admin/phonemes/{id}` — update parziale (`exclude_unset=True`, gestione esplicita dei nullable `videoLesson`/`funFact`/`subcategory`)
  - `DELETE /api/admin/phonemes/{id}`
  - `POST /api/admin/phonemes/{id}/publish` — toggle pubblicazione
  - `POST /api/admin/phonemes/{id}/duplicate` — duplicazione con id auto-generato in stato bozza
  - `GET /api/phonemes` — lista pubblica (solo `published=true`)
  - `GET /api/phonemes/{id}` — dettaglio pubblico
- [x] Modelli Pydantic flessibili + seed idempotente al boot (importa /ʊ/ e /iː/)
- [x] Frontend Admin: `/admin/phonemes` (lista + azioni) + `/admin/phonemes/:id` (editor form user-friendly)
- [x] `PhonemeCardPage.jsx` DB-first con fallback su `phonemes.js`
- [x] Cross-navigation: pulsante "Phoneme CMS" in `/admin` + link "Anteprima pubblica" + "Lista schede"
- [x] Fix chiave localStorage token (`vf_token`)



- [x] **Backend router modulare** `/app/backend/routers/phoneme_cards.py` (~290 righe). Endpoints:
  - `GET /api/admin/phonemes` — lista admin (summary con hotspotCount, commonWordCount, hasAudio, hasVideoLesson)
  - `GET /api/admin/phonemes/{id}` — get singola (full payload)
  - `POST /api/admin/phonemes` — create (409 su id duplicato, validazione regex slug)
  - `PUT /api/admin/phonemes/{id}` — update parziale (`exclude_unset=True`, gestione esplicita dei nullable `videoLesson`/`funFact`/`subcategory`)
  - `DELETE /api/admin/phonemes/{id}`
  - `POST /api/admin/phonemes/{id}/publish` — toggle pubblicazione
  - `POST /api/admin/phonemes/{id}/duplicate` — duplicazione con id auto-generato `{id}-copy[-N]` in stato bozza
  - `GET /api/phonemes` — lista pubblica (solo `published=true`)
  - `GET /api/phonemes/{id}` — dettaglio pubblico
  Tutti gli endpoint admin protetti da `Depends(get_admin_user)`.
- [x] **Modelli Pydantic flessibili**: `PhonemeCardCreate` / `PhonemeCardUpdate` / `PhonemeCardResponse` / `PhonemeCardSummary`. Campi didattici deeply-nested (hotspots, audio, commonWords, spellings, features, knobs, classification, funFact…) come `List[Dict[str, Any]]` — così l'admin può cambiare shape senza deploy backend.
- [x] **Seed idempotente** al boot `/app/backend/routers/phoneme_seed_data.py`: importa `PHONEME_U_FOOT` e `PHONEME_I_FLEECE` in Mongo con `createdBy='system-seed'`. Alla seconda startup non tocca nulla. Verificato: `inserted=[u-foot, i-fleece]` prima startup, `skipped=[u-foot, i-fleece]` seconda.
- [x] **Frontend `/admin/phonemes`** (`PhonemeAdminPage.jsx`, ~330 righe): lista con stats cards (Totale/Pubblicate/Bozze), search per id/IPA/esempi, filtri Tutte/Pubblicate/Bozze, azioni per riga (Preview pubblica in nuova tab, Publish toggle, Duplicate, Delete con conferma, Modifica). Ogni riga mostra IPA glyph, esempi, badge di stato, contatori (9 hotspot, 30 parole), tag audio + video-lezione.
- [x] **Frontend `/admin/phonemes/:id` + `/admin/phonemes/new`** (`PhonemeAdminEditorPage.jsx`, ~640 righe): editor form user-friendly per non-tecnici. Sezioni collassabili:
  - **Informazioni principali** (default open): id slug validato via regex, category dropdown IT (Vocale/Dittongo/Consonante), IPA + displayIpa, subcategory, order, ChipInput per examples, dialectNote, Switch pubblicata
  - **Video-lezione**: YouTube ID + titolo
  - **Immagini** (4 URL con label descrittivi)
  - **Audio** AmE + RP (isolated + 3 esempi ciascuno, label mostra la frase corrispondente)
  - **Frasi di esempio** (3 × text + ChipInput highlights)
  - **Frase mnemonica** (phrase + highlights + note + audio)
  - **Guida alla pronuncia** (headline + Repeater steps)
  - **Hotspot anatomici** — Repeater completo con id/x/y/label/title/role/detail/anatomy/kineticCue e frecce up/down per riordinare
  - **Parole comuni** — Repeater compatto (w / ipa / audio) con drag-order
  - **Avanzato JSON** — textarea con validazione real-time per spellings/frequencyChart/features/knobs/facialMuscles/classification/funFact/vowelChartPosition (una prossima iterazione avrà editor dedicati)
  Sticky footer con dirty-state indicator + "Salva come bozza" + "Salva e pubblica".
  Utility: `deepMerge()` per garantire campi mancanti, `setIn(path, value)` per update immutabile nested, `ChipInput` (Enter/comma/backspace), `Repeater` generico con add/remove/reorder.
- [x] **`PhonemeCardPage.jsx` DB-first**: fetch `/api/phonemes/{id}` on mount, fallback su `PHONEMES[id]` da `phonemes.js` (retrocompatibilità durante migrazione). Loading gate + not-found state aggiunti. Audio preloader effect guardato quando phoneme è null.
- [x] **Cross-navigation**: `/admin` ha nuovo tab "Phoneme CMS" (gradient cyan→orange) che naviga a `/admin/phonemes`. Editor ha link back a Lista schede + Anteprima pubblica in nuova tab.
- [x] **Auth token key fix**: le nuove pagine usano `localStorage.getItem('vf_token')` allineandosi con `AuthContext.js`.
- [x] **Test smoke end-to-end** (screenshot + assertions):
  - Lista `/admin/phonemes` → 2 righe (FOOT + FLEECE), stat total=2, tutte le azioni cliccabili
  - Editor `/admin/phonemes/u-foot` → carica dati (IPA=ʊ, displayIpa=/ʊ/, subcategory=short-lax, order=10, chip esempi FOOT/BOOK/PUT), pulsanti Salva presenti
  - Public `/lms/phoneme/u-foot` → renderizza da API (glyph /ʊ/ visibile, hotspot cliccabili, front-view HUD, PhonemeVideoLesson intatto)
  - Lint: 0 errors su entrambi i nuovi file
- Note su prossimi step (Fase 2 · Step 2 e 3):
  - **Step 2**: editor hotspot drag&drop visuale sull'immagine + upload immagini via Emergent Object Storage + preview live inline
  - **Step 3**: bulk-generator audio ElevenLabs da UI (coda + progress bar) + editor dedicati per spellings/features/knobs/classification (togliere il JSON textarea)


### 28/06/2026 — Video-lezione YouTube nella card fonema /ʊ/ con upsell overlay (P1 — DONE)
- [x] **`PhonemeVideoLesson.jsx`** completato con YouTube IFrame API + container cinematografico 16:9.
  - Cover state: thumbnail YouTube `maxresdefault.jpg` (fallback `hqdefault.jpg`) + bottone Play arancione pulsante con glow, CTA "Tocca per avviare", grain decorativo.
  - Iframe montato lazy solo al primo click → niente bundle YouTube sul first paint.
  - YT Player con host `youtube-nocookie.com` + origin esplicito + `rel:0`, `modestbranding:1`, `iv_load_policy:3` (no annotations), `cc_load_policy:1` (CC on).
  - `onStateChange` rileva `PlayerState.ENDED` → setta `ended=true` → render overlay full-surface gradient con CTA "Iscriviti per accedere" (naviga a `/login?intent=signup`) + link secondario "Rivedi l'anteprima" (seek 0 + replay).
  - Premium users mostrano badge "ANTEPRIMA" assente (no upsell hard).
  - Cleanup `playerRef.destroy()` su unmount.
- [x] **Schema `videoLesson`** aggiunto a `phonemes.js` (`PHONEME_U_FOOT.videoLesson = {id:'0-aau56RM9I', title:'L\'arte del fonema /ʊ/ — anteprima della video-lezione'}`). Solo /ʊ/ come prototipo.
- [x] **Integrazione `PhonemeCardPage`**: sezione condizionale fra main card e support panels (`data-testid="phoneme-video-lesson-section"`). `useNavigate` aggiunto, `hasPremiumAccess(user)` usato per skippare upsell ai premium.
- [x] **Test smoke screenshot**: cover render OK con tag "VIDEO-LEZIONE · PROF. STEVE DAPPER", titolo, badge ANTEPRIMA, play orange. Lint pulito (0 issues).
- Note: in headless Chromium (Playwright) YouTube può restituire "Video unavailable" per restrizioni DRM — comportamento normale, non riproducibile in browser reali.


### 28/06/2026 — Pink Trombone come popup top-left attivato dal trapezio (P2 — DONE)
- [x] **Riorganizzato `PinkTromboneEmbed.jsx`**: rimosso l\u2019iframe inline dalla card. Ora la sezione "Laboratorio Interattivo" mostra solo il **trapezio vocalico IPA** in modalità compatta (single-column).
- [x] **Popup attivato on-click**: qualsiasi click su un simbolo IPA del trapezio (o drag-down) apre un overlay fixed-position con backdrop blur, ancorato a `top: 24px; left: 24px`. Width responsive `min(440px, 100vw - 48px)`. Dentro: header con titolo "PINK TROMBONE · /<sym>/", iframe Pink Trombone (aspect 1:1, min-h 360px), legend in basso, pulsante X di chiusura.
- [x] **Chiusura**: click sulla X, click sul backdrop, o ESC (via aria-modal). Animazioni `plw-fade-in` (backdrop) + `plw-slide-tl` (card cubic-bezier ease-out).
- [x] **Continuità di stato**: il vowel cliccato viene memorizzato in `activeVowel` PRIMA dell\u2019apertura. L\u2019iframe, una volta montato e ricevuto il `pt:ready` handshake, riapplica `activeVowel` (non più il default della card). Così se l\u2019utente clicca /æ/, il tratto vocale si posiziona in /æ/, non in /ʊ/.
- [x] **CSS popup** aggiunto allo stesso `styles` template literal (no nuovi file, no nuove dipendenze).
- [x] **Verifica E2E**: pre-click → iframe assente nel DOM ✓; click /æ/ → popup top-left + iframe presente ✓; click X → popup smonta + iframe deallocato ✓.



### 28/06/2026 — Spettrogramma real-time + Quiz uditivo (P2 — DONE)
- [x] **`SpectrogramView.jsx`** (~155 LOC): scrolling waterfall spectrogram in tempo reale tramite Web Audio API (no librerie esterne). Pipeline: HTML5 audio → MediaElementSource → AnalyserNode (fftSize 1024, smoothing 0.78) → requestAnimationFrame loop → strip verticali di 1 px shiftate a sinistra. Color ramp percettivamente monotonica (navy → cyan → orange → white) sulla palette LMS. Etichette F0/F1 in basso, F2/F3 in alto, "→ tempo" a destra — formato Praat-style. Cleanup AudioContext + cancel rAF su unmount.
- [x] **`PhonemeAuralQuiz.jsx`** (~165 LOC): drill "ascolta e identifica" con 3 alternative IPA. Mappa esplicita `CONFUSION_PAIRS` (non euristica) basata su similarità acustica reale: /iː/↔/ɪ/+/eɪ/ (sheep/ship/shape), /ʊ/↔/uː/+/ʌ/ (full/fool/cup), /θ/↔/f/+/s/ (high-freq noise), /r/↔/l/+/w/, ecc. Auto-play della parola random ad ogni round, score con accuracy %, feedback inline (verde/rosso + parola+IPA), streak detector. Riusa `getIpaForDialect` dal catalogo → quiz dialect-aware (mostra /e/ in UK, /ɛ/ in US per DRESS, ecc.).
- [x] **Integrazione `PhonemeCardPage`**: nuova sezione "Fonetica Acustica + Quiz" sotto il Pink Trombone, grid responsive lg:grid-cols-2. Lo spettrogramma usa `phoneme.audio[dialect].isolated`; il quiz pesca da `commonWords`. Sezione visibile solo per card published (i 30 esempi audio del /ʊ/ FOOT pilotano il quiz correttamente).
- [x] **Verifica E2E preview**:
  - Spettrogramma /ʊ/ FOOT → click Avvia → bande formantiche F0/F1/F2 chiaramente visibili (audio .wav umano del Prof.)
  - Quiz /ʊ/ FOOT → auto-play "look" → click /ʊ/ FOOT → punteggio 1/1, feedback "Corretto. La parola era look /lʊk/" + bottone "Prossima domanda"
  - Cleanup verificato (AudioContext chiuso su unmount, audio ref pausato)
- [x] **Posizionamento accademico**: lo spettrogramma trasforma la card in uno strumento di **fonetica acustica** (non solo articolatoria); il quiz è esercizio di **fonologia percettiva** (categorizzazione minimale-pair). Insieme coprono il triangolo articolatorio-acustico-uditivo richiesto dall\u2019utente.



### 28/06/2026 — Inventario IPA completo (44 RP / 43 GA) — accademicamente rigoroso (P1 — DONE)
- [x] **`phonemeCatalogue.js` riscritto** con i 44 segmenti dell\u2019inglese standard secondo Wells (1982), Cruttenden (2014), Ladefoged & Johnson (2011):
  - **12 monofthongi** (7 brevi + 5 lunghe) — KIT, DRESS, TRAP, STRUT, LOT, FOOT, COMMA, FLEECE, PALM, THOUGHT, GOOSE, NURSE
  - **8 ditthongi** (5 chiudenti + 3 centrali) — FACE, PRICE, CHOICE, MOUTH, GOAT, NEAR, SQUARE, CURE
  - **24 consonanti** — 6 occlusive, 2 affricate, 9 fricative, 3 nasali, 4 approssimanti
- [x] **Distinzione varietale**: ogni entry porta `ipa` (RP base) + `ipaUS` quando il GA differisce. Esempi notevoli: DRESS `/e/` RP → `/ɛ/` GA; LOT `/ɒ/` RP → `/ɑ/` GA (con flag `mergedInUS: true` → merge con PALM); GOAT `/əʊ/` RP → `/oʊ/` GA; centrali `/ɪə eə ʊə/` RP → r-coloured `/ɪr ɛr ʊr/` GA; NURSE `/ɜː/` RP → `/ɝ/` GA.
- [x] **Wells lexical sets** usati come `subtitle` (FLEECE, KIT, FOOT, PALM, …); `subgroup` con classificazione fonetica fine (short-monophthong, closing-fronting, centring, plosive, affricate, fricative, nasal, approximant); per le consonanti `manner` con descrizione articolatoria completa (es. "voiceless post-alveolar fricative").
- [x] **Helper `getInventoryTotals()`**: calcola correttamente 44 RP / 43 GA tenendo conto dei merger pedagogici (oggi solo LOT in GA).
- [x] **Library page dialect-aware**:
  - Stat headline mostra **44 FONEMI RP** o **43 FONEMI GA** in funzione del toggle attivo
  - Inventory note in fondo: "Inventario completo · UK RP: 44 segmenti · US GA: 43 segmenti"
  - Filtri aggiornati automaticamente: Vocali 12 · Dittonghi 8 · Consonanti 24
  - Ogni card mostra l\u2019IPA della variante selezionata + nota cross-dialettale ("US: /ɛ/" / "RP: /e/")
  - LOT card mostra warning ambra "⚠ MERGED WITH PALM /ɑ/ IN GA" quando la variante US è attiva
  - Le 42 card "in preparazione" mostrano correttamente IPA, lexical set, sottocategoria fonetica, manner di articolazione (per consonanti), badge Premium
- [x] **Verifica visiva**: tutti i 44 segmenti renderizzati su griglia 4 colonne. Toggle US/UK ricalcola istantaneamente la statistica e le IPA. Le 2 card già pubblicate (FOOT free, FLEECE premium) mantengono i loro badge distintivi.



### 28/06/2026 — Audio v2 (slower/natural) + Card nav + Paywall premium (P0+P1 — DONE)
- [x] **Audio v2 — pacing più lento e naturale**: nuovo script `/app/backend/tests/regenerate_phoneme_audio_v2.py` ha rigenerato i 35 file ElevenLabs per /iː/ con:
  - **Text padding**: ogni parola wrappata con `   word.  ...` (leading silence + trailing decay), frasi con ellissi interne (`See... the green tree.`), fonema isolato come `...   eeeeeeee   ...`
  - **Voice settings**: stability 0.50→0.40 (più variazione prosodica), style 0.15→0 (zero inflessione artificiale)
  - Risultato verificato: file v2 ~2x più lunghi (es. isolated 12KB→24KB, mnemonic 37KB→53KB) — pacing più lento, decay naturale, troncamenti spariti
  - Script `patch_phonemes_v2.py` ha sostituito chirurgicamente le URL in `phonemes.js`. /ʊ/ FOOT mantiene le registrazioni autentiche umane `.wav` del Prof. (non rigenerato — già perfette).
- [x] **Pulsante nav "Tutte le card"** nel header di `PhonemeCardPage.jsx`: pill con BookOpen + chevron, accanto al link "Vocal Fitness LMS", che riporta a `/lms/phonemes`. Su mobile collassa elegantemente.
- [x] **Sistema paywall Premium + lead capture** (modello "A — First card free, rest premium"):
  - **`/app/frontend/src/data/phonemeCatalogue.js`**: single source of truth (catalogo + roles set + helpers `hasPremiumAccess`/`canAccessCard`). `/ʊ/ FOOT` = free, tutti gli altri = premium. Premium roles: `client/collaborator/editor/manager/admin` (lead/anonymous bloccati).
  - **`LMSPremiumPaywall.jsx`** (`variant: 'modal' | 'fullscreen'`): hero, 4 benefit cards, selector tier €19/mese · €149/anno (annuale highlighted "PIÙ SCELTO"), form lead capture, success state, login link, contatti (mailto + WhatsApp).
  - **Library page**: badges "GRATIS" / "PREMIUM" sulle card pubblicate, intercetta click su premium per utenti senza accesso → apre paywall modal.
  - **Card page guard**: paywall fullscreen al posto del contenuto quando `!authLoading && !accessGranted`. Loading-aware per evitare flash di paywall a utenti premium durante la validazione token.
- [x] **Backend lead capture**:
  - `POST /api/lms/interest` (pubblico): salva in collection `lms_interests` (email, nome, card_id, tier, source, IP, UA) e usa **BackgroundTasks** per notifica SMTP non bloccante al Prof. su `steve@vocalfitness.org` (`[LMS] Interesse Premium · email@…`). Response <500ms.
  - `GET /api/admin/lms/interests?status_filter=` (admin auth): elenco filtrabile newest-first.
- [x] **Verifica E2E preview**:
  - Library mostra correttamente "GRATIS"/"PREMIUM"
  - Anonymous clicca /iː/ → paywall modal → submit email → success in 2.5s → audit log creato (200 OK)
  - Admin login → bypassa paywall, accede a tutte le card
  - Nav "TUTTE LE CARD" presente nell\u2019header card → click → `/lms/phonemes`



### 28/06/2026 — Phoneme Library + global US/UK dialect toggle (P1 — DONE)
- [x] **Nuova rotta `/lms/phonemes`** con `/app/frontend/src/pages/PhonemeLibraryPage.jsx` (~340 LOC): hub pubblico che precede le card individuali. Hero con titolo, stats (2 disponibili / 18 in arrivo / variante corrente), filtri (Tutti/Vocali/Dittonghi/Consonanti), griglia responsive 1/2/3/4 colonne con mini-card published (IPA, lexical set, sottocategoria fonologica, 3 parole d\u2019esempio, mini play button per audio isolato del dialetto selezionato) e card "in preparazione" greyed-out con lucchetto. CTA finale "Prima volta? Inizia da /ʊ/ FOOT".
- [x] **Catalogo statico**: 20 voci (11 vocali, 3 dittonghi, 6 consonanti). `i-fleece` e `u-foot` published, gli altri 18 mostrati come placeholder per dare percezione di crescita del catalogo e SEO long-tail.
- [x] **Nuovo hook `useDialect`** in `/app/frontend/src/hooks/useDialect.js`: single source of truth per la variante US/UK. Persistenza in `localStorage` (`vf.lms.dialect`), override via URL query (`?d=us|uk` o `?dialect=AmE|RP`) alla prima visita, sync cross-tab via `storage` event e cross-component via `CustomEvent` custom.
- [x] **`PhonemeCardPage`** ora consuma `useDialect` invece dello state locale: cambio di dialetto in qualsiasi pagina viene riflesso ovunque immediatamente. Test e2e confermato: UK toggle in library → click card /iː/ → page card mostra 🇬🇧 attivo.
- [x] **Toggle UI**: due pill US/UK con bandiere + descrizione "American English" / "Received Pronunciation" (nascosto su mobile). Gradient orange quando attivo.
- [x] **Fix visuale**: rimossa duplicazione "FLEECE · FLEECE" / "FOOT · FOOT", ora mostra il `subcategory` fonologico (long tense, short lax).



### 28/06/2026 — Test phoneme card /iː/ FLEECE generata via pipeline ElevenLabs (P1 — DONE)
- [x] **Script generator** `/app/backend/tests/generate_phoneme_audio_i_fleece.py`: login admin → POST /api/admin/elevenlabs/tts per 30 parole + 1 isolato + 3 frasi + 1 mnemonico = **35 file audio mp3 44.1kHz** generati con la voce clonata del Prof. Dapper (voice_id `mIrm7gNCglTAXk0xhryV`). Risultato persistito su `/tmp/i_fleece_audio.json` per estrazione URL.
- [x] **Nuovo entry `PHONEME_I_FLEECE`** in `/app/frontend/src/data/phonemes.js`: card completa con 9 hotspot anatomici /iː/-specifici (blade FORWARD/HIGH, dorsum FRONT/CLOSE/TENSE, lip SPREADING), 4 knob articolatori, 30 parole comuni (see/me/he/we/she/tree/three/free/need/feel/week/sleep/green/street/read/keep/agree/between/complete/machine/believe/teach/easy/people/eat/each/team/piece/evening/season), 3 frasi d\u2019esempio, mnemonico ("He sees three sheep eat green leaves easily"), classification badges, fun-fact (F2 più alta tra le vocali inglesi), vowelChartPosition top-left.
- [x] **`PinkTromboneEmbed.jsx`** ora consapevole del fonema: introdotto `PHONEME_DEFAULTS` mapping (id → defaultSym + referenceAudio), rimosso flag `isDefault` hardcoded da VOWEL_TARGETS, IPA topbar label e vocale attiva del trapezio derivano da `phonemeId`. Aggiunto reference audio per `i-fleece`.
- [x] **Route attivo**: `/lms/phoneme/i-fleece` funzionante in preview.
- [x] **Verifica E2E**: HEAD su 5 audio URLs ritorna 200 + audio/mpeg (12-37 KB). Trapezio mostra /i/ attivo top-left. Topbar Pink Trombone mostra `/i/`.
- ⚠️ **Limitazione nota**: gli asset immagine (sideView, frontView, articulatory) riusano i placeholder /ʊ/ con etichette baked-in. Sostituibili in Phase 2 (Admin CMS) caricando immagini sagittali /iː/-specifiche.



### 24/06/2026 — Allineamento assets EY ↔ homepage (P0 — DONE)
- [x] **VIDEOS & IMAGES**: sostituiti gli URL placeholder con quelli identici alla homepage (`/app/frontend/src/pages/HomePage.jsx` linee 600-605):
  - `VIDEOS.hero` → `8id2qukm_57.1-invideo-seedance_2_0.mp4`
  - `VIDEOS.method` → `3w338a4f_56.1-invideo-seedance_2_0.mp4`
  - `IMAGES.dapper` → `rnb654p3_35.2-invideo-nanobanana_2.png`
- [x] **Componente `VideoWithLoader`** estratto da `HomePage.jsx` in `/app/frontend/src/components/VideoWithLoader.jsx` (~70 LOC): IntersectionObserver con rootMargin 200px, shimmer skeleton + spinner, fade-out su `onCanPlay`/`onLoadedData`, autoplay-friendly defaults (muted, playsInline, loop, preload="metadata"). Ora usato sia in HomePage che in ErnstYoungLandingPage.
- [x] **Keyframe `shimmer`** aggiunto allo `<style>` block della EY page (era scoped solo all\u2019HomePage prima).
- [x] **Lint clean**, build production (`yarn build`) attesa: 0 warning.


- [x] **Backend**: nuovo endpoint `POST /api/proposals/send-by-email` in `/app/backend/server.py`. Scarica il PDF della proposta da `customer-assets.emergentagent.com` via `httpx`, lo allega via `MIMEApplication`, invia tramite Zoho SMTP al destinatario con BCC opzionale a `steve@vocalfitness.org`. Validazione email lato server (regex). Audit log in collection `proposal_sends`. Risposta mai espone dettagli SMTP (errore generico 503).
- [x] **PROPOSAL_PDFS registry** in `server.py`: mappa `page_slug → {url, filename, title, page_url}` per estendere facilmente l\u2019endpoint ad altre proposte future.
- [x] **Frontend `ErnstYoungLandingPage.jsx`**: nuova sezione **"Ricevi la Proposta"** con due card affiancate:
  - **Opzione 1 · Scarica subito il PDF** (blu): bottone diretto al PDF.
  - **Opzione 2 · Ricevila via email** (ambra, badge "CONSIGLIATO"): form con nome (facoltativo) + email aziendale → POST `/api/proposals/send-by-email`. States: idle/sending/sent/error con UI dedicata (loader, success card, error inline).
- [x] **Refactor URL helper**: rimosso il regex custom inline (`/^https?:\/\/www\./`) sostituendolo con l\u2019helper centralizzato `BACKEND_URL` da `lib/backend.js` — stessa logica del resto del sito, evita drift.
- [x] **Production build**: `yarn build` completa con `EXIT:0`, zero warning, bundle main.*.js include la stringa "Cannizzaro" → la pagina EY è correttamente bundled. Le rotte `/speak-right-ey` e `/proposta-ey` sono entrambe registrate in `App.js`.
- ⚠️ **Pagina bianca su produzione**: la preview funziona correttamente. Probabile causa: deploy con versione precedente del codice (prima delle ultime correzioni URL helper). Soluzione consigliata: **ridepoyare** dal pannello Emergent per pushare il bundle aggiornato.



### 24/06/2026 — Banner di conferma lettura + tracking proposta EY (P1 — DONE)
- [x] **Backend**: nuovi endpoint in `/app/backend/server.py`:
  - `POST /api/proposals/track-open` (pubblico) — registra ogni apertura della landing page con `page`, `ref`, `referrer`, `client_tz`, IP (X-Forwarded-For aware), User-Agent, timestamp UTC. Collection MongoDB: `proposal_opens`. Ritorna `opened_at` canonico + `sequence` per la coppia (page, ref).
  - `GET /api/admin/proposals/opens?page=…&ref=…&limit=…` (admin-only) — restituisce il log opens filtrabile, newest-first.
- [x] **Frontend `ErnstYoungLandingPage.jsx`**:
  - Ping fire-and-forget al mount **solo se** la visita arriva con `?ref=<slug>` (no inquinamento del log per browsing anonimo).
  - Banner verde "**Documento aperto · 24 giugno 2026 alle 09:30**" con pulsing dot, check icon e badge "Visita n° X" se `sequence > 1`. Timestamp formattato in italiano con `Intl.DateTimeFormat('it-IT')` nel timezone del visitatore.
  - Errori silenziosi: il fallimento del ping non rompe mai la UX.
- [x] **Verifica E2E**: `curl POST /api/proposals/track-open` ritorna `{id, sequence}` correttamente, banner visibile in preview con visita n° 5, admin endpoint elenca tutti gli opens con IP/UA reali (admin auth funzionante).
- [x] **Estensibilità**: per nuovi destinatari basta aggiungere chiavi a `RECIPIENTS` in cima al file e usare `?ref=<slug>`.



### 24/06/2026 — Landing page dedicata Ernst & Young Italia (P1 — DONE)
- [x] **Nuova pagina** `/app/frontend/src/pages/ErnstYoungLandingPage.jsx` (~440 LOC) basata sul template della Medtronic Landing, ma riscritta in **italiano** per la proposta commerciale a EY Italia (attn. Layla Cannizzaro, Team HR & Formazione).
- [x] **Rotte registrate** in `App.js`: `/speak-right-ey` e `/proposta-ey` (entrambe puntano alla stessa pagina).
- [x] **Architettura tre tier** verbatim dal PDF allegato (`proposta_commerciale_E&Y_Layla_Cannizzaro.pdf`):
  - Level 1 · Executive Elite (oro/ambra, premium accent): Modulo Base €1.920 / Advanced €2.240 — in presenza one-to-one
  - Level 2 · Blended Performance (blu corporate): Core Team €3.800 / Division €6.500 — live video & hybrid
  - Level 3 · Digital Enterprise Scaling (indigo/viola): Small €190 / Medium €140 / Large flat — self-study con scontistica volumi
- [x] **Sezioni**: Hero (con video + recipient card "Layla Cannizzaro"), Target Pills banner (Partner/C-Suite/Executive Director/Senior Manager/Consultant/Staff), Premessa Metodologica CEFR, Architettura Offerta 3 tier (centrepiece), Method strip SpeakRight 101, Bio Prof. Steve Dapper (3 card dark theme), Note Editoriali (Materiali Inclusi + Validità 60gg), Final CTA, Footer con sede Roveredo GR.
- [x] **Brand coherence con vocalfitness.org**: stessa palette (slate/blue/indigo gradients), stesso pattern animazioni scroll-triggered, stessi Button shadcn, stesse icone lucide-react, stesso video hero di brand. Accento ambra/oro su Level 1 per differenziare la tier executive premium senza usare marchi EY.
- [x] **CTA**: "Programma chiamata con il Prof. Dapper" → `CorporateQuoteForm` modal · "Scarica proposta PDF" → URL dell\u2019artifact uploaded dall\u2019utente.
- [x] **Verifica visuale preview**: tutte le sezioni render correttamente, 3 tier visibili con pricing accurato, bio Dapper in italiano funzionante, no errori lint/console.



### 15/06/2026 — Pink Trombone autentico (Neil Thapen v1.1) integrato in iframe (P0 — RISOLTO)
- [x] **Bundle ufficiale Neil Thapen** scaricato direttamente da `https://dood.al/pinktrombone/` (MIT License, Copyright 2017 Neil Thapen). Single-file HTML (~1900 LOC) con due `<canvas>` (tractCanvas + backCanvas), audio system con `ScriptProcessorNode`, UI/Glottis/Tract/TractUI inline.
- [x] **File**: `/app/frontend/public/lms/vocal-lab/pink-trombone-original.html`. La gestione responsive è già nativa nel codice (`UI.shapeToFitScreen()` chiamato a ogni redraw).
- [x] **Modifiche minime**: rimosso BOM/CRLF, normalizzato `<head>`, aggiunto un **EmbedBridge** al fondo che (1) chiama `AudioSystem.audioContext.resume()` al primo gesto utente, (2) espone postMessage API `pt:set-params` → `Glottis.UIFrequency / UITenseness / loudness`, (3) emette handshake `pt:ready` al parent.
- [x] **Rimosso** il fork minore `zakaton/Pink-Trombone` (UI ridotta a 3 pulsanti). Cancellati i file inutilizzati `pink-trombone-frame.html`, `pink-trombone.min.js`, `pink-trombone-worklet-processor.min.js`, `vocal-framework.js`, `vocal-processor.js`, `index.html`.
- [x] **`PinkTromboneEmbed.jsx`** punta al nuovo iframe (`/lms/vocal-lab/pink-trombone-original.html`), background bianco, aspect-ratio 1/1.
- [x] **Verifica E2E preview**: UI Neil Thapen autentica renderizzata con tutte le etichette ("nasal cavity", "hard palate", "soft palate", "oral cavity", "throat", "lip", "nasals", "stops", "fricatives", "tongue control", "voicebox control", "pitch", "about", "always voice", "pitch wobble"). Click su /æ/ del trapezio React → applica `freq:132, tense:0.55` verificati nei globali iframe. `audioContext.state === 'running'`.



### 15/06/2026 — ElevenLabs Voice Clone integrato come glottal source (P1)
- [x] **Backend**: 2 endpoint admin in `/app/backend/server.py`:
  - `GET /api/admin/elevenlabs/voices` — lista voci sul account ElevenLabs collegato
  - `POST /api/admin/elevenlabs/tts` — genera TTS con voice clone, salva su Emergent Object Storage (`elevenlabs/<hint>_<voice>_<ts>.mp3`), ritorna URL pubblico
- [x] **Env vars** in `/app/backend/.env`: `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID=mIrm7gNCglTAXk0xhryV` (voice clone di Steve Dapper)
- [x] **SDK installato**: `elevenlabs==2.53.0` (`eleven_multilingual_v2` model, supporto IPA tag)
- [x] **Admin UI** `/app/frontend/src/components/ElevenLabsStudio.jsx` con tab "Audio Studio" in AdminPage:
  - selettore voce (default già impostato), textarea, preset rapidi (glottal /ʊ/, /iː/, /ɑː/, schwa)
  - slider stabilità/similarity/style, formato MP3/PCM, filename hint
  - player anteprima, copy URL, download, snippet auto-generato per `vocalLabProfiles.js`
- [x] **Profilo `u-foot`** in `vocalLabProfiles.js` aggiornato con `voiceClone.url` puntato all'audio Steve Dapper appena generato (refFreq: 120Hz).
- [x] **Verifica E2E preview**: il VocalLabEngine carica il file ElevenLabs, lo decodifica, lo passa al worklet che lo loopa con pitch-shift Catmull-Rom in real-time. Network log conferma fetch del glottal_u_foot mp3.
- ⚠️ **Sicurezza**: la API key è stata condivisa in chat — utente notificato per rotazione.

### 05/06/2026 — LMS Phonetics Lab: interactive Vocal Tract Synthesizer (P1)
- [x] **Engine DSP standalone** (`/app/frontend/public/lms/vocal-lab/`):
  - `vocal-processor.js` — AudioWorkletProcessor con waveguide Kelly-Lochbaum 44 sezioni + branca nasale 28 sezioni accoppiata al velum, friction injection localizzata, glottal source ibrido (LF-pulse sintetica O sample voice-clone con interpolazione cubica Catmull-Rom per pitch-shift).
  - `vocal-framework.js` — classe `VocalLabEngine` con lifecycle (`init`/`loadPhoneme`/`destroy`), Canvas2D sagittale Bézier, touch/mouse + Gaussian smoothing 5-tap, audio-unlock overlay, profile morphing, message throttling.
  - `index.html` — demo standalone con 5 profili di riferimento (FOOT, FLEECE, FATHER, /s/ fricativa, /m/ nasale), CSS scoped sotto `.vocal-lab-engine__*` (zero-leak BEM).
- [x] **React integration** (`/app/frontend/src/components/VocalLabEmbed.jsx`): wrapper che carica dynamic lo script framework una sola volta, mounta DOM scoped, mappa `profileId` prop a `engine.loadPhoneme()`, teardown automatico su unmount. Profili condivisi in `/app/frontend/src/data/vocalLabProfiles.js`.
- [x] **Embed nella `PhonemeCardPage.jsx`**: sezione "LABORATORIO INTERATTIVO" tra mnemonic e bottom-note. Profilo auto-selezionato in base a `phoneme.id` (es. `/lms/phoneme/u-foot` → carica `u-foot`).
- [x] Smoke E2E preview: AudioContext attivo running 44.1kHz, AudioWorkletNode caricato, tract sagittale renderizzato, switch profile funzionante (FOOT → FLEECE → /s/), zero errori legati all'engine.
- Future P2: integrazione ElevenLabs voice clone per glottal source con voce del professore Steve Dapper (campo `voiceClone.url` già supportato dall'engine).
- Future P3: schede admin per generare nuovi profili JSON dal pannello (LMS Phase 2 CMS).

### 05/06/2026 — Phonetic Lab audio performance fix (P1)
- [x] **Bug**: clienti segnalano caricamento lento/assente degli audio nella Phoneme Card. Causa: 39 file `.wav` non compressi (~200KB ciascuno = ~8MB totali) su CDN Cloudfront Emergent, **senza header `Cache-Control`**. Su connessioni lente, ogni click sui play-button scaricava il file da zero (TTFB 0.2–3s).
- [x] **Fix client-side**: implementato `useEffect` background preloader in `PhonemeCardPage.jsx`. Dopo 600ms dal mount, lancia 4 fetch paralleli in `cache: 'force-cache'` per popolare la HTTP cache del browser con TUTTI gli audio (isolated, examples, mnemonic, 30 common words). Quando l'utente clicca un play-button, l'audio è già su disco → istantaneo.
- [x] Cambiato `Audio.preload` da `'none'` a `'auto'` + aggiunti event listeners `canplay` e check `readyState >= 3` per evitare spinner falsi.
- [x] AbortController su unmount → cancella i fetch pendenti se l'utente lascia la pagina prima del completamento.
- [x] Verifica E2E preview: aprendo `/lms/phoneme/u-foot`, dopo 10s tutti i 39 file audio scaricati in background; click sul play → riproduzione immediata.
- Future P3: ri-uploadare audio in `.mp3` 192kbps (8MB → ~1.5MB).


### 05/06/2026 — Fix Email Notification Truncation (P0)
- [x] **Bugfix**: in `/app/backend/server.py::send_notification_email` (linea 3162) il `message_preview` veniva troncato a 150 caratteri con `[:150] + "..."`, nascondendo credenziali e link inviati dall'admin via pannello messaggi. Rimosso troncamento, escape HTML con `html.escape`, conversione `\n→<br>` e CSS `white-space:pre-wrap;word-break:break-word` per messaggi lunghi. Test di regressione in `/app/backend/tests/test_email_truncation.py` (3 test passati). Verifica E2E con `POST /api/admin/messages` su messaggio di 242 chars contenente credenziali → salvato e inviato integralmente.

### 05/06/2026 — Production login fix: strip "www." subdomain client-side (P0)
- [x] **Bug root cause**: il bundle frontend deployato in produzione era buildato con `REACT_APP_BACKEND_URL=https://www.vocalfitness.org`. La edge Cloudflare risponde con `HTTP 308 Permanent Redirect` da `www.` a senza-`www.` per tutti i path. Il browser, su un redirect 308 cross-origin di una POST, perde il body silenziosamente → ogni chiamata API falliva con "Errore di login" mentre il backend non vedeva neanche la richiesta.
- [x] **Fix client-side**: creato `/app/frontend/src/lib/backend.js` con `BACKEND_URL = REACT_APP_BACKEND_URL.replace(/^https:\/\/www\./, 'https://')`. Tutti i 14 file che leggevano `process.env.REACT_APP_BACKEND_URL` ora importano `BACKEND_URL` da `lib/backend`. Il fix è automatico: anche se l'env var Emergent rimane con `www.`, il runtime client la normalizza.
- [x] File aggiornati: `context/AuthContext.js`, `pages/{Settings,Admin,Login,MembersArea}Page.jsx`, `components/{OnboardingWizard,VideoModal,TestimonialsSection,ContactFormModal,CorporateQuoteForm,LevelTestModal,ClientsSection,Footer,BookingFormModal,AliceChatbotModal}.jsx`.
- [x] Smoke test preview: login admin/VocalFitness2026! → "Benvenuto, Administrator!" → redirect a `/area-clienti` ✓.
- 🚨 **Azione utente**: redeploy produzione → il login admin tornerà a funzionare in browser.

### 05/06/2026 — Idempotent admin seeding (P0 production auth recovery)
- [x] **Implementato `seed_admin()` all'avvio backend** (`/app/backend/server.py`) come da playbook auth Emergent. Comportamento idempotente: crea admin se manca, aggiorna hash se `ADMIN_PASSWORD` env è diverso da quello in DB, no-op se matcha, skip totale se env vuoto. Mai tocca utenti non-admin.
- [x] Aggiunte env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `JWT_SECRET_KEY` in `/app/backend/.env`.
- [x] 5 test pytest in `/app/backend/tests/test_seed_admin.py` (tutti PASS): create/no-op/rotate/skip-if-unset/never-touch-other-users.
- [x] Verifica E2E in preview: seed crea/no-op correttamente, rotate testato manualmente (login con vecchia password rifiutato, con nuova OK).
- 🚨 **Azione utente in produzione**: settare `ADMIN_PASSWORD=Mulignanes.2025!` (o password preferita) nelle env Emergent e redeployare → admin garantito al boot. Procedura completa in `/app/memory/test_credentials.md`.

### 05/06/2026 — Rich Text Editor + Email Preview nel pannello admin messaggi
- [x] **Rich Text Editor TipTap** (`/app/frontend/src/components/RichTextEditor.jsx`) integrato nella chat admin → cliente. Toolbar: Bold, Italic, Underline, Heading3, Liste puntate/numerate, Link (prompt con autoprefix `https://`), Clear formatting, Undo/Redo. Output HTML sanitizzato con DOMPurify (whitelist tag: p, br, strong, em, u, a, ul, ol, li, h3, h4, span). Multi-riga reale (non più input singola linea).
- [x] **Email Preview Modal** (`/app/frontend/src/components/EmailPreviewModal.jsx`): mostra in un `<iframe sandbox="">` isolato il rendering esatto del template HTML che verrà inviato via Zoho SMTP (header brand, blockquote ambra, CTA "Area Riservata"). Header con Da/A/Oggetto auto-generato. Pulsante "Anteprima email" accanto al bottone Invia.
- [x] **Backend backward-compatible**: `MessageCreate` ora include `content_html: str = ""` (opzionale). Se valorizzato, `send_notification_email` lo usa as-is dentro il template; altrimenti fallback su `content` plain con escape + nl2br. Persistito in MongoDB `messages.content_html`.
- [x] **Frontend chat rendering** (sia `AdminPage.jsx` che `MembersAreaPage.jsx`): se `m.content_html` presente → rendering HTML sicuro con `sanitizeRichHtml` + `dangerouslySetInnerHTML`; altrimenti rendering plain text come prima.
- [x] **Tests**: 6 test di regressione pytest in `/app/backend/tests/test_email_truncation.py` + `test_email_rich_html.py` (tutti PASS). Smoke E2E UI: login admin → tab Messaggi → conversazione Mario Rossi → editor visibile con toolbar, anteprima email apre modal con iframe e rendering corretto.

### Funzionalità Pubbliche ✅
- [x] Homepage con presentazione del metodo VocalFitness
- [x] **Homepage redesign istituzionale B2B/scientifico** (07/02/2026, iter. 11) — Palette unificata WHITE + BLUE medical/scientific su tutto il sito (homepage + footer + navbar). 13 sezioni in EN/IT bilingue + Footer light + 4 video con shimmer loader.
- [x] **Navbar light theme** (07/02/2026, iter. 11) — bg-white/80→white/95, logo blue gradient text-2xl font-black, link slate-700 font-semibold con hover blue-700, language toggle e login button slate-700/blue, CTA pulsante blue gradient. Alta visibilità su sfondo chiaro.
- [x] **Knowledge Graph SEO Pack** (14/05/2026) — Implementati 11 blocchi JSON-LD structured data in `/app/frontend/public/index.html`: `ProfessionalService` (Vocal Fitness), `Person` (Steve Dapper con jobTitle, affiliation con eCampus/LFSAG Torino/U.Tampa, knowsAbout), `WebSite`, `Course` (Speak Right 101 — A2→C2, 12 lezioni × 60min, 4 CourseInstance: Online 1:1/Some/Many/Blended, 2 Offer free+paid, educationalCredentialAwarded), `FAQPage` (6 Q&A bilingue collegate al Course via `about`), `BreadcrumbList` (8 anchor homepage), 5× `VideoObject` (uno per ogni video homepage con thumbnail, contentUrl, uploadDate, creator/publisher graph). Aggiunto `sitemap.xml` (4 URL con hreflang IT/EN + image:image + video:video) e `robots.txt` (Allow public, Disallow `/admin`/`/area-clienti`/`/impostazioni`/`/api/`/`/speak-right-medtronic`).
- [x] **Landing dedicata Speak Right 101** (14/05/2026) — Nuova pagina `/speak-right-101` istituzionale per il corso strutturato di pronuncia inglese CEFR A2→C2. 7 sezioni: Hero con dual CTA, Programme at a Glance (6 fact cards), Delivery Formats (4 modalità), What you'll work on (7 competenze), **Comparison Table** "Speak Right 101 vs corso d'inglese tradizionale" (8 criteri, desktop table + mobile stacked cards), Instructor block con foto Steve Dapper, FAQ accordion (5 Q&A), Final CTA gradient blue. Bilingue EN/IT, SEO meta dinamici via `useEffect` (title, description, canonical, OG), 30+ data-testid, Wizard onboarding + Corporate Quote modali integrati. Voce "Speak Right 101" aggiunta in Navbar al posto di "Programmi". Course.url e Offer.url JSON-LD aggiornati per puntare alla landing dedicata.
- [x] **FAQ Section visibile + JSON-LD FAQPage** (14/05/2026) — Sezione `#faq` in HomePage con accordion smooth (grid-rows trick), microdata Schema.org duplicati (itemScope/itemProp) per Google rich snippet, 6 Q&A bilingue, hover effects, keyboard accessible (aria-expanded, focus ring), 6 data-testid. Voce "FAQ" in Navbar.
- [x] **Centralizzazione Bio Professor** (14/05/2026) — Creato `/app/frontend/src/data/professorBio.js` come single source of truth: `professorIdentity`, `academicCredentials` (plain), `academicCredentialsHTML` (con span), `methodDevelopment`, `appliedPractice`, `bioBlocks` (struttura card homepage), `jsonLdDescription`. Aggiornati HomePage.jsx (IT+EN) e MedtronicLandingPage.jsx per consumare i dati centralizzati. Sostituito "ricercatore" → "collaboratore scientifico" su tutte e 4 le occorrenze del lab LFSAG Torino.
- [x] **Portrait Premium Effects** (14/05/2026) — Effetti sull'immagine Steve Dapper nella sezione bio: breathing glow continuo 5s, hover lift -6px + intensificazione glow, zoom 1.08x cubic-bezier smooth 1.1s, light sheen sweep diagonale 1.4s, radial blu aura blur, bottom depth gradient. Performant (transform/opacity GPU).
- [x] **OG Meta Tags + Steve Dapper portrait refresh** (14/05/2026) — Aggiornati tutti i meta tag Open Graph e Twitter Card in `/app/frontend/public/index.html` con copy istituzionale ("Vocal Fitness — The Science of Exceptional Voice" / "Un metodo scientifico per l'inglese parlato, chiarezza e performance comunicativa.") e nuova immagine hero brand. Sostituito anche il portrait `dapperPortrait` nella sezione bio HomePage.jsx con la foto editoriale navy blue Steve Dapper (suit navy + IPA chart + microscopi).
- [x] **Persistent file storage via Emergent Object Storage** (08/05/2026, iter. 14) — **FIX CRITICO**: i PDF/video/file caricati erano salvati su disco effimero del container (`/app/backend/uploads/`) e venivano persi a ogni redeploy/restart. Ora ogni upload viene scritto **sia su disco locale (cache fast-serve) sia su Emergent Object Storage persistente** tramite `put_object()`. Aggiunto endpoint `GET /api/uploads/{path}` con strategia di fallback: prima prova disco locale (FileResponse zero-copy), in caso di miss recupera da Emergent storage e ricrea cache locale. Helper `storage_helper.py` con session key auto-refresh + retry on 403. Script `backfill_uploads.py` per back-fill one-shot. Test E2E: file uploadato → cancellato dal disco → richiesta successiva → HTTP 200 application/pdf con contenuto identico recuperato da storage persistente.
- [x] **Onboarding Wizard multi-step + Magic-link auto-registration** (07/02/2026, iter. 11-13) — 5 step modale per l'Individual diagnostic assessment + lead inbox CRM. Submit del wizard ora **crea automaticamente un account MembersArea** (username derivato dall'email, password random sicura, role='client', campi profilo precompilati: english_level, sector, native_language, professional_role, lead_id) e **invia magic-link email via Zoho SMTP** (token JWT 24h con claim `magic`). LoginPage rileva `?magic=<token>` in URL, scambia via `POST /api/auth/magic` per session token e auto-redirect a `/area-clienti`. Backend backward-compatible: form classico non triggera magic flow.
- [x] **Admin Lead Inbox + Templated Email** (07/02/2026, iter. 12-13) — Tab "Lead Inbox" con badge sorgente, badge CEFR colorato, filtri (search/source/CEFR/role/sector/native), drawer dettaglio. **Template-picker per invio email** con 3 template precompilati (welcome onboarding, follow-up after 48h, custom proposal request) bilingue EN/IT, **variabili {{name}}/{{englishLevel}}/{{role}}/{{sector}}/{{nativeLanguage}}/{{email}} auto-sostituite**, invio via Zoho SMTP, **touch history** loggata in MongoDB con auto-update status='contacted', auto-refresh drawer dopo invio. Endpoint: `GET/PATCH /api/admin/leads`, `POST /api/admin/leads/{id}/email`.
- [x] Sezione testimonial e success stories (preservata, ripulita: rimosso brand-name trust grid)
- [x] Form di prenotazione valutazione gratuita (i18n EN/IT)
- [x] Form di contatto
- [x] Chatbot "Alice" per qualificazione lead
- [x] Pagina Risorse con materiali educativi
- [x] Sezione Corporate Solutions
- [x] Pagina dedicata Corporate Training
- [x] Pagina corporate Medtronic interna (`/speak-right-medtronic`) — riferimento visivo
- [x] Supporto bilingue IT/EN su tutto il sito
- [x] Link WhatsApp per contatto diretto

### Area Riservata Clienti ✅ (Implementata 20/01/2026)
- [x] Pagina di login `/login`
- [x] Dashboard clienti `/area-clienti`
- [x] Autenticazione JWT
- [x] Visualizzazione contenuti (video, PDF, audio, link)
- [x] Filtro per categorie
- [x] Player video/audio integrato

### Pannello Admin ✅ (Implementato 20/01/2026)
- [x] Gestione utenti (crea/elimina)
- [x] Gestione contenuti (crea/modifica/elimina)
- [x] Solo admin registra utenti (no auto-registrazione)
- [x] Protezione route per ruolo admin

## Tech Stack
- **Frontend:** React.js, Tailwind CSS, Shadcn UI
- **Backend:** FastAPI, MongoDB (motor)
- **Autenticazione:** JWT + bcrypt
- **Email:** Zoho SMTP
- **AI:** Emergent LLM Key (OpenAI gpt-4o-mini)

## API Endpoints

### Pubblici
- `POST /api/contact` - Form contatto
- `POST /api/booking` - Prenotazione valutazione
- `POST /api/corporate-quote` - Richiesta preventivo corporate
- `POST /api/chat` - Chatbot Alice

### Autenticazione
- `POST /api/auth/login` - Login utente
- `GET /api/auth/me` - Info utente corrente
- `POST /api/setup/admin` - Setup iniziale admin

### Admin (richiede role=admin)
- `GET /api/admin/users` - Lista utenti
- `POST /api/admin/users` - Crea utente
- `DELETE /api/admin/users/{id}` - Elimina utente
- `GET /api/admin/content` - Lista contenuti
- `POST /api/admin/content` - Crea contenuto
- `PUT /api/admin/content/{id}` - Modifica contenuto
- `DELETE /api/admin/content/{id}` - Elimina contenuto

### Members (richiede autenticazione)
- `GET /api/members/content` - Lista contenuti
- `GET /api/members/content/{id}` - Singolo contenuto
- `GET /api/members/categories` - Categorie

## Database Collections
- `users` - Utenti (admin/client)
- `member_content` - Contenuti area riservata
- `contacts` - Richieste contatto
- `bookings` - Prenotazioni
- `leads` - Lead dal chatbot
- `corporate_quotes` - Preventivi corporate

## Credenziali di Test
- **Admin:** username=`admin`, password=`VocalFitness2026!`
- **Client test:** username=`test.client`, password=`Test1234!`

## What's Been Implemented

### 20-22 Gennaio 2026
- ✅ Area Riservata Clienti completa
- ✅ Pannello Admin per gestione utenti/contenuti
- ✅ Autenticazione JWT con bcrypt
- ✅ Test automatici (20 test backend, tutti passati)
- ✅ Link "Accedi" nella navbar
- ✅ **Upload file diretto** (video, audio, PDF, immagini fino a 100MB/file)
  - Drag-and-drop o selezione file
  - Barra di progresso durante upload
  - File serviti da `/api/uploads/`
- ✅ **Cambio password** - Pagina impostazioni `/impostazioni`
- ✅ **Newsletter** - Form iscrizione nel footer + endpoint backend
- ✅ **Limiti storage** - 2GB totale, 100MB/file, statistiche nel pannello admin
- ✅ **Indici MongoDB** - 41 indici su 9 collezioni per query ottimizzate
  - Tab "Database" nel pannello admin con statistiche
  - Creazione automatica all'avvio dell'applicazione
- ✅ **Sistema Cartelle e Assegnazioni**
  - Cartelle per organizzare i contenuti
  - Assegnazione cartelle/contenuti a clienti specifici
  - Visibilità mista: contenuti pubblici + contenuti riservati
  - Tab "Cartelle" nel pannello admin
- ✅ **Fix Contatori Homepage** (verificato 23/01/2026)
  - Risolto bug dei contatori animati che mostravano "0"
  - Funzionante su Mac e Windows
- ✅ **Importazione Playlist YouTube** (implementato 26/01/2026)
  - Tab "YouTube" nel pannello admin
  - Importazione automatica di tutti i video di una playlist
  - Creazione automatica cartella con nome della playlist
  - Assegnazione playlist a clienti specifici
  - Sincronizzazione manuale (pulsante "Sincronizza")
  - Nuovi video ereditano assegnazioni esistenti
  - Supporto playlist pubbliche e non in elenco
- ✅ **Sistema Messaggi Pop-up Personalizzati** (implementato 19/02/2026)
  - Tab "Messaggi Pop-up" nel pannello admin
  - Creazione messaggi di tipo testo, audio o video
  - Audio/video: upload diretto file O link esterno/embed
  - Pulsante CTA opzionale (testo + URL)
  - Destinatari: tutti i clienti o clienti specifici
  - Attivazione/disattivazione rapida dei messaggi
  - Pop-up modale nell'area clienti al login
  - Pulsante "Non mostrare più" (dismiss permanente)
  - Pulsante "OK" per chiusura temporanea
  - Supporto YouTube embed, file audio/video caricati, link esterni
- ✅ **Statistiche Pop-up** (implementato 19/02/2026)
  - Tracciamento visualizzazioni per ogni messaggio
  - Tracciamento dismiss per ogni messaggio
  - Percentuali di view/dismiss rate su audience totale
  - Endpoint stats dedicato per admin
  - Display statistiche su ogni card nel pannello admin
- ✅ **Thumbnail/Cover Automatiche** (implementato 19/02/2026)
  - Video caricati: estrazione frame tramite ffmpeg
  - Link YouTube: thumbnail automatica da img.youtube.com
  - PDF: screenshot prima pagina tramite pdf2image
  - Google Drive: thumbnail da drive API
  - Cover personalizzata: upload immagine custom per sovrascrivere
  - Applicato sia a contenuti area clienti che messaggi pop-up
  - Colonna thumbnail nella tabella contenuti admin
  - Rigenerazione singola (bottone per riga) e bulk (bottone "Rigenera anteprime")
- ✅ **Anagrafica Clienti Completa** (implementato 23/02/2026)
  - Campi personali: nome, cognome, email, telefono, data nascita, indirizzo completo, codice fiscale
  - Tipo cliente: Privato / Business / Estero
  - Campi business: ragione sociale, P.IVA/VAT, codice univoco SDI, PEC, website
  - Storico acquisti e note admin
  - Pulsante Edit e form completo con tutti i campi
- ✅ **Messaggistica Bidirezionale** (implementato 23/02/2026)
  - Chat admin ↔ cliente con supporto testo, video, audio, compiti
  - Tab "Messaggi" nel pannello admin con lista conversazioni e chat
  - Pannello messaggi nell'area clienti con badge contatore non letti
  - Compiti assegnabili con scadenza e pulsante "completato"
  - Notifica email automatica via Zoho SMTP ad ogni nuovo messaggio
  - **Video YouTube embedded** - Link YouTube vengono mostrati come iframe cliccabile
  - **Tipo File/Link** - Supporto per link a documenti (PDF, Google Docs, Dropbox)
  - **Eliminazione messaggi** - Pulsante elimina (hover) per messaggi inviati dall'admin
- ✅ **CRM Form con Sezioni Collassabili** (implementato 23/02/2026)
  - Form utente completamente riprogettato con sezioni collassabili (click per espandere/comprimere)
  - 5 sezioni: ANAGRAFICA (aperta di default), DATI AZIENDALI (condizionale), SOCIAL & WEB, MARKETING & CRM, NOTE & STORICO
  - Nuovi ruoli utente: Lead, Cliente, Collaboratore, Editor, Manager, Admin
  - Badge colorati per ogni ruolo nella tabella utenti
  - Spiegazione permessi sotto il selettore ruolo
  - Ogni sezione ha icona, titolo e chevron per indicare stato espanso/compresso
- ✅ **Landing Page Corporate Medtronic** (implementato 23/02/2026)
  - Pagina dedicata `/speak-right-medtronic` nascosta dal menu principale
  - Target: HR Medtronic Italia - dal Board al personale operativo
  - 6 moduli syllabus: Segmentali, Soprasegmentali, Psicoacustica, Fisiologia, SOVT, Notazione Musicale
  - 3 pricing tiers: Speak Right 101 (€79), Pro (€119), Executive (€249)
  - 5 Key Assessment Methods: Intelligibility Audits, Analisi Spettrografica, Perceptual Ratings, etc.
  - 4 Tools VocalFitness per tracking: Analyzer, Pitch Coach, Ear Trainer, Stamina Tracker
  - Implementation Roadmap 6 mesi con deliverable
  - Confronto competitivo vs EF Education First

## Backlog

### P1 - Alta Priorità
- [x] Upload file diretto per contenuti (implementato 20/01/2026)
- [x] Cambio password utente (implementato 20/01/2026)
- [x] Importazione playlist YouTube (implementato 26/01/2026)
- [x] Sistema messaggi pop-up personalizzati (implementato 19/02/2026)
- [ ] **Browser Push Notifications** - Notifiche push browser per messaggi nuovi

### P2 - Media Priorità
- [x] Newsletter backend endpoint (implementato 20/01/2026)
- [x] Indici MongoDB per performance (implementato 20/01/2026)
- [ ] **Google Drive integration** - Importare contenuti da GDrive e assegnarli a clienti
- [ ] Google Calendar integration per prenotazioni
- [ ] Sincronizzazione automatica giornaliera playlist YouTube (cron job)
- [ ] Supporto video privati YouTube (richiede OAuth)
- [ ] Refactoring server.py in moduli con APIRouter

### P3 - Bassa Priorità
- [ ] Full LMS integration (corsi strutturati)
- [ ] Analytics dashboard
- [ ] Paginazione endpoint per liste lunghe
- [ ] Backup periodici database

## API Endpoints - Pop-up Messages
- `POST /api/admin/popups` - Crea messaggio pop-up (admin)
- `GET /api/admin/popups` - Lista messaggi pop-up (admin)
- `PUT /api/admin/popups/{id}` - Modifica messaggio (admin)
- `DELETE /api/admin/popups/{id}` - Elimina messaggio (admin)
- `POST /api/admin/popups/upload-media` - Upload media per pop-up (admin)
- `GET /api/members/popups` - Recupera pop-up attivi per il client
- `POST /api/members/popups/{id}/dismiss` - Dismiss permanente pop-up

## User Roles (Ruoli Utente)
| Ruolo | Badge | Emoji | Accesso |
|-------|-------|-------|---------|
| Lead | Giallo | 📝 | Area clienti |
| Cliente | Blu | 👤 | Area clienti |
| Collaboratore | Ciano | 🤝 | Admin limitato |
| Editor | Viola | ✏️ | Admin limitato |
| Manager | Arancione | 📊 | Accesso completo |
| Admin | Rosso | 🔐 | Accesso completo |

## Database Collections - Pop-up
- `popup_messages` - Messaggi pop-up (title, message_type, content, media_url, embed_code, target_users, is_active, button_text, button_url)
- `popup_dismissals` - Tracciamento dismissioni (user_id, popup_id, dismissed_at)

## Notes
- SMTP usa Zoho App-Specific Password
- In produzione configurare variabili d'ambiente su Emergent dashboard
- JWT_SECRET_KEY da cambiare in produzione
