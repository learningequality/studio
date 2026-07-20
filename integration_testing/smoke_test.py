# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright<2"]
# ///
"""
Browser smoke test for Kolibri Studio.

Polls a running Studio server for readiness, logs in as a superuser, walks a
curated set of in-app URLs, and screenshots each one. Collects console errors,
uncaught JS errors, and same-origin HTTP responses with status >= 400. Exits
non-zero if any errors were recorded.

The script expects a server (CI uses gunicorn with WhiteNoise serving /static/)
to already be running at STUDIO_URL — CI starts it as a separate workflow step.

Env vars:
    STUDIO_URL          (default http://localhost:8080)
    STUDIO_STARTUP_TIMEOUT  (default 120)
    SMOKE_EMAIL         (required)
    SMOKE_PASSWORD      (required)
    SCREENSHOT_DIR      (default ./smoke_test_screenshots)
"""
import http.client
import logging
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

STUDIO_URL = (os.environ.get("STUDIO_URL") or "http://localhost:8080").rstrip("/")
STUDIO_HOST = urllib.parse.urlparse(STUDIO_URL).hostname
STARTUP_TIMEOUT = int(os.environ.get("STUDIO_STARTUP_TIMEOUT", "120"))
SCREENSHOT_DIR = Path(os.environ.get("SCREENSHOT_DIR", "smoke_test_screenshots"))
SMOKE_EMAIL = os.environ.get("SMOKE_EMAIL")
SMOKE_PASSWORD = os.environ.get("SMOKE_PASSWORD")
NAV_TIMEOUT = 30000
# Minimum visible body text (chars) for a page to count as "mounted" rather than
# a blank-white failed SPA mount.
MIN_BODY_TEXT = 20

# Studio's "Unsupported Browser" page rejects the default HeadlessChrome UA
# and serves a static fallback with no SPA. Use a regular Chrome UA instead.
CHROME_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# (label, path) — paths relative to STUDIO_URL. The label is used for the
# screenshot filename. Order matters: login lands on /channels/ so we start
# from there and walk to other apps.
#
# This is an intentionally curated subset — not every route, just enough to
# exercise the different webpack bundles (channels SPA, settings SPA, admin
# SPA) and a few of the channelList tabs (each tab loads a separate vuex
# module). Extend deliberately: each added page adds CI time, and we'd
# rather catch broken SPA mount than broken route logic.
PAGES = [
    ("my_channels", "/channels/#/my-channels"),
    ("starred", "/channels/#/starred"),
    ("view_only", "/channels/#/view-only"),
    ("public", "/channels/#/public"),
    ("community_library", "/channels/#/community-library"),
    ("collections", "/channels/#/collections"),
    ("settings", "/settings/"),
    ("administration", "/administration/"),
]


def wait_for_studio(url, timeout=STARTUP_TIMEOUT):
    """Block until url responds with any HTTP status, or raise TimeoutError.

    Returns as soon as the server speaks HTTP — even 5xx counts as "up" so the
    smoke flow can fail fast on a broken server instead of spinning for the
    full STARTUP_TIMEOUT.
    """
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=5)
            return
        except urllib.error.HTTPError:
            # Server responded with an HTTP error — it's up.
            return
        except (
            urllib.error.URLError,
            ConnectionError,
            OSError,
            http.client.HTTPException,
        ):
            time.sleep(2)
    raise TimeoutError(f"Studio did not become ready within {timeout} seconds at {url}")


def _same_host(url):
    # Match by hostname so a request to a different port on the same host
    # (e.g. a bundle that hardcodes another local port) still falls inside the
    # same-origin filter.
    return urllib.parse.urlparse(url).hostname == STUDIO_HOST


def _is_real_console_error(msg):
    # Skip "Failed to load resource" — the resource URL isn't in msg.text,
    # so we can't tell same-origin from third-party (analytics, fonts).
    # Same-origin request failures are caught via on_requestfailed below.
    return msg.type == "error" and "Failed to load resource" not in msg.text


def attach_collectors(page):
    """Attach pageerror / console / response listeners; return event buffer."""
    buffer = []

    def on_pageerror(exc):
        buffer.append({"type": "pageerror", "url": page.url, "detail": str(exc)})

    def on_console(msg):
        if _is_real_console_error(msg):
            buffer.append(
                {"type": "console.error", "url": page.url, "detail": msg.text}
            )

    def on_response(resp):
        if not _same_host(resp.url):
            return
        # 5xx is always a smoke failure. For 4xx, only responses that can break
        # the app matter — navigation, the JS/CSS bundle, and API calls. A
        # missing decorative subresource (favicon, an optional image or font)
        # shouldn't redden the whole test.
        is_failure = resp.status >= 500 or (
            resp.status >= 400
            and resp.request.resource_type
            in ("document", "script", "stylesheet", "xhr", "fetch")
        )
        if is_failure:
            buffer.append(
                {
                    "type": "response",
                    "url": page.url,
                    "detail": f"{resp.status} {resp.url}",
                }
            )

    def on_requestfailed(req):
        if _same_host(req.url):
            buffer.append(
                {
                    "type": "requestfailed",
                    "url": page.url,
                    "detail": f"{req.url} — {req.failure}",
                }
            )

    page.on("pageerror", on_pageerror)
    page.on("console", on_console)
    page.on("response", on_response)
    page.on("requestfailed", on_requestfailed)
    return buffer


