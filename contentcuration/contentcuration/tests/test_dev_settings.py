import os
import subprocess
import sys
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import SimpleTestCase


def load_storage_settings(module="dev_settings", *, object_name=None, **env):
    environ = {
        k: v
        for k, v in os.environ.items()
        if k not in ("STORAGE_EMULATOR_HOST", "STUDIO_GCS_EMULATOR")
    }
    environ.pop("AWS_S3_ENDPOINT_URL", None)
    environ["DJANGO_SETTINGS_MODULE"] = "contentcuration." + module
    environ.update(env)
    probe = """
import django
from django.core.files.storage import default_storage

django.setup()
with default_storage.open(os.environ["STUDIO_TEST_OBJECT"]) as stored:
    print(stored.read().hex())
"""
    if object_name is not None:
        environ["STUDIO_TEST_OBJECT"] = object_name
    output = subprocess.run(
        [
            sys.executable,
            "-c",
            f"import contentcuration.{module} as s;"
            "print(s.GCS_BUCKET_NAME);"
            "print(s.GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH);"
            "print(s.GCS_ENDPOINT_URL);"
            "print(s.GCS_EMULATOR_HOST);"
            "import os; print(os.environ.get('STORAGE_EMULATOR_HOST'))"
            + (probe if object_name is not None else ""),
        ],
        cwd=settings.BASE_DIR,
        env=environ,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return output.splitlines()[-(6 if object_name is not None else 5) :]


class DevStorageSettingsTestCase(SimpleTestCase):
    real_bucket_env = {
        "AWS_BUCKET_NAME": "your-development-bucket",
        "GOOGLE_CLOUD_STORAGE_SERVICE_ACCOUNT_CREDENTIALS": "/path/to/key.json",
    }

    def test_emulator_ignores_real_bucket_settings(self):
        self.assertEqual(
            load_storage_settings(**self.real_bucket_env),
            [
                "content",
                "None",
                "http://localhost:4443",
                "http://localhost:4443",
                "http://localhost:4443",
            ],
        )

    def test_opt_out_uses_real_bucket_settings(self):
        self.assertEqual(
            load_storage_settings(STUDIO_GCS_EMULATOR="0", **self.real_bucket_env),
            [
                "your-development-bucket",
                "/path/to/key.json",
                "https://storage.googleapis.com",
                "None",
                "None",
            ],
        )

    def test_opt_out_ignores_inherited_emulator_host(self):
        self.assertEqual(
            load_storage_settings(
                STUDIO_GCS_EMULATOR="0",
                STORAGE_EMULATOR_HOST="http://gcs:4443",
                **self.real_bucket_env,
            ),
            [
                "your-development-bucket",
                "/path/to/key.json",
                "https://storage.googleapis.com",
                "None",
                "None",
            ],
        )

    def test_empty_emulator_host_uses_default(self):
        self.assertEqual(
            load_storage_settings(STORAGE_EMULATOR_HOST="")[-2:],
            ["http://localhost:4443", "http://localhost:4443"],
        )

    def test_empty_emulator_host_uses_default_in_test_settings(self):
        self.assertEqual(
            load_storage_settings("test_settings", STORAGE_EMULATOR_HOST="")[-2:],
            ["http://localhost:4443", "http://localhost:4443"],
        )

    def test_storage_uses_configured_emulator_host(self):
        host = "http://gcs:4443"
        for module in ("dev_settings", "test_settings"):
            with self.subTest(module=module):
                result = load_storage_settings(module, STORAGE_EMULATOR_HOST=host)
                self.assertEqual(result[-3:], [host, host, host])

    def test_default_storage_reads_from_configured_emulator(self):
        content = b"Studio GCS settings probe"
        name = default_storage.save(f"settings-probe-{uuid4()}", ContentFile(content))
        self.addCleanup(default_storage.delete, name)
        for module in ("dev_settings", "test_settings"):
            with self.subTest(module=module):
                result = load_storage_settings(
                    module,
                    object_name=name,
                    STORAGE_EMULATOR_HOST=settings.GCS_EMULATOR_HOST,
                )
                self.assertEqual(result[-1], content.hex())
