import os
import subprocess
import sys

from django.conf import settings
from django.test import SimpleTestCase


def load_dev_storage_settings(**env):
    environ = {
        k: v
        for k, v in os.environ.items()
        if k not in ("STORAGE_EMULATOR_HOST", "STUDIO_GCS_EMULATOR")
    }
    environ.update(env)
    output = subprocess.run(
        [
            sys.executable,
            "-c",
            "import contentcuration.dev_settings as s;"
            "print(s.AWS_S3_BUCKET_NAME);"
            "print(s.GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH);"
            "print(s.AWS_S3_ENDPOINT_URL);"
            "import os; print(os.environ.get('STORAGE_EMULATOR_HOST'))",
        ],
        cwd=settings.BASE_DIR,
        env=environ,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return output.splitlines()[-4:]


class DevStorageSettingsTestCase(SimpleTestCase):
    real_bucket_env = {
        "AWS_BUCKET_NAME": "your-development-bucket",
        "GOOGLE_CLOUD_STORAGE_SERVICE_ACCOUNT_CREDENTIALS": "/path/to/key.json",
    }

    def test_emulator_ignores_real_bucket_settings(self):
        self.assertEqual(
            load_dev_storage_settings(**self.real_bucket_env),
            ["content", "None", "http://localhost:4443", "http://localhost:4443"],
        )

    def test_opt_out_uses_real_bucket_settings(self):
        self.assertEqual(
            load_dev_storage_settings(STUDIO_GCS_EMULATOR="0", **self.real_bucket_env),
            [
                "your-development-bucket",
                "/path/to/key.json",
                "https://storage.googleapis.com",
                "None",
            ],
        )

    def test_opt_out_ignores_inherited_emulator_host(self):
        self.assertEqual(
            load_dev_storage_settings(
                STUDIO_GCS_EMULATOR="0",
                STORAGE_EMULATOR_HOST="http://gcs:4443",
                **self.real_bucket_env
            ),
            [
                "your-development-bucket",
                "/path/to/key.json",
                "https://storage.googleapis.com",
                "None",
            ],
        )
