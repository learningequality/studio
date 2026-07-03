"""Re-vendor the QTI 3.0 item XSD schema tree.

Downloads the QTI-item XSD and its W3C/MathML/SSML dependencies, then
rewrites their `schemaLocation` attributes from absolute
`https://purl.imsglobal.org/...` URLs to local relative filenames so the
schema tree compiles with no network access at runtime.

Usage: python refresh_schema.py
(Run from any directory; writes into the `xsd/` subdirectory next to this
script.) Afterwards, re-run the validation test suite:

    pytest contentcuration/contentcuration/tests/utils/qti/test_validation.py -v
"""
import codecs
import socket
import subprocess
from pathlib import Path

import requests
from lxml import etree


XSD_DIR = Path(__file__).parent / "xsd"

SOURCES = {
    "imsqti_itemv3p0p1_v1p0.xsd": "https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_itemv3p0p1_v1p0.xsd",
    "xml.xsd": "https://purl.imsglobal.org/spec/w3/2001/schema/xsd/xml.xsd",
    "XInclude.xsd": "https://purl.imsglobal.org/spec/w3/2001/schema/xsd/XInclude.xsd",
    "mathml3.xsd": "https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd",
    "mathml3-content.xsd": "https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3-content.xsd",
    "mathml3-presentation.xsd": "https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3-presentation.xsd",
    "mathml3-common.xsd": "https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3-common.xsd",
    "mathml3-strict-content.xsd": "https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3-strict-content.xsd",
    "ssmlv1p1-core.xsd": "https://purl.imsglobal.org/spec/ssml/v1p1/schema/xsd/ssmlv1p1-core.xsd",
    "synthesis-nonamespace.xsd": "https://purl.imsglobal.org/spec/ssml/v1p1/schema/xsd/synthesis-nonamespace.xsd",
}

# schemaLocation rewrites: file -> its dependencies (keys into SOURCES),
# each rewritten from the dependency's absolute URL to its local filename.
REWRITES = {
    "imsqti_itemv3p0p1_v1p0.xsd": [
        "xml.xsd",
        "XInclude.xsd",
        "mathml3.xsd",
        "ssmlv1p1-core.xsd",
    ],
    "ssmlv1p1-core.xsd": ["xml.xsd"],
    "synthesis-nonamespace.xsd": ["xml.xsd"],
}


def _normalize_encoding(content):
    # purl.imsglobal.org serves XInclude.xsd as UTF-16 with no XML declaration,
    # unlike every other source file here (plain UTF-8); transcode rather than
    # leaving it as the only non-UTF-8, non-diffable file in the vendored tree.
    # Decoding/re-encoding (instead of round-tripping through lxml) preserves
    # the original formatting instead of reflowing it.
    if content.startswith(codecs.BOM_UTF16_LE) or content.startswith(
        codecs.BOM_UTF16_BE
    ):
        text = content.decode("utf-16")
        if not text.lstrip().startswith("<?xml"):
            text = '<?xml version="1.0" encoding="UTF-8"?>\n' + text
        return text.encode("utf-8")
    return content


def download():
    XSD_DIR.mkdir(parents=True, exist_ok=True)
    for filename, url in SOURCES.items():
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        (XSD_DIR / filename).write_bytes(_normalize_encoding(response.content))


def rewrite_schema_locations():
    for filename, deps in REWRITES.items():
        path = XSD_DIR / filename
        text = path.read_text()
        for dep in deps:
            old = 'schemaLocation="%s"' % SOURCES[dep]
            new = 'schemaLocation="%s"' % dep
            assert old in text, "%r not found in %s" % (old, filename)
            text = text.replace(old, new)
        path.write_text(text)


def run_pre_commit():
    # Applies the repo's trailing-whitespace/end-of-file-fixer hooks (the only
    # hooks whose `files:` patterns match .xsd) so the vendored tree matches
    # the same convention already applied to the committed copies. Exit code
    # 1 just means files were modified; that's expected, not a failure.
    subprocess.run(
        ["pre-commit", "run", "--files"]
        + [str(path) for path in sorted(XSD_DIR.glob("*.xsd"))],
        check=False,
    )


def verify_compiles_offline():
    real_socket = socket.socket

    def _blocked(*args, **kwargs):
        raise RuntimeError("network access attempted while compiling vendored schema")

    socket.socket = _blocked
    try:
        etree.XMLSchema(etree.parse(str(XSD_DIR / "imsqti_itemv3p0p1_v1p0.xsd")))
    finally:
        socket.socket = real_socket


def main():
    download()
    rewrite_schema_locations()
    run_pre_commit()
    verify_compiles_offline()
    print("Vendored schema refreshed in %s" % XSD_DIR)  # noqa: T201


if __name__ == "__main__":
    main()
