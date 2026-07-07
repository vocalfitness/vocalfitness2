"""
Phoneme Hotspot Rule §3.4 — DERIVED, rule-based, never LLM-authored.

Given the canonical entry for a phoneme (ipa + kind + features), produce
the list of anatomical hotspots that should render on the sagittal
overlay for that specific phoneme. Only pedagogically relevant regions
are surfaced (e.g. /p/ does NOT expose "pharynx neutral" — irrelevant;
/ʊ/ DOES expose it because it contributes to the vowel's timbre).

The engine mirrors the pattern of §3.1 Muscle Rule:
  • Deterministic tables → single source of truth.
  • Idempotent → same canonical inputs always produce identical output.
  • Bilingual outputs → ``labelLocalized`` / ``titleLocalized`` /
    ``roleLocalized`` / ``detailLocalized`` / ``anatomyLocalized`` are
    ``{it, en}`` dicts consumed by the frontend via ``pickLang``.
  • Never overwrites cards flagged ``hotspots_locked=true`` (the manual
    curators — currently only u-foot + i-fleece — are protected).

Coordinates are calibrated against the standard 16:9 sagittal reference
image used by all phoneme cards.

Reference spec: /app/backend/canonical_data/HotspotRule_v1.md
Reference impl parity: /ʊ/ (u-foot) — the 9-hotspot authored gold standard.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional


# =========================================================================
# §3.4 · Bilingual copy helper
# =========================================================================
def _biling(it: str, en: str) -> Dict[str, str]:
    return {"it": it, "en": en}


# =========================================================================
# §3.4.1 · Vowel geometry tables
# =========================================================================

# Height bucket helper — accepts every historical spelling.
_HEIGHT_BUCKET = {
    "close":       "close",
    "near-close":  "near-close",
    "close-mid":   "close-mid",
    "mid":         "mid",
    "open-mid":    "open-mid",
    "near-open":   "near-open",
    "open":        "open",
}

_BACKNESS_BUCKET = {
    "front":         "front",
    "near-front":    "front",
    "central":       "central",
    "near-back":     "back",
    "back":          "back",
}


def _bucket_height(h: Optional[str]) -> str:
    if not h:
        return "mid"
    return _HEIGHT_BUCKET.get(h.strip().lower(), "mid")


def _bucket_backness(b: Optional[str]) -> str:
    if not b:
        return "central"
    return _BACKNESS_BUCKET.get(b.strip().lower(), "central")


# apex (tongue tip) coordinates × backness — passive on vowels.
_VOWEL_APEX_BY_BACKNESS = {
    "front":   (40.6, 51.2, "raised toward alveolar ridge",
                "sollevato verso la cresta alveolare",
                "Tongue tip: raised, front",
                "Apice: sollevato, in avanti"),
    "central": (40.6, 53.8, "neutral",
                "posizione neutra",
                "Tongue tip: neutral",
                "Apice: neutro"),
    "back":    (40.6, 54.4, "passive, behind lower front teeth",
                "passivo, dietro gli incisivi inferiori",
                "Tongue tip: low, free, not touching",
                "Apice: basso, libero, non tocca"),
}

# blade coordinates × (height_bucket, backness_bucket)
_VOWEL_BLADE = {
    ("close",      "front"):   (41,   52,   "front, high",   "avanti, alto"),
    ("close",      "back"):    (43,   56.8, "back, high",    "indietro, alto"),
    ("close",      "central"): (42,   55,   "central, high", "centrale, alto"),
    ("near-close", "front"):   (41,   52.5, "front, high",   "avanti, alto"),
    ("near-close", "back"):    (43,   56.8, "back, high",    "indietro, alto"),
    ("near-close", "central"): (42,   55,   "central, high", "centrale, alto"),
    ("close-mid",  "front"):   (41.5, 55,   "front, mid",    "avanti, medio"),
    ("close-mid",  "back"):    (43,   60,   "back, mid",     "indietro, medio"),
    ("close-mid",  "central"): (42,   57.5, "central, mid",  "centrale, medio"),
    ("mid",        "front"):   (41.5, 57,   "front, mid",    "avanti, medio"),
    ("mid",        "back"):    (43,   60,   "back, mid",     "indietro, medio"),
    ("mid",        "central"): (42,   58,   "central, mid",  "centrale, medio"),
    ("open-mid",   "front"):   (41.5, 60,   "front, low-mid",   "avanti, medio-basso"),
    ("open-mid",   "back"):    (43.5, 63,   "back, low-mid",    "indietro, medio-basso"),
    ("open-mid",   "central"): (42.5, 61.5, "central, low-mid", "centrale, medio-basso"),
    ("near-open",  "front"):   (42,   62,   "front, low-mid",   "avanti, medio-basso"),
    ("near-open",  "back"):    (43.5, 63,   "back, low-mid",    "indietro, medio-basso"),
    ("near-open",  "central"): (42.5, 62,   "central, low-mid", "centrale, medio-basso"),
    ("open",       "front"):   (42,   64,   "front, low",       "avanti, basso"),
    ("open",       "back"):    (44,   65,   "back, low",        "indietro, basso"),
    ("open",       "central"): (43,   64,   "central, low",     "centrale, basso"),
}


# dorsum (main vowel articulator) × (height_bucket, backness_bucket)
_VOWEL_DORSUM = {
    ("close",      "front"):   (46,   59,   "close, raised toward palate",
                                             "alto, sollevato verso il palato"),
    ("close",      "back"):    (47.3, 60,   "close, raised toward velum",
                                             "alto, sollevato verso il velo"),
    ("close",      "central"): (46.5, 60,   "close, raised centrally",
                                             "alto, sollevato al centro"),
    ("near-close", "front"):   (46.5, 61,   "near-close, high front",
                                             "quasi alto, avanti"),
    ("near-close", "back"):    (47.3, 64.1, "near-close, raised toward velum",
                                             "quasi alto, sollevato verso il velo"),
    ("near-close", "central"): (47,   62.5, "near-close, central",
                                             "quasi alto, centrale"),
    ("close-mid",  "front"):   (47,   63,   "close-mid, mid-high front",
                                             "medio-alto, avanti"),
    ("close-mid",  "back"):    (48,   66,   "close-mid, mid-high back",
                                             "medio-alto, indietro"),
    ("close-mid",  "central"): (47.5, 64.5, "close-mid, central",
                                             "medio-alto, centrale"),
    ("mid",        "front"):   (47.5, 64,   "mid front",       "medio, avanti"),
    ("mid",        "back"):    (48.5, 66,   "mid back",        "medio, indietro"),
    ("mid",        "central"): (48,   65,   "mid central",     "medio, centrale"),
    ("open-mid",   "front"):   (48,   67,   "open-mid, mid-low front",
                                             "medio-basso, avanti"),
    ("open-mid",   "back"):    (49,   69,   "open-mid, mid-low back",
                                             "medio-basso, indietro"),
    ("open-mid",   "central"): (48.5, 68,   "open-mid, mid-low central",
                                             "medio-basso, centrale"),
    ("near-open",  "front"):   (48.5, 69,   "near-open, low-mid front",
                                             "quasi basso, medio-basso avanti"),
    ("near-open",  "back"):    (49.5, 70,   "near-open, low-mid back",
                                             "quasi basso, medio-basso indietro"),
    ("near-open",  "central"): (49,   69.5, "near-open, low-mid central",
                                             "quasi basso, centrale"),
    ("open",       "front"):   (49,   71,   "open, low front",     "aperto, basso avanti"),
    ("open",       "back"):    (50,   71,   "open, low back",      "aperto, basso indietro"),
    ("open",       "central"): (49.5, 71,   "open, low central",   "aperto, basso centrale"),
}


# Rounding × enum (case-insensitive).
_ROUNDING_BUCKET = {
    "unrounded":            "unrounded",
    "unrounded (spread)":   "unrounded",
    "spread":               "unrounded",
    "slight":               "slight",
    "moderate":             "moderate",
    "strong":               "strong",
    "rounded":              "moderate",   # canonical default when not further specified
    "rounded (protruded)":  "strong",
}

_LIP_ROUNDING_SPEC = {
    "unrounded": {
        "titleEn":  "Lip rounding — NONE / spread",
        "titleIt":  "Arrotondamento labiale — assente / stirato",
        "roleEn":   "Orbicularis oris: relaxed; corners spread",
        "roleIt":   "Orbicolare della bocca: rilassato; commessure stirate",
        "detailEn": ("The lips are UNROUNDED — either neutral or actively spread as in a slight smile. "
                     "The orbicularis oris is relaxed; when the vowel is close-front (e.g. /iː/) the "
                     "zygomaticus contributes to a mild spreading."),
        "detailIt": ("Le labbra NON sono arrotondate — restano neutre o leggermente stirate come in un "
                     "sorriso appena accennato. L'orbicolare della bocca è rilassato; nelle vocali alte "
                     "anteriori come /iː/ lo zigomatico contribuisce a un leggero stiramento."),
    },
    "slight": {
        "titleEn":  "Lip rounding — SLIGHT",
        "titleIt":  "Arrotondamento labiale — LIEVE",
        "roleEn":   "Orbicularis oris: light activation",
        "roleIt":   "Orbicolare della bocca: attivazione leggera",
        "detailEn": ("The lips are only lightly rounded — a soft, natural shape without protrusion. "
                     "Typical of RP /ɔː/ and unstressed /ə/."),
        "detailIt": ("Le labbra sono solo leggermente arrotondate — forma naturale, senza protrusione. "
                     "Tipico di /ɔː/ RP e della schwa /ə/ non accentata."),
    },
    "moderate": {
        "titleEn":  "Lip rounding — MODERATE",
        "titleIt":  "Arrotondamento labiale — MODERATO",
        "roleEn":   "Orbicularis oris: moderate activation",
        "roleIt":   "Orbicolare della bocca: attivazione moderata",
        "detailEn": ("The lips are MODERATELY rounded — not tightly pursed, not spread. The "
                     "orbicularis oris is engaged but relaxed. Slight protrusion contributes to the "
                     "vowel's dark, hollow timbre."),
        "detailIt": ("Le labbra sono MODERATAMENTE arrotondate — non compresse, non stirate. "
                     "L'orbicolare della bocca è attivo ma rilassato. Una lieve protrusione dà al "
                     "suono il suo timbro scuro e cavernoso."),
    },
    "strong": {
        "titleEn":  "Lip rounding — STRONG (protruded)",
        "titleIt":  "Arrotondamento labiale — FORTE (protruso)",
        "roleEn":   "Orbicularis oris: strong activation, protrusion",
        "roleIt":   "Orbicolare della bocca: attivazione forte, protrusione",
        "detailEn": ("The lips are STRONGLY rounded and PROTRUDED — a compact opening pushed "
                     "forward. Typical of /uː/ and /w/. The orbicularis oris is highly active; "
                     "the mentalis assists the protrusion."),
        "detailIt": ("Le labbra sono FORTEMENTE arrotondate e PROTRUSE — apertura compatta spinta in "
                     "avanti. Tipico di /uː/ e /w/. L'orbicolare della bocca lavora molto; il "
                     "muscolo mentoniero aiuta nella protrusione."),
    },
}


# Passive landmarks — always visible on vowels for spatial orientation.
_PASSIVE_ALVEOLAR = {
    "id":      "alveolar-ridge",
    "x":       39.2,
    "y":       41.6,
    "label":   "Alveolar ridge",
    "labelLocalized":   _biling("Cresta alveolare", "Alveolar ridge"),
    "title":   "Alveolar ridge",
    "titleLocalized":   _biling("Cresta alveolare", "Alveolar ridge"),
    "role":    "Passive — not engaged",
    "roleLocalized":    _biling("Passiva — non coinvolta", "Passive — not engaged"),
    "detail":  ("The bony bump just behind the upper teeth. Passive for vowels — becomes the "
                "active site for /t/, /d/, /n/, /l/, /s/, /z/."),
    "detailLocalized":  _biling(
        ("La cresta ossea appena dietro gli incisivi superiori. Passiva per le vocali — è il "
         "punto attivo per /t/, /d/, /n/, /l/, /s/, /z/."),
        ("The bony bump just behind the upper teeth. Passive for vowels — becomes the active "
         "site for /t/, /d/, /n/, /l/, /s/, /z/."),
    ),
    "anatomy": "Bony protrusion of the maxilla, posterior to the upper incisors.",
    "anatomyLocalized": _biling(
        "Protrusione ossea della mascella, posteriore agli incisivi superiori.",
        "Bony protrusion of the maxilla, posterior to the upper incisors.",
    ),
}

_PASSIVE_HARD_PALATE = {
    "id":      "hard-palate",
    "x":       43.7,
    "y":       46.1,
    "label":   "Hard palate",
    "labelLocalized":   _biling("Palato duro", "Hard palate"),
    "title":   "Hard palate",
    "titleLocalized":   _biling("Palato duro", "Hard palate"),
    "role":    "Passive — overhead vault",
    "roleLocalized":    _biling("Passivo — volta superiore", "Passive — overhead vault"),
    "detail":  ("The dome of bone forming the roof of the mouth. Acts as a resonance chamber that "
                "shapes vowel timbre."),
    "detailLocalized":  _biling(
        "La cupola ossea che forma il palato duro. Funge da camera di risonanza che modella il timbro vocalico.",
        "The dome of bone forming the roof of the mouth. Acts as a resonance chamber that shapes vowel timbre.",
    ),
    "anatomy": "Anterior portion of the palate, bony substrate.",
    "anatomyLocalized": _biling(
        "Porzione anteriore del palato, base ossea.",
        "Anterior portion of the palate, bony substrate.",
    ),
}


# =========================================================================
# §3.4.2 · Consonant place tables
# =========================================================================

_PLACE_BUCKET = {
    "bilabial":      "bilabial",
    "labiodental":   "labiodental",
    "dental":        "dental",
    "alveolar":      "alveolar",
    "post-alveolar": "postalveolar",
    "postalveolar":  "postalveolar",
    "palato-alveolar": "postalveolar",
    "palatal":       "palatal",
    "velar":         "velar",
    "labial-velar":  "labialvelar",
    "glottal":       "glottal",
}


_PLACE_SPEC = {
    "bilabial": {
        "x": 32, "y": 57,
        "labelEn": "Both lips",   "labelIt": "Entrambe le labbra",
        "titleEn": "Bilabial constriction",
        "titleIt": "Costrizione bilabiale",
        "roleEn":  "Active articulators: upper lip + lower lip",
        "roleIt":  "Articolatori attivi: labbro superiore + inferiore",
    },
    "labiodental": {
        "x": 33, "y": 60,
        "labelEn": "Lower lip + upper teeth",
        "labelIt": "Labbro inferiore + incisivi superiori",
        "titleEn": "Labiodental constriction",
        "titleIt": "Costrizione labiodentale",
        "roleEn":  "Active articulator: lower lip against upper incisors",
        "roleIt":  "Articolatore attivo: labbro inferiore contro gli incisivi superiori",
    },
    "dental": {
        "x": 38, "y": 55,
        "labelEn": "Tongue tip + upper teeth",
        "labelIt": "Apice della lingua + denti superiori",
        "titleEn": "Dental constriction",
        "titleIt": "Costrizione dentale",
        "roleEn":  "Active articulator: apex/blade against upper incisors",
        "roleIt":  "Articolatore attivo: apice/lamina contro gli incisivi superiori",
    },
    "alveolar": {
        "x": 39, "y": 52,
        "labelEn": "Tongue tip/blade + alveolar ridge",
        "labelIt": "Apice/lamina + cresta alveolare",
        "titleEn": "Alveolar constriction",
        "titleIt": "Costrizione alveolare",
        "roleEn":  "Active articulator: apex or lamina against the alveolar ridge",
        "roleIt":  "Articolatore attivo: apice o lamina contro la cresta alveolare",
    },
    "postalveolar": {
        "x": 43, "y": 50,
        "labelEn": "Tongue blade + post-alveolar area",
        "labelIt": "Lamina + area post-alveolare",
        "titleEn": "Post-alveolar constriction",
        "titleIt": "Costrizione post-alveolare",
        "roleEn":  "Active articulator: lamina against the region behind the alveolar ridge",
        "roleIt":  "Articolatore attivo: lamina contro la zona dietro la cresta alveolare",
    },
    "palatal": {
        "x": 47, "y": 54,
        "labelEn": "Tongue body + hard palate",
        "labelIt": "Corpo della lingua + palato duro",
        "titleEn": "Palatal constriction",
        "titleIt": "Costrizione palatale",
        "roleEn":  "Active articulator: dorsum against the hard palate",
        "roleIt":  "Articolatore attivo: dorso contro il palato duro",
    },
    "velar": {
        "x": 51, "y": 58,
        "labelEn": "Tongue back + velum",
        "labelIt": "Dorso posteriore + velo",
        "titleEn": "Velar constriction",
        "titleIt": "Costrizione velare",
        "roleEn":  "Active articulator: back of the dorsum against the velum",
        "roleIt":  "Articolatore attivo: parte posteriore del dorso contro il velo palatino",
    },
    "labialvelar": {
        "x": 32, "y": 59,
        "labelEn": "Rounded lips + tongue back near velum",
        "labelIt": "Labbra arrotondate + dorso posteriore vicino al velo",
        "titleEn": "Labial-velar constriction",
        "titleIt": "Costrizione labio-velare",
        "roleEn":  "Two simultaneous constrictions: strong lip rounding + tongue back approximation to the velum",
        "roleIt":  "Due costrizioni simultanee: forte arrotondamento delle labbra + avvicinamento del dorso posteriore al velo",
    },
    "glottal": {
        "x": 52, "y": 74,
        "labelEn": "Glottis (vocal folds)",
        "labelIt": "Glottide (corde vocali)",
        "titleEn": "Glottal constriction",
        "titleIt": "Costrizione glottidale",
        "roleEn":  "Active articulator: the vocal folds themselves",
        "roleIt":  "Articolatore attivo: le corde vocali stesse",
    },
}


_MANNER_BUCKET = {
    "plosive":               "plosive",
    "stop":                  "plosive",
    "affricate":             "affricate",
    "fricative":             "fricative",
    "nasal":                 "nasal",
    "approximant":           "approximant",
    "lateral approximant":   "lateral",
    "lateral":               "lateral",
    "tap":                   "tap",
    "flap":                  "tap",
    "trill":                 "trill",
}


_MANNER_SPEC = {
    "plosive": {
        "titleEn": "Complete closure → sudden release",
        "titleIt": "Chiusura completa → rilascio improvviso",
        "detailEn": ("A total oral closure builds air pressure, then a sudden release produces a "
                     "brief burst. Voiceless plosives at the start of a stressed syllable are "
                     "typically aspirated in English."),
        "detailIt": ("Una chiusura orale totale accumula pressione; il rilascio improvviso produce un "
                     "breve scoppio. In inglese le occlusive sorde all'inizio di sillaba accentata "
                     "sono di solito aspirate."),
    },
    "affricate": {
        "titleEn": "Closure → controlled fricative release",
        "titleIt": "Chiusura → rilascio fricativo controllato",
        "detailEn": ("A stop closure is released as a homorganic fricative, producing a single sound "
                     "with two phases (stop + friction)."),
        "detailIt": ("Una chiusura occlusiva si rilascia come fricativa omorganica, producendo un "
                     "unico suono in due fasi (occlusione + frizione)."),
    },
    "fricative": {
        "titleEn": "Narrow gap → turbulent airflow",
        "titleIt": "Fessura stretta → flusso d'aria turbolento",
        "detailEn": ("A narrow constriction forces air through a small gap, generating audible "
                     "turbulence. Sustained and continuous."),
        "detailIt": ("Una costrizione stretta forza l'aria attraverso una fessura, generando "
                     "turbolenza udibile. Suono sostenuto e continuo."),
    },
    "nasal": {
        "titleEn": "Oral closure + lowered velum → airflow through nose",
        "titleIt": "Chiusura orale + velo abbassato → aria dal naso",
        "detailEn": ("The oral cavity is completely closed while the velum is LOWERED, opening the "
                     "nasal port. Air resonates in the nasal cavity."),
        "detailIt": ("La cavità orale è completamente chiusa mentre il velo palatino è ABBASSATO, "
                     "aprendo il canale nasale. L'aria risuona nella cavità nasale."),
    },
    "approximant": {
        "titleEn": "Close approximation, no turbulence",
        "titleIt": "Avvicinamento stretto, senza turbolenza",
        "detailEn": ("Two articulators approach each other closely but not enough to create "
                     "turbulence. Vowel-like flow."),
        "detailIt": ("Due articolatori si avvicinano molto ma non abbastanza da generare turbolenza. "
                     "Flusso d'aria di tipo vocalico."),
    },
    "lateral": {
        "titleEn": "Central closure + lateral airflow",
        "titleIt": "Chiusura centrale + flusso laterale",
        "detailEn": ("The tongue tip contacts the alveolar ridge along the central axis while the "
                     "sides lower to let air escape laterally over the tongue."),
        "detailIt": ("L'apice tocca la cresta alveolare al centro mentre i lati si abbassano per "
                     "lasciar passare l'aria lungo i bordi della lingua."),
    },
    "tap": {
        "titleEn": "Brief single contact",
        "titleIt": "Contatto singolo e brevissimo",
        "detailEn": ("A very short single touch of the tongue against the alveolar ridge — no "
                     "pressure build-up. In American English, /t/ is realised this way between "
                     "vowels (city, water)."),
        "detailIt": ("Un tocco singolo brevissimo della lingua sulla cresta alveolare — nessun "
                     "accumulo di pressione. In inglese americano /t/ si realizza così tra vocali "
                     "(city, water)."),
    },
    "trill": {
        "titleEn": "Rapid multiple contacts",
        "titleIt": "Contatti multipli e rapidi",
        "detailEn": "Multiple rapid taps against the articulator. Not present in standard English inventory.",
        "detailIt": "Contatti multipli rapidi contro l'articolatore. Non presente nell'inventario inglese standard.",
    },
}


# =========================================================================
# §3.4 · Composition
# =========================================================================

def _make_hotspot(hid: str, x: float, y: float,
                   label_en: str, label_it: str,
                   title_en: str, title_it: str,
                   role_en: str, role_it: str,
                   detail_en: str, detail_it: str,
                   anatomy_en: Optional[str] = None,
                   anatomy_it: Optional[str] = None,
                   kinetic_en: Optional[str] = None,
                   kinetic_it: Optional[str] = None) -> Dict[str, Any]:
    hs = {
        "id":    hid,
        "x":     round(float(x), 1),
        "y":     round(float(y), 1),
        "label": label_en,
        "labelLocalized":  _biling(label_it, label_en),
        "title": title_en,
        "titleLocalized":  _biling(title_it, title_en),
        "role":  role_en,
        "roleLocalized":   _biling(role_it, role_en),
        "detail":          detail_en,
        "detailLocalized": _biling(detail_it, detail_en),
    }
    if anatomy_en:
        hs["anatomy"] = anatomy_en
        hs["anatomyLocalized"] = _biling(anatomy_it or anatomy_en, anatomy_en)
    if kinetic_en:
        hs["kineticCue"] = kinetic_en
        hs["kineticCueLocalized"] = _biling(kinetic_it or kinetic_en, kinetic_en)
    return hs


def _vowel_hotspots(ipa: str, canon: Dict[str, Any]) -> List[Dict[str, Any]]:
    height = _bucket_height(canon.get("height"))
    backness = _bucket_backness(canon.get("backness"))
    rounding_raw = (canon.get("rounding") or "").strip().lower()
    rounding = _ROUNDING_BUCKET.get(rounding_raw, "unrounded")
    tenseness = (canon.get("tenseness") or "").strip().lower()

    out: List[Dict[str, Any]] = []

    # 1-2 · passive landmarks
    out.append({**_PASSIVE_ALVEOLAR})
    out.append({**_PASSIVE_HARD_PALATE})

    # 3 · apex — vowel-specific by backness
    ax, ay, apex_en, apex_it, apex_role_en, apex_role_it = _VOWEL_APEX_BY_BACKNESS[backness]
    out.append(_make_hotspot(
        "apex",
        ax, ay,
        "Apex (tongue tip)", "Apice (punta della lingua)",
        f"Apex — {apex_en}", f"Apice — {apex_it}",
        apex_role_en, apex_role_it,
        (f"For /{ipa}/ the tongue tip is {apex_en}. It is not the active articulator — the "
         f"main work is done by the tongue body (dorsum)."),
        (f"Per /{ipa}/ l'apice della lingua è {apex_it}. Non è l'articolatore principale — il "
         f"lavoro è svolto dal corpo della lingua (dorso)."),
        anatomy_en="Tongue apex — anterior-most portion.",
        anatomy_it="Apice della lingua — porzione più anteriore.",
    ))

    # 4 · blade
    b_key = (height, backness)
    if b_key in _VOWEL_BLADE:
        bx, by_, blade_en, blade_it = _VOWEL_BLADE[b_key]
        out.append(_make_hotspot(
            "blade",
            bx, by_,
            "Blade (lamina)", "Lamina",
            f"Blade — {blade_en}", f"Lamina — {blade_it}",
            "Lamina: positioned relative to height and backness of the vowel",
            "Lamina: posizionata in base ad altezza e arretramento della vocale",
            (f"The blade sits {blade_en} — this position is a direct consequence of the vowel's "
             f"{height} height and {backness} backness."),
            (f"La lamina è {blade_it} — questa posizione dipende direttamente dall'altezza "
             f"({height}) e dall'arretramento ({backness}) della vocale."),
            anatomy_en="Lamina linguae — flat portion of the tongue behind the apex.",
            anatomy_it="Lamina linguae — porzione piatta della lingua dietro l'apice.",
        ))

    # 5 · dorsum — the primary articulator
    d_key = (height, backness)
    if d_key in _VOWEL_DORSUM:
        dx, dy, dor_en, dor_it = _VOWEL_DORSUM[d_key]
        tense_en = " · tense body" if "tense" in tenseness else (" · lax, retracted" if "lax" in tenseness else "")
        tense_it = " · corpo teso" if "tense" in tenseness else (" · rilassato, retratto" if "lax" in tenseness else "")
        out.append(_make_hotspot(
            "dorsum",
            dx, dy,
            "Dorsum", "Dorso della lingua",
            f"Dorsum — {dor_en}{tense_en}",
            f"Dorso — {dor_it}{tense_it}",
            f"Tongue body: primary articulator for /{ipa}/",
            f"Corpo della lingua: articolatore principale per /{ipa}/",
            (f"The MAIN articulator for /{ipa}/. The dorsum takes the {height}/{backness} position "
             f"that defines this vowel."
             + (" The body is TENSE — this is a long/tense vowel." if "tense" in tenseness else "")
             + (" The body is LAX — this is a short/lax vowel." if "lax" in tenseness else "")),
            (f"L'articolatore PRINCIPALE per /{ipa}/. Il dorso assume la posizione {height}/{backness} "
             f"che definisce questa vocale."
             + (" Il corpo è TESO — vocale lunga/tesa." if "tense" in tenseness else "")
             + (" Il corpo è RILASSATO — vocale breve/rilassata." if "lax" in tenseness else "")),
            anatomy_en="Dorsum linguae — main body/crest of the tongue.",
            anatomy_it="Dorso linguae — corpo principale della lingua.",
            kinetic_en=(f"Feel the tongue body settle into the {height}/{backness} position — "
                        f"it should be the muscle you're most aware of."),
            kinetic_it=(f"Senti il corpo della lingua sistemarsi in posizione {height}/{backness} — "
                        f"deve essere il muscolo che percepisci di più."),
        ))

    # 6 · lips (rounding)
    r_spec = _LIP_ROUNDING_SPEC[rounding]
    out.append(_make_hotspot(
        "lip-rounding",
        36.8, 67.2,
        "Lip rounding", "Arrotondamento labiale",
        r_spec["titleEn"], r_spec["titleIt"],
        r_spec["roleEn"],  r_spec["roleIt"],
        r_spec["detailEn"], r_spec["detailIt"],
        anatomy_en="Orbicularis oris muscle.",
        anatomy_it="Muscolo orbicolare della bocca.",
    ))

    # 7 · velum — always raised for oral vowels
    out.append(_make_hotspot(
        "velum-raised",
        52, 52.5,
        "Velum", "Velo palatino",
        "Velum (soft palate) — RAISED",
        "Velo palatino — SOLLEVATO",
        "Nasal port closed",
        "Canale nasale chiuso",
        ("The velum is RAISED, closing the nasal port. Airflow exits ENTIRELY through the mouth — "
         "this is an ORAL vowel. Compare to /m/, /n/, /ŋ/ where the velum is lowered."),
        ("Il velo è SOLLEVATO, chiudendo il canale nasale. L'aria esce COMPLETAMENTE dalla bocca — "
         "vocale ORALE. Confronta con /m/, /n/, /ŋ/ dove il velo è abbassato."),
        anatomy_en="Velum palatinum — muscular flap at the back of the palate.",
        anatomy_it="Velo palatino — lembo muscolare in fondo al palato.",
    ))

    # 8 · pharynx — width depends on height/backness
    if height in ("open", "near-open") and backness == "back":
        px, py, phar_en_t, phar_it_t = 55, 66, "Pharynx — wide", "Faringe — larga"
        phar_detail_en = ("The pharynx is WIDE and open — a hallmark of low-back vowels like /ɑː/. "
                          "This wide throat gives the vowel a full, resonant body.")
        phar_detail_it = ("La faringe è LARGA e aperta — caratteristica delle vocali basse posteriori "
                          "come /ɑː/. Questa apertura conferisce alla vocale un corpo pieno e risonante.")
    else:
        px, py, phar_en_t, phar_it_t = 54.2, 64.1, "Pharynx — neutral / moderately wide", "Faringe — neutra / moderatamente aperta"
        phar_detail_en = ("The pharynx is in a NEUTRAL position — moderately wide, neither constricted "
                          "nor expanded. Contributes to the relaxed quality of the vowel.")
        phar_detail_it = ("La faringe è in posizione NEUTRA — moderatamente aperta, né costretta né "
                          "dilatata. Contribuisce alla qualità rilassata della vocale.")
    out.append(_make_hotspot(
        "pharynx",
        px, py,
        "Pharynx", "Faringe",
        phar_en_t, phar_it_t,
        "Throat cavity", "Cavità faringea",
        phar_detail_en, phar_detail_it,
        anatomy_en="Pharyngeal cavity — region from the velum down to the larynx.",
        anatomy_it="Cavità faringea — regione dal velo fino alla laringe.",
    ))

    # 9 · larynx — always VOICED
    out.append(_make_hotspot(
        "larynx-voiced",
        51.5, 76.7,
        "Larynx / Glottis", "Laringe / Glottide",
        "Larynx / Glottis — VOICED",
        "Laringe / Glottide — SONORA",
        "Vocal folds vibrating",
        "Corde vocali che vibrano",
        ("The vocal folds are vibrating, producing voicing. All vowels are voiced by default. "
         "Place your fingers on your throat to feel the vibration."),
        ("Le corde vocali vibrano, producendo la voce. Tutte le vocali sono per default sonore. "
         "Metti le dita sulla gola per sentire la vibrazione."),
        anatomy_en="Larynx — vocal folds within.",
        anatomy_it="Laringe — al suo interno le corde vocali.",
        kinetic_en="Place your hand on your throat — feel the vibration.",
        kinetic_it="Metti la mano sulla gola — senti la vibrazione.",
    ))

    return out


def _consonant_hotspots(ipa: str, canon: Dict[str, Any]) -> List[Dict[str, Any]]:
    place_raw = (canon.get("place") or "").strip().lower()
    manner_raw = (canon.get("manner") or "").strip().lower()
    voicing_raw = (canon.get("voicing") or "").strip().lower()

    place = _PLACE_BUCKET.get(place_raw, "alveolar")
    manner = _MANNER_BUCKET.get(manner_raw, "plosive")
    is_voiced = "voiced" in voicing_raw

    out: List[Dict[str, Any]] = []
    p_spec = _PLACE_SPEC[place]
    m_spec = _MANNER_SPEC[manner]

    # 1 · primary constriction (place-specific)
    out.append(_make_hotspot(
        "primary-constriction",
        p_spec["x"], p_spec["y"],
        p_spec["labelEn"], p_spec["labelIt"],
        p_spec["titleEn"], p_spec["titleIt"],
        p_spec["roleEn"],  p_spec["roleIt"],
        (f"For /{ipa}/ the constriction is {place} — {p_spec['roleEn'].lower()}."),
        (f"Per /{ipa}/ la costrizione è {place} — {p_spec['roleIt'].lower()}."),
    ))

    # 2 · manner marker
    manner_x, manner_y = 45, 51
    out.append(_make_hotspot(
        "manner",
        manner_x, manner_y,
        "Manner of articulation", "Modo di articolazione",
        m_spec["titleEn"], m_spec["titleIt"],
        f"Manner: {manner}", f"Modo: {manner}",
        m_spec["detailEn"], m_spec["detailIt"],
    ))

    # 3 · velum — nasal or oral
    is_nasal = manner == "nasal"
    if is_nasal:
        out.append(_make_hotspot(
            "velum-lowered",
            52, 56,
            "Velum", "Velo palatino",
            "Velum — LOWERED (nasal port OPEN)",
            "Velo — ABBASSATO (canale nasale APERTO)",
            "Nasal resonance active", "Risonanza nasale attiva",
            ("The velum is LOWERED, opening the nasal port. This is the ONLY manner in which air "
             "resonates in the nasal cavity."),
            ("Il velo palatino è ABBASSATO, aprendo il canale nasale. È l'UNICO modo articolatorio "
             "in cui l'aria risuona nella cavità nasale."),
            anatomy_en="Velum palatinum — muscular flap at the back of the palate.",
            anatomy_it="Velo palatino — lembo muscolare in fondo al palato.",
        ))
    else:
        out.append(_make_hotspot(
            "velum-raised",
            52, 52.5,
            "Velum", "Velo palatino",
            "Velum — RAISED (nasal port CLOSED)",
            "Velo — SOLLEVATO (canale nasale CHIUSO)",
            "Oral airflow only", "Solo flusso orale",
            ("The velum is RAISED, closing the nasal port. Airflow exits through the mouth only."),
            ("Il velo palatino è SOLLEVATO, chiudendo il canale nasale. L'aria esce solo dalla bocca."),
            anatomy_en="Velum palatinum — muscular flap at the back of the palate.",
            anatomy_it="Velo palatino — lembo muscolare in fondo al palato.",
        ))

    # 4 · larynx — voicing
    if is_voiced:
        out.append(_make_hotspot(
            "larynx-voiced",
            51.5, 76.7,
            "Larynx / Glottis", "Laringe / Glottide",
            "Larynx — VOICED",
            "Laringe — SONORA",
            "Vocal folds vibrating", "Corde vocali che vibrano",
            (f"The vocal folds vibrate throughout the production of /{ipa}/. Place your fingers "
             f"on your throat to feel the vibration."),
            (f"Le corde vocali vibrano per tutta la durata di /{ipa}/. Metti le dita sulla gola "
             f"per sentire la vibrazione."),
            anatomy_en="Larynx — vocal folds within.",
            anatomy_it="Laringe — al suo interno le corde vocali.",
            kinetic_en="Place your hand on your throat — feel the vibration.",
            kinetic_it="Metti la mano sulla gola — senti la vibrazione.",
        ))
    else:
        # Voiceless — mention aspiration for /p/, /t/, /k/ (canonical property)
        aspirated = ipa in {"p", "t", "k"} and manner == "plosive"
        out.append(_make_hotspot(
            "larynx-voiceless",
            51.5, 76.7,
            "Larynx / Glottis", "Laringe / Glottide",
            ("Larynx — VOICELESS (aspirated at syllable onset)" if aspirated
             else "Larynx — VOICELESS"),
            ("Laringe — SORDA (aspirata a inizio sillaba)" if aspirated
             else "Laringe — SORDA"),
            "Vocal folds apart, no vibration", "Corde vocali separate, nessuna vibrazione",
            ("The vocal folds are apart — no vibration. "
             + ("At the start of a stressed syllable /p/, /t/, /k/ are ASPIRATED — you hear a puff "
                "of breath after the release (like 'pʰit', 'tʰop', 'kʰey')." if aspirated
                else "")),
            ("Le corde vocali sono separate — nessuna vibrazione. "
             + ("A inizio di sillaba accentata /p/, /t/, /k/ sono ASPIRATE — si sente un piccolo "
                "soffio dopo il rilascio (come in 'pʰit', 'tʰop', 'kʰey')." if aspirated
                else "")),
            anatomy_en="Larynx — vocal folds within.",
            anatomy_it="Laringe — al suo interno le corde vocali.",
        ))

    # 5 · lips — bilabials/labiodentals already covered by primary; add for /w/, /r/ (rounding)
    if place == "labialvelar":
        out.append(_make_hotspot(
            "lips-rounded",
            32, 59,
            "Lips", "Labbra",
            "Lips — STRONGLY rounded and protruded",
            "Labbra — FORTEMENTE arrotondate e protruse",
            "Orbicularis oris: strong activation",
            "Orbicolare della bocca: attivazione forte",
            "Compact, forward-pushed lip opening — the labial component of /w/ or /ɹ/.",
            "Apertura labiale compatta e protrusa — la componente labiale di /w/ o /ɹ/.",
            anatomy_en="Orbicularis oris muscle.",
            anatomy_it="Muscolo orbicolare della bocca.",
        ))

    # 6 · tongue-body-shape — laterals, retroflex /r/
    if manner == "lateral":
        out.append(_make_hotspot(
            "tongue-shape-lateral",
            42, 54,
            "Tongue shape", "Forma della lingua",
            "Central closure + sides lowered",
            "Chiusura centrale + lati abbassati",
            "Lateral airflow over tongue sides",
            "Flusso laterale sui lati della lingua",
            ("The tongue tip contacts the alveolar ridge along the midline while the sides drop, "
             "letting air escape laterally. In American English syllable-final /l/ is DARK — the "
             "tongue back also retracts toward the velum."),
            ("L'apice tocca la cresta alveolare al centro mentre i lati si abbassano, lasciando "
             "uscire l'aria di lato. In inglese americano la /l/ finale è SCURA — anche il dorso "
             "retrocede verso il velo."),
            anatomy_en="Tongue apex + lateral edges.",
            anatomy_it="Apice della lingua + bordi laterali.",
        ))

    # 7 · airflow-note — fricatives, affricates, plosives (burst), nasals (nasal resonance)
    if manner in ("fricative", "affricate"):
        out.append(_make_hotspot(
            "airflow",
            45, 51,
            "Airflow", "Flusso d'aria",
            ("Turbulent airflow" if manner == "fricative" else "Stop → controlled release"),
            ("Flusso d'aria turbolento" if manner == "fricative" else "Occlusione → rilascio controllato"),
            ("Sustained turbulence" if manner == "fricative" else "Two-phase release"),
            ("Turbolenza sostenuta" if manner == "fricative" else "Rilascio in due fasi"),
            ("Air is forced through a narrow gap, producing audible hiss or buzz for the full "
             "duration of the sound." if manner == "fricative" else
             "The closure releases into a homorganic fricative — you hear a stop then friction."),
            ("L'aria viene forzata in una fessura stretta, producendo un sibilo o ronzio udibile "
             "per tutta la durata del suono." if manner == "fricative" else
             "La chiusura si rilascia in una fricativa omorganica — si sente prima l'occlusione, poi la frizione."),
        ))
    elif manner == "plosive":
        out.append(_make_hotspot(
            "airflow",
            45, 51,
            "Airflow", "Flusso d'aria",
            "Pressure build-up → burst release",
            "Accumulo di pressione → rilascio esplosivo",
            "Silent hold, then sudden release", "Tenuta silenziosa, poi rilascio improvviso",
            ("During the closure air pressure builds behind the constriction. The sudden release "
             "produces a brief burst of noise. In stressed onset position, voiceless plosives add "
             "an aspiration puff (audible /h/-like breath)."),
            ("Durante la chiusura la pressione dell'aria si accumula dietro la costrizione. Il "
             "rilascio improvviso produce un breve rumore di scoppio. In posizione iniziale "
             "accentata, le occlusive sorde aggiungono un soffio di aspirazione (una specie di /h/)."),
        ))
    elif manner == "nasal":
        out.append(_make_hotspot(
            "airflow",
            50, 40,
            "Nasal airflow", "Flusso nasale",
            "Continuous airflow through the nose",
            "Flusso continuo attraverso il naso",
            "Voiced nasal resonance", "Risonanza nasale sonora",
            ("With the oral cavity fully closed at the constriction, air resonates continuously "
             "through the nasal cavity, producing the characteristic humming quality of nasals."),
            ("Con la cavità orale completamente chiusa alla costrizione, l'aria risuona di continuo "
             "attraverso la cavità nasale, producendo il tipico effetto 'ronzante' delle nasali."),
        ))

    return out


# =========================================================================
# Public API
# =========================================================================

def generate_hotspots_for_canonical(ipa: str, canon: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate anatomical hotspots for the given phoneme from its canonical row.

    Args:
        ipa: The IPA symbol (e.g. "ʊ", "p", "θ").
        canon: The canonical row dict (from canonical_phonemes collection).
               Expected keys: kind, height, backness, rounding, tenseness,
               voicing, manner, place.

    Returns:
        A list of hotspot dicts ready to store in phoneme_cards.hotspots.
        Each hotspot contains bilingual localised fields (labelLocalized,
        titleLocalized, etc.) as {it, en} dicts.
    """
    kind = (canon.get("kind") or "").strip().lower()
    if kind in ("vowel", "diphthong"):
        # Diphthongs use the starting vowel's parameters; fallback to vowel table.
        return _vowel_hotspots(ipa, canon)
    return _consonant_hotspots(ipa, canon)
