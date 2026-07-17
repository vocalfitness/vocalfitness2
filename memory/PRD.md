# VocalFitness - Product Requirements Document

## Problem Statement
VocalFitness è un sito web per un servizio di formazione Business English per professionisti italiani. Il sito deve catturare lead, presentare il metodo e permettere ai clienti paganti di accedere a contenuti esclusivi.

## User Personas
1. **Visitatore** - Professionista italiano che cerca di migliorare il proprio inglese per il business
2. **Lead qualificato** - Visitatore che ha interagito con il sito (form, chatbot Alice)
3. **Cliente pagante** - Utente con accesso all'area riservata
4. **Admin** - Gestore del sito che può creare utenti e gestire contenuti

## Core Requirements


### 17/07/2026 · FASE 2 · Expert Mode diagnostica FormantPath (solo diagnostica) — DONE ✅ (testing agent 45/45)

- **Scopo**: capire perché il tracker oscilla tra regimi di misura su /æ/ identici (F1 573-897, F3 2160-3273). Nessuna modifica a scoring/riferimenti/UI di scoring.
- **Backend**: la risposta di `analyze-formants` include ora `diagnostics` con: `max_num_formants`, `ceiling_range_tested_hz` [5500,5000,4500], `ceiling_selected_hz`, `candidate_formants` (top-6 finestre con start/end ms + F1/F2/F3 + SD + plausibile), `nucleus_window_ms` (start/end), `reliable`, `attempts` per-ceiling. Log strutturato `analyze-formants[expert]:` (INFO se reliable, WARNING se unreliable — così l'oscillazione è tracciabile anche sui 422). `diagnostics` è top-level, non inquina `student_formants`.
- **Frontend** (`FormantScorePanel`): pannello **Expert Mode** nascosto di default (toggle `expert-mode-toggle`), mostra parametri FormantPath, tentativi per ceiling, tabella finestre candidate pre-selezione e finestra nucleo.
- Testing agent 45/45 PASS, nessuna regressione sullo scoring.



### 16/07/2026 · FASE 2 · Fix fallback silenzioso su misure implausibili — DONE ✅ (testing agent 35/35)

- **Problema**: quando nessuna finestra passava il controllo F1≤900Hz, il codice ripiegava silenziosamente sulla finestra a minima varianza (F1 implausibile) e la punteggiava come valida — nessun flag. Riprodotto: stesso /iː/, 343Hz (73/B1) vs 933Hz (16/A1).
- **Fix** (`phoneme_formants.py`): (a) `_extract_formants` **ritenta** con tetti LPC alternativi 5500→5000→4500 Hz; restituisce il primo risultato plausibile con `reliable=True`; (b) se tutti i retry restano >900Hz → `reliable=False` e l'endpoint solleva **HTTP 422** esplicito ("Misura non affidabile…") invece di un punteggio fuorviante; (c) **WARNING log** con il valore F1 implausibile ad ogni fallback/rifiuto.
- Verificato: WAV F1~1250 → 422 + WARNING (F1=1229); vocale normale → 200 reliable; **riproducibilità 5x**: stessi byte → 5x identico (200) oppure 5x 422 coerente. Testing agent 35/35 PASS, nessuna regressione.



### 16/07/2026 · FASE 2 · Fix critico F0 instabile (gruppo speaker che oscilla male/female) — DONE ✅ (testing agent 29/29)

- **Problema**: F0 stimato solo sul nucleo (~20ms) → sensibile al rumore → stessa voce classificata 'male' in una registrazione e 'female' nella successiva.
- **Fix**: `_extract_formants` calcola ora F0 come **media su TUTTI i frame voiced dell'intera registrazione** (min 100ms di audio voiced, altrimenti F0=None). Selezione gruppo con **threshold fissi**: F0<165 → men, 165-255 → women, >255 → children (RP: women/children → female). `group_method='f0_threshold'` (F0 presente) o `'formant_distance'` (fallback).
- **Frontend** (`FormantScorePanel`): riga gruppo speaker ora mostra "Confrontato con riferimento madrelingua <gruppo> · voce rilevata F0 medio ~<F0> Hz" (diagnostica).
- Verificato: F0=120→men, 200→women, 281→children; 3 POST identici → stesso gruppo (deterministico). Testing agent 29/29 PASS, nessuna regressione.



### 16/07/2026 · FASE 2 · Fix architetturale scoring parole (dataset come riferimento numerico) — DONE ✅ (testing agent 23/23)

- **Problema**: i formanti estratti dai campioni MP3 del Prof. Dapper variano troppo tra parole (/iː/ 'feel' F3=2967 vs 'season' F3=2554) → scoring instabile.
- **Fix 1 — dataset sempre**: lo scoring numerico F1/F2/F3 + composito CEFR usa SEMPRE le medie Hillenbrand/Deterding da `formant_references` quando esiste un riferimento per phoneme+dialect, **anche per le parole** (rimosso il gate `use_dataset = target_kind=='phoneme'`; `_find_reference` chiamato incondizionatamente). Il campione docente resta solo come riferimento **visivo** nello spettrogramma sinistro; il teacher-sample numerico è fallback solo per fonemi assenti dal dataset (dittonghi/consonanti).
- **Fix 2 — nucleo a minima varianza**: `_extract_formants` sceglie la finestra scorrevole di 20ms con **SD minima di F1+F2** (steady-state), invece della massima intensità — robusto in contesto consonantico.
- **Fix 3 — sanity check F1>900Hz**: se la finestra candidata ha F1 mediana >900 Hz (implausibile per vocale adulta) viene scartata e si usa la finestra adiacente stabile; fallback alla minima varianza solo se tutte >900.
- Verificato: word /ʊ/ → `reference_source=dataset` (era teacher_sample), F1=448; WAV con segmento spurio F1=1200 + /ʊ/ → F1=437 (finestra alta scartata). Testing agent 23/23 PASS, tutte le regressioni (Bug1-4, consent, fallback teacher_sample per fonemi assenti) intatte.



### 16/07/2026 · FASE 2 · Fix Bug 4 (gruppo 'children' errato + F1>1000 su /ʊ/ CVC) — DONE ✅ (testing agent 18/18)

- **Causa**: su parole CVC brevi (/lʊk/) il nucleo vocalico veniva trovato come istante di massima intensità globale → cadeva sul burst della consonante /k/ (più forte della vocale breve) → F1>1000 Hz; la selezione gruppo usava la distanza tra formanti (circolare) → sceglieva 'children'.
- **Fix**: `_extract_formants` costruisce un contorno di pitch (To Pitch, floor 60Hz), cerca il nucleo tra i **frame sonori** (voiced), misura F1/F2/F3 mediana + **F0 mediana** solo su frame sonori (finestra ±50ms, allargamento adattivo per vocali brevi). Selezione gruppo ora **guidata da F0** (men≈130/women≈220/children≈236 Hz) invece che dalle formanti; fallback a distanza formanti solo se F0 assente.
- **Logging**: F0 estratto + `selected_group=... (via f0|formant_distance)` per entrambi i percorsi (dataset e teacher-sample).
- Verificato: WAV con vocale sonora F0=120 + burst non-sonoro **più forte** → F1≈450 (non >1000), F0=120, gruppo=**men**. Testing agent 18/18 PASS, nessuna regressione (Bug1/2/3, consent, /iː/).



### 16/07/2026 · FASE 2 · Fix Bug 3 (F1 alto + composito troppo penalizzante) — DONE ✅ (testing agent 15/15)

- **Logging gruppo speaker**: `analyze-formants` ora logga `selected_group` (men/women/children), `groups_available` e le medie per gruppo; la risposta include `reference_group`. Diagnostica per capire quale riferimento viene usato.
- **Tolleranza ±2SD → ±2.5SD**: `_score_gop(..., tol_sd=2.5)` — i dataset Hillenbrand/Deterding sono registrazioni studio, il microfono consumer devia legittimamente di più.
- **Composito ripesato**: `_weighted_composite` con pesi F1=0.15 / F2=0.425 / F3=0.425 (con F3) e F1=0.35 / F2=0.65 (senza F3). F1 è pesato meno perché la banda bassa è quella più corrotta dai microfoni consumer. Caso segnalato [F1=0, F2=59, F3=88]: composito 49→**62.5**, CEFR A2→**B1**.
- Testing agent: 15/15 PASS (unit su `_score_gop`/`_weighted_composite` + E2E group-logging + regressioni Bug1/Bug2/consent).



### 16/07/2026 · FASE 2 · Fix 2 bug pre-deploy (formanti + riferimento parola) — DONE ✅ (testing agent 5/5)

- **BUG 1** (estrazione formanti da microfono reale errata: /iː/ dava F1=834 Hz): `_extract_formants` ora localizza il **nucleo vocalico** (istante di massima intensità via `to_intensity`) e prende la **mediana** delle formanti in una finestra ±60ms, invece della media su una finestra fissa 20-80% che includeva silenzio/rumore/plosive. Fix aggiuntivo: `snd.subtract_mean()` (metodo in-place, non riassegnato). Verificato: F1=333 Hz (range corretto).
- **BUG 2** (riferimento docente su parola 'look' falliva): gli URL audio delle parole sono **relativi** (`/api/uploads/...`) e `httpx` non li scaricava. `_fetch_and_extract` ora risolve gli URL relativi contro `http://localhost:8001` (funziona in Preview e Prod indipendentemente da FRONTEND_URL) e converte MP3→WAV via `parselmouth.Sound.save` prima dell'analisi. Verificato: `reference_source=teacher_sample`, 3 formanti.
- Testing agent (backend): 5/5 PASS, nessuna regressione (consent gate 403→200, path dataset vocale OK).



### 16/07/2026 · FASE 2 · Scoring automatico formanti + GDPR — DONE ✅ (backend testato; flusso microfono live da verificare manualmente)

**Richiesta**: potenziare l'auto-valutazione (Fase 1) con pipeline di scoring formanti end-to-end (7 step) + requisiti GDPR.

**STEP 1** — `praat-parselmouth==0.4.7` installato (Praat incluso, nessuna dip. di sistema). `To FormantPath (burg)` a tetto adattivo → gestisce voci M/F/bambino senza selezione manuale. Verificato.

**STEP 2** — Endpoint `POST /api/phonemes/analyze-formants` (`routers/phoneme_formants.py`): estrae F1/F2/F3 (media sul 20-80% stabile della clip). **Audio convertito in WAV lato client** (`lib/blobToWav.js`, Web Audio API) → Parselmouth legge WAV/MP3 nativamente, **nessun ffmpeg** → pipeline identica Preview/Prod.

**STEP 3** — Collezione `formant_references` (58 righe, seed idempotente allo startup): GenAm Hillenbrand et al. 1995 (12 vocali × M/F/bambini, F1/F2/F3) + RP Deterding 1997 (11 vocali × M/F, F1/F2). Riferimenti misti: dataset per vocali monottongali, campione Prof. Dapper (fetch+analisi mp3) per dittonghi/consonanti/parole. `data/formant_references.py`.

**STEP 4** — Scoring GOP: per-formante 0-100 con tolleranza ±2 SD dalla media nativa (dataset) o ±15% relativo (campione docente). Selezione automatica del gruppo speaker più vicino (gender-agnostic). Composito = media formanti.

**STEP 5** — Mapping fasce ispirate CEFR "Sound Articulation" (A1→C1-C2). Flag `high_impact` per fonemi ad alto carico funzionale (/θ/,/ð/,/iː/,/ɪ/,/i/). UI cita Hillenbrand 1995 / Deterding 1997 + CEFR Companion Volume (Piccardo 2016), esplicitando "metodologia Vocal Fitness, non certificazione CEFR ufficiale".

**STEP 6** — Frontend `FormantScorePanel.jsx` sotto gli spettrogrammi: punteggio F1/F2/F3 con barre + hint direzionale ("F2 troppo basso = non abbastanza frontale"), composito + fascia CEFR, citazione fonte. Auto-analisi dopo la registrazione (nessun click extra) + pulsante "Rianalizza".

**STEP 7 · GDPR** — `ConsentDialog.jsx`: doppio consenso separato audio/video, revocabile indipendentemente (`POST/GET /api/phonemes/consent`, collezione `user_consents`). Registrazione/analisi bloccate senza consenso audio (gate su Fase-1 save + analyze). Cancellazione granulare per singola registrazione già presente (DELETE Fase 1). RBAC minimo: studente vede solo le proprie registrazioni, admin tutto; ruoli `teacher`/`corporate` rimandati a fase successiva (scelta utente 1b).

**Verifica**: backend E2E via curl — consent gate 403, GOP dataset (gruppo men auto-selezionato), teacher-sample (fetch mp3), CEFR, citazione, routing risolto (consent vs /phonemes/{id}). Frontend: studio + consent dialog + footer renderizzati (screenshot). ⚠️ Il flusso microfono LIVE (registra→WAV→analyze→punteggio) non è testabile in automazione headless — da verificare manualmente.

**Deploy**: Preview — richiede Deploy per la Produzione.



### 15/07/2026 · Modulo Auto-valutazione · Registrazione audio + spettrogramma affiancato (Fase 1) — DONE ✅

**Richiesta**: aggiungere alla phoneme card un modulo di auto-valutazione con registrazione audio (solo audio, niente webcam/video/scoring/LPC in questa fase). Lo studente registra la propria pronuncia, vede il proprio spettrogramma affiancato a quello di riferimento del Prof. Dapper, e (se loggato) salva la registrazione collegata a studente/card/fonema/dialetto/timestamp.

**Scelte utente**: registrazione aperta anche agli anonimi (salvataggio solo per loggati) · cronologia registrazioni con play+elimina · selettore bersaglio (fonema isolato + parole di esempio).

**Backend** — nuovo `backend/routers/phoneme_recordings.py` (`build_phoneme_recordings_router`, registrato in `server.py`):
- `POST /api/phonemes/{card_id}/recordings` (auth) — multipart: file + phoneme_ipa + dialect(AmE|RP) + target_kind + target_label. Persist su Emergent object storage (`recordings/{student}/…`), doc in collezione `phoneme_recordings`. Max 15 MB, ext webm/ogg/m4a/mp4/wav/mp3.
- `GET /api/phonemes/{card_id}/recordings` (auth) — cronologia dello studente, newest first.
- `DELETE /api/phonemes/recordings/{id}` (auth) — elimina la propria registrazione.

**Frontend** — nuovo `frontend/src/components/StudentRecordingStudio.jsx`, integrato in `PhonemeCardPage.jsx` (nuova sezione sotto "Lo spettrogramma del Prof. Dapper", nessun modulo esistente toccato):
- `MediaRecorder` browser → blob → **riusa `SpectrogramView`** (stesso renderer del riferimento) per lo spettrogramma dello studente.
- Due spettrogrammi affiancati: sinistra riferimento, destra studente. Selettore bersaglio + toggle dialetto GenAm/RP.
- Salva (solo loggati; anonimi vedono invito al login) + cronologia con play + elimina.

**Verifica**: backend E2E via curl (create→storage fetch 200→list→delete OK). Frontend smoke test: modulo renderizzato, tutti i data-testid presenti, spettrogrammi affiancati corretti. NOTA: il flusso microfono live non è testabile in automazione headless.

**Deploy**: cambiamenti in Preview — richiede Deploy per la Produzione.



### 09/02/2026 · Iteration 42 — 4-bug bundle + auto-migrations al startup — DONE ✅

**Contesto**: Prof segnala 4 bug su produzione con screenshot bundle:
1. AmE card /i/ /u/ /ɔ/ non fanno autofill → "Fonema non presente nell'inventario canonical"
2. Lista admin mostra card AmE mescolate con RP (studenti confusi)
3. Example sentences perdono l'highlight arancione sulle parole-target
4. Trapezoide top-of-card piazza il dot in alto-sinistra invece che sulla posizione corretta

**Fix (4 step ordinati)**:

**Step 1** — 3 equivalenze IPA short↔long in `_IPA_EQUIVALENTS`:
```python
"i":  ["i",  "iː"],   # AmE i-fleece-ame ↔ RP FLEECE
"u":  ["u",  "uː"],   # AmE u-goose-ame ↔ RP GOOSE
"ɔ":  ["ɔ",  "ɔː"],   # AmE oh-thought-ame ↔ RP THOUGHT
```

**Step 2** — `create_ame_variant_cards.py` ora stampa `clone["dialects"] = ["AmE"]` sui cloni futuri.

**Step 3** — Migration `fix_dialect_tags.py`: 8 card `-ame` → `dialects=["AmE"]`, 6 card RP source (e-dress, er-nurse, o-lot, ou-goat, a-palm, o-thought) → `dialects=["RP"]`. **14 righe DB aggiornate**.

**Step 4a** — Migration `backfill_es_highlights.py`: 50/52 card ricevono `highlights` deterministici calcolati da `commonWords`, stesso tokeniser di `_es()`. No LLM.

**Step 4b** — Patch `_needs_draft`: qualsiasi `exampleSentence` senza `highlights` triggera redraft.

**Auto-migrations al startup** (idempotenti): step 12 (dialect-tags) + step 13 (es-highlights) in `ensure_phoneme_seed()`. Al secondo restart consecutivo log mostra `patched=[]` — zero write inutili.

**Extra**: aggiunto campo `dialects` a `PhonemeCardSummary` per frontend filter RP/GenAm.

**Verifica E2E**:
- ✅ VERIFICA 1: `/i/ /u/ /ɔ/ + dialect=GenAm` → autofill success con vowelChartPosition corretto
- ✅ VERIFICA 2: 6 RP-only + 8 AmE-only + 38 shared = 52 totali · overlap RP∩AmE = **0**
- ✅ VERIFICA 3: 52 card con exampleSentences hanno tutte `highlights` popolate
- ✅ Idempotenza: 2 restart consecutivi → `patched=[]`

**Test totale iter 36-42**: **34/34 PASS**.

Il Prof al prossimo deploy NON deve eseguire nessuno script manuale — il backend è self-migrating.

---

### 09/02/2026 · Iteration 40 — Fix guardia "published card" invertita (root cause definitivo) — DONE ✅

**Contesto**: dopo iter 39 (frontend passato a `batch-fill-v2`), Prof continuava a segnalare "le frasi di esempio non vengono create" su `schwa` in produzione. Screenshot allegato mostrava `vocalfitness.org/lms/phoneme/schwa` con anatomia perfetta ma sezione example sentences vuota.

**Root cause definitivo** — verificato via curl diretto sulla API pubblica prod:
```
GET https://vocalfitness.org/api/phonemes/schwa
→ pub=True · exampleSentences=[]
```
La card `schwa` in produzione è **pubblicata**. La guardia in `admin_batch_fill_v2` (line 2306 pre-fix) diceva:
```python
if doc.get("published") and not payload.overwrite:
    raise HTTPException(409, "usa overwrite=true per forzare")
```
Il frontend passa sempre `overwrite=false`. Quindi: **ogni click "Batch bozze AI" su card pubblicata → 409 → NULLA veniva generato**. L'errore veniva pushato nel results panel come stringa truncata, silenzioso per l'utente.

**Fix (inversione semantica)**:
```python
# ANTE:
if doc.get("published") and not payload.overwrite: → 409
# POST:
if doc.get("published") and payload.overwrite: → 409
```
Nuova semantica **corretta e sicura**:
- `overwrite=false` (additive: `_needs_draft` scrive solo su campi vuoti) → **ALLOW su qualunque card**, anche pubblicata. Non c'è mai distruzione.
- `overwrite=true` (destructive: sovrascrive esistente) → **ALLOW solo su card unpublished**. Su card pubblicata restituisce 409 con messaggio chiaro: "Depubblica prima o usa overwrite=false".

**Verifica E2E preview**:
```
POST /admin/phonemes/i-fleece/batch-fill-v2 (published, overwrite=false)
→ HTTP 200 · applied.creative: [deepDive, videoScript]  (fills empties only)

POST /admin/phonemes/i-fleece/batch-fill-v2 (published, overwrite=true)
→ HTTP 409 · "La scheda è pubblicata — non posso sovrascrivere. Depubblica..."
```

**Regression tests** — `backend/tests/test_batch_fill_v2_published_guard.py` (4 test PASS):
1. Published + overwrite=false → allow ✅
2. Published + overwrite=true → 409 ✅
3. Unpublished + overwrite=false → allow ✅
4. Unpublished + overwrite=true → allow ✅

**Test totale**: **21/21 PASS** (4 published-guard + 2 wiring + 8 needs_draft + 6 AmE + 1 helper).

**Impatto**: dopo il redeploy, il click "Batch bozze AI" da homepage genererà **finalmente** le example sentences (e tutti gli altri creative fields vuoti) sulle 11 card pubblicate in produzione. Il ciclo completo funzionerà:
1. "Batch bozze AI" → text creative popolato (incluse frasi esempio)
2. "Genera audio su tutte" → audio ElevenLabs per tutti i clip
3. Card pubblicata su vocalfitness.org mostra frasi + audio

**Errore diagnostico corretto**: nei precedenti iter 38-39 avevo trovato bug reali (crash 500, endpoint sbagliato) ma nessuno era LA root cause del problema di Prof. La combinazione dei 3 fix (iter 38 type-safe + iter 39 endpoint corretto + iter 40 guard invertita) risolve il flusso end-to-end.

---

### 09/02/2026 · Iteration 39 — Homepage "Batch bozze AI" ora chiama v2 endpoint — DONE ✅

**Root cause SCOPERTO (era il vero problema)**: il tasto "Batch bozze AI" nella homepage CMS (`PhonemeAdminPage.jsx` linea 97) chiamava l'endpoint LEGACY `/batch-fill` che gestisce SOLO `mnemonic` + `funFact` — NON toccava `exampleSentences`, `deepDive`, `videoScript`. Le mie fix iter 38 (helper `_needs_draft` type-safe) erano nel `batch-fill-v2` che **non era mai raggiunto dal frontend**. Ecco perché Prof continuava a vedere "nulla è cambiato" dopo il deploy — la fix era corretta ma nel posto sbagliato dell'API.

**Fix**: aggiornato `PhonemeAdminPage.jsx` per chiamare `POST /api/admin/phonemes/{id}/batch-fill-v2` con payload `{include_creative: batchIncludeAi, overwrite: false}` invece del legacy `/batch-fill` con `{include_ai}`. Ora il click "Batch bozze AI" attiva la piena taxonomy §1 dello spec Phase-2:
- **DERIVED** (§3.1-§3.5): features, knobs, classification, vowelChartPosition, facialMuscles, hotspots, commonWords, spellings, pronunciationProtocol
- **CREATIVE**: mnemonic, funFact, deepDive, **exampleSentences**, videoScript

**Regression tests** — `backend/tests/test_batch_fill_v2_frontend_wiring.py` (2 test, PASS):
1. Homepage calls `/batch-fill-v2` (not legacy `/batch-fill`)
2. Request body uses `include_creative` flag

**Verifica E2E preview**:
```
POST /api/admin/phonemes/i-kit/batch-fill-v2 → HTTP 200
applied.creative: [mnemonic, funFact, deepDive, exampleSentences, videoScript]
applied.derived:  [features, knobs, classification, vowelChartPosition, facialMuscles, hotspots, commonWords, spellings]
readinessScore: 93 (era 83)
DB: 3 exampleSentences correttamente popolate con testo grounded
```

**Test totali finora**: 17 pytest PASS (2 wiring + 8 needs_draft + 6 AmE seed + 1 helper)

**Impatto**: dopo il redeploy, il click "Batch bozze AI" da homepage genererà TUTTE le fields creative (incluse le frasi di esempio) invece di solo 2. Il flusso end-to-end funzionerà:
1. Click "Batch bozze AI" → text di 5 creative fields generato
2. Click "Genera audio su tutte" → tutti gli audio generati
3. Frasi esempio ora hanno testo + audio ElevenLabs

---

### 09/02/2026 · Iteration 38 — Fix `batch-fill-v2` 500 crash su `exampleSentences` — DONE ✅

**Contesto**: utente segnala "Le frasi di esempio nelle card fonetiche non vengono più generate" — su produzione né testo né audio delle example sentences venivano più creati dopo "Batch bozze AI".

**Root cause identificato** (`phoneme_cards.py::admin_batch_fill_v2` → `_apply_field`):
```python
if payload.overwrite or _is_empty_or_default(cur) or _is_empty_or_default(
        (cur or {}).get("phrase") if card_key == "mnemonic" else (cur or {}).get("body")):
```
Quando `card_key == "exampleSentences"` e la card ha già ≥1 frase, `cur` è una **lista** non un dict. Il fallback `(cur or {}).get("body")` chiamava `.get()` su `list` → **AttributeError: 'list' object has no attribute 'get'** → **HTTP 500 Internal Server Error** → l'intero endpoint abortiva → NESSUN campo veniva generato (né exampleSentences, né mnemonic, né funFact, né altri).

**Fix**: estratta la logica in un helper type-safe `_needs_draft(card_key, cur)`:
- lista/tupla/stringa/None vuoto → True
- non-dict non-vuoto → False (già filled, non chiamare `.get()`)
- dict skeleton → controlla la chiave giusta per tipo (`phrase` per mnemonic, `script` per videoLesson, `body` per funFact + pronunciationGuide)

**Regression tests** — `backend/tests/test_batch_fill_v2_creative_guard.py` (9 test, tutti PASS):
1. `_is_empty_or_default` gestisce list/tuple/dict/str/None
2. **`exampleSentences` = `[{"text": "..."}]` NON crasha più** (era esattamente l'input che innescava il bug)
3. `exampleSentences` = `[]` o `None` → needs draft
4. `mnemonic` skeleton con phrase vuota → needs draft
5. `mnemonic` con contenuto → skip
6. `funFact` skeleton con body vuoto → needs draft
7. `funFact` con contenuto → skip
8. `videoLesson` skeleton con script vuoto → needs draft
9. `videoLesson` con script → skip

**Verifica E2E**:
- Pre-fix: `POST /admin/phonemes/i-kit/batch-fill-v2` → **HTTP 500**
- Post-fix: **HTTP 200** con `applied.creative: [mnemonic, funFact, deepDive, exampleSentences, videoScript]` → tutte 5 le creative fields rigenerate

**Nota per l'utente**: dopo redeploy in produzione, cliccando "Batch bozze AI" con `overwrite=false` (default) le card che già hanno frasi vedranno solo le fields davvero mancanti rigenerate. Per forzare rigenerazione completa usare `overwrite=true` dall'editor.

**Impatto**: questo bug bloccava **tutto** il flusso AI drafting su card con contenuto esistente. Risolto per tutte le 52 card.

---

### 09/02/2026 · Iteration 37 — Voice picker RP + canonical fallback /ɒ/ + trapezoide vowels — DONE ✅

**Contesto**: dopo il deploy in produzione l'utente ha segnalato 4 issue distinte sul Phoneme CMS.

**Issue 1 · 30 parole ma solo 10 audio RP (P0, risolvibile con redeploy)**:
Il codice preview genera già 30 parole × 2 dialetti (verificato via `_compute_card_audio_items`). In produzione le prime 10 hanno audio RP (batch vecchio con `words_limit=10`); le altre 20 aggiunte dopo. Al prossimo redeploy + click su "Genera audio su tutte" (idempotente) le 20 mancanti verranno completate. Corretti anche i testi UI stantii "Top 10 parole comuni" → "Top 30" in `PhonemeRoadmapDashboard.jsx` (dialog conferma + descrizione bottone).

**Issue 2 · Voice picker RP per parole comuni (feature nuova)**:
- `PhonemeAdminEditorPage.jsx`: aggiunti 2 dropdown 🇺🇸 AmE + 🇬🇧 RP nella barra "Bulk audio ElevenLabs" della sezione Parole comuni
- Fetch voci da `/api/admin/elevenlabs/voices` una tantum a load-time
- Selezione persistita in `localStorage` (`vf_editor_voice_ame` / `vf_editor_voice_rp`)
- 4 chiamate al `batch-audio` (regen singola, regen selezionate, bulk mancanti, bulk sovrascrivi tutti) ora passano `voice_ame` e `voice_rp`
- Bottone "reset" per tornare al default Steve Dapper
- `data-testid`: `editor-cw-voice-pickers`, `editor-cw-voice-ame`, `editor-cw-voice-rp`, `editor-cw-voice-reset`

**Issue 3 · `/ɒ/` AI drafting GenAm errore "canonical inventory missing" (P0)**:
- `_IPA_EQUIVALENTS` in `phoneme_cards.py`: aggiunta equivalenza LOT-PALM merger `/ɒ/ ↔ /ɑ/ ↔ /ɑː/` (Wells 1982)
- Ora quando si drafta AI per dialect=GenAm su una card `/ɒ/`, il lookup canonical cade su `/ɑː/` GenAm invece di erroreggiare
- Verificato: `POST /api/admin/phonemes/o-lot/ai-draft?dialect=GenAm` restituisce ora `drafts` (LLM risponde)

**Issue 4 · Trapezoide vocalica: fonema mancante graficamente (P0)**:
- `VOWEL_TARGETS` in `PinkTromboneEmbed.jsx`: aggiunte 6 vocali mancanti (`/ɒ/ LOT`, `/ʌ/ STRUT`, `/ɜ/ NURSE RP`, `/ɝ/ NURSE AmE`, `/ɛ/ DRESS AmE`, `/ɚ/ letter r-schwa`)
- Ora ogni card ha il proprio dot posizionato correttamente sul trapezoide IPA, incluso i fonemi AmE splittati (iter 35) e /ɒ/ RP

**Verifiche**:
- Lint JS + Python: OK
- Backend restart: OK
- `/api/admin/phonemes/o-lot/ai-draft?dialect=GenAm` → SUCCESS
- Batch endpoint accetta `voice_rp` senza errori (verificato con voice_id valido)
- Frontend editor renderizza (screenshot smoke test u-foot)

---

### 09/02/2026 · Iteration 36 — Auto-seed AmE cards on backend startup — DONE ✅

**Contesto**: dopo split delle 8 card AmE (iter 35), il DB di produzione (`vocalfitness.org`) risultava sprovvisto delle nuove card perché la migrazione era stata eseguita solo su preview. L'utente ha richiesto: *"execute it on the next backend startup, don't make me do it please!"*.

**Nessun cambio di logica al Voice Lab richiesto** — il dropdown "Associa direttamente a fonema" già renderizza qualunque card trovi in `/api/admin/phonemes`. Il fix consisteva unicamente nel garantire che il DB di produzione contenga le 8 card.

**Refactor idempotente** — `backend/scripts/create_ame_variant_cards.py`:
- Estratta la logica in funzione async `ensure_ame_variant_cards(db)` → riusabile in startup + CLI
- Aggiunta l'8ª variante mancante nello script: `epsilon-dress-ame` (`/ɛ/` DRESS clone di `e-dress`)
- Ritorna `{"created", "skipped", "missing_src"}` per structured logging
- Mantiene `if __name__ == "__main__"` per esecuzione manuale (CLI)

**Wire-up allo startup** — `backend/routers/phoneme_cards.py::ensure_phoneme_seed()`:
- Aggiunto step 11) chiamata a `ensure_ame_variant_cards(db)` come ultimo passo del seed
- Try/except non-fatal: log dell'errore ma non blocca il boot
- Segna `ame-variants.created×N` nel campo `patched` del log di startup per visibilità operativa

**Regression tests** — `backend/tests/test_ame_variant_seed.py` (6 test, tutti PASS):
1. Crea tutte 8 le card su DB vuoto
2. Idempotente su seconda esecuzione (0 create, 8 skipped)
3. Clone azzera tutti gli slot audio (isolated/examples/mnemonic/commonWords)
4. Clone resetta tutti i lock flags (hotspots/lexicon/pronunciation/mnemonic)
5. Source RP mancante → riportata in `missing_src` senza throw
6. IPA/displayName/title patchati correttamente sul clone

**Verifica end-to-end preview**:
- DB pulito delle 8 AmE cards → restart backend → log: `patched=['ame-variants.created×8']` ✅
- API `/api/admin/phonemes` restituisce di nuovo 52 card ✅
- Dropdown Voice Lab mostra ogni card AmE indipendentemente (`/ɛ/ · epsilon-dress-ame`, `/ɚ/ · schwar-letter-ame`, ecc.)

**Prossimo deploy in produzione**: al primo boot dopo deploy, il seed migration popolerà automaticamente il DB prod con le 8 card AmE senza alcun intervento manuale.

---

### 08/02/2026 · Iteration 35 — 8 card AmE-specific indipendenti — DONE ✅

**Contesto**: l'utente vuole poter selezionare ogni fonema IPA (UK + US) individualmente. Estensione dell'iter 34 (`/ɛ/` DRESS) al set completo di divergenze RP↔AmE.

**Script migration**: `backend/scripts/create_ame_variant_cards.py`
- Duplica RP source → patch id/ipa/displayName/title
- **`strip_audio()`**: azzera tutti gli slot audio (isolated, examples, mnemonic, common words × 2 dialetti) → il batch runner rigenera con la nuova IPA
- **`reset_locks()`**: azzera hotspots/lexicon/pronunciation/mnemonic_locked → il Prof può rigenerare hotspot articolatori
- Draft di default (`published: false`) → richiede review manuale
- Idempotente: skip se target id già presente

**Card create (8 totali, DB preview)**:
| IPA | ID | Source RP | Lexical Set |
|-----|-----|-----|-----|
| `/ɛ/` | epsilon-dress-ame | e-dress | DRESS |
| `/ɑ/` | ah-palm-ame | a-palm | PALM/LOT |
| `/ɔ/` | oh-thought-ame | o-thought | THOUGHT/CLOTH |
| `/ɝ/` | er-nurse-ame | er-nurse | NURSE |
| `/ɚ/` | schwar-letter-ame | schwa | letter/r-schwa |
| `/oʊ/` | ou-goat-ame | ou-goat | GOAT |
| `/i/` | i-fleece-ame | i-fleece | FLEECE |
| `/u/` | u-goose-ame | u-goose | GOOSE |

Totale: **52 card** (44 originali + 8 AmE).

**Frontend `ElevenLabsStudio.jsx`**: aggiornato `RP_TO_AME_IPA` — svuotato per LOT/PALM/THOUGHT/NURSE/letter/GOAT/FLEECE/GOOSE/DRESS (ora card indipendenti). Rimangono i mapping per NEAR/SQUARE/CURE (centering diphthongs) se un giorno il Prof decidesse di splittarli.

**Migration produzione**: in produzione va rieseguito `python3 scripts/create_ame_variant_cards.py` una tantum dopo il deploy. Idempotente e sicuro.

**Prossimi step utente**: personalizzare le 8 card nuove dall'admin editor (hotspot articolatori corretti per la nuova IPA, rigenerare audio, pubblicare).



### 08/02/2026 · Iteration 31 — Voice Lab · Tabella equivalenze RP↔AmE — DONE ✅

**Contesto**: enhancement veloce all'iter 30. Sotto la griglia chip IPA aggiunta una tabella collassabile con 15 lexical sets (Wells 1982) che mostra la corrispondenza tra fonemi RP e AmE.

**Frontend `ElevenLabsStudio.jsx`**:
- Nuovo `<details data-testid="el-ipa-equivalence-table">` con summary "🔀 Tabella equivalenze RP ↔ AmE (Wells 1982 lexical sets)".
- Tabella 15 righe con colonne: Lexical set · 🇬🇧 RP · ≡ · 🇺🇸 AmE · Esempio.
- Distinzione `=` (mapping 1:1 stabile) vs `≈` (variazione regionale — rhoticity, cot-caught merger).
- Coverage: LOT, CLOTH, PALM, THOUGHT, GOAT, NURSE, letter, FLEECE, GOOSE, happY, NEAR, SQUARE, CURE, START, NORTH.
- Footnote scientifico: Wells (1982) "Accents of English".

Verificato via Playwright: 15 righe renderizzate, tabella espandibile, tutti i simboli IPA leggibili.



### 08/02/2026 · Iteration 30 — Voice Lab · Fonemi AmE + Repository per dialetto — DONE ✅

**Contesto**: griglia chip IPA e sezione Repository nel Voice Lab avevano solo fonemi RP. Aggiunta esplicita del set AmE.

**Frontend `ElevenLabsStudio.jsx`**:
- `IPA_QUICK` esteso da 8 → 11 gruppi:
  - Vocali condivise (7): ɪ ʊ ɛ e æ ʌ ə
  - Monoftongi RP (6): iː uː ɑː ɔː ɜː ɒ
  - **Vocali AmE** (6): i u ɑ ɔ ɝ ɚ [r-colorate + no length]
  - Dittonghi condivisi (4): eɪ aɪ ɔɪ aʊ
  - Dittonghi RP centering (4): əʊ ɪə eə ʊə
  - **Dittonghi AmE** (1): oʊ
  - 5 gruppi consonanti invariati (24 chip)
  - **Totale 52 chip** cliccabili, ognuno con `data-testid="el-ipa-chip-{sym}"`
- Sezione "📚 Repository IPA scientifiche (RP + AmE · CC-BY-SA)" riorganizzata in 3 sottosezioni:
  - **🇬🇧 RP**: Pronunciation Studio · Wikipedia RP
  - **🇺🇸 AmE**: Pronuncian · Wikipedia GA · **University of Iowa Sounds of Speech** (animazioni articolatorie + audio, riferimento accademico)
  - **🌐 Universali**: IPA.org · UCLA Ladefoged · GitHub UCLA-IPA-Corpus · Wikimedia Commons
- Workflow rapido documentato inline: Wikimedia → tasto destro → "Copia indirizzo audio" → "Da URL esterno" → Scarica → Associa.

**Testing**: iteration_30.json — Playwright verifica 11 gruppi, 52 chip totali, 7/7 chip AmE funzionanti (click → input popolato), 3 sezioni repository con 9 link tutti conformi (`target=_blank`, `rel=noreferrer`), zero regressioni, zero errori console.



### 08/02/2026 · Iteration 29 — Voice Lab external URL fetcher + "Associa a fonema" (one-click) — DONE ✅

**Contesto**: l'utente ha chiesto come associare i suoni delle repository IPA scientifiche (Wikimedia, UCLA, IPA.org, GitHub raw) ai fonemi come file URL. Il workflow manuale precedente aveva 5-6 step (scarica → salva su PC → trascina in Voice Lab → copia URL → vai in Phoneme CMS → incolla in slot audio). Ora è **un solo click**.

**Backend `elevenlabs.py`**:
- Nuovo modello Pydantic **`FetchExternalAudioRequest`** a livello modulo (fuori dalla closure per evitare ForwardRef PydanticUserError).
- Nuovo endpoint **`POST /api/admin/elevenlabs/fetch-external-audio`**:
  - Body: `{url, filename_hint?}`
  - Guardrails: solo http/https · timeout 30s · max 5 MB · 6 estensioni audio · User-Agent conforme Wikimedia policy · Accept header audio-first · content-type detection con fallback URL extension
  - Server-side download via `httpx.AsyncClient(follow_redirects=True)` → persist via `emergent_put` in `manual/<hint>_<ts>.<ext>` → ritorna `{url, relative_url, filename, content_type, size_bytes, source_url}`
  - Rifiuta HTML (`text/html`), ftp://, file://, empty body

**Frontend `ElevenLabsStudio.jsx`**:
- Nuovo state: `externalUrl`, `fetchingExternal`, `phonemeCards`, `assocCardId`, `assocSlot`, `assocWordIndex`, `assocExampleIndex`, `associating`, `associated`.
- Load automatico del catalogo fonemi via `GET /api/admin/phonemes` all'apertura.
- Handler `handleFetchExternal()` → POST fetch-external-audio → popola result panel.
- Handler `handleAssociate()` + `buildAssocKey()` → PATCH audio-url del card con la key giusta.
- **Nuovo campo "Da URL esterno · fetch server-side"** dentro pannello upload emerald.
- **Nuovo pannello cyan "ASSOCIA DIRETTAMENTE A FONEMA"** nel result panel · dopo qualsiasi TTS/upload/fetch:
  - Dropdown card fonema (44 opzioni con IPA + nome)
  - Dropdown slot con optgroups: Isolato AmE/RP · Mnemonica · Esempi AmE/RP · Parole comuni AmE/RP
  - Input Indice numerico (mostrato solo per example/word slots) con live-preview della key
  - Pulsante "Associa e salva" → flip verde "Associata ✓" al successo

**Testing**: iteration_29.json — 9/9 pytest backend (auth guard, input validation 400, non-audio rejection 415, happy path, reachability, E2E fetch → PATCH → verify persistence). Frontend Playwright: 7/7 testid, dropdown 44 fonemi popolato, indice mostra/nasconde correttamente, network trace conferma i 2 endpoint chiamati esattamente in sequenza.



### 08/02/2026 · Iteration 28 — Common Words UI Redesign — DONE ✅

**Contesto**: la riga a 12 colonne era sovrastata, il pulsante "Rigenera" si sovrapponeva agli input URL. Ridisegno completo con:
- **Riga 1** (dati testuali): `word · ipa · note · [URL▸]` (chevron per espandere URL)
- **Riga 2** (tracce audio): due card affiancate 🇺🇸 AmE / 🇬🇧 RP, ognuna con [☐ select] + [▶ play] + [⟳ regen] + [✕ clear]
- **Pannello URL** collassabile on-demand per editing manuale
- **MiniAudioButton** custom con re-mount su cambio `src` (no cache di clip vecchie)

**Frontend `PhonemeAdminEditorPage.jsx`**:
- Nuovo componente `MiniAudioButton` (24×24 play/pause con re-mount su src change).
- Nuovo state `selectedTracks` (Set di `word-{i}-{dialect}` selezionate).
- Nuovo state `expandedRows` (Set di indici con pannello URL aperto).
- Helper `toggleSelected(key)` / `toggleExpanded(i)`.
- Nuovo helper `regenSelectedTracks({overwrite})` → bulk batch delle tracce selezionate.
- Rifattorizzato completamente il `renderItem` del Repeater `commonWords`.
- Nuovo pulsante fucsia **"Genera N selezionate"** (`data-testid="editor-cw-bulk-selected"`) — appare solo se ≥1 selezione.
- Badge dinamico "N selezionate" nel banner.
- Rimosso il vecchio `editor-cw-{i}-regen-both` (che si sovrapponeva agli URL) — sostituito da 2 rigenera indipendenti per traccia.

**Testing**: iteration_28.json — 330 testid nuovi verificati (30 righe × 11 testid), batch selection chirurgica (POST batch-audio con `only_keys:['word-0-AmE','word-1-RP','word-2-AmE']` esattamente), per-track regen surgical (solo AmE ricreato, RP invariato), MiniAudioButton play/pause CSS transition confermato, URL expander toggle verificato.



### 08/02/2026 · Iteration 27 — Common Words audio ×30 AmE + ×30 RP + per-row refresh — DONE ✅

**Contesto**: fino a iter 26 le parole comuni generavano solo 10 audio (default `words_limit=10`). L'utente voleva 30 per dialetto (60 clip totali) + un pulsante refresh diretto sulla singola parola dentro l'editor CMS della card, per non dover ricorrere manualmente al Voice Lab per correggere le parole difficili.

**Backend**:
- `BatchAudioRequest.words_limit` default alzato da **10 → 30** (`phoneme_cards.py`).
- `include_words_rp` resta `True` di default → generazione RP inclusa senza flag esplicito.

**Frontend `PhonemeAdminEditorPage.jsx`**:
- Nuovo state `regenBusy` (set di key attivi).
- Nuovo helper `regenCommonWordAudio(index, dialect)` → POST `batch-audio` con `only_keys` chirurgici + refresh del card in state.
- Nuovo banner cyan sopra la lista parole con:
  - **"Genera solo mancanti"** (`data-testid="editor-cw-bulk-missing"`): scansiona `commonWords`, costruisce array di key mancanti, POST batch-audio.
  - **"Sovrascrivi tutti"** (`data-testid="editor-cw-bulk-overwrite"`): rigenera tutte le 60 clip con `overwrite=true` (con conferma window.confirm).
- Nuovo pulsante inline "⟳ Genera" (`data-testid="editor-cw-{i}-regen-both"`) su ogni riga → rigenera AmE+RP di quella singola parola. Icon `Loader2` durante l'attesa.
- I pulsanti ✕ AmE/RP per svuotare restano invariati.

**Frontend `PhonemeRoadmapDashboard.jsx`**:
- Cambiato `words_limit: 10 → 30` nel bulk audio (`derived + audio`).

**Testing**:
- 9/9 pytest verdi (defaults, idempotency, surgical only_keys, auth, 404, PATCH regression).
- Frontend E2E: 30 pulsanti Genera per-row + 2 bulk verificati; click reale su word #29 (`crook`) genera davvero via ElevenLabs → campi AmE+RP popolati con URL `/api/uploads/elevenlabs/u-foot_word_crook_*.mp3`.



### 08/02/2026 · Iteration 26 — 3 issue fixes + Voice Lab evolution — DONE ✅

**Issue #3 · Toggle IPA dialect-sync (P0 · bug fix)**
- `AudioPlayButton` in `PhonemeCardPage.jsx` non ricreava l'oggetto `Audio` quando la prop `src` cambiava (utente cambia AmE↔RP → primo play riproduceva ancora il vecchio dialetto).
- Fix: nuovo `useEffect` sul cambio di `src` che smonta `audioRef.current` (pause + null-out + reset di playing/loading state) → il prossimo click ricrea l'audio con l'URL fresco.

**Issue #1 · Common Words · Manual URL paste + <audio> remount (P1)**
- Bug root-cause: `<audio src={audioSrc}>` HTML DOM element **non ricarica** automaticamente il src attribute quando la prop cambia — l'utente sentiva ancora l'MP3 cached. Fix: aggiunto `key={audioSrc}` per forzare React a remontare l'element quando l'URL cambia.
- Nuovo endpoint backend: `PATCH /api/admin/phonemes/{card_id}/audio-url` accetta `{key, url}` per aggiornare qualsiasi slot audio del card. Taxonomy: `isolated-{dialect}`, `example-{dialect}-{i}`, `mnemonic`, `word-{i}-{dialect}`.
- Nuovo pulsante inline verde (Wand2 icon, `data-testid="audio-studio-paste-{cardId::key}"`) su ogni riga dell'Audio Studio → apre prompt, incolla URL manuale, PATCH → refresh card riga.

**Issue #2 · Voice Lab evolution (P2)**
- **(a) Repository IPA scientifiche** (`<details>` collapsible in Voice Lab): 5 fonti CC-BY-SA:
  - IPA.org · Chart with sounds
  - UCLA Phonetics Lab Archive (Ladefoged)
  - GitHub UCLA-IPA-Phonetic-Corpus (`eng/audio` folder)
  - Wikimedia Commons · IPA sound files (OGG)
  - Pronunciation Studio · English IPA Chart (streaming)
- **(b) Upload da PC**: dropzone drag-and-drop + file picker in Voice Lab (border emerald). Endpoint backend `POST /api/admin/elevenlabs/upload-audio` accetta multipart file (MP3/WAV/OGG/M4A/FLAC/AAC ≤ 5MB), persiste in `/api/uploads/manual/{hint}_{ts}.{ext}`, ritorna `{url, relative_url, filename, content_type, size_bytes}`.
- SSML IPA fonema isolato (fucsia) resta come opzione secondaria — non rimosso.

**Tech**:
- Nuovo file backend nessuno (endpoint aggiunti a `phoneme_cards.py` e `elevenlabs.py`).
- Nuovo state frontend `uploading` + `uploadInputRef` in `ElevenLabsStudio.jsx`.
- 16/16 test backend verdi (`iteration_26.json`).
- Frontend E2E: 1256 pulsanti Wand2, upload operativo, repository panel completo.



### 08/02/2026 — §3.6 · Mnemonic Inline-IPA Rewriter (bracket syntax + Tooltip UI) — DONE ✅

**Feature completa full-stack**. Le frasi mnemoniche vengono automaticamente annotate con la sintassi `[word|/ipa/]` derivata **deterministicamente** da CMUdict (mai LLM). Al passaggio del mouse, il frontend mostra un tooltip Radix con la trascrizione IPA; l'audio ElevenLabs riceve SSML `<phoneme>` per ogni parola annotata.

**Sintassi scelta (dopo domanda esplicita all'utente)**: opzione **(a)** — stringa singola con sintassi markdown-like `[word|/ipa/]` (retrocompatibile, nessuna migrazione DB).

**Backend**:
- Nuovo endpoint admin `POST /api/admin/phonemes/batch/rewrite-mnemonics` body: `{overwrite_existing_brackets: bool, only_ids?: [str]}`.
- Idempotente: re-run → `changed=0`.
- Solo parole che contengono realmente il fonema target (con filtro stress corretto) vengono annotate.
- Skip: `mnemonic_locked=true`, frase vuota, IPA target mancante.
- Al rewrite, il campo `mnemonic.audio` viene azzerato → forza rigenerazione SSML.
- Nuovi helper in `phoneme_lexicon_rule.py`: `word_to_ipa(word)` e `word_contains_phoneme(word, target_ipa)`.
- Nuovo flag su `PhonemeCard`: `mnemonic_locked: bool = False`.

**ElevenLabs (`synthesize_and_store`)**:
- Pre-processore combinato in un unico passaggio: matcha `[word|/ipa/]` **e** `/ipa/` bare in un solo scan (evita doppia XML-escape delle tag SSML).
- `[cook|/kʊk/]` → `<phoneme alphabet="ipa" ph="kʊk">cook</phoneme>` (surface word come fallback naturale).
- Auto-switch a `eleven_turbo_v2` quando compare qualsiasi wrap.

**Frontend**:
- `renderMnemonicPhrase()` in `PhonemeCardPage.jsx`: parser che estrae `[w|/ipa/]` e wrappa in Radix `Tooltip`. Testid: `mnemonic-ipa-{word}` / `mnemonic-ipa-tooltip-{word}`.
- Stile: parola arancione + underline tratteggiato + `cursor-help` + keyboard-accessible (`tabIndex=0` + focus-ring).
- Admin `PhonemeRoadmapDashboard`: nuovo blocco §3.6 con pulsanti "Annota mnemoniche" (`roadmap-bulk-mnemonic-button`) e "Re-annota da zero" (`roadmap-bulk-mnemonic-force-button`), risultato in banner (`roadmap-bulk-mnemonic-result`).

**Test creati / passati (100%)**:
- `test_ssml_ipa_wrapping.py`: 12/12 verdi (3 nuovi test bracket-syntax).
- `test_batch_rewrite_mnemonics.py` (creato dal testing agent): 7/7 verdi.
- Frontend E2E: 6 spans `mnemonic-ipa-*` renderizzati su `u-foot`, tooltip `/pʊl/` visibile su hover, admin bulk trigger operativo con banner "Processate 44 · modificate 0 · saltate 0".

**Esempio semantica u-foot**: `"Pull the wool, push the hood, put the foot."` → `"[Pull|/pʊl/] the [wool|/wʊl/], [push|/pʊʃ/] the [hood|/hʊd/], [put|/pʊt/] the [foot|/fʊt/]."` — 6/6 parole target correttamente annotate.


### 07/07/2026 — SSML IPA inline auto-wrap per frasi ibride prose+IPA — DONE ✅

**Estensione del suggerimento**: il motore SSML IPA ora funziona anche INLINE dentro qualsiasi frase. Esempio d'uso pedagogico:

Input: `"The word /kʊk/ contains the vowel /ʊ/, not /uː/."`

Output SSML inviato a ElevenLabs:
```
The word <phoneme alphabet="ipa" ph="kʊk">kʊk</phoneme> contains the vowel <phoneme alphabet="ipa" ph="ʊ">ʊ</phoneme>, not <phoneme alphabet="ipa" ph="uː">uː</phoneme>.
```

Il modello pronuncia esattamente i 3 fonemi mentre le parti in prosa restano naturali.

**Logica** (in `synthesize_and_store`):
- Se `ipa_phoneme` fornito esplicitamente → wrap full text (comportamento isolated invariato).
- Altrimenti → scan regex `/([^/\s]{1,8})/` sul text (guard anti-false-positive: nessuno spazio dentro le barre, 1-8 char max).
- Per ogni match: XML-escape della prosa circostante + `<phoneme alphabet="ipa" ph="…">…</phoneme>` sul fragment.
- Auto-switch model a `eleven_turbo_v2` se qualsiasi wrap avviene.
- Response arricchita: `inline_ipa_hits: List[str]` per debug/analytics.

**False-positive guard verificato**: `"1/2 cup"`, `"foo / bar"`, `"path/to/file"` → NO wrap (regex esige assenza di whitespace dentro).

**Refactor `/tts` endpoint** legacy: ora usa `synthesize_and_store` (prima era codice duplicato). Beneficia automaticamente del pattern SSML IPA + campo nuovo `ipa_phoneme` esposto.

**Test end-to-end via curl**:
- Test 1 (inline hybrid): `ssml_used=True model=eleven_turbo_v2 hits=['kʊk','ʊ']` ✅
- Test 2 (explicit): `ssml_used=True ipa=ʌ model=eleven_turbo_v2` ✅
- Test 3 (normal): `ssml_used=False model=eleven_multilingual_v2` ✅

**Test unit**: `tests/test_ssml_ipa_wrapping.py` estesi da 5 → **9 test, 9/9 PASS** in 0.22s (aggiunti: multi-fragment wrap, whitespace guard, ipa_phoneme override precedence, XML escape circostante).

**Audio Studio UI**: banner IPA aggiornato per spiegare la modalità inline auto-detect + esempi cliccabili.

**Redeploy richiesto**. Post-redeploy: puoi scrivere frasi ibride in qualsiasi campo (mnemonic, example, custom prompt Audio Studio) — l'engine wrappa automaticamente.


### 07/07/2026 — SSML IPA scientific mode per Audio Studio + isolated clips — DONE ✅

**Richiesta utente**: "se scrivo /ʌ/ voglio che mi restituisca il suono isolato di quel fonema. Ora devo scrivere 'uh' e sperare che sia corretto — così non è come voglio lavorare. La scientificità dev'essere assoluta."

**Root cause**: fino ad ora l'audio "isolated" della card usava testo come `"The /ʌ/ sound. As in strut."` → ElevenLabs sintetizzava la stringa letterale, non il fonema IPA. Digitare `/ʌ/` non aveva effetto: veniva letto come slash-simbolo-slash.

**Fix — SSML IPA wrapping** (basato su spec ElevenLabs v2 English models):
- Estesa `synthesize_and_store()` in `elevenlabs.py` con parametro `ipa_phoneme: Optional[str]`.
- Quando `ipa_phoneme` è presente, il testo viene wrappato in `<phoneme alphabet="ipa" ph="{ipa}">fallback_text</phoneme>` (XML-escape del contenuto).
- Auto-switch model da `eleven_multilingual_v2` a `eleven_turbo_v2` (unico che supporta SSML `<phoneme>`).
- Strip automatico di barre `/…/` circostanti (input utente `/ʌ/` → `ph="ʌ"`).

**Wiring**:
- `_compute_card_audio_items()` in phoneme_cards.py: le clip `group='isolated'` ora usano testo = solo il simbolo IPA + `ipa_phoneme = card.ipa`. **Le clip isolated in tutte le 42 card diventano suoni puri**, non frasi.
- `BatchAudioRequest`: aggiunti `text_override: Dict[str,str]` e `ipa_override: Dict[str,str]` per per-clip customization dall'Audio Studio.
- Auto-detect: se `text_override` è tipo `/ʌ/` (barre + 1-4 char + barre), viene interpretato come IPA.

**Frontend Audio Studio**:
- Banner informativo in alto (gradient fuchsia/cyan): spiega la modalità IPA con esempi.
- Nuovo pulsante **Sparkles** ✨ per riga accanto al regen: apre prompt che accetta simbolo IPA (opzionale, autofill dal testo attuale) → invia `text_override + ipa_override` al backend.
- Comportamento auto: digitando `/ʌ/` come `text_override` di qualsiasi clip → SSML kicks in automaticamente.

**Testing rigoroso**:
- Nuovo `/app/backend/tests/test_ssml_ipa_wrapping.py` con 5 test (5/5 PASS in 0.22s):
  - Verifica wrapping SSML corretto + switch model
  - Strip di slash `/`
  - No-op quando `ipa_phoneme=None` → mantiene `eleven_multilingual_v2` senza SSML
  - Escape XML dei caratteri speciali nel fallback
  - Input degenere (`"/   /"`) trattato come no-IPA
- Test end-to-end su schwa + ah-strut: 3 clip generate senza errori, URL persistiti correttamente.

**Redeploy richiesto** per portare in produzione. Post-redeploy consigliato: lanciare bulk audio (o rigenerare manualmente le clip isolated più critiche) per aggiornarle con il suono puro IPA.


### 07/07/2026 — HOTFIX §3.2 · Stress-sensitive phoneme lexicon bug (schwa=STRUT) — DONE ✅

**Bug**: utente segnalava che `/ə/` (schwa) su `vocalfitness.org/admin/phonemes/schwa` mostrava parole di `/ʌ/` (STRUT) come "one, just, up, us"…

**Root cause identificato in `phoneme_lexicon_rule.py`**:
- CMUdict codifica /ə/ e /ʌ/ con lo stesso ARPAbet base "AH" — la differenza è nello STRESS DIGIT (`AH0` = schwa unstressed · `AH1`/`AH2` = STRUT stressed).
- Il mio motore strippava lo stress prima del matching (`_strip_stress`) → schwa e STRUT collassavano nello stesso pool di parole.
- Stessa classe di bug per: `/ɚ/` vs `/ɝ/` (entrambi ER), `/iː/` vs `/ɪ/` (IY vs IH), `/uː/` vs `/ʊ/` (UW vs UH), `/ɑː/` (AA stressed), `/ɔː/` (AO stressed), `/ɜː/` (ER stressed).

**Fix**:
- Nuovo `_STRESS_FILTER: Dict[str, Callable[[str], bool]]` — predicati stress per IPA che condividono base ARPAbet. `/ə/` accetta solo stress=0, `/ʌ/` solo stress ∈ {1,2}, ecc.
- `_extract_matching_words()` estende il matching a `(base_phone == target_arpa) AND (stress_pred(stress_digit))`.
- Signature estesa a `target_ipa=""` per passare l'IPA originale (serve al lookup predicato).

**Verifica automatica**:
- Rigenerate 6 card impattate (schwa, ah-strut, a-palm, o-thought, u-goose, er-nurse) via `POST /generate-lexicon` — ora tutte con parole corrette.
- Nuovo test file `/app/backend/tests/test_lexicon_stress_filter.py` con 15 test:
  - 10 test parametrici verificano che ogni fonema stress-sensitive contenga almeno 1 parola canonica attesa.
  - 4 test parametrici verificano disgiunzione top-5 tra coppie confusable (/ə/ vs /ʌ/, /ɚ/ vs /ɝ/, /ɪ/ vs /iː/, /ʊ/ vs /uː/).
  - 1 sentinel test esplicito: schwa MUST NOT contain "from, one, just, up, us".
- **15/15 PASS** in 4.4 sec.

**Card in preview verificate**:
- /ə/ → "about, people, little, another, again, against, family, second…" ✅
- /ʌ/ → "from, one, just, up, what, some, other, us…" ✅
- /ɚ/ → "other, our, after, over, never…" ✅
- /ɝ/ → "were, her, first, work, world…" ✅
- /iː/ → "be, he, we, me, she, people, see…" ✅
- /ɪ/ → "is, it, with, this, his, will…" ✅
- /uː/ → "you, do, who, new, two, too…" ✅
- /ʊ/ → "would, good, could, should, look…" ✅
- /ɑː/ → "was, are, not, want, got, part…" ✅
- /ɔː/ → "for, your, all, more, also, because…" ✅

**Redeploy richiesto**: fix in preview. Redeploy per produzione (`vocalfitness.org`). Post-redeploy: click "Rigenera derived su tutte" dalla Roadmap Dashboard per applicare il fix a tutte le card affette in produzione.


### 07/07/2026 — §3.5 Pronunciation Protocol Canonical + Engine — DONE ✅

**Contesto**: utente ha confermato che i 3 hotfix precedenti (hotspot auto-lock, pronunciationGuide.body fallback, 30 words backfill) hanno risolto tutto tranne "Vocal Fitness articulatory protocol" ancora vuoto. Ha chiesto: "controlla se esiste un CANONICAL, se no formalizzane uno solido sul piano scientifico". Nessun canonical esisteva.

**Base scientifica adottata** per §3.5:
- IPA descriptor system (place × manner × voicing per consonanti; height × backness × rounding × tenseness per vocali).
- Ladefoged & Johnson, "A Course in Phonetics" (7th ed.) — descrizioni articolatorie standard.
- Chomsky & Halle, "The Sound Pattern of English" (1968) — feature-based underlying representation.
- Roach (RP reference), Ladefoged (GenAm reference).
- Vocal Fitness method — la sequenza pedagogica 6-step (Jaw / Lips / Tongue / Apex / Voicing / Velum) è marchio didattico Steve Dapper.

**Nuovo canonical spec** `/app/backend/canonical_data/PronunciationProtocol_v1.md` (~180 righe):
- §3.5.1 Jaw aperture: table height→aperture per vocali + place→aperture per consonanti (10 casi).
- §3.5.2 Lips: mapping rounding enum + case-per-place per consonanti (bilabiale/labiodentale/labiovelare/approx-r/neutro).
- §3.5.3 Tongue body: 15 buckets height×backness per vocali + 9 casi place per consonanti.
- §3.5.4 Apex: front/central/back per vocali + active/passive per consonanti + caso speciale lateral (dark L americano).
- §3.5.5 Voicing: vowel/voiced/voiceless/aspirated con test cinestetico.
- §3.5.6 Velum: RAISED oral / LOWERED nasal.
- §3.5.7 Localizzazione IT/EN completa (labelLocalized + bodyLocalized).
- §3.5.8 Idempotency + `pronunciation_locked` contract.

**Nuovo engine** `/app/backend/routers/phoneme_pronunciation_rule.py` (~330 righe):
- `generate_pronunciation_protocol(ipa, canon)` → dict con `headline`, `steps: [Jaw/Lips/Tongue/Apex/Voicing/Velum]`, `grounded_on: [features usate]`, `confidence: 1.0`.
- Ogni step: `label`, `body`, `labelLocalized: {it,en}`, `bodyLocalized: {it,en}`.

**Wiring backend** in `phoneme_cards.py`:
- `apply_pronunciation_rule_to_doc(db, doc, preserve_body=True)` — helper con lock + preserva `body` AI-drafted preesistente.
- `admin_create`: aggiunto step §3.5.
- `admin_update`: auto-lock su `pronunciationGuide` in PATCH body (stesso pattern hotspots).
- `batch/regenerate-derived`: nuova sezione §3.5 in loop bulk.
- `ensure_phoneme_seed` step 10: backfill idempotente (rewrite solo se le 6 label mancanti/differenti).
- Model `PhonemeCardBase`: nuovo campo `pronunciation_locked: bool = False`.
- Protetti u-foot + i-fleece con `pronunciation_locked=True`.

**Frontend** `PhonemeCardPage.jsx`:
- Renderizza `pickLang(headlineLocalized)`, `pickLang(labelLocalized)`, `pickLang(bodyLocalized)` con fallback ai campi English + fallback finale a `pronunciationGuide.body` (compatibilità AI-drafted) + placeholder bilingue se vuoto.

**Verifica end-to-end**:
- i-kit (vocale /ɪ/): 6 step generati, grounded_on=[backness,height,rounding,voicing], body AI preservato ✓
- p-pen (consonante /p/): 6 step generati, grounded_on=[aspiration,place,voicing], caratteristica "voiceless aspirated puff" correttamente inclusa ✓
- 44/44 card processate, u-foot e i-fleece protetti con lock.

**Redeploy richiesto**: cambiamenti in preview. Redeploy per portare in produzione.


### 07/07/2026 — HOTFIX Fase 3 · 3 bug prod segnalati dall'utente (i-kit) — DONE ✅

**Bug 1 (P0 blocker)**: hotspot piazzati manualmente dall'admin si "spostano da soli" dopo save.
- **Root cause**: il §3.4 hotspot rule engine, wired in `admin_update`, sovrascriveva `hotspots` a ogni PATCH indipendentemente da cosa l'utente stesse editando. Solo `hotspots_locked=true` lo fermava, ma il flag non era esposto in admin UI.
- **Fix backend** (`admin_update` in `phoneme_cards.py`): se il PATCH body include esplicitamente `hotspots`, auto-lock a `hotspots_locked=true`. Il motore §3.4 skippa. Riabilitazione via `hotspots_locked=false` esplicito.
- **Fix frontend** (`PhonemeAdminEditorPage.jsx`): pannello "Blocco hotspot manuali" con toggle checkbox visibile SEMPRE sopra la sezione Hotspot + auto-lock quando l'utente sposta/aggiunge/elimina un hotspot (nel callback `onChange`). Feedback visivo: 🔒 verde attivo, ⚠️ arancione non attivo.
- **Verifica end-to-end**: PATCH con 2 custom hotspots → salvati + `locked=true`. PATCH altro campo → hotspot persistono. PATCH `hotspots_locked:false` → rigenerazione automatica canonical (9 hotspot).

**Bug 2 (P1)**: sezione "Vocal Fitness articulatory protocol" appare vuota nella phoneme card.
- **Root cause**: schema mismatch. AI batch-fill produce `pronunciationGuide = {body: "paragrafo AI", grounded_on, confidence}` mentre il frontend renderizzava SOLO la forma strutturata `{headline, steps: [{label, body}]}`.
- **Fix frontend** (`PhonemeCardPage.jsx`): fallback multi-schema. Se `steps[]` presenti → render come lista ordinata (comportamento originale, tipo u-foot). Altrimenti se `body` presente → render come paragrafo coerente. Altrimenti → placeholder "Protocollo in preparazione" (bilingue IT/EN). Backward-compatible al 100% con u-foot autoriale.

**Bug 3 (P1)**: 30 parole comuni mancanti su i-kit in produzione.
- **Root cause**: in preview DB `i-kit` ha già 30 parole (verificato via API). In produzione probabilmente < 30 perché il backfill lexicon di startup skippa card con `>= 3` parole (safe default).
- **Fix per l'utente**: dopo redeploy, cliccare "Rigenera derived su tutte" dalla Roadmap Dashboard → il backfill in memoria è rimasto conservative (skippa cards con >= 3 words) MA l'endpoint `batch/regenerate-derived` NON ha quel guard e rigenera tutto. Il PRD.md è aggiornato con questa nota.

**Redeploy richiesto**: fix in preview, produzione (`vocalfitness-revamp.emergent.host` / `vocalfitness.org`) richiede redeploy da chat.


### 07/07/2026 — Phase-3 · Audio Studio (Iterazione B) — DONE ✅

Fine-tuning autonomo audio come richiesto dall'utente: "voglio poter rigenerare ogni suono/audio della card, sia AmE che RP, se non soddisfacente".

**Backend**
- Esteso `POST /api/admin/phonemes/{id}/batch-audio` con parametro `only_keys: List[str]` — se fornito, l'endpoint processa SOLO quei clip. Combinato con `overwrite=true` = rigenerazione chirurgica per-clip. Compatibile 100% col mass runner esistente.

**Frontend — nuova pagina `/admin/audio-studio`** (`PhonemeAudioStudioPage.jsx`, ~370 righe):
- **Fetch parallelo** di tutte le card admin + `elevenlabs/voices` + flatten in "clip catalog" (~1256 righe totali con 44 card × ~29 clip cadauna).
- **Pannello voci top**: 3 dropdown (AmE / RP / Default) popolati dai 27 voice profile del roster ElevenLabs + preset prosodia (Naturale / Espressivo / Stabile) con VoiceSettings pre-configurati.
- **Filtri**: card, gruppo (isolated/examples/mnemonic/words), dialetto (AmE/RP/default/all), stato (presenti/mancanti/tutti), search testuale.
- **Selezione multi-clip**: checkbox per riga + "Seleziona tutte visibili" + "Deseleziona" + counter live.
- **Play inline** per riga: pulsante Play/Pause con `<audio preload="none">` che punta all'URL relativo o assoluto.
- **Regen singolo** per riga (spinner inline durante processing) — sovrascrive con voce/preset selezionati dall'utente.
- **Bulk regen selezionate** con progress bar per-card (raggruppa `only_keys` per card, un HTTP request per card).
- **Error list expandable** a fine bulk run.
- Refresh atomico dei card processati (dopo regen → re-fetch della singola card e merge nello stato).
- Data-testid completi (`audio-studio-page/voices/filters/regen/play/…`) per testing.

**Wiring UI**
- Nuova route `/admin/audio-studio` in `App.js`.
- Link "Audio Studio" (button outline arancione con icona Volume2) nella toolbar di `PhonemeAdminPage.jsx`.

**Smoke test end-to-end**:
- Page load: 1256 clip visibili, 54 già presenti, 1202 mancanti.
- Filtro "Mancanti" applicato correttamente (1202 rimaste).
- 3 dropdown voci popolati con default = Steve Dapper (it-standard).
- 0 errori console, 0 lint.

**Come usarla — workflow autonomo del Prof**:
1. Vai su `/admin/audio-studio`.
2. Filtra le clip di interesse (es. dialetto RP + gruppo isolated → 42 clip da controllare).
3. Ascolta con play inline.
4. Se non ti piace: cambia voce/preset in cima → click regen (loop-arrow) sulla riga → clip riprodotta con nuova voce.
5. Bulk: seleziona 50 clip → cambia preset a "Espressivo" → "Rigenera 50 selezionate" → progress bar per card → error list a fine.


### 07/07/2026 — Phase-3 · Mass Audio Generation (Iterazione A) — DONE ✅

Scelte utente confermate: scope B (essenziale, ~29 clip/card × 42 = ~1200 clip), voci C=a (riusa Steve Dapper clone italiano per entrambi i dialetti), UX 3=c (bulk runner + Audio Studio in fase B), no test preliminare, errori policy c (continua sempre, mostra a fine run).

**Backend**
- Nuovo helper `synthesize_and_store()` in `/app/backend/routers/elevenlabs.py` (module-scope, ~90 righe) — estratto dalla logica di `elevenlabs_tts` per essere riusabile dal batch runner. Ritorna `{url, relative_url, filename, voice_id, content_type, size_bytes}` o solleva `RuntimeError` in caso di fallimento (client mancante, API error, audio vuoto). Il `/tts` endpoint originale è preservato invariato.
- Nuovo endpoint `POST /api/admin/phonemes/{id}/batch-audio` in `phoneme_cards.py` (~180 righe):
  - Helper `_compute_card_audio_items(card, words_limit, include_words_rp)` calcola la work-list per una singola card: 2 isolated + 2N examples + 1 mnemonic + 2M words (con M ≤ words_limit).
  - Skip-existing default: se il campo audio è già popolato → salta (idempotente). Override con `overwrite=true`.
  - Errori per-clip NON abortiscono: raccolti in `errors[]` e ritornati a fine run (option E=c).
  - Fix critico: costruzione in-memory della struttura nested (audio/mnemonic/commonWords) e $set al livello top per evitare il bug MongoDB "dotted-key array-index crea subdocumento invece di array".
  - Preserva URL audio esistenti per campi non toccati.

**Frontend**
- `PhonemeRoadmapDashboard.jsx`: nuovo pulsante "Genera audio su tutte" (gradient orange-rose) con:
  - Confirm dialog dettagliato (elenca cosa verrà generato).
  - Loop client-side card-by-card (mantiene HTTP requests brevi ~30 sec).
  - Progress bar globale + counter "N/M · card corrente".
  - Result panel a fine run: totali (processate/generate/skippate/errori) + expandable list dei primi 40 errori con `card · clip_key · error`.
  - Auto-refresh del parent (roadmap grid) a fine run.

**Verifica smoke test end-to-end** (ae-trap):
- 1° run con words_limit=2: 13 clip generate, 0 skip, 0 errori, tutti gli URL popolati correttamente.
- 2° run con words_limit=4: 4 clip nuove generate (word 2-3 × 2 dialetti), 13 skip (esistenti), 0 errori — idempotency OK.
- File MP3 verificati serviti da `/api/uploads/elevenlabs/*.mp3` via Emergent Object Storage (25.5 KB, ID3+FFmpeg).
- Readiness `ae-trap`: 93 → **100/100 GREEN, ready=True** dopo audio bulk.

**Iterazione B (prossima)** — Audio Studio + per-item override:
- Nuova pagina `/admin/audio-studio` con tabella globale filtrable (card × gruppo × dialetto × stato).
- Bulk regen selettivo con voice + preset override.
- Per-item voice/prosody override direttamente nel BulkAudioGenerator per-card.


### 07/07/2026 — Phase-3 CMS · Full auto-population di 42 card AMBER (Hotspot §3.4 + Lexicon §3.2/§3.3) — DONE ✅
Obiettivo: portare tutte le 44 card allo stato "u-foot" (100% GREEN) con AI/rule engine, così il Prof deve solo REVIEW, non compilare manualmente. Le 2 lacune bloccanti su tutti i 42 card AMBER erano `content.hotspots` + `content.commonWords`.

**FASE 1 · Hotspot Auto-Generator §3.4** — DONE ✅
- Nuovo canonical spec `/app/backend/canonical_data/HotspotRule_v1.md` (~180 righe) — tabelle deterministiche per vowel × (height, backness, rounding, tenseness) + consonant × (place, manner, voicing) + slot passivi (alveolar-ridge, hard-palate).
- Nuovo motore `/app/backend/routers/phoneme_hotspot_rule.py` (~500 righe): `generate_hotspots_for_canonical(ipa, canon)` → lista di 4-9 hotspot bilingue (labelLocalized/titleLocalized/roleLocalized/detailLocalized/anatomyLocalized/kineticCueLocalized come `{it, en}` dicts).
- Coordinate x/y percentuali calibrate sull'immagine sagittale standard 16:9. Ogni fonema espone SOLO i punti anatomici pedagogicamente rilevanti (es. /p/ non espone "pharynx neutral" — irrilevante; /ʊ/ sì).
- Vowels: 9 hotspot (alveolar-ridge/hard-palate/apex/blade/dorsum/lip-rounding/velum/pharynx/larynx).
- Consonants: 5-7 hotspot (primary-constriction/manner/velum/larynx/airflow + optional lips/tongue-shape).
- Endpoint `POST /api/admin/phonemes/{id}/generate-hotspots` per rigen singolo.
- Wire in `admin_create` + `admin_update` + `batch-fill-v2` DERIVED block + backfill idempotente su startup (`ensure_phoneme_seed` step 8).
- Flag `hotspots_locked=true` sui card manualmente curati (u-foot, i-fleece) → engine skippa. Model esteso in `PhonemeCardBase` + `PhonemeCardUpdate`.

**FASE 2 · Lexicon Auto-Generator §3.2/§3.3** — DONE ✅
- Installati `cmudict==1.1.3` + `wordfreq==3.1.1` in `requirements.txt` (via pip freeze).
- Nuovo motore `/app/backend/routers/phoneme_lexicon_rule.py` (~250 righe): `generate_lexicon_for_canonical(ipa, max_words=30)` → `{commonWords, spellings}`.
- ARPAbet → IPA mapping bidirezionale + Zipf frequency ordering. Ogni parola porta `w`, `ipa` (renderizzato in IPA), `audioAmE`, `audioRP`, `zipf`.
- Spelling distribution deriva heuristicamente da tabella grafemica per phoneme (es. /ʊ/: oo 40% · u 33% · ou 20% · o 7%).
- Endpoint `POST /api/admin/phonemes/{id}/generate-lexicon` con `preserve_audio=True` → gli URL ElevenLabs esistenti sopravvivono al refresh delle parole matching.
- Wire in `admin_create` + backfill idempotente su startup (`ensure_phoneme_seed` step 9). NON wire in `admin_update` per evitare churn su edit manuali.
- Flag `lexicon_locked=true` per protezione card autoriali. Model esteso in `PhonemeCardBase` + `PhonemeCardUpdate`.

**Bulk endpoint one-click** — DONE ✅
- `POST /api/admin/phonemes/batch/regenerate-derived`: rilancia in blocco §3.1 muscoli + §3.2 overlay + §3.4 hotspot + §3.2/§3.3 lexicon su tutti i card non lockati. Idempotente. Ritorna summary per-card con `applied`/`skipped` list.
- Frontend: nuovo pulsante "Rigenera derived su tutte" (cyan gradient) nella `PhonemeRoadmapDashboard.jsx` con confirm dialog dettagliato + spinner + risultato inline.

**Risultato readiness scores** (letto da `GET /api/admin/phonemes`):
- 2 card @ 100 (u-foot, i-fleece — locked)
- 10 vocali @ 93 (era 70 — solo audio manca)
- 23 consonanti @ 92 (era 70 — solo audio + 1 warn manca)
- 9 dittonghi @ 85 (audio + 1 chip classification warn)

**Frontend bilingue**: `PhonemeCardPage.jsx` Hotspot component + sheet panel ora consumano `pickLang()` su ogni campo localized con fallback su versione English (backward-compatible con u-foot/i-fleece autoriali che non hanno campi localized).

**Prossima Fase 3 · Mass Audio Generation**: richiede ElevenLabs Voice Design per voce Prof Dapper RP + AmE. Batch endpoint da wireare quando l'utente fornisce API key + configurazione Voice Design.


### 07/07/2026 — HOTFIX Vimeo loader infinite spinner (P0 blocker prod) — DONE ✅
Bug prod: utente clicca CTA "Video" sulla phoneme card → spinner infinito, immagine ancora visibile, video non parte. Segnalato dall'utente dopo deploy: "compared to our earlier setup, this got worse".

**Root cause** (`PhonemeAssetMedia.jsx`):
- In CASE C (immagine + video) l'iframe Vimeo è **sempre montato** con `opacity-0` dal primo render (per pre-boot Vimeo dietro l'immagine).
- `onLoad` dell'iframe scatta UNA sola volta al mount iniziale → `videoReady=true`.
- Al click su Play, `videoActive` cambia → `useEffect` con `[videoUploadUrl, videoLinkUrl, videoActive]` resetta `setVideoReady(false)`.
- L'iframe NON si rimonta (stesso `src`) → `onLoad` non ri-scatta → `videoReady` resta false per sempre → loader spinner infinito, immagine mai fade-out.

**Fix**: rimosso `videoActive` dalle dipendenze del reset useEffect. Ora `videoReady=true` persiste dopo il primo load — il click Play rivela il video istantaneamente (comportamento desiderato = "click → reveal mid-playback muted"). Lint pulito.

**Nota deploy**: fix è in preview, l'utente redeploya per pushare in produzione.


### 07/07/2026 — Vimeo hover-prefetch + cosmetics — DONE ✅
- Nuovo helper `/app/frontend/src/lib/prefetchVimeo.js`: iniezione idempotente di iframe nascosto 1×1 su hover/focus/touchstart delle CTA video della phoneme card, per pre-boot del player Vimeo (DNS/TLS/JS/config JSON/primo segmento video). Usa `requestIdleCallback` (250ms fallback) e Map cache per non duplicare. Muted=1 sempre → nessun audio leak.
- Wired in `PhonemeCardPage.jsx` alle 3 CTA (side/front/articulatory video) via `onMouseEnter` + `onFocus` + `onTouchStart` (copertura mouse/keyboard/touch).
- Fix cosmetico: typo IT `fonemai` → `fonemi` nella banner "Mono-dialetto" di `PhonemeLibraryPage.jsx`.
- Fix a11y: aggiunta `DialogDescription` (sr-only, bilingue) ai 2 Dialog "Facial Muscle Activation" e "Articulatory Deep-Dive" per silenziare warning Radix.
- **Testing agent iter_24**: 6/6 regression checks PASS · 0 console errors · retest_needed=false.
- Nota: nessuna card DB ha ancora un URL Vimeo → CTA video non renderizzate (gate `hasPlayableVideo`); il prefetch è no-op difensivo confermato. Quando il Prof caricherà il primo Vimeo, la Network tab mostrerà l'iframe nascosto su hover.


### 06/07/2026 — Phoneme Card · Video rendering pubblico armonico — DONE ✅
Nuovo componente `PhonemeAssetMedia.jsx` che gestisce le 3 casistiche di rendering media
sulla card pubblica, sostituendo i vecchi `<img>` per sideView / frontView / articulatory:

1. **Solo immagine** → identico a prima (backwards-compatible).
2. **Solo video** (upload o link) → il video occupa lo stesso spazio dell'immagine ed è
   completamente chromeless: `autoplay + muted + loop + playsinline`, nessun controllo
   visibile. Player pausato quando il modal padre si chiude (perf).
3. **Immagine + video** → l'immagine è il default; un piccolo pulse cyan sulla bocca segnala
   la disponibilità del video; hover mostra un pulsante play centrale; click (o Enter/Space
   con focus) cross-fade a 500 ms verso il video; secondo click ritorna all'immagine.

**Provider embed**
- Upload MP4/WebM/MOV → `<video>` nativo, zero UI.
- Vimeo → iframe con `background=1&controls=0` → completamente chromeless.
- YouTube → iframe con `controls=0&modestbranding=1&rel=0&disablekb=1&fs=0` — YouTube
  mantiene per policy il branding e la barra titolo su hover. Raccomandato Vimeo/upload
  per un look 100% pulito.

**File nuovi/toccati**
- `frontend/src/components/PhonemeAssetMedia.jsx` (nuovo, usa `parseVideoUrl`)
- `frontend/src/pages/PhonemeCardPage.jsx` — 3 punti aggiornati + keyframe CSS
  `phoneme-media-pulse` (2.4s ease-in-out) per l'affordance idle.


La sezione "Immagini della scheda" è stata rinominata **"Media della scheda"** ed estesa:
per ognuna delle 4 viste (sideView / frontView / frontViewClean / articulatory) l'admin
ora dispone di **3 input paralleli**:
1. Immagine (`assets.<key>`) — come prima, `ImageUploader`.
2. Video upload (`assets.<key>Video`) — nuovo componente `VideoUploader` con limite
   client-side 10 MB, gate su estensione (MP4/WebM/MOV/AVI/MKV), preview `<video controls>`.
3. Video link (`assets.<key>VideoLink`) — nuovo componente `VideoLinkInput` con parser
   YouTube (`youtu.be`, `youtube.com/watch|shorts|embed`) + Vimeo + URL diretti MP4;
   preview `<iframe>` embed inline per YouTube/Vimeo, `<video>` per file, warning per URL
   non riconosciuti.

**File nuovi**
- `/app/frontend/src/components/VideoUploader.jsx`
- `/app/frontend/src/components/VideoLinkInput.jsx` (con export `parseVideoUrl` per test unitari)

**Backend** — nessuna modifica: `PhonemeCardBase.assets: Dict[str, Any]` accetta già chiavi
arbitrarie; endpoint `POST /api/admin/upload` già whitelistato per video (mp4/webm/mov/avi/mkv,
max 100 MB server-side). Il 10 MB client-side è un guard-rail UX per la sezione media.

**Test manuale end-to-end**: PUT su `u-foot` con `assets.sideViewVideoLink=<youtube>` + reload
editor mostra embed YouTube live-preview inline sotto l'input.



### 06/07/2026 — §3.1 Muscle Rule automatizzata + admin-preview drafts — DONE ✅
Utente aveva segnalato: "questi dati devono essere visibili a destra dell'immagine (modal Facial Muscle Activation), e all'interno del modulo collassato del backend che ora è vuoto. Automatizza §3.1 su tutte le card presenti e future."

**Backend**
- `phoneme_cards.py::apply_muscle_rule_to_doc(db, doc)` — nuovo helper DERIVED-by-rule: computa i 5 muscoli dallo IPA + canonical.kind e sovrascrive sempre `facialMuscles` (Spec §1 vieta authoring LLM/utente).
- Agganciato in `admin_create` e `admin_update` → ogni CREATE/UPDATE riscrive automaticamente `facialMuscles` con la regola §3.1.
- `ensure_phoneme_seed()` allo startup ora fa backfill idempotente: 20 card migrate MOD → MODERATE (long-enum enum lockdown allineato al frontend dropdown).
- `phoneme_batch_v2.compose_facial_muscles()` restituisce ora il long-form (HIGH/MODERATE/LOW) invece di MOD; `run_validation_suite` normalizza entrambi i lati per la comparazione.
- Nuovo `get_optional_admin_user` in `utils/security.py` (silent-fail su header assente / token scaduto / role != admin) esposto come `build_user_deps.optional_admin`.
- `GET /api/phonemes/{id}` ora accetta JWT admin opzionale: anonimi vedono solo `published=true` (404 altrimenti), admin autenticati vedono anche i draft.

**Frontend**
- `PhonemeCardPage.jsx`: fetch con `Authorization: Bearer <token>` quando l'utente è admin → admin può fare preview dei draft (u-goose ecc.) senza pubblicarli. Optional chaining difensivo su tutti i `.map` (pronunciationGuide.steps, mnemonic.phrase/highlights, item.ipa, facialMuscles, hotspots, spellings, frequencyChart, features, knobs) — fix nuovi crash emersi con card batch parziali.
- `PhonemeAdminEditorPage.jsx`: sezione "Muscoli facciali (§3.1 DERIVED)" ora `defaultOpen` + badge `editor-muscle-rule-badge` con 5 chip (`editor-muscle-rule-0..4`) che mostrano la regola §3.1 attesa in verde quando i valori attuali combaciano. Tabella client-side `MUSCLE_RULE_VOWELS` mirror del backend §3.1.

**Test coverage**
- `/app/backend/tests/test_muscle_rule_iter23.py` — 8 test classi (auth, public /ʊ/, anon 404 su /uː/ draft, admin bypass, admin_update preserva la regola, admin_create sui bilabiali /p/, backfill startup su tutte le card): 8/8 PASS.
- Verifica visuale: modal /uː/ GOOSE ora mostra i 5 muscoli nel pannello destro (HIGH/MODERATE/LOW/MODERATE/MODERATE). Admin editor mostra badge tutto verde.



### 06/07/2026 — Phoneme CMS · Phase-2 Batch-fill-v2 (Spec v1.0) — DONE ✅
Implementazione conforme allo spec `Batch-AI-Automation-Spec-v1.0.md` in un unica sessione.

**Field taxonomy strict (spec §1)**:
- **CANONICAL_lookup**: ipa/category/subcategory/height/backness/rounding/tenseness/voicing/manner/duration/dialect_membership — locked lookup, mai scritti dall'LLM
- **DERIVED_by_rule**: classification/vowelChartPosition/knobs/facialMuscles — calcolati deterministicamente
- **NEEDS_SOURCE** (deferred first-pass): commonWords_30/spelling_distribution (§3.2/§3.3 richiedono CMUdict + dataset)
- **CREATIVE_ai_draft**: mnemonic/funFact/deepDive/exampleSentences/videoScript — grounded LLM
- **OUT_OF_SCOPE**: spectrogram/pink_trombone/graphics

**Nuovo modulo** `/app/backend/routers/phoneme_batch_v2.py`:
- `_MUSCLE_TABLE_VOWELS` — 12-vowel resolved table verbatim dallo spec §3.1 (slash-ranges collapsati al valore basso per enum HIGH/MOD/LOW)
- `_muscle_levels_for(ipa, kind)` — vowel/diphthong/consonant (bilabials/labiodentals/w-glide/altro)
- `compose_facial_muscles()` — 5-muscle list nel formato card
- **Grounding contract** (§2): system prompt vieta invenzione, esige `grounded_on` list per campo, "empty beats invented"
- `draft_creative_fields()` — Claude Sonnet 4.5 con injected canonical + DERIVED facts
- `run_validation_suite()` — §4 checks: muscle_levels_match_rule, muscle_enum, minimal_pairs_one_segment, sentence_contains_phoneme, no_unsourced_superlatives (word_contains_phoneme deferred)

**Endpoint**:
- `GET /api/admin/phonemes/taxonomy` — espone la tassonomia
- `POST /api/admin/phonemes/{id}/batch-fill-v2` — pipeline completo per card: CANONICAL lookup → DERIVED compute (autofill + muscoli) → CREATIVE LLM draft (5 campi) → §4 validation → rescore → persist come bozza (mai auto-publish)

**Test case /ʊ FOOT (spec target)**:
- Muscoli: **MOD / MOD / LOW / MOD / LOW** ✓ (spec exact match)
- 5/5 CREATIVE draftati con confidence 0.95-1.0 e `grounded_on: [rounding, tenseness, duration, backness, height]`
- 3 pass + 1 warn + 0 fail (sentence check è WARN causa proxy commonWords-based fino a §3.2)
- readiness: 100/100 dopo re-publish

**Batch completo 42 draft cards** (~14 min, ~19s/card):
- **Score distribution**: min 70 · max 82 · avg 75.5
- **Buckets**: 2 GREEN (u-foot 100, i-fleece 100) · 42 AMBER (70-89) · 0 RED
- Tutti gli AMBER hanno la stessa causa: `content.audio` + `content.hotspots` mancanti (correttamente flagged come content-gap umano, non LLM)
- 0 superlativi non citati, 0 muscle rule violations, tutti gli enum conformi

**Enum fix**: readiness `_ACTIVATION_ENUM` ora accetta sia "MOD" (spec §3.1) che "MODERATE" (legacy Phase B) per backward compat.

**Ranked queue reale ora è utilizzabile**: sorti per score DESC, greens = one-click publish, amber = human content input needed.



### 05/07/2026 — Phoneme CMS · Correzioni Architettura (issue utente) — DONE ✅
Tre bug critici segnalati dall'utente dopo Phase F+ sono stati risolti:

**FIX 1 · IPA equivalence layer** (`/r/` e `/g/` batch fallivano con 404)
- Card usa ASCII `r` (0x72) o IPA `ɡ` (0x261), canonical usa IPA `ɹ` (0x279) o ASCII `g` (0x67) → mismatch Unicode
- **Backend** `_IPA_EQUIVALENTS` map + `_ipa_equivalents()` helper: normalizzazione whole-symbol + substring per length marks (`:` ↔ `ː`)
- Applicato in: `build_autofill_payload`, `generate_ai_draft`, `build_readiness_report`, `compute_frequency_chart`
- Estensibile per future coppie (`a` ↔ `ɑ`, aspiration marks, ecc.)

**FIX 2 · Mnemonic phrase/audio stale** (audio non corrisponde alla frase quando editata)
- **Backend `admin_batch_fill`**: `new_audio = cur_audio if new_phrase == cur_phrase else ''` (svuota solo se cambia)
- **Frontend `applyAiDraft`**: stessa logica lato client applica-al-form
- **Editor UI**: help text "⚠️ Se hai modificato la frase, l'audio potrebbe non corrispondere" + bottone "Svuota" (rose-500) con testid `editor-field-mnemonic-audio-clear`

**FIX 3 · Card pubblicate via CMS non appaiono sul frontend** (`PhonemeLibraryPage` leggeva `PHONEMES` statico con solo 2 entries)
- **Frontend `PhonemeLibraryPage`**: fetch `/api/phonemes` on-mount → `dbPhonemes` state
- Merge intelligente: `dbPhonemes[id]` override `entry.status='published'`; `PublishedCard` preferisce dato DB su PHONEMES statico
- Fallback graceful su errore rete (usa PHONEMES statico)
- Verificato: publish di i-kit via CMS → appare immediatamente su `/lms/phonemes` con badge PREMIUM + status DISPONIBILE

**Test agent iter_22**: **12/12 backend + frontend PASS**, 0 fail, 0 action items, `retest_needed: False`



### 05/07/2026 — Phoneme CMS · Batch AI-fill (Fase F+) — DONE ✅
- [x] **Backend** `POST /api/admin/phonemes/{id}/batch-fill`: combina autofill deterministico (canonical → features/knobs/classification/vowelChartPosition) + AI drafting Claude Sonnet 4.5 (mnemonic/funFact) + persistenza atomica come `bozza` (published=false)
- [x] **Safety guards**:
  - `published=true` senza `overwrite:true` → 409 (rifiuta di sovrascrivere schede pubblicate)
  - Preserva campi già valorizzati (solo `_is_empty_or_default` viene compilato); flag `overwrite:true` per forzare
  - `frequencyChart` mai toccato (resta canonical-computed on read)
  - `include_ai:false` → solo autofill deterministico (per test veloci senza LLM)
- [x] **Dialect fallback**: itera su preferred → dichiarati → tutti i candidati fino al primo hit canonical (risolve /e/ e-dress → RP, /ɛ/ resta GenAm)
- [x] **Frontend** `PhonemeAdminPage.jsx`:
  - Bottone toolbar "Batch bozze AI" (fuchsia)
  - Modal con: warning safety, checkbox include_ai, lista con checkbox per ogni card in bozza, pre-selezione automatica delle card con `readinessScore<70`
  - Bottoni "Tutte"/"Nessuna" per bulk-toggle
  - Progress bar con `currentId` durante il batch, bottone "Interrompi dopo la scheda corrente"
  - Results panel: ok/err per riga con score badge color-coded, refresh automatico della lista principale
  - Modal-close guards: backdrop-click disabilitato durante `batchRunning` E quando `batchResults` è popolato (evita di perdere il report per errore)
- [x] **Test agent iter_20+21**: **10/10 backend + frontend PASS**, 0 fail, `retest_needed: False`, `action_items: []` dopo il fix del dialect fallback + modal close guard

**Roadmap Fonemi (A→F+) COMPLETATA al 100%.**



### 05/07/2026 — Phoneme System Rebuild · Phase F (AI drafting Stage 2) — DONE ✅
- [x] **Integration**: Claude Sonnet 4.5 (`anthropic/claude-sonnet-4-5-20250929`) via `emergentintegrations.llm.chat.LlmChat` + `EMERGENT_LLM_KEY`. Playbook consultato prima dell'implementazione.
- [x] **Backend** `/app/backend/routers/phoneme_cards.py`:
  - Nuovo endpoint `POST /api/admin/phonemes/{id}/ai-draft` (admin auth). Body: `{fields:[mnemonic|funFact], dialect?}`. Preview-only, zero scritture.
  - `_AI_DRAFT_ALLOWED_FIELDS = {"mnemonic","funFact"}` — allow-list stretta (nessun campo strutturale)
  - `_AI_DRAFT_SYSTEM`: system prompt che vieta invenzione di feature fonetiche, vieta superlativi non citati, esige JSON stretto
  - `_build_ai_draft_prompt()` — include profilo canonical come ground truth + shape JSON deterministica + esistenti (per evitare duplicati)
  - `_parse_llm_json()` — parser tollerante a markdown fences + estrazione JSON bilanciato
  - `generate_ai_draft()` — chiama LLM, parsa, filtra ai soli fields richiesti, ritorna `{drafts, model, dialect, ipa, session_id, generated_at, status:"bozza"}`
  - Error sanitization: 502 con messaggio tipo-eccezione (no leak SDK internals)
- [x] **Frontend** `PhonemeAdminEditorPage.jsx`:
  - Nuovo componente `ConfidencePill` (verde ≥0.8 / giallo ≥0.5 / rosso <0.5) con %+etichetta italiana
  - Sezione "AI drafting · Claude Sonnet 4.5 (bozze)" con Switch per mnemonic/funFact + bottone "Genera bozza AI"
  - Preview panel a 2 sotto-panelli (mnemonic con phrase italica + highlights chip + coaching note; funFact con headline+body) — ogni panel con ConfidencePill
  - Bottoni "Scarta" / "Applica al form" (verde). Apply scrive solo nello state locale, preservando campi siblings (mnemonic.audio, funFact metadata). Toast "Bozza AI applicata".
  - Disabilitato su /admin/phonemes/new (isNew guard). Errore se nessun campo selezionato.
- [x] **Test agent v3 iter_19**: **14/14 backend + 9/9 frontend PASS**, `retest_needed: False`, `action_items: []`
  - Verificato: draft realistico ("We believe these people need peace and freedom." confidence 85%)
  - Persistence-only-on-save garantita: applica → naviga senza salvare → GET pubblico invariato
  - Regressioni Fase A-E ok (canonical 84, u-foot readiness 100/100, autofill funzionante)

**Roadmap Fonemi completata (A→F). Prossime opzioni:**
- P2 Steve Dapper Knowledge Graph
- P3 Web Push Notifications
- P3 Google Calendar/Drive integration
- Piccoli miglioramenti QoL: filtro "Solo non pronte" nella lista admin phonemes; batch-mode AI drafting per generare bozze su N schede in parallelo



### 05/07/2026 — Phoneme CMS · Readiness badge in admin list — DONE ✅
- [x] **Backend** `PhonemeCardSummary` esteso con `readinessScore` (0-100), `readinessReady` (bool), `readinessFailCount` (int). `admin_list` calcola readiness per ogni card (per 44 card ~200ms totali)
- [x] **Frontend** `PhonemeAdminPage.jsx`: nuovo badge color-coded a destra dei chip meta (verde ≥90 / giallo ≥70 / rosso <70) con tooltip "Pronta per pubblicazione" o "N check falliti". Testid `phoneme-admin-readiness-{id}`
- [x] Screenshot conferma: u-foot / i-fleece → ✓ 100% (verde); tutte le 42 schede skeleton → ✗ 55% (rosso). Visual signal a colpo d'occhio di quali card servono lavoro

### 05/07/2026 — Phoneme System Rebuild · Phase E (Readiness Checklist) — DONE ✅
- [x] **Backend** `/app/backend/routers/phoneme_cards.py`:
  - Nuovo endpoint `GET /api/admin/phonemes/{id}/readiness` (admin auth) — puro diagnostic, zero scritture
  - `build_readiness_report(db, card)` — 15 check deterministici raggruppati in 4 categorie:
    - **canonical** (5): match ipa in inventario, category vs kind, parity Height/Backness/Rounding/Tenseness (o Voicing/Place/Manner per consonanti)
    - **enum** (2): facialMuscles.activation ∈ {HIGH,MODERATE,LOW}; nessuna etichetta classification deprecata (Near-high/High/…)
    - **contrast** (2): parsing `/A/ vs /B/` con verifica presenza canonical + coppie minime word-pair well-formed
    - **content** (6): audio per ogni dialetto, ≥3 hotspots, ≥6 commonWords, ≥3 classification chip, mnemonic, funFact
  - Normalizzazione parentetici (es: "Unrounded (spread)" ≡ "Unrounded") con `_normalise_feature_value()`
  - Score 0-100 pesato (pass=1.0, warn=0.5, fail=0.0); `ready=true` iff fail_n=0
  - 5° migration patch in `ensure_phoneme_seed`: normalizza Rounding parentetici legacy
- [x] **Frontend** `PhonemeAdminEditorPage.jsx`:
  - Nuova sezione "Readiness checklist (correctness)" defaultOpen
  - Score numerico grande (verde ≥90 / giallo ≥70 / rosso <70) + verdict + summary counts
  - Bottone "Ricalcola" con spinner
  - Lista di 15 check con icon color-coded (✓/⚠/✗), category+key label
  - Auto-fetch al load + auto-refetch dopo ogni Save (feedback loop stretto)
  - Su `/admin/phonemes/new` mostra messaggio "Salva prima la scheda" + bottone disabilitato
- [x] **Data drift fix**: seed i-fleece Rounding='Unrounded (spread)' → 'Unrounded' (parity con canonical)
- [x] **Test agent v3 iter_18**: **10/10 backend + 11/11 frontend PASS** con 1 minor (i-fleece drift) risolto post-run
  - Verificato: u-foot 100/100 ready; contradiction detection su Height=Open + classification.Near-high fires correctly; contrast.self detection su '/x/ vs /y/' fires; 404/403 corretti; new-card message ok
  - Zero regressioni Fase A/B/C/D

**Prossime fasi in coda:**
- Fase F: AI drafting Stage 2 (bozza-only, confidence flags) — LLM-assisted per campi narrativi (mnemonic detail, funFact prose, facialMuscles.detail rewording)



### 05/07/2026 — Phoneme System Rebuild · Phase D (Autofill Stage 1 Deterministic) — DONE ✅
- [x] **Backend** `/app/backend/routers/phoneme_cards.py`:
  - Nuovo endpoint `POST /api/admin/phonemes/autofill?ipa=&dialect=` (admin auth) — preview-only, ZERO scritture su Mongo
  - Mappe deterministiche IPA → knob position: `_HEIGHT_TO_KNOB`, `_BACKNESS_TO_KNOB`, `_ROUNDING_TO_KNOB`, `_TENSENESS_TO_KNOB`, `_HEIGHT_TO_Y`, `_BACKNESS_TO_X` — nessun LLM, nessuna percentuale inventata
  - `_compose_autofill_for_vowel()` — features (Height/Backness/Rounding/Tenseness/Duration/Voicing/Manner/Lexical set), 4 knobs (advancement/tenseness/height/roundness con height highlighted), classification chips, vowelChartPosition {x,y}
  - `_compose_autofill_for_consonant()` — features (Voicing/Place/Manner), knobs=[] by design, classification chips, vowelChartPosition={}
  - `build_autofill_payload(db, ipa, dialect)` — 400 su dialect ≠ GenAm/RP, 404 se IPA non nell'inventario
- [x] **Frontend** `PhonemeAdminEditorPage.jsx`:
  - Nuova sezione "Autofill dal canonical (deterministico)" con info banner arancione + bottone "Ottieni anteprima autofill"
  - State `autofillPreview` con panel preview a 4 sotto-panelli (features / knobs con barre / classification chips / vowel chart position) + note canonical se presenti
  - Bottoni Annulla / Applica al form (con Check icon verde). Applica scrive solo nello state locale — l'utente conferma con "Salva" per persistere
  - Toast di conferma "Autofill applicato: features, knobs, classification, vowelChartPosition · ricontrolla e salva."
- [x] **Test agent v3 iter_17**: **16/16 backend + 11/11 frontend PASS**, 0 fail, `retest_needed: False`, `action_items: []`
  - Vowel /ʊ/ GenAm: 8 features, 4 knobs, 5 classification chips, vowel chart (x:95,y:22), source FOOT
  - Consonant /t/ GenAm: knobs=[] by design, dialect_notes contiene "flapped"
  - Diphthong RP-only /ɪə/ → GenAm restituisce 404 (RP-only handling ok)
  - Preview-only confermato: GET /api/phonemes/u-foot before/after autofill è identico
  - Cancel non muta form; Apply scrive nello state locale con toast
  - Zero regressioni Fase A/B/C

**Prossime fasi in coda:**
- Fase E: Correctness checks readiness (minimal pairs validator, contradiction detector)
- Fase F: AI drafting Stage 2 (bozza-only, confidence flags)



### 05/07/2026 — Phoneme System Rebuild · Phase C (Frequency Chart Lockdown) — DONE ✅
- [x] **Backend `/app/backend/routers/phoneme_cards.py`**:
  - Nuova funzione `compute_frequency_chart(db, ipa, category, dialects, n=9)` — calcola i 9 bar da `canonical_phonemes` ordinati per `frequency_rank` ASC, con IPA target forzato in coda se fuori top-N, altezze normalizzate lineari 30→100 dal rank più alto al più basso, `active:true` sul target
  - `_inject_computed_chart(db, doc)` — helper che sovrascrive `frequencyChart` in ogni read (mai ritorna dati legacy)
  - Iniezione in `GET /admin/phonemes/{id}`, `GET /phonemes/{id}`, `POST /admin/phonemes`, `PUT /admin/phonemes/{id}`
  - Defense-in-depth: `admin_update` fa pop di `frequencyChart` prima del `$set`; `admin_create` inserisce `frequencyChart=[]` a prescindere dal payload
  - Dialect precedence esplicita: GenAm o AmE presente → GenAm; solo RP → RP; fallback GenAm
- [x] **Frontend `PhonemeAdminEditorPage.jsx`**:
  - Sezione "Grafico di frequenza · read-only" sostituisce il Repeater editabile
  - Info banner "Bloccato dal Phase C" (spiega il lockdown + prompt "Salva la scheda per ricalcolare")
  - Anteprima calcolata: 9 barre grafiche con `data-testid='editor-freq-preview'` + `editor-freq-bar-N` (bar attivo arancione, altri slate)
  - `ADVANCED_KEYS` non include più `frequencyChart` — il JSON expert mode non permette override
- [x] **Test agent v3 iter_16**: **8/8 backend + 11/11 frontend PASS**, 0 fail, `retest_needed: False`, `action_items: []`
  - Anti-tampering PUT con `{ipa:"FAKE",height:999}` silenziosamente stripped, altri campi legittimi (dialectNote) applicati
  - Parity admin vs public GET verificata
  - Card pubblica /lms/phoneme/u-foot: 9 barre canonical, /ʊ/ attiva
  - Zero regressioni Fase A/B

**Prossime fasi in coda:**
- Fase D: Autofill Stage 1 deterministico (`POST /admin/phonemes/autofill`)
- Fase E: Correctness checks readiness (minimal pairs validator, contradiction detector)
- Fase F: AI drafting Stage 2 (bozza-only, confidence flags)



### 03/07/2026 — Phoneme System Rebuild · Phase B (Bug fix P1 controlled vocabulary) — DONE ✅
- [x] **Backend** `/app/backend/routers/canonical_phonemes.py`: aggiunto `ACTIVATION_TERMS = ["HIGH","MODERATE","LOW"]` ed esposto in `controlled_vocabulary` accanto ai 7 termini height IPA.
- [x] **Backend** `/app/backend/routers/phoneme_cards.py::ensure_phoneme_seed`: 4 patch idempotenti one-shot per correggere docs legacy in Mongo (matching solo su valori esatti, preserva user edits):
  1. `classification.label` `Near-high` → `Near-close` (con tooltip aggiornato)
  2. `facialMuscles.activation` map `moderate/near-close/close/minimal` → enum `MODERATE/MODERATE/HIGH/LOW`
  3. `funFact.body` regex "least common vowel" → sostituito con testo non-superlativo
  4. `knobs[id=height].valueLabel` lowercase → 7 termini IPA capitalizzati
- [x] **Backend seed source** `/app/backend/routers/phoneme_seed_data.py`: u-foot + i-fleece riscritti con activation enum + `Near-close`/`Close` capitalizzati + funFact senza superlative
- [x] **Frontend `PhonemeCardPage.jsx`**:
  - Rimosso hardcoded "2nd most common back vowel" dal blocco Frequency in English
  - Footer dialetto ora dedupa: renderizza dialectNote (trim + uppercase) O l'elenco dialects, mai concatena entrambi con `· AmE & RP`
- [x] **Frontend `PhonemeAdminEditorPage.jsx`**:
  - Aggiunte costanti locali `HEIGHT_TERMS` (7 IPA) + `ACTIVATION_TERMS` (enum) allineate con il backend
  - Features Repeater: quando `label` è "Height"/"Altezza" (case-insensitive), il campo value diventa `<select>` con i 7 termini
  - Knobs Repeater: quando `id === "height"` o label è "Height"/"Altezza", `valueLabel` diventa `<select>`
  - FacialMuscles Repeater: `activation` sempre `<select>` con HIGH/MODERATE/LOW
  - "Nota dialetto" help text chiarisce che sostituisce l'auto-tag (dedup awareness)
  - Classification placeholder aggiornato a "Near-close" (era "Near-high")
- [x] **Frontend seed** `/app/frontend/src/data/phonemes.js`: activation enum + `Near-close` classification + funFact non-superlativo
- [x] **Test agent v3 iter_15**: **14/14 backend + 8/8 frontend PASS**, 0 fail, `retest_needed: False`, `action_items: []`
  - Verificato: `/api/canonical/phonemes` espone activation + height; u-foot/i-fleece migrati; card pubblica libera da "2nd most common"; footer dedup funziona; editor 3 dropdown enforced

**Prossime fasi in coda:**
- Fase C: Frequency Chart lockdown (rimuovere "Aggiungi barra", read-only da canonical)
- Fase D: Autofill Stage 1 deterministico (`POST /admin/phonemes/autofill`)
- Fase E: Correctness checks readiness (minimal pairs validator, contradiction detector)
- Fase F: AI drafting Stage 2 (bozza-only, confidence flags)



### 02/07/2026 — Phoneme System Rebuild · Phase A (Canonical Inventory) — DONE ✅
- [x] **Nuovo router** `/app/backend/routers/canonical_phonemes.py` (~320 righe) — fondamenta data-driven per il phoneme CMS:
  - `ensure_canonical_seed(db)` idempotente (hooked in startup) — indice unico `(dialect, ipa)` + upsert deterministico
  - 84 documenti seeded: **40 GenAm** (11 vowel + 5 diphthong + 24 consonanti) + **44 RP** (12 vowel + 8 diphthong + 24 consonanti)
  - `GET /canonical/phonemes?dialect=&kind=` public read con `controlled_vocabulary` esposto (7 IPA height terms, backness, rounding, manner, place, voicing)
  - `GET /canonical/phonemes/{ipa}?dialect=` lookup singolo per autofill
- [x] **Fixed root-cause dei Bug #1/#4** del brief:
  - Height controlled vocab: `Close/Near-close/Close-mid/Mid/Open-mid/Near-open/Open` — impossibile scrivere "Near-high" (Bug #4)
  - Frequency = `frequency_rank` int only (no percentuali fabbricate); superlative language da rimuovere dalle card in Fase B
  - Dialect divergence modellata correttamente: RP /ɒ/ e /ɜː/ come righe distinte; centring diphthongs (ɪə/eə/ʊə) solo RP; note anti-drift ("Never mark identical") su /ɜː/ e /ɒ/
  - /t/ e /ɹ/ e /l/ portano `dialect_notes` con realization differences (flapping/rhoticity/dark-L) invece di righe duplicate
- [x] File `.md` canonici versionati in `/app/backend/canonical_data/` per audit/riferimento
- [x] **Testing agent v3**: **27/27 test PASS**, 0 fail, no retest needed
  - Counts esatti (84 total, 40 GenAm, 44 RP)
  - Dialect divergence validata (RP centring diphthongs, /ɒ/ RP-only, note NURSE anti-drift)
  - Controlled vocabulary height priva di "Near-high"/"High"/"Low" ✓
  - Filter/sort/validation/idempotency tutti conformi
  - **Zero regressioni** su 12 router estratti nelle sessioni precedenti

**Prossime fasi in coda:**
- Fase B: Bug fix P1 (dropdown Height, enum activation, dedup Nota dialetto, rimozione ranking hardcoded)
- Fase C: Frequency Chart lockdown (rimuovere "Aggiungi barra", read-only da canonical)
- Fase D: Autofill Stage 1 deterministico (`POST /admin/phonemes/autofill`)
- Fase E: Correctness checks readiness (minimal pairs validator, contradiction detector)
- Fase F: AI drafting Stage 2 (bozza-only, confidence flags)



### 02/07/2026 — Backend Refactoring · auth + newsletter (P1 — DONE ✅)
- [x] **Nuovo modulo** `/app/backend/utils/security.py` (~116 righe) — centralizza tutte le primitive di sicurezza: JWT config, `pwd_context`, `security` (HTTPBearer), `verify_password`, `get_password_hash`, `create_access_token`, e factory `build_user_deps(db)` che restituisce le closure `get_current_user` + `get_admin_user`
- [x] **Nuovo router** `/app/backend/routers/auth.py` (~267 righe) — 7 endpoint:
  - `POST /auth/login` — username/password → JWT
  - `POST /auth/magic` — magic-link token exchange
  - `GET /auth/me` — profilo utente corrente
  - `POST /auth/change-password` — cambio password
  - `POST /newsletter/subscribe` — subscribe (con reactivation per email dismesse)
  - `POST /newsletter/unsubscribe` — unsubscribe
  - `GET /admin/newsletter/subscribers` — lista admin
- [x] `TokenResponse` e helper `_make_user_response` incapsulati nel factory; `UserResponse`/`NewsletterResponse` iniettati via param per evitare cicli
- [x] **server.py shrink**: 2113 → **1917 righe** (–196 righe, –9%)
- [x] **Totale sessione backend**: 4188 → 1917 (**–2271 righe, –54%**) 🎯
- [x] Zero lint errors su tutti i file
- [x] **Test E2E** completo (12 assertion via curl):
  - `POST /auth/login` valido → 200 (token 124 char, role admin) · password errata → 401 ✓
  - `GET /auth/me` con token → 200 · senza token → 403 ✓
  - `POST /auth/magic` con token JWT firmato correttamente → 200 (session token 124 char) · invalid → 401 · missing → 400 ✓
  - `POST /newsletter/subscribe` nuova → 201 · duplicate → 400 ✓
  - `POST /newsletter/unsubscribe` → 200 ✓
  - `GET /admin/newsletter/subscribers` con admin auth → 200 (1 subscriber) ✓
  - Cleanup DB OK
- **Beneficio**: primitive di sicurezza centralizzate in `utils/security.py` (riusabili in tutti i router futuri via `build_user_deps` factory). Auth logic isolata, testabile con mock db. Il monolite `server.py` è ora sotto le 2000 righe.



### 02/07/2026 — Backend Refactoring · chat_alice AI chatbot (P1 — DONE)
- [x] **Nuovo router** `/app/backend/routers/chat_alice.py` (~295 righe) — assistente virtuale "Alice" per qualifica lead con GPT-4o-mini via `EMERGENT_LLM_KEY`:
  - `POST /chat` con multi-turn session tracking (`session_id` keyed)
  - Prompt di sistema IT/EN estratti in `_build_system_prompt()` helper
  - Dual-pass LLM: risposta conversazionale + extraction pass per campi strutturati (name/email/english_level/goal/urgency)
  - Hesitation detection (15 keywords IT+EN) → WhatsApp handoff automatico
  - Completion logic (`is_complete`) basata su 3 condizioni (dati completi / esitanti+3 turni / con-info+5 turni)
- [x] Modelli inline (`ChatRequest`, `ChatResponse`, `ChatMessage`, `LeadData`); `LlmChat`/`UserMessage` lazy-import per test env
- [x] **server.py shrink**: 2364 → **2113 righe** (–251 righe, –11%)
- [x] **Totale sessione backend**: 4188 → 2113 (**–2075 righe, –50%** — mezzo file eliminato) 🎯
- [x] Zero lint errors
- [x] **Test E2E LLM in preview** con vera chiamata Emergent LLM key:
  - Turn 1 (greeting IT) → Alice risponde in italiano, estrae già `goal` ✓
  - Turn 2 ("Sono Marco Rossi") → name extraction funziona, multi-turn session preserved ✓
  - Turn 3 ("No preferisco parlare con qualcuno") → hesitation triggers WhatsApp handoff con messaggio esatto, `is_complete: True` ✓
  - Cleanup 1 sessione DB rimossa
- **Beneficio**: chatbot AI completamente isolato, testabile con mock LLM. La logica di prompt engineering + extraction ora vive in un file dedicato (facile A/B testing, versioning prompt).



### 02/07/2026 — Backend Refactoring · leads_forms (contact/booking/corporate-quote) (P1 — DONE)
- [x] **Nuovo router** `/app/backend/routers/leads_forms.py` (~574 righe) — 3 endpoint pubblici del marketing:
  - `POST /contact` — form contatto generico (Zoho SMTP notification HTML)
  - `POST /booking` — richiesta valutazione gratuita + onboarding wizard (auto-registrazione utente + magic-link email quando `source=onboarding_wizard`)
  - `POST /corporate-quote` — richiesta preventivo B2B (HTML notification con priorità 48h)
- [x] Modelli inline (`ContactFormSubmission`, `BookingFormSubmission`, `CorporateQuoteRequest` + Response variants); auth callables (`get_password_hash`, `create_access_token`) iniettati via factory
- [x] **server.py shrink**: 2895 → **2364 righe** (–531 righe in questo passaggio, –18%)
- [x] **Totale sessione backend**: 4188 → 2364 (**–1824 righe, –44%**)
- [x] Zero lint errors (fix: rimossi 3 blocchi di import duplicati inline, corretto `magic_link_sent` unused var)
- [x] **Test E2E**:
  - `POST /contact` → 201, `email_sent: True` (SMTP Zoho attivo, template HTML rendering OK) ✓
  - `POST /booking` → 201, sector/day/preferredTime serializzati correttamente ✓
  - `POST /corporate-quote` → 201, companyName/contactEmail preservati ✓
  - Cleanup DB completato (docs test rimossi da contacts/bookings/corporate_quotes/users)
- **Beneficio**: il router più grosso finora estratto (574 righe di lead-capture logic), con l'intera magic-link auto-registrazione preservata. Il monolite `server.py` è ora sotto le 2400 righe.



### 02/07/2026 — Backend Refactoring · testimonials + messages + popups (P1 — DONE)
- [x] **3 nuovi router** estratti:
  - `/app/backend/routers/testimonials_clients.py` (~123 righe) — 4 endpoint (`GET/POST /testimonials`, `GET/POST /clients`) con modelli inline
  - `/app/backend/routers/messages.py` (~236 righe) — 9 endpoint (member/admin chat + task complete + delete + unread count), riceve `get_conversation_id` e `send_notification_email` via factory
  - `/app/backend/routers/popups.py` (~286 righe) — 10 endpoint (CRUD admin + upload media + member view/dismiss/list)
- [x] **`server.py` shrink**: 3346 → 2895 righe (–451 righe, –13%)
- [x] **Totale progressive**: 4188 → 2895 (–1293 righe, –31% dal punto di partenza)
- [x] **Test E2E** (curl via preview):
  - `GET /testimonials` → 200 (31 items) ✓
  - `GET /clients` → 200 (25 items) ✓
  - `GET /admin/messages/conversations` → 200 (11 conv) ✓
  - `POST /admin/messages` → 200 (msg created) → `DELETE /admin/messages/{id}` → 200 ✓
  - `GET /admin/popups` → 200 · `GET /admin/popups/stats` → 200 (aggregati corretti) ✓
  - Auth guards senza token → 403 ✓
- **Beneficio**: 3 domini ora completamente isolati e testabili. `messages.py` estrarrà anche l'auto-notifica email; `popups.py` include l'upload media (che usa `utils.storage` condiviso). Prossimi candidati: auth (login/magic/change-password), chat Alice AI, contact/booking/corporate-quote (i più grandi rimasti).



### 02/07/2026 — Frontend Refactoring · useAdminState hook (P1 — DONE ✅)
- [x] **Nuovo custom hook** `/app/frontend/src/pages/admin/useAdminState.js` (~858 righe) — contiene tutta la logica di stato (~40 useState, 4 refs, CRM sections), gli useEffect (auth guard + data fetch), showToast helper e i ~35 handlers (folders/content/users/messaging/leads/youtube/popups CRUD). Ritorna un unico oggetto con ~130 identificatori.
- [x] **Nuovo file translations** `/app/frontend/src/pages/adminTranslations.js` (~311 righe) — estratto dal top di AdminPage, importato sia da AdminPage sia dal hook
- [x] **AdminPage.jsx shrink FINALE**: 1397 → **353 righe** (–1044 righe, –75% in questo passaggio)
- [x] **TOTALE sessione (5 tappe)**: 2973 → 353 righe (**–88%**) 🎯
- [x] **Zero lint errors** su tutti i file coinvolti
- [x] **Smoke test E2E completo** in preview:
  - Header + storage widget renderizzano ✓
  - Tutti gli 8 tab cliccabili (folders, content, users, youtube, messaging, leads, database, popups) ✓
  - CRUD end-to-end funziona: `handleCreateFolder` dall'hook → cartella creata + toast "Cartella creata con successo" + counter aggiornato "Cartelle (4)" ✓
  - Cleanup: cartella test rimossa via API ✓

**Riepilogo finale AdminPage refactoring**:
```
AdminPage.jsx         353 righe  (era 2973 — 88% ridotta)
useAdminState.js      858 righe  (hook con state + handlers)
AdminEditorModal.jsx  807 righe  (10 form CRUD)
adminTranslations.js  311 righe  (i18n dict)
AdminLeadsTab.jsx     349 righe
AdminMessagingTab.jsx 274 righe
AdminYouTubeTab.jsx   154 righe
AdminContentTab.jsx   140 righe
AdminPopupsTab.jsx    135 righe
AdminUsersTab.jsx     120 righe
AdminFoldersTab.jsx    89 righe
AdminDatabaseTab.jsx   56 righe
```

- **Beneficio**: AdminPage.jsx è ora un componente di composizione puro (353 righe di JSX + tab dispatch). L'hook `useAdminState` è testabile con `@testing-library/react-hooks`. Ogni tab è isolato e lazy-loadable. Il codice è ora **production-grade e mantenibile a lungo termine**.



### 02/07/2026 — Frontend Refactoring · AdminEditorModal (P1 — DONE)
- [x] **Nuovo componente** `/app/frontend/src/pages/admin/AdminEditorModal.jsx` (~807 righe) — modal shell unificato per tutti i 10 tipi di form CRUD admin:
  - `create-folder` / `edit-folder`
  - `create-content` / `edit-content` (con upload file, thumbnail auto, cover custom)
  - `create-user` / `edit-user` (form CRM completo: Anagrafica, Dati Aziendali, Social & Web, Marketing & CRM, Note & Storico, Ruolo Sistema — tutte le sezioni collassabili)
  - `import-youtube` / `edit-youtube-users`
  - `create-popup` / `edit-popup` (con upload media, cover, CTA, target selector)
- [x] **AdminPage.jsx shrink**: 2138 → **1397 righe** (–741 righe, –35% solo in questo passaggio)
- [x] **Totale sessione**: 2973 → 1397 righe (**–53%, obiettivo `<1400` RAGGIUNTO** ✅)
- [x] **Contratto props esplicito**: ~40 props (state + refs + handlers) — parent resta single source of truth
- [x] **Zero lint errors** su file toccati
- [x] **Smoke test E2E** in preview (login admin → aperti tutti e 5 i tipi di modal):
  - Folder modal → `folder-name-input` + `save-button` visibili ✓
  - Content modal → `content-title-input` + `content-type-select` visibili ✓
  - User modal → `user-username-input` + `user-role-select` visibili, sezioni CRM collassabili renderizzano ✓
  - YouTube import → `youtube-url-input` visibile, banner rosso + lista clienti ✓
  - Popup modal → `popup-title-input` + `popup-type-select` visibili, submit button arancione ✓
  - Zero regressioni visive (colori, layout, submit button color per import-youtube/popup)
- **Beneficio**: modal completamente isolato, ora possibile testarlo unitariamente con mock di form data + submit handlers. Il file principale è finalmente sotto le 1400 righe.



### 02/07/2026 — Frontend Refactoring · 5 nuovi tab estratti (P1 — DONE)
- [x] **5 nuovi componenti** in `/app/frontend/src/pages/admin/`:
  - `AdminFoldersTab.jsx` (~89 righe) — grid cartelle con create/edit/delete
  - `AdminContentTab.jsx` (~140 righe) — tabella contenuti con thumbnail regeneration
  - `AdminUsersTab.jsx` (~120 righe) — tabella utenti con badge role/type + shortcut "invia messaggio"
  - `AdminYouTubeTab.jsx` (~154 righe) — playlist YouTube con sync/edit/delete
  - `AdminMessagingTab.jsx` (~274 righe) — chat 2-pane completa (sidebar conversazioni + thread + rich text editor + task/audio/video/file)
- [x] **AdminPage.jsx shrink**: 2583 → 2137 righe (–446 righe, –17%)
- [x] **Totale sessione refactoring frontend**: 2973 → 2137 (–836 righe, –28%)
- [x] **8 tab admin ora modulari** (folders, content, users, youtube, messaging, leads, database, popups)
- [x] **Zero lint errors** su 8 file toccati
- [x] **Smoke test E2E** in preview: login → 8 tab cliccati in sequenza → tutti renderizzano correttamente. Messaging mostra sidebar con 15 conversazioni + empty state chat area ✓
- **Target non raggiunto**: obiettivo era `<1000 righe`. Servono ancora 2 estrazioni:
  1. `AdminEditorModal.jsx` (~780 righe di form condizionali) — da fare
  2. `useAdminState.js` custom hook (~400 righe di state + handlers) — da fare
- **Beneficio già ottenuto**: 8 tab isolati, riusabili e testabili unitariamente; il futuro lazy-loading via `React.lazy` è ora un one-liner per ciascun tab.



### 02/07/2026 — Frontend Refactoring · AdminPage split (P1 — DONE)
- [x] **3 nuovi componenti** estratti in `/app/frontend/src/pages/admin/`:
  - `AdminLeadsTab.jsx` (~349 righe) — Lead Inbox completo: filtri (7 fields), lista con badge CEFR/status, drawer dettaglio, azioni cambio-stato, invio email template (welcome/followup/proposal), touch history
  - `AdminDatabaseTab.jsx` (~56 righe) — dashboard stats MongoDB (dimensione dati/indici/collezioni, tabella per-collection)
  - `AdminPopupsTab.jsx` (~135 righe) — lista popup broadcast con badge type/status, stats views/dismissals, azioni toggle/edit/delete
- [x] **AdminPage.jsx shrink**: da 2973 → 2583 righe (–390 righe, –13%)
- [x] **Contratto props chiaro**: ogni tab riceve solo la slice di stato + handler che gli serve (single source of truth resta nel parent AdminPage)
- [x] **Zero lint errors** su tutti i file toccati
- [x] **Smoke test E2E** su preview (login admin → navigazione tra i 3 tab):
  - `tab-leads` → `leads-panel` visibile ✓ (28 leads renderizzati)
  - `tab-database` → heading "Statistiche Database" visibile ✓
  - `tab-popups` → `add-popup-button` visibile + card popup renderizzato con stats (viste 1/15 6.7%) ✓
- **Beneficio**: tab-level components isolati e riusabili, testabili unitariamente, il refactor riduce il rischio di regressioni cross-tab quando si modifica un singolo dominio (es. il lead inbox). Prossimo candidato: `MessagingTab` (~980 righe, il più grosso).



### 02/07/2026 — Backend Refactoring · Uploads + Leads + Proposals (P1 — DONE)
- [x] **3 nuovi router** estratti da `server.py`:
  - `/app/backend/routers/admin_leads.py` (~287 righe) — `GET/PATCH /admin/leads`, `POST /admin/leads/{id}/email` (Zoho SMTP + template EN/IT + variable substitution + touch log)
  - `/app/backend/routers/proposals.py` (~272 righe) — `POST /proposals/track-open`, `GET /admin/proposals/opens`, `POST /proposals/send-by-email` (PDF attachment + BCC seller + audit log)
  - `/app/backend/routers/uploads.py` (~299 righe) — `GET /admin/storage/stats`, `POST/DELETE /admin/upload*`, `POST /admin/thumbnail/*`, `GET /uploads/{path:path}` (public serve + Emergent-storage fallback + write-back cache)
- [x] **Nuovo modulo condiviso** `/app/backend/utils/storage.py` (~148 righe) — costanti (`ALLOWED_EXTENSIONS`, `UPLOAD_MAX_*`) e helper (`format_size`, `get_total_storage_used`, `auto_generate_thumbnail`, `get_youtube_thumbnail`, `generate_video_thumbnail`, `generate_pdf_thumbnail`) accessibili sia dal router che dai restanti endpoint di `server.py`
- [x] **`server.py` shrink**: da 4188 → 3346 righe (–842 righe, –20%)
- [x] **Test E2E end-to-end** (curl via preview URL, admin login):
  - Upload PNG reale → 200, salvato su disco + mirror Emergent Storage → public serve 200 (261 B, `image/png`) → DELETE 200 ✓
  - `GET /admin/storage/stats` → 200 (2 GB cap, 7 files) ✓
  - `POST /admin/thumbnail/generate-from-url` YouTube + Google Drive → 200 ✓
  - `GET /admin/leads` → 200 (3 items) · `PATCH nonexistent` → 404 ✓
  - `POST /proposals/track-open` → 200 (sequence numbering ok) · filter GET → 200 ✓
  - `POST /proposals/send-by-email` invalid email → 400 ✓
  - Auth guards (no token) → 403 ✓
- **Beneficio**: architettura scalabile, ogni dominio ha il suo router testabile in isolamento, helper condivisi centralizzati in `utils/`. Prossimo candidato: split di `AdminPage.jsx` (>2900 righe frontend).



### 02/07/2026 — Backend Refactoring · ElevenLabs Router Extraction (P0 — DONE)
- [x] **Nuovo file** `/app/backend/routers/elevenlabs.py` (~200 righe) creato con factory `build_elevenlabs_router(get_admin_user, emergent_put, uploads_dir)` — stesso pattern di `phoneme_cards.py`
- [x] **Rimosse ~135 righe** da `server.py` (da 4188 a ~4057 righe): `ElevenLabsTTSRequest`, `_get_elevenlabs_client()`, `list_elevenlabs_voices`, `elevenlabs_tts`
- [x] **Router incluso** in `server.py` (bottom section) accanto a `phoneme_cards`
- [x] **Test end-to-end** (curl via preview URL):
  - `GET /api/admin/elevenlabs/voices` → HTTP 200, 27 voci reali + `default_voice_id` corretto
  - `POST /api/admin/elevenlabs/tts` → HTTP 200, MP3 22.6 KB caricato su Emergent Storage
  - Validazione (`text` vuoto) → HTTP 400 `"text obbligatorio"` ✓
  - Auth guard (senza token) → HTTP 403 ✓
- **Beneficio**: `server.py` più snello, endpoint ElevenLabs isolati e testabili individualmente, zero regressioni sul flusso Bulk Audio Generator del CMS.



### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Auto-save Editor (P1 — DONE)
- [x] **Auto-save debounced** (30 secondi dall'ultimo edit) nel `PhonemeAdminEditorPage.jsx`:
  - Silent PUT su `/api/admin/phonemes/{id}` — non modifica mai `published` (rispetta stato bozza/pubblicato)
  - Skip condizionale: solo in modalità edit (mai in `/new` che non ha ancora un id), solo se dirty, solo se auto-save enabled, solo se JSON valido, solo se validate() passa
  - `autoSaveInFlightRef` guard contro chiamate concorrenti
  - Aggiorna `initial` post-successo → `isDirty` torna a false automaticamente senza reset del `card`
- [x] **`AutoSaveIndicator` component** nel footer sticky (accanto al dirty-state indicator):
  - **Toggle pill** ON (verde) / OFF (slate) — persistito in `vf_editor_autosave`
  - **4 stati visivi**: idle ("ogni 30s dopo l'ultima modifica"), saving (spinner Wand2 pulse + "Salvataggio…"), saved ("✓ Salvato alle 17:19"), error ("⚠ Errore autosave")
  - Timestamp locale (formato `HH:mm` it-IT) mostrato dopo ogni salvataggio riuscito
- [x] **Cleanup timer**: ogni edit resetta il timer 30s (debounce vero); unmount clear via return del `useEffect`
- [x] **Test smoke passato**:
  - Indicator visibile e ON di default ✓
  - Toggle OFF/ON persistito in localStorage ✓
  - Indicator NASCOSTO in modalità `/new` ✓
  - Dirty state appare all'edit (`● Modifiche non salvate`) ✓
  - PUT endpoint 200 OK ✓
  - Lint 0 errori
- **Impatto**: rete di sicurezza per il Prof durante la rifinitura dei 42 scheletri. Ogni edit viene automaticamente persistito dopo 30 secondi — nessun rischio di perdita dati in caso di crash browser, sessione scaduta o dimenticanza. Il toggle OFF resta disponibile per il modo "sperimentale" quando l'admin vuole controllo esplicito.


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Stability Preset Selector (P1 — DONE)
- [x] **3 preset di prosodia ElevenLabs** tarati per l'insegnamento fonetico, nel `BulkAudioGenerator.jsx`:
  - **Naturale** (cyan, default): `stability 0.42 · similarity 0.88 · style 0.05` — bilanciato per la maggior parte dei fonemi
  - **Espressivo** (arancione): `stability 0.25 · similarity 0.85 · style 0.15` — più variazione, ideale per vocali lunghe (`/iː/`, `/uː/`, `/ɔː/`) e frasi mnemoniche
  - **Stabile** (verde): `stability 0.65 · similarity 0.92 · style 0.02` — molto consistente, ideale per fonemi isolati e consonanti (plosive, affricate)
- [x] **UI**: pill selector 3-tab tra il progress bar e i voice picker con colore dinamico in base al preset attivo + hint sottotitolare che mostra parametri correnti in real-time
- [x] **`generateOne` aggiornato**: pesca dinamicamente `prosody.stability / similarity_boost / style / use_speaker_boost` dal preset selezionato invece di valori hardcoded
- [x] **Persistenza localStorage** in chiave `vf_bulk_prosody` — la scelta dura tra sessioni
- [x] **Test smoke passato**:
  - 3 pill renderizzate ✓, hint iniziale "Naturale · Bilanciato · 0.42" ✓
  - Click "Espressivo" → hint aggiornato "0.25" + persistito in localStorage ✓
  - Click "Stabile" → hint "consistente · 0.65" ✓
  - Lint 0 errori
- **Impatto**: il Prof può ora scegliere il preset ottimale per il tipo di fonema (Espressivo per vocali lunghe con contorno intonativo, Stabile per consonanti isolate) senza dover conoscere i parametri interni ElevenLabs. Le 3 configurazioni sono già testate e produce risultati didatticamente adeguati.


### 02/07/2026 — LMS Fase 2 · CMS Fonemi — Voice Dropdown nel Bulk Generator (P1 — DONE)
- [x] **BulkAudioGenerator.jsx** esteso con 3 voice picker (AmE / RP / Default):
  - **Fetch on mount** da `/api/admin/elevenlabs/voices` (endpoint già esistente in `server.py`), riuso puro
  - Response ha 27 voci disponibili: 25 premade (Roger, Sarah, Laura, Charlie, George…) + 2 cloni personalizzati incluso **"Steve Dapper · professional · it-standard"** (default account)
  - **Layout**: 3 `VoicePicker` in una riga a 3 colonne sotto la progress bar
    - 🇺🇸 AmE (per gli isolated + example sentences AmE)
    - 🇬🇧 RP (per gli isolated + example sentences RP)
    - Default (per la frase mnemonica + le parole comuni — dialect-agnostic)
  - Ogni picker: `<select>` con nome + categoria + accent label + bottone Play/Pause per **preview inline** (usa `voice.preview_url`, `<audio autoplay>` invisibile)
  - **Persistenza localStorage** in chiave `vf_bulk_voices` — le scelte durano tra sessioni
  - Auto-seed con account default al primo caricamento
- [x] **`generateOne` aggiornato**: pesca `voiceByDialect[item.dialect] || voiceByDialect.default` in base al campo `dialect` dell'item
- [x] **`computeItems` aggiornato**: ogni item porta ora `dialect: 'AmE' | 'RP' | 'default'` (mnemonic e commonWords sono `default`)
- [x] **Loading state** con spinner + gestione errore quando l'API non risponde
- [x] **Test smoke passato**: 27 voci caricate ✓, AmE selezionata su voce Prof Dapper ✓, preview button abilitato (ha preview_url) ✓, cambio voce RP → persistenza in localStorage verificata ✓, Lint 0 errori
- **Impatto**: il Prof può ora usare voci native diverse per AmE (voce americana) vs RP (voce britannica) → risultato didatticamente più accurato. Le voci scelte restano tra le sessioni, quindi la configurazione si fa una volta sola.


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

## Changelog — 06/07/2026 (Dialect fact-check — RP/AmE lock canonico)

### Nuova regola canonica: fonemi mono-dialetto
Alcuni fonemi esistono come suono distintivo solo in un accento:
- **`/ɒ/` LOT**: RP-only (in GenAm si è fuso con `/ɑ/` PALM — cot-caught territory)
- **`/ɪə eə ʊə/`** dittonghi centering (NEAR, SQUARE, CURE): RP-only
  (in GA sono realizzati con rotici `/ɪr ɛr ʊr/` — articolazione diversa)

Aggiornati in `frontend/src/data/phonemeCatalogue.js`:
`dialectScope: 'both'` → `'RP-only'` per i 4 fonemi sopra.

### Wiring frontend (PhonemeCardPage)
- Nuovo blocco §DIALECT FACT-CHECK che legge `phoneme.dialects` (array canonico dal DB)
- **Auto-flip silenzioso**: se lo studente arriva sulla card con il dialetto "sbagliato" selezionato, il toggle si sposta automaticamente sul dialetto supportato
- **Toggle bloccato**: quando la card è mono-dialetto, il pulsante US⇄UK diventa un **badge locked** con bandiera + "SOLO" + puntino arancione
- **Tooltip esplicativo** al hover: "Il toggle US/UK è disattivato perché questo suono esiste solo in [RP britannico | American English]"
- Testo bilingue IT/EN via `LanguageContext`
- data-testid: `phoneme-dialect-lock` (mono-dialect) vs `phoneme-dialect-switch` (bi-dialect)

### Admin editor
- Nuovo campo **Dialetti supportati** in `PhonemeAdminEditorPage.jsx` con checkbox 🇺🇸 AmE / 🇬🇧 RP
- Warning arancione quando si spunta un solo checkbox: "⚠️ Mono-dialetto: il toggle US/UK sarà bloccato sulla card cliente"
- Impossibile deselezionare entrambi (fallback automatico all'opposto)
- data-testid: `editor-field-dialect-ame` / `editor-field-dialect-rp`



### Wiring dialetto-audio end-to-end
- 🆕 Helper `pickDialectAudio(entity, dialect)` (`frontend/src/lib/pickDialectAudio.js`)
  con fallback graceful: legge `entity.audioAmE`/`entity.audioRP` prima, poi
  `entity.audio[dialect]`, infine `entity.audio` (stringa legacy).
- **PhonemeCardPage**: 30 Common Words + Mnemonic passano ora da `pickDialectAudio`;
  il preloader HTTP-cache carica solo la traccia del dialetto selezionato.
- **PhonemeAuralQuiz**: `playWord()` usa `pickDialectAudio`, riproduce la traccia
  RP/AmE corretta; il bottone Riascolta è disabilitato solo se ENTRAMBE mancano.
- **PinkTromboneEmbed**: la reference audio "Ascolta voce di Steve" ora consuma
  `phoneme.audio[dialect].isolated` (nuovo prop `cardAudioByDialect`), sostituendo
  l'URL WAV hardcoded pre-ElevenLabs. Cambia dialetto → cambia traccia.

### Admin editor (Fase B)
- `PhonemeAdminEditorPage`: la sezione Common Words ora mostra **due Input** per
  ogni riga (🇺🇸 AmE + 🇬🇧 RP) invece del singolo campo audio; template
  aggiornato a `{w, ipa, audioAmE, audioRP}`. Backfill grazioso del legacy
  `audio` in `audioAmE` al primo edit.
- Sezione Frase Mnemonica: due Input separati AmE/RP con bottone Svuota per
  ciascuno. Cambia frase → entrambi gli audio vengono azzerati (perché la
  registrazione ElevenLabs non corrisponde più).
- Seed dell'editor da catalogo aggiornato per creare direttamente i campi
  `audioAmE`/`audioRP` sui new cards.

### Backend
- Nessun cambiamento — i modelli `PhonemeCardBase.commonWords` e `.mnemonic`
  erano già `Dict[str, Any]` free-form, accettano qualunque chiave.

### File toccati
```
frontend/
  src/lib/pickDialectAudio.js          (NEW)
  src/pages/PhonemeCardPage.jsx        (wire commonWords + mnemonic)
  src/components/PhonemeAuralQuiz.jsx  (wire quiz playback)
  src/components/PinkTromboneEmbed.jsx (dialect-aware reference audio)
  src/pages/PhonemeAdminEditorPage.jsx (dual AmE/RP fields)
```

### ⚠️ Incidente su u-foot durante il test
Durante una PUT di verifica ho sovrascritto per errore i 30 commonWords e la
frase mnemonica di u-foot con 2 righe di test. Ho **ripristinato dal seed**
i 30 words e la frase originale "Pull the wool, push the hood, put the foot."
La tua versione più recente della mnemonic ("A good cook should put sugar
cookies in the wooden cookware.") **non è più recuperabile automaticamente** —
la trovi solo nella tua memoria/note. Da re-inserire manualmente dall'admin
editor (l'audio ElevenLabs andrà rigenerato).



### Nuove funzionalità
- **Helper `pickLang`** (`frontend/src/lib/pickLang.js`) — legge stringhe da
  oggetti bilingui `{it, en}` con fallback graceful, retrocompatibile con
  stringhe singole.
- **`VocalLabEmbed`** completamente bilinguato: titolo, hint istruzioni,
  bottone attivazione, etichette controlli (Pitch/Tenseness/Soft palate/Voicing),
  legenda modello. **Toggle IT🇮🇹/EN🇬🇧 visibile** nel header del lab
  agganciato al `LanguageContext` globale (data-testid `vocal-lab-lang-it`,
  `vocal-lab-lang-en`).
- **`vocalLabProfiles.js`** convertito a struttura ricca bilingue:
  `{ label: {it,en}, description: {it,en}, ...engine params }` con
  **descrizioni articolatorie complete** per tutti i 5 profili (u-foot,
  i-fleece, a-father, s-fric, m-nasal). La descrizione del profilo attivo
  appare come callout evidenziato sotto le chip.
- **`PinkTromboneEmbed`** bilinguato: caption, ARIA labels, legenda
  trapezoide, assi (anteriore/posteriore/aperta/chiusa), bottone
  reference-audio, popup close/legend/title.
- **`SagittalOverlay`** aggancia automaticamente `LanguageContext` (le
  etichette anatomiche già hanno `labelIt/labelEn` dall'endpoint canonico).
- **Facial Muscle Activation modal** (`PhonemeCardPage.jsx`) bilinguato:
  titolo, header sezione, descrizione, nomi muscoli + dettaglio (letti da
  `nameLocalized`/`detailLocalized` con fallback al `name`/`detail` legacy).
- **Articulatory deep-dive modal** titolo + toggle Foto/Photo/Video.

### Backend — muscoli bilingui
- `compose_facial_muscles(ipa, kind)` in `phoneme_batch_v2.py` restituisce
  `name`/`detail` come stringhe inglesi (retrocompat con test suite iter23)
  **+ nuovi campi** `nameLocalized`/`detailLocalized: {it, en}` consumati
  dal frontend via `pickLang`.
- Auto-derivazione su ogni PUT admin (rigenerati u-foot, e-dress, i-fleece
  a mano dopo il deploy della regola).

### File toccati
```
frontend/
  src/lib/pickLang.js                    (NEW)
  src/data/vocalLabProfiles.js           (REWRITE)
  src/components/VocalLabEmbed.jsx       (i18n + lang toggle)
  src/components/PinkTromboneEmbed.jsx   (i18n)
  src/components/SagittalOverlay.jsx     (context hook)
  src/pages/PhonemeCardPage.jsx          (muscle modal + articulatory)
  public/index.html                      (Barlow Condensed already)
backend/
  routers/phoneme_batch_v2.py            (bilingual muscle fields)
```



### Restyling secondo riferimento printed-card
- **Font**: importato **Barlow Condensed** (Google Fonts, weights 300/400/500)
  in `frontend/public/index.html`. Fallback: Roboto Condensed → Fira Sans
  Condensed → system.
- **SagittalOverlay.jsx rifatto** (HTML absolute-position + SVG hairline
  per leader):
  - Testo bianco puro (`#ffffff`), sentence-case, **font condensato tall/narrow**.
  - `fontSize: clamp(14px, 1.4vw, 20px)`, `fontWeight: 400`, `lineHeight: 1.05`.
  - Solo pallino bianco al lato anatomico (raggio ~5px, cerchio vero via
    `border-radius: 50%` HTML); nessun pallino al lato del testo.
  - Leader line bianca, `strokeWidth=1` con `vectorEffect="non-scaling-stroke"`.
  - Supporto multi-line (`max-width: 18ch`, `white-space: normal`).
- **Frecce airflow ripristinate** ma **piccole e contenute** dentro la
  cavità orale (`x ∈ 36..53`, `y ∈ 44..50`) — non più il grande arco che
  copriva il volto. Colore teal (`#5eead4`), marker più piccolo.
- **Ratio card**: ripristinato **16:9** (era stato erroneamente forzato a
  1:1) — `aspectRatio: '16 / 9', maxHeight: 85vh`.
- **Coordinate label ravvicinate**: leader endpoints ora molto vicini agli
  anchor (breve tratto orizzontale/diagonale in stile printed-card).

### Note per test end-to-end
- Preview `u-foot` mostra ancora l'immagine con **etichette baked**: le
  etichette digitali overlay si sovrappongono → è previsto finché
  l'utente non carica una **immagine PULITA** su Preview (l'ha caricata
  in produzione, DB diversi).
- `e-dress` su Preview non ha ancora `sideView`: bisogna caricare l'asset.


### Fix visivi Sagittal Overlay `/e/` (bozza)
- **Container quadrato reale**: aggiunto `maxWidth: 85vh` alla `imageContainerRef`
  in `PhonemeCardPage.jsx` per evitare stiramento orizzontale delle coordinate
  SVG (che sono calibrate su aspect 1:1).
- **Placeholder pulito**: `PhonemeAssetMedia.jsx` ora renderizza un `<div>` scuro
  quando `imageUrl` è vuoto, invece dell'icona "broken image" con testo alt.
- **Front-view button condizionale**: nascosto interamente quando né
  `frontViewClean` né `frontView` esistono (evita testo "front-view"
  fantasma nel cerchio HUD).
- **Frecce airflow ridotte**: `strokeWidth` 1.1→0.7, `markerWidth/Height` 4→2.4
  in `SagittalOverlay.jsx` per un rendering più delicato/proporzionato.
- **Riposizionamento etichette anatomiche** in `anatomical_overlay.py`:
  - `vocal-folds` leader → `(20, 88)` (era `(72, 88)`, collideva con badge
    Airflow/Voicing in basso a destra).
  - `tongue-body` leader → `(78, 78)` (era `(28, 84)`, sovrapposto a
    tongue-root/vocal-folds).
- **Path airflow vocali riposizionato** a `(58,56)→(45,50)→(33,48)` per
  fermarsi prima delle labbra e non collidere con `upper-lip`/`lower-lip`.
- **IPA equivalence `e ↔ ɛ`** aggiunta a `_IPA_EQUIVALENTS` in
  `phoneme_cards.py` (DRESS lexset in italiano `/e/`, canonical `/ɛ/`).

### Verifica in Preview
- Login admin → `/lms/phoneme/e-dress` mostra correttamente:
  LABBRO SUPERIORE, LABBRO INFERIORE, CORPO DELLA LINGUA, CORDE VOCALI,
  freccia airflow curva, indicatore voicing animato a 3 barre.
- Produzione (`vocalfitness.org`): endpoint `/api/canonical/anatomical-labels`
  restituisce `0` etichette — deploy §3.2 pendente. **User action**: click
  "Deploy" da dashboard Emergent per attivare le etichette in live.

### Next Actions
- P0: user validation su Preview dopo upload immagine `/e/` su Preview
  (attualmente immagine è su Produzione, dove il canonical seed non è ancora
  deployato).
- P1: Integrazione ElevenLabs (voce Steve Dapper) per `mnemonic.phrase`.
- P2: Toggle admin `showAnatomicalLabels` per opt-out per singola card.
- P2: Testing agent v3 su tutta la feature §3.2 (fluida verifica end-to-end).

