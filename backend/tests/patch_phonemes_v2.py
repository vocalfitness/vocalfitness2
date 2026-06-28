"""
Patch ONLY /iː/ FLEECE audio in phonemes.js with the v2 ElevenLabs URLs
(slower / more natural). /ʊ/ FOOT keeps its authentic .wav recordings of
the Professor's real voice — those don't need regeneration.
"""
import json, re

PATH = "/app/frontend/src/data/phonemes.js"
with open("/tmp/i_fleece_audio_v2.json") as f:
    i = json.load(f)
with open(PATH) as f:
    src = f.read()

new_iso = i["isolated"].split("/")[-1]
new_mnem = i["mnemonic"].split("/")[-1]
# Replace isolated
src = re.sub(r"i_fleece_isolated_mIrm7gNC_\d+\.mp3", new_iso, src)
# Replace mnemonic
src = re.sub(r"mnemonic_i_fleece_mIrm7gNC_\d+\.mp3", new_mnem, src)
# Replace each word
for w in i["words"]:
    new_fn = w["audio"].split("/")[-1]
    src = re.sub(rf"i_fleece_{re.escape(w['w'])}_mIrm7gNC_\d+\.mp3", new_fn, src)
# Replace sentences (3 of them)
for idx, hint in enumerate(["see_the_green_tree", "she_needs_to_eat_each_week", "three_sheep_sleep_field"]):
    new_fn = i["sentences"][idx]["audio"].split("/")[-1]
    src = re.sub(rf"{re.escape(hint)}_mIrm7gNC_\d+\.mp3", new_fn, src)

with open(PATH, "w") as f:
    f.write(src)
print("[+] /iː/ FLEECE audio URLs updated to v2 (slower/natural)")
