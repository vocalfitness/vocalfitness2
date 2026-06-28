"""
Regenerate ElevenLabs audio for BOTH /ʊ/ FOOT and /iː/ FLEECE with
slower / more natural pacing. Two fixes applied:

  1. Text padding — every word/sentence is wrapped with a leading "    " and
     trailing ". ..." so the model adds natural intro silence, falls off
     gracefully and never gets abruptly truncated at the end of the sample.
  2. Voice settings — stability lowered to 0.40 (more prosody variation) and
     style locked to 0 (no artificial inflection). similarity_boost stays
     at 0.85 to keep the cloned voice recognisable.
  3. Isolated phonemes — the single-letter "ee" / "uh" become elongated
     "...eeeeee..." / "...uhhhh..." so the synthesised vowel can sustain
     its formants long enough to be perceptually useful for the student.

Outputs to /tmp/i_fleece_audio_v2.json and /tmp/u_foot_audio_v2.json.
"""
import os, sys, json, time, urllib.request

API_BASE   = os.environ.get("API_BASE") or "http://localhost:8001"
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "VocalFitness2026!")

# ---- Slower / more natural voice settings ------------------------------
VOICE_SETTINGS = dict(
    stability=0.40,            # was 0.50 — lower = more natural prosody
    similarity_boost=0.85,
    style=0.0,                 # was 0.15 — kill artificial inflection
    use_speaker_boost=True,
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128",
)

# ---- Text shaping ------------------------------------------------------
def pad_word(w: str) -> str:
    """Force a natural intro + a soft decay at the end."""
    return f"   {w}.  ..."

def pad_sentence(s: str) -> str:
    return f"   {s}  ..."

def pad_phoneme(elongated: str) -> str:
    return f"...   {elongated}   ..."

ISOLATED = {
    "i-fleece": pad_phoneme("eeeeeeee"),   # FLEECE — close-front-tense long vowel
    "u-foot":   pad_phoneme("uhhhhhh"),    # FOOT  — near-close back-rounded short
}

I_WORDS = ["see","me","he","we","she","tree","three","free","need","feel",
           "week","sleep","green","street","read","keep","agree","between",
           "complete","machine","believe","teach","easy","people","eat",
           "each","team","piece","evening","season"]
I_SENT  = [
    ("see_the_green_tree",        "See... the green tree."),
    ("she_needs_to_eat_each_week","She needs to eat... each week."),
    ("three_sheep_sleep_field",   "Three sheep... sleep in the field."),
]
I_MNEM  = ("mnemonic_i_fleece",   "He sees... three sheep... eat green leaves... easily.")

U_WORDS = ["look","good","would","could","should","put","book","took","stood","push",
           "bush","wood","wool","cookie","sugar","football","childhood","bullet","cushion","pulley",
           "fully","pull","bull","full","hood","hook","cook","foot","wolf","woman"]
U_SENT  = [
    ("could_you_look_at_the_book",  "Could you look... at the book?"),
    ("a_good_woman_took_the_cookie","A good woman... took the cookie."),
    ("you_should_put_your_foot_down","You should put... your foot down."),
]
U_MNEM  = ("mnemonic_u_foot", "A good cook should put... full sugar in the cookie... wouldn't she?")

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
    payload = {**VOICE_SETTINGS, "text": text, "filename_hint": hint}
    req = urllib.request.Request(
        f"{API_BASE}/api/admin/elevenlabs/tts",
        data=json.dumps(payload).encode(),
        headers={"Content-Type":"application/json","Authorization":f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    return data["relative_url"]

def gen(token: str, phoneme_id: str, words: list, sentences: list, mnem: tuple, prefix: str) -> dict:
    out = {"isolated": "", "words": [], "sentences": [], "mnemonic": ""}
    out["isolated"] = tts(token, ISOLATED[phoneme_id], f"{prefix}_isolated_v2")
    print(f"  [{phoneme_id}] isolated → {out['isolated']}")
    for w in words:
        url = tts(token, pad_word(w), f"{prefix}_{w}_v2")
        out["words"].append({"w": w, "audio": url})
        print(f"  [{phoneme_id}] {w:<10} → {url}")
        time.sleep(0.20)
    for hint, text in sentences:
        url = tts(token, pad_sentence(text), f"{hint}_v2")
        out["sentences"].append({"text": text, "audio": url})
        print(f"  [{phoneme_id}] sentence → {url}")
        time.sleep(0.20)
    out["mnemonic"] = tts(token, pad_sentence(mnem[1]), f"{mnem[0]}_v2")
    print(f"  [{phoneme_id}] mnemonic → {out['mnemonic']}")
    return out

def main() -> int:
    print(f"[+] API_BASE = {API_BASE}")
    token = login()
    print(f"[+] Logged in as {ADMIN_USER}")

    print("\n========== /iː/ FLEECE ==========")
    i_out = gen(token, "i-fleece", I_WORDS, I_SENT, I_MNEM, prefix="i_fleece")
    with open("/tmp/i_fleece_audio_v2.json","w") as f:
        json.dump(i_out, f, indent=2, ensure_ascii=False)
    print(f"[+] Saved /tmp/i_fleece_audio_v2.json")

    print("\n========== /ʊ/ FOOT ==========")
    u_out = gen(token, "u-foot",   U_WORDS, U_SENT, U_MNEM, prefix="u_foot")
    with open("/tmp/u_foot_audio_v2.json","w") as f:
        json.dump(u_out, f, indent=2, ensure_ascii=False)
    print(f"[+] Saved /tmp/u_foot_audio_v2.json")

    return 0

if __name__ == "__main__":
    sys.exit(main())
