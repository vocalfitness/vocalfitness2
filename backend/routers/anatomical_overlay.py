"""Canonical anatomical labels + phoneme-card overlay derivation.

Adds a shared ``canonical_anatomical_labels`` collection (12 anatomical
points on the sagittal cross-section, position-fixed) and computes per
card the DERIVED overlay fields:

* ``anatomicalLabels``  — list of label IDs to highlight for this phoneme,
                          filtered from the canonical set based on
                          ``canonical_phonemes.place`` (consonants) or
                          ``height`` + ``backness`` (vowels).
* ``airflowArrows``     — list of arrow path templates keyed off
                          ``canonical_phonemes.manner`` (or "vowel").
* ``voicing``           — copied verbatim from ``canonical_phonemes.voicing``
                          for consonants; always ``"Voiced"`` for vowels.

Convention: all coordinates are ``0..100`` percentages so overlays scale
cleanly across image sizes. Origin (0,0) = top-left of the sagittal
image; +x is right, +y is down.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional


# --------------------------------------------------------------------------- #
# 12 anatomical points on the sagittal illustration.
# Positions are calibrated against Steve Dapper's side-view template
# (portrait, mouth roughly at 30–48% x, throat at 45–55% x).
# --------------------------------------------------------------------------- #
CANONICAL_ANATOMICAL_LABELS: List[Dict[str, Any]] = [
    # id                        it                         en                       anchor       leader
    {"id": "upper-lip",         "labelIt": "Labbro superiore",       "labelEn": "Upper lip",       "anchor": {"x": 30, "y": 44}, "leader": {"x": 22, "y": 30}},
    {"id": "lower-lip",         "labelIt": "Labbro inferiore",       "labelEn": "Lower lip",       "anchor": {"x": 30, "y": 50}, "leader": {"x": 22, "y": 62}},
    {"id": "teeth",             "labelIt": "Denti",                  "labelEn": "Teeth",           "anchor": {"x": 35, "y": 48}, "leader": {"x": 22, "y": 48}},
    {"id": "alveolar-ridge",    "labelIt": "Cresta alveolare",       "labelEn": "Alveolar ridge",  "anchor": {"x": 40, "y": 44}, "leader": {"x": 26, "y": 26}},
    {"id": "hard-palate",       "labelIt": "Palato duro",            "labelEn": "Hard palate",     "anchor": {"x": 44, "y": 41}, "leader": {"x": 34, "y": 18}},
    {"id": "soft-palate",       "labelIt": "Palato molle (velo)",    "labelEn": "Soft palate",     "anchor": {"x": 51, "y": 42}, "leader": {"x": 65, "y": 22}},
    {"id": "uvula",             "labelIt": "Ugola",                  "labelEn": "Uvula",           "anchor": {"x": 53, "y": 47}, "leader": {"x": 74, "y": 34}},
    {"id": "tongue-tip",        "labelIt": "Apice della lingua",     "labelEn": "Tongue tip",      "anchor": {"x": 42, "y": 53}, "leader": {"x": 24, "y": 72}},
    {"id": "tongue-body",       "labelIt": "Corpo della lingua",     "labelEn": "Tongue body",     "anchor": {"x": 47, "y": 55}, "leader": {"x": 78, "y": 78}},
    {"id": "tongue-root",       "labelIt": "Radice della lingua",    "labelEn": "Tongue root",     "anchor": {"x": 52, "y": 60}, "leader": {"x": 70, "y": 70}},
    {"id": "epiglottis",        "labelIt": "Epiglottide",            "labelEn": "Epiglottis",      "anchor": {"x": 51, "y": 66}, "leader": {"x": 72, "y": 62}},
    # Vocal-folds leader is placed on the LEFT side to avoid colliding
    # with the bottom-right Airflow/Voicing HUD badge on the card.
    {"id": "vocal-folds",       "labelIt": "Corde vocali",           "labelEn": "Vocal folds",     "anchor": {"x": 47, "y": 76}, "leader": {"x": 20, "y": 88}},
]


# --------------------------------------------------------------------------- #
# Anatomical labels shown per canonical PLACE / VOWEL region.
# The end user sees a curated subset — showing all 12 at once would clutter
# the composition. Each phoneme highlights only the ~4 landmarks that
# directly define its articulation.
# --------------------------------------------------------------------------- #
_LABELS_BY_PLACE = {
    "Bilabial":         ["upper-lip", "lower-lip", "vocal-folds"],
    "Labiodental":      ["upper-lip", "lower-lip", "teeth", "vocal-folds"],
    "Dental":           ["teeth", "tongue-tip", "vocal-folds"],
    "Alveolar":         ["alveolar-ridge", "tongue-tip", "vocal-folds"],
    "Post-alveolar":    ["alveolar-ridge", "hard-palate", "tongue-body", "vocal-folds"],
    "Palatal":          ["hard-palate", "tongue-body", "vocal-folds"],
    "Velar":            ["soft-palate", "tongue-body", "vocal-folds"],
    "Uvular":           ["uvula", "tongue-root", "vocal-folds"],
    "Glottal":          ["vocal-folds", "epiglottis"],
}
# Vowels — pick landmarks based on tongue posture (backness+height)
_VOWEL_LABELS_ALWAYS = ["upper-lip", "lower-lip", "tongue-body", "vocal-folds"]


def _airflow_for_manner(manner: str, place: str) -> List[Dict[str, Any]]:
    """Return one or more airflow-arrow descriptors for the given manner.

    Arrow path is a list of 3 points (start, control, end) in 0..100
    coordinates that the frontend renders as a smooth quadratic Bézier.
    ``type`` drives the visual style (dashed = obstructed, wavy =
    turbulent, straight = smooth, dotted = nasal branch).
    """
    m = (manner or "").lower()
    if m == "plosive":
        # Airflow blocked at the closure point + burst outward
        return [{"type": "blocked", "path": [
            {"x": 60, "y": 55}, {"x": 50, "y": 50}, {"x": 42, "y": 48},
        ]}]
    if m == "fricative":
        return [{"type": "oral-turbulent", "path": [
            {"x": 60, "y": 55}, {"x": 45, "y": 50}, {"x": 28, "y": 48},
        ]}]
    if m == "nasal":
        # Velum lowers → airflow diverted through the nasal cavity
        return [{"type": "nasal", "path": [
            {"x": 60, "y": 60}, {"x": 50, "y": 40}, {"x": 30, "y": 26},
        ]}]
    if m in ("lateral", "lateral approximant"):
        return [{"type": "lateral", "path": [
            {"x": 60, "y": 55}, {"x": 45, "y": 52}, {"x": 30, "y": 48},
        ]}]
    # Approximants + vowels: smooth oral airflow (endpoint stops just
    # before the lips at x≈33 so it doesn't collide with the upper/lower
    # lip anchor labels)
    return [{"type": "oral-smooth", "path": [
        {"x": 58, "y": 56}, {"x": 45, "y": 50}, {"x": 33, "y": 48},
    ]}]


def compute_overlay(canonical: Dict[str, Any]) -> Dict[str, Any]:
    """Compute the DERIVED overlay bundle from the card's canonical row.

    Returns a dict with keys ``anatomicalLabels``, ``airflowArrows`` and
    ``voicing`` — ready to be ``$set`` on the phoneme_cards document.
    """
    kind = (canonical.get("kind") or "").lower()
    manner = canonical.get("manner", "")
    place = canonical.get("place", "")

    if kind == "vowel" or kind == "diphthong":
        labels = list(_VOWEL_LABELS_ALWAYS)
        # Rounded vowels highlight the lips more prominently — no change
        # in the list but downstream renderer can bold them.
        voicing = "Voiced"
        arrows = _airflow_for_manner("approximant", "")
    else:
        labels = list(_LABELS_BY_PLACE.get(place, ["vocal-folds"]))
        voicing = canonical.get("voicing", "Voiceless")
        arrows = _airflow_for_manner(manner, place)

    return {
        "anatomicalLabels": labels,
        "airflowArrows":    arrows,
        "voicing":          voicing,
    }
