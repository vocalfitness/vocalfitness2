"""
Regression tests for rich-text email rendering.
Mirrors the post-fix logic in server.py::send_notification_email so that we can
verify the HTML/plain fallback without sending real SMTP traffic.
"""
from html import escape as _html_escape


def _render_email_body(message_preview: str, message_html: str = "") -> str:
    """Mirror of the rendering block inside send_notification_email."""
    if message_html and message_html.strip():
        full_message_html = message_html
    else:
        full_message_html = _html_escape(message_preview or "").replace("\n", "<br>")
    return f"<div>{full_message_html}</div>"


def test_uses_rich_html_when_provided():
    plain = "Plain fallback"
    html = "<p>Ciao <strong>Mario</strong>!</p><ul><li>username: <code>m.rossi</code></li></ul>"
    out = _render_email_body(plain, html)
    assert "<strong>Mario</strong>" in out
    assert "<ul>" in out
    # Plain fallback must NOT be present
    assert "Plain fallback" not in out


def test_falls_back_to_escaped_plain_when_no_html():
    out = _render_email_body("Hello <world> & friends", "")
    assert "&lt;world&gt;" in out
    assert "&amp;" in out
    # No real <p> tag from input
    assert "<p>" not in out


def test_empty_html_string_uses_plain_fallback():
    # whitespace-only HTML should NOT be used
    out = _render_email_body("hello", "   \n  ")
    assert "hello" in out
    assert "<p>" not in out


if __name__ == "__main__":
    test_uses_rich_html_when_provided()
    test_falls_back_to_escaped_plain_when_no_html()
    test_empty_html_string_uses_plain_fallback()
    print("All rich email rendering regression tests PASSED")
