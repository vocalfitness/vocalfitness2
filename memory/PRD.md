# VocalFitness - Product Requirements Document

## Problem Statement
VocalFitness è un sito web per un servizio di formazione Business English per professionisti italiani. Il sito deve catturare lead, presentare il metodo e permettere ai clienti paganti di accedere a contenuti esclusivi.

## User Personas
1. **Visitatore** - Professionista italiano che cerca di migliorare il proprio inglese per il business
2. **Lead qualificato** - Visitatore che ha interagito con il sito (form, chatbot Alice)
3. **Cliente pagante** - Utente con accesso all'area riservata
4. **Admin** - Gestore del sito che può creare utenti e gestire contenuti

## Core Requirements

### Funzionalità Pubbliche ✅
- [x] Homepage con presentazione del metodo VocalFitness
- [x] Sezione testimonial e success stories
- [x] Form di prenotazione valutazione gratuita
- [x] Form di contatto
- [x] Chatbot "Alice" per qualificazione lead
- [x] Pagina Risorse con materiali educativi
- [x] Sezione Corporate Solutions
- [x] Pagina dedicata Corporate Training
- [x] Supporto bilingue IT/EN
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
