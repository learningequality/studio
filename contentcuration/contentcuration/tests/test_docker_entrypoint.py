import os
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase

ENTRYPOINT = Path(__file__).resolve().parents[3] / "docker/studio-dev/entrypoint.py"


class DockerEntrypointTestCase(SimpleTestCase):
    def run_entrypoint(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "psycopg2.py").write_text("def connect(**kwargs): pass\n")
            (root / "requests.py").write_text(
                "def get(*args, **kwargs): "
                "return type('Response', (), {'status_code': 200})()\n"
            )
            setup_marker = root / "setup-ran"
            setup = root / "python"
            setup.write_text(
                '#!/bin/sh\ntouch "$SETUP_MARKER"\n'
                'case "$PGOPTIONS" in *read_only=on) exit 1;; esac\n'
            )
            setup.chmod(0o755)
            marker = root / "started"
            result = subprocess.run(
                [sys.executable, str(ENTRYPOINT), "touch", str(marker)],
                env={
                    **os.environ,
                    "PATH": f"{root}:{os.environ['PATH']}",
                    "PYTHONPATH": str(root),
                    "SETUP_MARKER": str(setup_marker),
                    "PGOPTIONS": "-c default_transaction_read_only=on",
                },
                capture_output=True,
                timeout=10,
            )
            return result.returncode, setup_marker.exists(), marker.exists()

    def test_setup_failure_prevents_startup(self):
        status, setup_ran, started = self.run_entrypoint()
        self.assertNotEqual(status, 0)
        self.assertTrue(setup_ran)
        self.assertFalse(started)
