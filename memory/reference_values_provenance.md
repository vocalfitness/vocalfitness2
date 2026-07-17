# Verifica di provenienza — valori di riferimento formantici

**Tipo:** verifica documentale (NESSUN valore modificato).
**Data:** 2026-07-17
**Unica fonte dei valori:** `/app/backend/data/formant_references.py` (dict Python hardcoded).

---

## Come sono entrati i numeri nel sistema

Tutti i valori di riferimento (GenAm + RP) sono **letterali hardcoded** in due dict
Python nel file `formant_references.py`:
- GenAm → dict `_H95` (righe 26-45), attribuito a Hillenbrand et al. (1995) / `phonTools::h95`.
- RP → dict `_DET` (righe 48-59), attribuito a Deterding (1997), JIPA 27:47-55.

**Modalità di ingresso:** trascrizione a mano nel sorgente (tuple letterali).
NON importati da un dataset, NON generati, NON letti da file esterno.
**NON esiste** nel repo una citazione per-valore (tabella/riga del paper), né una
traccia di import o di provenienza per singolo numero. L'attribuzione è solo a
livello di modulo (una citazione unica per tutto GenAm e una per tutto RP).

---

## Risposte puntuali

### RP /æ/ = 690 / 1550 (male)
1. **File:** `formant_references.py`, dict `_DET["male"]`, tupla `("æ", 690, 1550)` (riga 50).
2. **Come è entrato:** letterale scritto a mano nel sorgente.
3. **Tabella/riga Deterding:** NON indicata nel codice. Nessun riferimento a tabella o riga.
4. **Dataset:** no, non importato.
5. **Ricostruibilità:** oltre a "letterale trascritto a mano, attribuito a Deterding 1997",
   la provenienza del singolo valore NON è ricostruibile dal repo.
   ⚠️ **Segnalazione discrepanza:** il valore atteso da Deterding (1997) per /æ/ maschile,
   secondo la tua osservazione, è ≈ 834 / 1782 — NON 690 / 1550. Da confermare sul paper.
   (Non modifico nulla; è la verifica bibliografica dal tuo lato.)

### GenAm /æ/ = 588 / 1952 / 2601 (men)
1. **File:** `formant_references.py`, dict `_H95["men"]`, tupla `("æ", 588, 1952, 2601)` (riga 29).
2. **Come è entrato:** letterale scritto a mano nel sorgente.
3. **Tabella/riga Hillenbrand:** NON indicata nel codice, ma questi valori **coincidono**
   con le medie maschili di /æ/ pubblicate in Hillenbrand et al. (1995) / `phonTools::h95`
   (588 / 1952 / 2601). → GenAm risulta trascritto correttamente e verificabile.
4/5. Stesso stato (letterale hardcoded, nessun trail di import), ma i numeri corrispondono
   alla tabella canonica h95.

---

## Osservazioni trasversali (tutti i fonemi)
- **`sd_source = "estimated_pooled"` per il 100% delle righe**: le SD NON sono quelle
  pubblicate, sono stime % della media (F1 12% / F2 10% / F3 8%).
- **RP: F3 = null** per tutte le vocali (Deterding non riporta F3 → scoring RP su F1+F2).
- **GenAm**: i valori campionati (es. /æ/ men, /i/ men 342/2322/3000, /ʊ/ men 469/1122/2434)
  coincidono con h95 → provenienza GenAm difendibile.
- **RP**: da verificare bibliograficamente riga per riga; almeno /æ/ maschile mostra
  discrepanza con il valore atteso da Deterding.

---

## Dump completo dei valori in uso (58 righe)

Formato: `ipa | dialetto | gruppo | F1 | F2 | F3 | sd_source | fonte dichiarata`
Generato da `build_reference_rows()`. F3 = "-" quando null (RP).

Vedi tabella allegata nella chat (36 righe AmE: men/women/children × 12 vocali;
22 righe RP: male/female × 11 vocali). Rigenerabile con:
`python -c "from data.formant_references import build_reference_rows; ..."`
