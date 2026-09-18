import os
import subprocess
import sys
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase

from contentcuration.settings import _dev_server_port
from contentcuration.settings import _resolve_webpack_dev_public_host

# Required directly rather than via webpack.config.js, so this runs without a JS install.
WEBPACK_DEV_SERVER_ADDRESS = (
    Path(__file__).resolve().parents[3] / "webpackDevServerAddress.js"
)

# Matches pytest.ini's pythonpath.
SETTINGS_SUBPROCESS_CWD = Path(__file__).resolve().parents[2]

HOST_CASES = [
    (None, None),
    (None, "studio.test"),
    ("0.0.0.0", None),
    ("0.0.0.0", "studio.test"),
    ("::", None),
    ("::", "studio.test"),
    ("[::]", None),
    ("[::]", "studio.test"),
    ("localhost", None),
    ("localhost", "studio.test"),
    ("192.168.1.50", None),
    ("192.168.1.50", "studio.test"),
    ("studio.internal", None),
    ("studio.internal", "studio.test"),
]

PORT_CASES = [
    (None, None),
    ("4000", "4000"),
    ("34567", "34567"),
    ("4000", "45678"),
    ("34567", "45678"),
    ("abc", None),  # invalid bind port falls back to the 4000 default
    (None, "xyz"),  # invalid public port falls back to the (unset -> 4000) bind port
    ("0", None),  # 0 is a valid port, not the falsy trigger for a fallback
]


def _js_public_host(bind_host, public_host_env):
    env = dict(os.environ)
    for name, value in (
        ("WEBPACK_DEV_HOST", bind_host),
        ("WEBPACK_DEV_PUBLIC_HOST", public_host_env),
    ):
        if value is None:
            env.pop(name, None)
        else:
            env[name] = value

    result = subprocess.run(
        [
            "node",
            "-e",
            "console.log(require(process.argv[1]).getWebpackDevPublicHost())",
            str(WEBPACK_DEV_SERVER_ADDRESS),
        ],
        cwd=WEBPACK_DEV_SERVER_ADDRESS.parent,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _js_public_port(dev_port_env, public_port_env):
    env = dict(os.environ)
    for name, value in (
        ("WEBPACK_DEV_PORT", dev_port_env),
        ("WEBPACK_DEV_PUBLIC_PORT", public_port_env),
    ):
        if value is None:
            env.pop(name, None)
        else:
            env[name] = value

    result = subprocess.run(
        [
            "node",
            "-e",
            "console.log(require(process.argv[1]).getWebpackDevPublicPort())",
            str(WEBPACK_DEV_SERVER_ADDRESS),
        ],
        cwd=WEBPACK_DEV_SERVER_ADDRESS.parent,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _python_public_port(dev_port_env, public_port_env):
    # Mirrors settings.py's WEBPACK_DEV_PORT / WEBPACK_DEV_PUBLIC_PORT lines, which read
    # os.environ directly rather than taking arguments.
    with mock.patch.dict(os.environ, {}, clear=False):
        for name, value in (
            ("WEBPACK_DEV_PORT", dev_port_env),
            ("WEBPACK_DEV_PUBLIC_PORT", public_port_env),
        ):
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
        dev_port = _dev_server_port("WEBPACK_DEV_PORT", 4000)
        return _dev_server_port("WEBPACK_DEV_PUBLIC_PORT", dev_port)


def _python_settings(
    dev_port_env=None, public_port_env=None, bind_host_env=None, public_host_env=None
):
    # Reads what settings.py resolved, rather than calling the helpers it wires together.
    env = dict(os.environ)
    for name, value in (
        ("WEBPACK_DEV_PORT", dev_port_env),
        ("WEBPACK_DEV_PUBLIC_PORT", public_port_env),
        ("WEBPACK_DEV_HOST", bind_host_env),
        ("WEBPACK_DEV_PUBLIC_HOST", public_host_env),
    ):
        if value is None:
            env.pop(name, None)
        else:
            env[name] = value
    env["DJANGO_SETTINGS_MODULE"] = "contentcuration.settings"

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from django.conf import settings\n"
            "print(settings.WEBPACK_DEV_PUBLIC_PORT)\n"
            "print(settings.WEBPACK_DEV_PUBLIC_HOST)\n",
        ],
        cwd=SETTINGS_SUBPROCESS_CWD,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    port, host = result.stdout.strip().splitlines()
    return port, host


# Subset that discriminates settings.py's wiring; the helpers get the full space above.
WIRING_PORT_CASES = [(None, None), ("34567", None), ("34567", "45678")]
WIRING_HOST_CASES = [
    (None, None),
    ("0.0.0.0", None),
    ("studio.internal", None),
    ("studio.internal", "studio.test"),
]


class WebpackDevPublicPortWiringTestCase(SimpleTestCase):
    def test_settings_agrees_with_javascript(self):
        for dev_port_env, public_port_env in WIRING_PORT_CASES:
            with self.subTest(
                dev_port_env=dev_port_env, public_port_env=public_port_env
            ):
                python_port, _ = _python_settings(
                    dev_port_env=dev_port_env, public_port_env=public_port_env
                )
                js_port = _js_public_port(dev_port_env, public_port_env)
                self.assertEqual(js_port, python_port)


class WebpackDevPublicHostWiringTestCase(SimpleTestCase):
    def test_settings_agrees_with_javascript(self):
        for bind_host_env, public_host_env in WIRING_HOST_CASES:
            with self.subTest(
                bind_host_env=bind_host_env, public_host_env=public_host_env
            ):
                _, python_host = _python_settings(
                    bind_host_env=bind_host_env, public_host_env=public_host_env
                )
                js_host = _js_public_host(bind_host_env, public_host_env)
                self.assertEqual(js_host, python_host)


class WebpackDevPublicHostAgreementTestCase(SimpleTestCase):
    """Bind-host-unset cases assume non-WSL, where getWebpackDevHost() shells out for the IP."""

    def test_python_agrees_with_javascript(self):
        for bind_host, public_host_env in HOST_CASES:
            with self.subTest(bind_host=bind_host, public_host_env=public_host_env):
                python_bind_host = bind_host or "127.0.0.1"
                python_host = _resolve_webpack_dev_public_host(
                    python_bind_host, public_host_env
                )
                js_host = _js_public_host(bind_host, public_host_env)
                self.assertEqual(js_host, python_host)


class WebpackDevPublicPortAgreementTestCase(SimpleTestCase):
    def test_python_agrees_with_javascript(self):
        for dev_port_env, public_port_env in PORT_CASES:
            with self.subTest(
                dev_port_env=dev_port_env, public_port_env=public_port_env
            ):
                python_port = _python_public_port(dev_port_env, public_port_env)
                js_port = _js_public_port(dev_port_env, public_port_env)
                self.assertEqual(js_port, str(python_port))
