import os
import subprocess

import pathlib
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

        # this test can make changes to committed files, so only run it
        # on the CI server
        if 'CI' not in os.environ or not os.environ['CI']:
            return

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
