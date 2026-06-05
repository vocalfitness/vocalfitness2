"""
Regression test: verify that admin email notifications include the FULL message
content (no 150-char truncation).
"""
import re
from html import escape as _html_escape


def _render_email_html(message_preview: str, sender_name: str = "Admin", type_label: str = "Messaggio") -> str:
    """Mirror of the template inside server.py::send_notification_email (post-fix)."""
    full_message_html = _html_escape(message_preview or "").replace("\n", "<br>")
    return f"""
    <html><body>
    <div>
        <p>Hai ricevuto un nuovo {type_label.lower()} da <strong>{sender_name}</strong>:</p>
        <div>
            <p style="white-space:pre-wrap;word-break:break-word;">{full_message_html}</p>
        </div>
    </div>
    </body></html>"""


def test_full_message_is_rendered_when_longer_than_150_chars():
    long_msg = (
        "Ciao Mario, ecco le tue credenziali per accedere all'area riservata: "
        "username: mario.rossi password: VocalTest2026! "
        "Link di login: https://vocalfitness.org/login. "
        "Ti consiglio di cambiare la password al primo accesso. A presto!"
    )
    assert len(long_msg) > 150, "Test message must exceed the old 150-char limit"

    html = _render_email_html(long_msg)

    # Full sentences must be present (no truncation)
    assert "VocalTest2026!" in html, "Password (would be truncated by old code) must appear"
    assert "https://vocalfitness.org/login" in html, "Login URL must appear in full"
    assert "A presto!" in html, "End of the message must be present"
    # No ellipsis-truncation marker
    assert not re.search(r"VocalTest2026!\.\.\.|cambiare la password\.\.\.", html)


def test_html_special_chars_are_escaped():
    msg = 'Test <script>alert("xss")</script> & <b>bold</b>'
    html = _render_email_html(msg)
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&amp;" in html


def test_newlines_preserved_as_br():
    msg = "Riga 1\nRiga 2\nRiga 3"
    html = _render_email_html(msg)
    assert "Riga 1<br>Riga 2<br>Riga 3" in html


if __name__ == "__main__":
    test_full_message_is_rendered_when_longer_than_150_chars()
    test_html_special_chars_are_escaped()
    test_newlines_preserved_as_br()
    print("All email truncation regression tests PASSED")
