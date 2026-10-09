"""Validate bundled HTML references before publishing the static site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

root = Path(__file__).resolve().parents[1] / "site"


class References(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name not in {"src", "href"} or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            path = (root / unquote(url.path).lstrip("/")) if url.path.startswith("/") else self.path.parent / unquote(url.path)
            assert path.exists(), f"Missing asset referenced by {self.path}: {value}"


for html in root.rglob("*.html"):
    References(html).feed(html.read_text())
assert (root / "beidou/assets/earth-sphere.png").is_file()
print("All bundled HTML references and Beidou earth texture are present.")