def login(page, buffer, failures):
    """Navigate to /, follow redirect, log in, land on /channels/."""
    page.goto(STUDIO_URL + "/", wait_until="domcontentloaded")
    # Studio's i18n middleware redirects / to /<lang>/accounts/. Anchor to a
    # locale segment so we don't also match a page whose path coincidentally
    # contains "/accounts/" (e.g. an error page or marketing route).
    page.wait_for_url(re.compile(r"/[a-z][a-z-]*/accounts/"), timeout=NAV_TIMEOUT)
    # Wait for the SPA to mount the login form.
    page.get_by_label("Email").wait_for(state="visible", timeout=NAV_TIMEOUT)
    page.screenshot(path=str(SCREENSHOT_DIR / "00_login.png"), full_page=False)

    page.get_by_label("Email").fill(SMOKE_EMAIL)
    page.get_by_label("Password").fill(SMOKE_PASSWORD)
    page.get_by_role("button", name="Sign in").click()

    # Successful login lands at /<lang>/channels/#/my-channels. Anchor to a
    # locale segment for the same reason as the /accounts/ regex above.
    page.wait_for_url(re.compile(r"/[a-z][a-z-]*/channels/"), timeout=NAV_TIMEOUT)
    page.wait_for_load_state("networkidle", timeout=NAV_TIMEOUT)
    page.screenshot(path=str(SCREENSHOT_DIR / "01_post_login.png"), full_page=False)

    if buffer:
        failures.extend({**event, "page": "(login)"} for event in buffer)
        buffer.clear()


def _bust(path, index):
    """Append a cache-buster query param to force a full page reload.

    Without this, hash-only navigation (e.g. /channels/#/starred →
    /channels/#/view-only) is same-document — the browser doesn't reload,
    Vue router has to react in a later tick, and a screenshot taken right
    after `goto` can capture the previous tab.
    """
    base, _, frag = path.partition("#")
    sep = "&" if "?" in base else "?"
    base = f"{base}{sep}_smoketest={index}"
    return f"{base}#{frag}" if frag else base


def walk_pages(page, buffer, failures):
    """Visit each (label, path) in PAGES, screenshot, collect errors."""
    for index, (label, path) in enumerate(PAGES, start=2):
        target = STUDIO_URL + _bust(path, index)
        try:
            page.goto(target, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
            page.wait_for_load_state("networkidle", timeout=NAV_TIMEOUT)
        except PlaywrightError as exc:
            buffer.append({"type": "nav-error", "url": target, "detail": str(exc)})
        shot = SCREENSHOT_DIR / f"{index:02d}_{label}.png"
        try:
            page.screenshot(path=str(shot), full_page=False)
        except PlaywrightError as exc:
            buffer.append(
                {"type": "screenshot-error", "url": page.url, "detail": str(exc)}
            )
        # Positive mount check: a broken SPA mount renders a blank page with no
        # console error and no failed request, which would otherwise pass. Assert
        # the app actually rendered visible text.
        try:
            body_text = page.inner_text("body", timeout=NAV_TIMEOUT).strip()
        except PlaywrightError as exc:
            body_text = ""
            buffer.append(
                {"type": "content-error", "url": page.url, "detail": str(exc)}
            )
        if len(body_text) < MIN_BODY_TEXT:
            buffer.append(
                {
                    "type": "blank-page",
                    "url": page.url,
                    "detail": f"rendered body text too short ({len(body_text)} chars)",
                }
            )
        # Drain at end of iteration so events arriving between the goto and
        # screenshot of THIS page are attributed to THIS page. Events that
        # leak in after the drain land in the next iteration's buffer; they
        # get attributed to the next page, which is wrong-but-bounded — at
        # least nothing is silently dropped.
        if buffer:
            failures.extend({**event, "page": label} for event in buffer)
            buffer.clear()


def report(failures):
    if not failures:
        logger.info("Smoke test passed — all pages loaded without errors.")
        return 0
    logger.error("Smoke test FAILED — %d error(s) collected:\n", len(failures))
    logger.error("  %-22s %-18s Detail", "Page", "Type")
    logger.error("  %s %s %s", "-" * 22, "-" * 18, "-" * 60)
    for f in failures:
        page_label = (f.get("page") or "")[:22]
        detail = f["detail"]
        if len(detail) > 80:
            detail = detail[:77] + "..."
        logger.error("  %-22s %-18s %s", page_label, f["type"], detail)
    return 1


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if not SMOKE_EMAIL or not SMOKE_PASSWORD:
        raise RuntimeError("SMOKE_EMAIL and SMOKE_PASSWORD must be set")

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(f"Waiting for Studio at {STUDIO_URL}...")
    wait_for_studio(STUDIO_URL + "/")
    logger.info("Studio is ready.")

    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=CHROME_UA)
        page = context.new_page()
        buffer = attach_collectors(page)
        try:
            login(page, buffer, failures)
            walk_pages(page, buffer, failures)
        except PlaywrightError as exc:
            # Browser-driver errors (timeouts, broken selectors) get recorded
            # as a smoke failure with a best-effort screenshot. Programmer
            # errors (NameError, ImportError, AttributeError, etc.) propagate
            # so the traceback isn't buried under a one-line "fatal" entry.
            failures.append(
                {
                    "type": "fatal",
                    "url": page.url,
                    "detail": str(exc),
                    "page": "(fatal)",
                }
            )
            # Flush whatever the collectors captured before the exception — a
            # fatal is usually a symptom (e.g. a login timeout caused by a 500
            # on the page), and those buffered events name the real cause.
            if buffer:
                failures.extend({**event, "page": "(fatal)"} for event in buffer)
                buffer.clear()
            try:
                page.screenshot(path=str(SCREENSHOT_DIR / "fatal.png"), full_page=False)
            except PlaywrightError:
                pass
        finally:
            browser.close()
    return report(failures)


if __name__ == "__main__":
    sys.exit(main())
