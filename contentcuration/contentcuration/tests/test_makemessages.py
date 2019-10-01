import os
import pathlib
import subprocess

from django.conf import settings
from django.test import TestCase


class MakeMessagesCommandRunTestCase(TestCase):
    """
    Sanity check to make sure makemessages runs to completion.
    """

    def test_command_succeeds_without_postgres(self):
        """
        Test that we can run makemessages when postgres is not activated.
        """
        repo_root = pathlib.Path(settings.BASE_DIR).parent
        cmd = ["make", "makemessages"]
        env = os.environ.copy()
        # We fake postgres not being available, by setting the wrong IP address.
        # hopefully postgres isn't running at 127.0.0.2!
        env.update({"DATA_DB_HOST": "127.0.0.2"})
        subprocess.check_output(
            cmd,
            env=env,
            cwd=str(repo_root)
        )
