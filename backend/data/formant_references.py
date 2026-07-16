"""
Canonical formant reference tables for L2 pronunciation scoring.

Two public academic datasets are encoded verbatim (published mean values):

* GenAm — Hillenbrand, Getty, Clark & Wheeler (1995), "Acoustic
  characteristics of American English vowels", JASA 97(5): 3099-3111.
  12 monophthongal/steady-state vowels, mean F1/F2/F3 for men / women /
  children (equivalent of the R package ``phonTools::h95``).

* RP / SSBE — Deterding (1997), "The formants of monophthong vowels in
  Standard Southern British English pronunciation", JIPA 27: 47-55.
  11 monophthong vowels, mean F1/F2 for male / female speakers (F3 not
  reported by Deterding → left null; RP scoring uses F1+F2).

Standard deviations: Hillenbrand/Deterding tabulate per-vowel SDs in the
original papers; where a numeric SD is not reproduced here it is derived as
a pooled estimate (F1≈12%, F2≈10%, F3≈8% of the mean, consistent with the
dispersion reported across both corpora). This is recorded in
``source_citation`` for full transparency.
"""
from __future__ import annotations

# GenAm — Hillenbrand et al. (1995) mean F1/F2/F3 (Hz).
# (vowel_ipa, F1, F2, F3) per speaker group.
_H95 = {
    "men": [
        ("i", 342, 2322, 3000), ("ɪ", 427, 2034, 2684), ("eɪ", 476, 2089, 2691),
        ("ɛ", 580, 1799, 2605), ("æ", 588, 1952, 2601), ("ɑ", 768, 1333, 2522),
        ("ɔ", 652, 997, 2538), ("oʊ", 497, 910, 2459), ("ʊ", 469, 1122, 2434),
        ("u", 378, 997, 2343), ("ʌ", 623, 1200, 2550), ("ɝ", 474, 1379, 1710),
    ],
    "women": [
        ("i", 437, 2761, 3372), ("ɪ", 483, 2365, 3053), ("eɪ", 536, 2530, 3047),
        ("ɛ", 731, 2058, 2979), ("æ", 669, 2349, 2972), ("ɑ", 936, 1551, 2815),
        ("ɔ", 781, 1136, 2824), ("oʊ", 555, 1035, 2828), ("ʊ", 519, 1225, 2827),
        ("u", 459, 1105, 2735), ("ʌ", 753, 1426, 2933), ("ɝ", 523, 1588, 1929),
    ],
    "children": [
        ("i", 452, 3081, 3702), ("ɪ", 511, 2552, 3403), ("eɪ", 564, 2812, 3339),
        ("ɛ", 749, 2267, 3310), ("æ", 717, 2501, 3289), ("ɑ", 1002, 1688, 2950),
        ("ɔ", 803, 1210, 2982), ("oʊ", 597, 1137, 3088), ("ʊ", 568, 1490, 3072),
        ("u", 494, 1345, 2988), ("ʌ", 749, 1546, 3145), ("ɝ", 586, 1719, 2143),
    ],
}

# RP / SSBE — Deterding (1997) mean F1/F2 (Hz). F3 not reported (None).
_DET = {
    "male": [
        ("iː", 280, 2249), ("ɪ", 367, 1757), ("e", 494, 1650), ("æ", 690, 1550),
        ("ʌ", 644, 1259), ("ɑː", 646, 1155), ("ɒ", 558, 1047), ("ɔː", 415, 828),
        ("ʊ", 379, 1173), ("uː", 316, 1191), ("ɜː", 478, 1436),
    ],
    "female": [
        ("iː", 303, 2654), ("ɪ", 384, 2174), ("e", 719, 2063), ("æ", 1018, 1799),
        ("ʌ", 914, 1459), ("ɑː", 910, 1316), ("ɒ", 751, 1215), ("ɔː", 389, 888),
        ("ʊ", 410, 1340), ("uː", 328, 1437), ("ɜː", 606, 1695),
    ],
}

_H95_CITE = ("Hillenbrand et al. (1995), JASA 97(5):3099-3111 "
             "(phonTools::h95). SD = stima pooled (F1~12%, F2~10%, F3~8%).")
_DET_CITE = ("Deterding (1997), JIPA 27:47-55. F3 non riportato. "
             "SD = stima pooled (F1~12%, F2~10%).")


def _row(ipa, dialect, group, f1, f2, f3, cite):
    def sd(v, frac):
        return round(v * frac) if v else None
    return {
        "phoneme_ipa": ipa,
        "dialect": dialect,
        "speaker_group": group,
        "F1_mean": f1, "F1_sd": sd(f1, 0.12),
        "F2_mean": f2, "F2_sd": sd(f2, 0.10),
        "F3_mean": f3, "F3_sd": sd(f3, 0.08),
        "source_citation": cite,
    }


def build_reference_rows() -> list[dict]:
    rows: list[dict] = []
    for group, items in _H95.items():
        for ipa, f1, f2, f3 in items:
            rows.append(_row(ipa, "AmE", group, f1, f2, f3, _H95_CITE))
    for group, items in _DET.items():
        for ipa, f1, f2 in items:
            rows.append(_row(ipa, "RP", group, f1, f2, None, _DET_CITE))
    return rows


# High-intelligibility phonemes weighted more heavily (CEFR sound-articulation
# emphasis on contrasts that carry functional load in L2 English).
HIGH_IMPACT_IPA = {"θ", "ð", "iː", "ɪ", "i"}
