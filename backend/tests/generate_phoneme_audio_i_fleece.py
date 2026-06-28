"""
Generate ElevenLabs audio for the /iː/ (FLEECE) phoneme card.
Calls POST /api/admin/elevenlabs/tts for every word/sentence and prints
the resulting URLs as a Python dict, ready to paste into phonemes.js.

Run:  python3 /app/backend/tests/generate_phoneme_audio_i_fleece.py
"""
import os
import sys
import json
import time
import urllib.request

API_BASE = os.environ.get("API_BASE") or "http://localhost:8001"
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "VocalFitness2026!")

def login() -> str:
    req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    token = data.get("access_token") or data.get("token")
    if not token:
        raise RuntimeError(f"Login failed: {data}")
    return token

def tts(token: str, text: str, hint: str) -> str:
    payload = {
        "text": text,
        "stability": 0.5,
        "similarity_boost": 0.85,
        "style": 0.15,
        "use_speaker_boost": True,
        "model_id": "eleven_multilingual_v2",
        "output_format": "mp3_44100_128",
        "filename_hint": hint,
    }
    req = urllib.request.Request(
        f"{API_BASE}/api/admin/elevenlabs/tts",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return data["relative_url"]

# ---- Content to generate ------------------------------------------------
ISOLATED_TEXT = "ee"  # the FLEECE vowel sounded in isolation

COMMON_WORDS = [
    ("see", "/siː/"), ("me", "/miː/"), ("he", "/hiː/"), ("we", "/wiː/"),
    ("she", "/ʃiː/"), ("tree", "/triː/"), ("three", "/θriː/"), ("free", "/friː/"),
    ("need", "/niːd/"), ("feel", "/fiːl/"), ("week", "/wiːk/"), ("sleep", "/sliːp/"),
    ("green", "/ɡriːn/"), ("street", "/striːt/"), ("read", "/riːd/"), ("keep", "/kiːp/"),
    ("agree", "/əˈɡriː/"), ("between", "/bɪˈtwiːn/"), ("complete", "/kəmˈpliːt/"),
    ("machine", "/məˈʃiːn/"), ("believe", "/bɪˈliːv/"), ("teach", "/tiːtʃ/"),
    ("easy", "/ˈiːzi/"), ("people", "/ˈpiːpəl/"), ("eat", "/iːt/"),
    ("each", "/iːtʃ/"), ("team", "/tiːm/"), ("piece", "/piːs/"),
    ("evening", "/ˈiːvnɪŋ/"), ("season", "/ˈsiːzən/"),
]

EXAMPLE_SENTENCES = [
    ("See the green tree.",                  "see_the_green_tree"),
    ("She needs to eat each week.",          "she_needs_to_eat_each_week"),
    ("Three sheep sleep in the field.",      "three_sheep_sleep_field"),
]

MNEMONIC = ("He sees three sheep eat green leaves easily.", "mnemonic_i_fleece")

def main() -> int:
    print(f"[+] API_BASE = {API_BASE}")
    token = login()
    print(f"[+] Logged in as {ADMIN_USER}")

    out = {"isolated": "", "words": [], "sentences": [], "mnemonic": ""}

    # Isolated
    out["isolated"] = tts(token, ISOLATED_TEXT, "i_fleece_isolated")
    print(f"  isolated  → {out['isolated']}")

    # Words
    for word, ipa in COMMON_WORDS:
        url = tts(token, word, f"i_fleece_{word}")
        out["words"].append({"w": word, "ipa": ipa, "audio": url})
        print(f"  {word:<10} → {url}")
        time.sleep(0.25)  # be gentle on the API

    # Sentences
    for text, hint in EXAMPLE_SENTENCES:
        url = tts(token, text, hint)
        out["sentences"].append({"text": text, "audio": url})
        print(f"  sentence  → {url}")
        time.sleep(0.25)

    # Mnemonic
    out["mnemonic"] = tts(token, MNEMONIC[0], MNEMONIC[1])
    print(f"  mnemonic  → {out['mnemonic']}")

    print("\n========== JSON RESULT ==========")
    print(json.dumps(out, indent=2, ensure_ascii=False))
    # Persist to disk for downstream consumption
    out_path = "/tmp/i_fleece_audio.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\n[+] Saved to {out_path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
