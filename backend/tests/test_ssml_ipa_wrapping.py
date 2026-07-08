"""
Regression test for the ElevenLabs SSML IPA wrapping.

Guards the requirement (07/07/2026): when the user types "/ʌ/" or an
IPA symbol in Audio Studio, the TTS payload must reach ElevenLabs
wrapped in ``<phoneme alphabet="ipa" ph="ʌ">…</phoneme>`` so the
model produces the exact IPA sound (not the literal spelling "uh"
or "ah"). This test does NOT hit the ElevenLabs API — it monkey-patches
the client to capture the outgoing text + model_id.
"""

import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch


def _fake_put(*_a, **_k):
    return True


class _FakeVS:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


class _FakeTTSResponse:
    def __iter__(self):
        yield b"ID3fake_mp3_bytes"


class _FakeClient:
    def __init__(self):
        self.last_call = None
        self.text_to_speech = MagicMock()
        self.text_to_speech.convert = self._capture

    def _capture(self, *, text, voice_id, model_id, voice_settings, output_format):
        self.last_call = dict(text=text, voice_id=voice_id, model_id=model_id,
                              output_format=output_format)
        return _FakeTTSResponse()


@pytest.fixture
def fake_client():
    fc = _FakeClient()
    with patch("routers.elevenlabs._get_elevenlabs_client", return_value=fc):
        # Also patch VoiceSettings so the import inside synthesize doesn't fail.
        with patch.dict("sys.modules", {"elevenlabs": MagicMock(VoiceSettings=_FakeVS)}):
            yield fc


def test_ipa_phoneme_wraps_in_ssml_and_switches_model(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    res = synthesize_and_store(
        text="uh", voice_id="v1",
        emergent_put=_fake_put, uploads_dir=tmp_path,
        ipa_phoneme="ʌ",
    )
    assert res["ssml_used"] is True
    assert res["ipa_phoneme"] == "ʌ"
    call = fake_client.last_call
    assert '<phoneme alphabet="ipa" ph="ʌ">' in call["text"]
    assert '</phoneme>' in call["text"]
    # Model must auto-switch to a v2 English SSML-compatible model.
    assert call["model_id"] == "eleven_turbo_v2"


def test_ipa_phoneme_strips_surrounding_slashes(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    synthesize_and_store(
        text="phoneme", voice_id="v1",
        emergent_put=_fake_put, uploads_dir=tmp_path,
        ipa_phoneme="/ə/",
    )
    call = fake_client.last_call
    assert 'ph="ə"' in call["text"]
    assert 'ph="/ə/"' not in call["text"]


def test_no_ipa_keeps_multilingual_model_and_no_ssml(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    synthesize_and_store(
        text="hello world", voice_id="v1",
        emergent_put=_fake_put, uploads_dir=tmp_path,
    )
    call = fake_client.last_call
    assert '<phoneme' not in call["text"]
    assert call["text"] == "hello world"
    assert call["model_id"] == "eleven_multilingual_v2"


def test_ipa_phoneme_escapes_xml_specials_in_fallback(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    synthesize_and_store(
        text='a<b&c>d', voice_id="v1",
        emergent_put=_fake_put, uploads_dir=tmp_path,
        ipa_phoneme="ʌ",
    )
    call = fake_client.last_call
    assert "&lt;" in call["text"] and "&amp;" in call["text"] and "&gt;" in call["text"]


def test_empty_ipa_phoneme_is_treated_as_no_ipa(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    res = synthesize_and_store(
        text="hello", voice_id="v1",
        emergent_put=_fake_put, uploads_dir=tmp_path,
        ipa_phoneme="   /   ",   # only slashes → cleans to ""
    )
    assert res["ssml_used"] is False
    call = fake_client.last_call
    assert call["text"] == "hello"


# =========================================================================
# Inline IPA auto-wrapping (07/07/2026 · feature suggerimento §3.6)
# =========================================================================

def test_inline_ipa_wraps_all_fragments(fake_client, tmp_path):
    """Multi-fragment prose: "The word /kʊk/ has /ʊ/." → 2 phoneme tags."""
    from routers.elevenlabs import synthesize_and_store
    res = synthesize_and_store(
        text="The word /kʊk/ has the vowel /ʊ/.",
        voice_id="v1", emergent_put=_fake_put, uploads_dir=tmp_path,
    )
    assert res["ssml_used"] is True
    assert res["inline_ipa_hits"] == ["kʊk", "ʊ"]
    call = fake_client.last_call
    assert '<phoneme alphabet="ipa" ph="kʊk">kʊk</phoneme>' in call["text"]
    assert '<phoneme alphabet="ipa" ph="ʊ">ʊ</phoneme>' in call["text"]
    assert "The word " in call["text"]
    assert " has the vowel " in call["text"]
    assert call["model_id"] == "eleven_turbo_v2"


def test_inline_ipa_ignores_slashes_with_whitespace(fake_client, tmp_path):
    """False positives guard: '1/2 cup' or 'foo / bar' should NOT be
    interpreted as IPA fragments."""
    from routers.elevenlabs import synthesize_and_store
    res = synthesize_and_store(
        text="Add 1/2 cup — foo / bar / baz.",
        voice_id="v1", emergent_put=_fake_put, uploads_dir=tmp_path,
    )
    assert res["ssml_used"] is False
    assert res["inline_ipa_hits"] is None
    call = fake_client.last_call
    assert "<phoneme" not in call["text"]


def test_explicit_ipa_phoneme_beats_inline_scan(fake_client, tmp_path):
    """When ``ipa_phoneme`` is provided, the inline scanner is skipped —
    the whole text becomes one phoneme (isolated-clip case)."""
    from routers.elevenlabs import synthesize_and_store
    res = synthesize_and_store(
        text="The word /kʊk/ has /ʊ/.",
        voice_id="v1", emergent_put=_fake_put, uploads_dir=tmp_path,
        ipa_phoneme="ʊ",
    )
    assert res["ipa_phoneme"] == "ʊ"
    assert res["inline_ipa_hits"] is None
    call = fake_client.last_call
    # The whole text is wrapped by the explicit override, no per-fragment split.
    assert call["text"].count("<phoneme") == 1


def test_inline_ipa_xml_escapes_surrounding_prose(fake_client, tmp_path):
    from routers.elevenlabs import synthesize_and_store
    synthesize_and_store(
        text='2 < 5 & 5 > 2. Say /ʊ/.',
        voice_id="v1", emergent_put=_fake_put, uploads_dir=tmp_path,
    )
    call = fake_client.last_call
    assert "&lt;" in call["text"]
    assert "&amp;" in call["text"]
    assert "&gt;" in call["text"]
    assert 'ph="ʊ"' in call["text"]
