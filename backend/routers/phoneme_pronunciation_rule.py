"""
Phoneme Pronunciation Protocol Rule §3.5 — DERIVED, rule-based, never LLM-authored.

Given the canonical entry for a phoneme, generate the 6-step "Vocal Fitness
articulatory protocol" (Jaw / Lips / Tongue / Apex / Voicing / Velum).

Scientific basis: IPA descriptor system, Ladefoged & Johnson (2015), Chomsky
& Halle (1968) SPE features, Roach (RP), Ladefoged (GenAm). Pedagogical
framing (6-step ordered sequence) is the Vocal Fitness method by S. Dapper.

Reference impl parity: /ʊ/ (u-foot) authored steps → the engine reproduces
the SAME pedagogical shape for every phoneme.

Reference spec: /app/backend/canonical_data/PronunciationProtocol_v1.md
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional


HEADLINE_EN = "Vocal Fitness articulatory protocol"
HEADLINE_IT = "Protocollo articolatorio Vocal Fitness"


def _biling(it: str, en: str) -> Dict[str, str]:
    return {"it": it, "en": en}


# =========================================================================
# §3.5.1 · Jaw aperture
# =========================================================================

_JAW_VOWEL = {
    "close":       ("Open the mouth slightly — about one finger of vertical space between the molars.",
                    "Apri la bocca appena — circa un dito di spazio verticale tra i molari."),
    "near-close":  ("Open the mouth slightly — about one finger of vertical space between the molars.",
                    "Apri la bocca appena — circa un dito di spazio verticale tra i molari."),
    "close-mid":   ("Open the mouth moderately — about one and a half fingers between the molars.",
                    "Apri la bocca moderatamente — circa un dito e mezzo tra i molari."),
    "mid":         ("Open the mouth moderately — about one and a half fingers between the molars.",
                    "Apri la bocca moderatamente — circa un dito e mezzo tra i molari."),
    "open-mid":    ("Open the mouth wide — about two fingers between the molars.",
                    "Apri la bocca ampiamente — circa due dita tra i molari."),
    "near-open":   ("Open the mouth wide — about two fingers between the molars.",
                    "Apri la bocca ampiamente — circa due dita tra i molari."),
    "open":        ("Open the mouth fully — about two and a half fingers, jaw dropped and relaxed.",
                    "Apri la bocca al massimo — circa due dita e mezza, mandibola abbassata e rilassata."),
}

_JAW_CONSONANT_BY_PLACE = {
    "bilabial":     ("Bring the jaw to a near-neutral, closed position — the lips do the work.",
                     "Porta la mandibola in posizione quasi chiusa e neutra — sono le labbra a lavorare."),
    "labiodental":  ("Keep the jaw slightly open so the upper teeth can rest lightly on the lower lip.",
                     "Tieni la mandibola leggermente aperta perché gli incisivi superiori tocchino appena il labbro inferiore."),
    "dental":       ("Keep the jaw at neutral, about one finger of space. The tongue reaches upward — the jaw doesn't.",
                     "Tieni la mandibola in posizione neutra, circa un dito di spazio. È la lingua che si alza — non la mandibola."),
    "alveolar":     ("Keep the jaw at neutral, about one finger of space. The tongue reaches upward — the jaw doesn't.",
                     "Tieni la mandibola in posizione neutra, circa un dito di spazio. È la lingua che si alza — non la mandibola."),
    "postalveolar": ("Keep the jaw relaxed at neutral, about one finger of space.",
                     "Tieni la mandibola rilassata in posizione neutra, circa un dito di spazio."),
    "palatal":      ("Keep the jaw relaxed at neutral, about one finger of space.",
                     "Tieni la mandibola rilassata in posizione neutra, circa un dito di spazio."),
    "velar":        ("Keep the jaw close to neutral. The tongue back does the work — the jaw stays out of the way.",
                     "Tieni la mandibola vicino al neutro. È il dorso posteriore a lavorare — la mandibola resta fuori dai giochi."),
    "labialvelar":  ("Keep the jaw close to neutral. Lips and tongue back work together — the jaw is passive.",
                     "Tieni la mandibola vicino al neutro. Labbra e dorso posteriore lavorano insieme — la mandibola resta passiva."),
    "glottal":      ("Jaw is passive and free — the sound is produced at the vocal folds, well below the tongue.",
                     "La mandibola è passiva e libera — il suono nasce dalle corde vocali, ben sotto la lingua."),
}


# =========================================================================
# §3.5.2 · Lips
# =========================================================================

_LIPS_BY_ROUNDING = {
    "unrounded":  ("Lips relaxed and neutral — neither rounded nor spread.",
                   "Labbra rilassate e neutre — né arrotondate né stirate."),
    "slight":     ("Lips lightly rounded — a soft, natural shape, no protrusion.",
                   "Labbra leggermente arrotondate — forma naturale, senza protrusione."),
    "moderate":   ('Round the lips moderately. No tension. Imagine a soft, relaxed "oo" shape — not pursed, not spread.',
                   'Arrotonda moderatamente le labbra. Nessuna tensione. Immagina una "u" morbida e rilassata — né compressa né stirata.'),
    "strong":     ("Round and protrude the lips strongly. Compact opening pushed forward.",
                   "Arrotonda e protrudi fortemente le labbra. Apertura compatta spinta in avanti."),
}
_LIPS_CONS_BILABIAL     = ("Bring the lips together for a full closure — evenly, without tension.",
                            "Porta le labbra insieme per una chiusura completa — uniforme, senza tensione.")
_LIPS_CONS_LABIODENTAL  = ("Rest the upper front teeth lightly against the lower lip — no biting, gentle contact.",
                            "Appoggia leggermente gli incisivi superiori contro il labbro inferiore — nessun morso, contatto delicato.")
_LIPS_CONS_LABIALVELAR  = ("Round and protrude the lips strongly. Very compact opening, pushed forward.",
                            "Arrotonda e protrudi fortemente le labbra. Apertura molto compatta, spinta in avanti.")
_LIPS_CONS_APPROX_R     = ("Lips lightly rounded (especially in American English).",
                            "Labbra leggermente arrotondate (in particolare in inglese americano).")
_LIPS_CONS_NEUTRAL      = ("Lips in a neutral position — neither rounded nor spread.",
                            "Labbra in posizione neutra — né arrotondate né stirate.")


# =========================================================================
# §3.5.3 · Tongue body / dorsum
# =========================================================================

def _tongue_vowel(height: str, backness: str) -> tuple[str, str]:
    key = (height, backness)
    # Explicit high-signal buckets
    table = {
        ("close", "back"):     ("Pull the body of the tongue back toward the throat. Raise the dorsum high but do NOT touch the velum.",
                                "Ritira il corpo della lingua verso la gola. Solleva il dorso in alto SENZA toccare il velo."),
        ("near-close", "back"):("Pull the body of the tongue back and raise it high — but keep it slightly lower and more relaxed than for /uː/.",
                                "Ritira il corpo della lingua e sollevalo in alto — ma leggermente più basso e rilassato che per /uː/."),
        ("close", "front"):    ("Raise the tongue body high and forward, close to the hard palate — but leave a small gap.",
                                "Solleva il corpo della lingua in alto e in avanti, vicino al palato duro — ma lascia un piccolo spazio."),
        ("near-close", "front"):("Raise the tongue body forward and moderately high — slightly lower and more relaxed than for /iː/.",
                                "Solleva il corpo della lingua in avanti, moderatamente in alto — leggermente più basso e rilassato che per /iː/."),
        ("close-mid", "front"):("Raise the tongue body forward and to mid-high position.",
                                "Solleva il corpo della lingua in avanti, in posizione medio-alta."),
        ("close-mid", "back"): ("Raise the tongue body back and to mid-high, with the dorsum approaching the velum.",
                                "Solleva il corpo della lingua indietro e in posizione medio-alta, con il dorso che si avvicina al velo."),
        ("close-mid", "central"):("Keep the tongue body in a central, mid-high position — the resting shape lifted slightly.",
                                "Tieni il corpo della lingua in posizione centrale, medio-alta — la posizione di riposo appena sollevata."),
        ("mid", "central"):    ("Keep the tongue body in a neutral central position — the resting shape.",
                                "Tieni il corpo della lingua in posizione neutra e centrale — la forma di riposo."),
        ("open-mid", "front"): ("Position the tongue body forward and mid-low — lower than /ɛ/, higher than /æ/.",
                                "Posiziona il corpo della lingua in avanti, medio-basso — più basso di /ɛ/, più alto di /æ/."),
        ("open-mid", "back"):  ("Lower the tongue body back and slightly retracted — a wide-throat feeling.",
                                "Abbassa il corpo della lingua indietro, leggermente retratto — sensazione di gola aperta."),
        ("open-mid", "central"):("Lower the tongue body to a central, mid-low position.",
                                "Abbassa il corpo della lingua in posizione centrale, medio-bassa."),
        ("near-open", "front"):("Lower the tongue body forward and low — flat but pushed forward.",
                                "Abbassa il corpo della lingua in avanti e in basso — piatta ma spinta in avanti."),
        ("open", "back"):      ("Lower the tongue body and pull it slightly back. Wide throat, low tongue.",
                                "Abbassa il corpo della lingua e ritiralo un poco. Gola larga, lingua bassa."),
        ("open", "front"):     ("Lower the tongue body and push it forward. Feel space between the tongue back and the pharynx wall.",
                                "Abbassa il corpo della lingua e spingilo avanti. Percepisci lo spazio tra il dorso posteriore e la faringe."),
        ("open", "central"):   ("Lower the tongue body flat to a fully open central position.",
                                "Abbassa il corpo della lingua fino a una posizione centrale completamente aperta."),
    }
    if key in table:
        return table[key]
    # Fallback: describe by (height, backness) in generic terms
    h_desc  = {"close":"high","near-close":"high","close-mid":"mid-high","mid":"neutral","open-mid":"mid-low","near-open":"low","open":"low"}.get(height,"neutral")
    h_desc_it={"close":"alto","near-close":"alto","close-mid":"medio-alto","mid":"neutro","open-mid":"medio-basso","near-open":"basso","open":"basso"}.get(height,"neutro")
    b_desc  = {"front":"forward","central":"central","back":"back"}.get(backness,"central")
    b_desc_it={"front":"in avanti","central":"centrale","back":"indietro"}.get(backness,"centrale")
    return (
        f"Position the tongue body {h_desc} and {b_desc}.",
        f"Posiziona il corpo della lingua {h_desc_it} e {b_desc_it}.",
    )


_TONGUE_CONS_BY_PLACE = {
    "bilabial":     ("Tongue is passive and relaxed. The action is at the lips.",
                     "La lingua è passiva e rilassata. L'azione è sulle labbra."),
    "labiodental":  ("Tongue is passive. The lower lip and upper teeth form the constriction.",
                     "La lingua è passiva. Labbro inferiore e incisivi superiori formano la costrizione."),
    "dental":       ("Bring the tongue tip forward, touching the back of the upper teeth or peeking through them slightly.",
                     "Porta l'apice della lingua in avanti, a toccare la parte posteriore degli incisivi superiori o a spuntare appena tra di essi."),
    "alveolar":     ("Place the tongue tip or blade on the alveolar ridge — the bony bump just behind the upper teeth.",
                     "Appoggia l'apice o la lamina sulla cresta alveolare — la protuberanza ossea dietro gli incisivi superiori."),
    "postalveolar": ("Raise the tongue blade toward the area just behind the alveolar ridge. Sides braced against the upper molars.",
                     "Solleva la lamina verso l'area appena dietro la cresta alveolare. I lati appoggiati contro i molari superiori."),
    "palatal":      ("Raise the tongue body high toward the hard palate, similar to /i/ but with more approach.",
                     "Solleva il corpo della lingua verso il palato duro, come per /i/ ma con maggiore avvicinamento."),
    "velar":        ("Raise the back of the tongue to make contact (or close approach) with the soft palate.",
                     "Solleva il dorso posteriore fino a toccare (o quasi) il velo palatino."),
    "labialvelar":  ("Round the lips strongly AND raise the tongue back toward the velum — two constrictions at once.",
                     "Arrotonda fortemente le labbra E solleva il dorso posteriore verso il velo — due costrizioni simultanee."),
    "glottal":      ("Tongue stays in the position of the following vowel — the sound is produced by the vocal folds.",
                     "La lingua resta nella posizione della vocale seguente — il suono è prodotto dalle corde vocali."),
}


# =========================================================================
# §3.5.4 · Apex (tongue tip)
# =========================================================================

_APEX_VOWEL_BY_BACKNESS = {
    "front":   ("Let the tongue tip rest lightly near the lower front teeth — passive.",
                "Lascia l'apice appoggiato leggermente vicino agli incisivi inferiori — passivo."),
    "central": ("Tongue tip is passive, in a neutral low position.",
                "L'apice è passivo, in posizione bassa neutra."),
    "back":    ("Leave the tongue tip low, behind the lower front teeth. Passive, never pressed against anything.",
                "Lascia l'apice basso, dietro gli incisivi inferiori. Passivo, mai premuto contro nulla."),
}

_APEX_CONS_ACTIVE_PLACES = {"dental", "alveolar", "postalveolar"}
_APEX_CONS_PASSIVE_STR  = ("Apex is passive and low, behind the lower front teeth.",
                            "L'apice è passivo e basso, dietro gli incisivi inferiori.")
_APEX_CONS_ACTIVE_STR   = ("The apex is ACTIVE — it makes the constriction.",
                            "L'apice è ATTIVO — forma la costrizione.")
_APEX_CONS_LATERAL_STR  = ("Apex ACTIVE on the alveolar ridge. In American syllable-final /l/ the tongue back also retracts (dark L).",
                            "Apice ATTIVO sulla cresta alveolare. In inglese americano nella /l/ finale di sillaba anche il dorso posteriore si ritrae (dark L).")


# =========================================================================
# §3.5.5 · Voicing
# =========================================================================

_VOICING_VOWEL = ("Engage the vocal folds. Place your fingers on your larynx — you should feel a steady, low-frequency vibration.",
                   "Attiva le corde vocali. Metti le dita sulla laringe — devi sentire una vibrazione costante a bassa frequenza.")
_VOICING_CONS_VOICED = ("Vocal folds vibrate for the full duration of the sound. Test with fingers on the throat.",
                         "Le corde vocali vibrano per tutta la durata del suono. Verifica con le dita sulla gola.")
_VOICING_CONS_VLESS  = ("Vocal folds do NOT vibrate — silent airflow only. No throat buzz.",
                         "Le corde vocali NON vibrano — solo flusso d'aria silenzioso. Nessun ronzio in gola.")
_VOICING_CONS_ASPIRATED = ("Vocal folds do not vibrate, and there is an audible /h/-like puff of breath after the release.",
                            "Le corde vocali non vibrano, e dopo il rilascio c'è un soffio udibile simile a /h/.")


# =========================================================================
# §3.5.6 · Velum
# =========================================================================

_VELUM_RAISED  = ("Keep the soft palate raised. All airflow exits through the mouth. This is an oral sound.",
                   "Tieni il velo palatino sollevato. Tutta l'aria esce dalla bocca. Suono orale.")
_VELUM_LOWERED = ("Lower the soft palate to open the nasal port. Airflow resonates through the nose.",
                   "Abbassa il velo palatino per aprire il canale nasale. L'aria risuona attraverso il naso.")


# =========================================================================
# Feature bucket helpers (shared with hotspot rule; kept local for isolation)
# =========================================================================

_HEIGHT_BUCKET = {"close":"close","near-close":"near-close","close-mid":"close-mid",
                  "mid":"mid","open-mid":"open-mid","near-open":"near-open","open":"open"}
_BACKNESS_BUCKET = {"front":"front","near-front":"front","central":"central",
                    "near-back":"back","back":"back"}
_PLACE_BUCKET = {
    "bilabial":"bilabial","labiodental":"labiodental","dental":"dental",
    "alveolar":"alveolar","post-alveolar":"postalveolar","postalveolar":"postalveolar",
    "palato-alveolar":"postalveolar","palatal":"palatal","velar":"velar",
    "labial-velar":"labialvelar","glottal":"glottal",
}
_ROUNDING_BUCKET = {"unrounded":"unrounded","unrounded (spread)":"unrounded","spread":"unrounded",
                    "slight":"slight","moderate":"moderate","strong":"strong",
                    "rounded":"moderate","rounded (protruded)":"strong"}


def _step(label_en: str, label_it: str, body_en: str, body_it: str) -> Dict[str, Any]:
    return {
        "label":          label_en,
        "labelLocalized": _biling(label_it, label_en),
        "body":           body_en,
        "bodyLocalized":  _biling(body_it, body_en),
    }


# =========================================================================
# Public API
# =========================================================================

def generate_pronunciation_protocol(ipa: str, canon: Dict[str, Any]) -> Dict[str, Any]:
    """Compose the 6-step Vocal Fitness articulatory protocol for a phoneme.

    Args:
        ipa: IPA symbol (e.g. "ʊ", "p", "θ", "eɪ").
        canon: canonical row dict.

    Returns:
        ``{headline, steps: [Jaw, Lips, Tongue, Apex, Voicing, Velum],
           body: "", grounded_on: [...], confidence: 1.0}``
        (``body`` is left empty here — callers may keep any pre-existing
        AI-drafted paragraph, or the frontend renders a placeholder.)
    """
    kind = (canon.get("kind") or "").strip().lower()
    is_vowel = kind in ("vowel", "diphthong")

    height   = _HEIGHT_BUCKET.get((canon.get("height") or "").strip().lower(), "mid")
    backness = _BACKNESS_BUCKET.get((canon.get("backness") or "").strip().lower(), "central")
    rounding = _ROUNDING_BUCKET.get((canon.get("rounding") or "").strip().lower(), "unrounded")
    place    = _PLACE_BUCKET.get((canon.get("place") or "").strip().lower(), "alveolar") if not is_vowel else None
    manner   = (canon.get("manner") or "").strip().lower()
    voicing  = (canon.get("voicing") or "").strip().lower()
    is_voiced = "voiced" in voicing
    is_nasal  = manner == "nasal"
    is_lateral = "lateral" in manner
    is_aspirated_plosive = (ipa in {"p", "t", "k"}) and (manner == "plosive")

    grounded: List[str] = []

    # 1 · Jaw
    if is_vowel:
        j_en, j_it = _JAW_VOWEL.get(height, _JAW_VOWEL["mid"])
        grounded.append("height")
    else:
        j_en, j_it = _JAW_CONSONANT_BY_PLACE.get(place, _JAW_CONSONANT_BY_PLACE["alveolar"])
        grounded.append("place")
    jaw = _step("Jaw", "Mandibola", j_en, j_it)

    # 2 · Lips
    if is_vowel:
        l_en, l_it = _LIPS_BY_ROUNDING.get(rounding, _LIPS_BY_ROUNDING["unrounded"])
        grounded.append("rounding")
    else:
        if place == "bilabial":
            l_en, l_it = _LIPS_CONS_BILABIAL
        elif place == "labiodental":
            l_en, l_it = _LIPS_CONS_LABIODENTAL
        elif place == "labialvelar":
            l_en, l_it = _LIPS_CONS_LABIALVELAR
        elif ipa in {"ɹ", "r"}:
            l_en, l_it = _LIPS_CONS_APPROX_R
        else:
            l_en, l_it = _LIPS_CONS_NEUTRAL
    lips = _step("Lips", "Labbra", l_en, l_it)

    # 3 · Tongue (body/dorsum)
    if is_vowel:
        t_en, t_it = _tongue_vowel(height, backness)
        grounded.extend(["height", "backness"])
    else:
        t_en, t_it = _TONGUE_CONS_BY_PLACE.get(place, _TONGUE_CONS_BY_PLACE["alveolar"])
        grounded.append("place")
    tongue = _step("Tongue", "Lingua (corpo)", t_en, t_it)

    # 4 · Apex
    if is_vowel:
        a_en, a_it = _APEX_VOWEL_BY_BACKNESS.get(backness, _APEX_VOWEL_BY_BACKNESS["central"])
        grounded.append("backness")
    elif is_lateral:
        a_en, a_it = _APEX_CONS_LATERAL_STR
    elif place in _APEX_CONS_ACTIVE_PLACES:
        a_en, a_it = _APEX_CONS_ACTIVE_STR
    else:
        a_en, a_it = _APEX_CONS_PASSIVE_STR
    apex = _step("Apex", "Apice", a_en, a_it)

    # 5 · Voicing
    if is_vowel or is_voiced:
        v_en, v_it = _VOICING_VOWEL if is_vowel else _VOICING_CONS_VOICED
        grounded.append("voicing")
    elif is_aspirated_plosive:
        v_en, v_it = _VOICING_CONS_ASPIRATED
        grounded.extend(["voicing", "aspiration"])
    else:
        v_en, v_it = _VOICING_CONS_VLESS
        grounded.append("voicing")
    voi = _step("Voicing", "Sonorità", v_en, v_it)

    # 6 · Velum
    if is_nasal:
        vel_en, vel_it = _VELUM_LOWERED
        grounded.append("nasality")
    else:
        vel_en, vel_it = _VELUM_RAISED
    velum = _step("Velum", "Velo palatino", vel_en, vel_it)

    return {
        "headline":         HEADLINE_EN,
        "headlineLocalized": _biling(HEADLINE_IT, HEADLINE_EN),
        "steps":            [jaw, lips, tongue, apex, voi, velum],
        "grounded_on":      sorted(set(grounded)),
        "confidence":       1.0,
    }
