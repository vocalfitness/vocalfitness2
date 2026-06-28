"""
Regenerate ONLY the problematic /iː/ FLEECE audio: the isolated vowel
(top-left "tap to hear") and the three example sentences + mnemonic.

Key tuning vs v2:
  • DROP the ellipsis padding for sentences — it forced unnatural pauses.
    Use natural punctuation only.
  • Use a CARRIER PHRASE for the isolated vowel ("The vowel: eeeee.") so
    the model produces a clean, sustained /iː/ inside a natural utterance,
    rather than a robotic letter repetition.
  • Bump stability to 0.60 for cleaner prosody on short clips, keep style
    at 0 (no artificial inflection), similarity_boost 0.85.

Outputs to /tmp/i_fleece_audio_v3.json and prints the URLs the patch
script needs.
"""
import os, sys, json, time, urllib.request

API_BASE   = os.environ.get("API_BASE") or "http://localhost:8001"
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "VocalFitness2026!")

VOICE_BASE = dict(
    similarity_boost=0.85,
    style=0.0,
    use_speaker_boost=True,
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128",
)

# Per-clip overrides: short, isolated clips benefit from higher stability,
# multi-word sentences want a touch more variation for prosody.
CLIPS = [
    # (hint, text, stability)
    ("i_fleece_isolated_v3",   "The vowel sound is: eeee.",                                  0.65),
    ("see_the_green_tree_v3",  "See the green tree.",                                        0.55),
    ("she_needs_to_eat_v3",    "She needs to eat each week.",                                0.55),
    ("three_sheep_sleep_v3",   "Three sheep sleep in the field.",                            0.55),
    ("mnemonic_i_fleece_v3",   "He sees three sheep eat green leaves easily.",               0.55),
]

def login() -> str:
    req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())["access_token"]

def tts(token: str, text: str, stability: float, hint: str) -> str:
    payload = {**VOICE_BASE, "stability": stability, "text": text, "filename_hint": hint}
    req = urllib.request.Request(
        f"{API_BASE}/api/admin/elevenlabs/tts",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())["relative_url"]

def main() -> int:
    token = login()
    out = {}
    for hint, text, stab in CLIPS:
        url = tts(token, text, stab, hint)
        out[hint] = url
        print(f"  {hint:<28} (stab={stab})  →  {url}")
        time.sleep(0.25)
    with open("/tmp/i_fleece_audio_v3.json", "w") as f:
        json.dump(out, f, indent=2)
    print("\n[+] Saved /tmp/i_fleece_audio_v3.json")
    return 0

if __name__ == "__main__":
    sys.exit(main())
