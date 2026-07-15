"""
Regression tests for iter 41 — 4 fixes reported by Prof (screenshot bundle):

  1. /ɜː/ NURSE AI drafting for GenAm dialect no longer aborts with
     "non presente nell'inventario canonical" (LOT-PALM-NURSE merger
     fallback via _IPA_EQUIVALENTS).
  4. Diphthongs (eɪ, aɪ, ɔɪ, oʊ, əʊ, aʊ, ɪə, eə, ʊə) now carry the
     nucleus height + backness in the canonical inventory, so
     `_compose_autofill_for_vowel` derives a valid vowelChartPosition
     instead of {} — the trapezoid dot no longer glues itself to the
     top-left corner (0,0).

Fix 2 (dialect tabs on admin list) and fix 3 (deterministic highlights)
are covered by frontend/manual verification since they don't have a
pure-Python unit boundary.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def test_ipa_equivalents_nurse_falls_back_to_r_colored():
    """/ɜː/ (RP NURSE) must resolve to /ɚ/ or /ɝ/ in the equivalents map."""
    from routers.phoneme_cards import _IPA_EQUIVALENTS
    assert "ɜː" in _IPA_EQUIVALENTS
    fallbacks = _IPA_EQUIVALENTS["ɜː"]
    assert "ɚ" in fallbacks or "ɝ" in fallbacks, (
        f"/ɜː/ must map to r-colored equivalents, got {fallbacks}"
    )


def test_ipa_equivalents_r_colored_falls_back_to_nurse():
    """/ɚ/ and /ɝ/ must resolve to /ɜː/ so the reverse lookup also works."""
    from routers.phoneme_cards import _IPA_EQUIVALENTS
    assert "ɝ" in _IPA_EQUIVALENTS["ɚ"] and "ɜː" in _IPA_EQUIVALENTS["ɚ"]
    assert "ɜː" in _IPA_EQUIVALENTS["ɝ"]


def test_ipa_equivalents_lot_palm_merger_still_present():
    """/ɒ/ (RP LOT) must still fall back to /ɑ/ / /ɑː/ — iter 37 fix."""
    from routers.phoneme_cards import _IPA_EQUIVALENTS
    fallbacks = _IPA_EQUIVALENTS["ɒ"]
    assert "ɑ" in fallbacks and "ɑː" in fallbacks


def test_ipa_equivalents_goat_diphthong_rp_ame_bridged():
    """/əʊ/ (RP GOAT) ↔ /oʊ/ (GenAm GOAT) must be bridged."""
    from routers.phoneme_cards import _IPA_EQUIVALENTS
    assert "oʊ" in _IPA_EQUIVALENTS.get("əʊ", [])
    assert "əʊ" in _IPA_EQUIVALENTS.get("oʊ", [])


def test_canonical_diphthongs_have_nucleus_height_backness():
    """Iter 41 fix: every diphthong seed row now carries height + backness
    (nucleus position per Wells 1982) so the autofill produces a valid
    vowelChartPosition instead of {}."""
    from routers.canonical_phonemes import _VOWEL_ROWS, _VOWEL_ROWS_RP
    all_rows = _VOWEL_ROWS + _VOWEL_ROWS_RP
    diphthongs = [r for r in all_rows if r.get("kind_hint") == "diphthong"]
    assert len(diphthongs) >= 5, "Expected at least 5 diphthong rows"
    for r in diphthongs:
        assert r.get("height"), (
            f"Diphthong /{r['ipa']}/ missing 'height' — will produce empty vowelChartPosition"
        )
        assert r.get("backness"), (
            f"Diphthong /{r['ipa']}/ missing 'backness'"
        )


def test_canonical_face_nucleus_position_is_close_mid_front():
    """FACE /eɪ/ starts at close-mid front per Wells 1982 §2.2.1."""
    from routers.canonical_phonemes import _VOWEL_ROWS
    face = next(r for r in _VOWEL_ROWS if r["ipa"] == "eɪ")
    assert face["height"] == "Close-mid"
    assert face["backness"] == "Front"


def test_compose_autofill_produces_vowel_chart_position_for_diphthong():
    """End-to-end: `_compose_autofill_for_vowel` with a diphthong canonical
    row now returns a populated vowelChartPosition dict."""
    from routers.phoneme_cards import _compose_autofill_for_vowel
    canonical = {
        "ipa": "eɪ", "kind": "diphthong", "lexical_set": "FACE",
        "height": "Close-mid", "backness": "Front",
        "rounding": "Unrounded", "tenseness": "Tense", "duration": "Long",
    }
    out = _compose_autofill_for_vowel(canonical)
    vcp = out.get("vowelChartPosition") or {}
    assert vcp.get("x") is not None, f"Expected numeric x, got {vcp}"
    assert vcp.get("y") is not None, f"Expected numeric y, got {vcp}"
    # Front = x≈5, Close-mid = y≈35 (per _BACKNESS_TO_X / _HEIGHT_TO_Y)
    assert vcp["x"] < 30, f"FACE should be front (x<30), got {vcp['x']}"
    assert 20 <= vcp["y"] <= 50, f"FACE nucleus should be upper-mid, got {vcp['y']}"
