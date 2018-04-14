from __future__ import print_function

import atexit
import os
import subprocess
from threading import Thread

from contentcuration.utils.minio_utils import (ensure_storage_bucket_public,
                                               start_minio)
from django.contrib.staticfiles.management.commands.runserver import \
    Command as RunserverCommand
from django.core.management.base import CommandError


class Command(RunserverCommand):
    """
    Subclass the RunserverCommand from Staticfiles to run webpack.
    """

    def __init__(self, *args, **kwargs):
        self.cleanup_closing = False
        self.webpack_process = None

        super(Command, self).__init__(*args, **kwargs)

    def handle(self, *args, **options):

        # We're subclassing runserver, which spawns threads for its
        # autoreloader with RUN_MAIN set to true, we have to check for
        # this to avoid running webpack twice.
        if not os.getenv('RUN_MAIN', False) and not getattr(self, "webpack_process"):

            webpack_thread = Thread(target=self.start_webpack)
            webpack_thread.daemon = True
            webpack_thread.start()

            ensure_storage_bucket_public()

            atexit.register(self.kill_webpack_process)

        return super(Command, self).handle(*args, **options)

    def start_minio(self):
        self.stdout.write("Starting minio")

        self.minio_process = subprocess.Popen(
            ["run_minio.py"],
            stdin=subprocess.PIPE,
        )



    def kill_webpack_process(self):
        if self.webpack_process.returncode is not None:
            return

        self.cleanup_closing = True
        self.stdout.write('Closing webpack process')

        self.webpack_process.terminate()

    def start_webpack(self):
        self.stdout.write('Starting webpack')

        self.webpack_process = subprocess.Popen(
            'yarn run build --watch --progress',
            shell=True,
            stdin=subprocess.PIPE,
            stdout=self.stdout,
            stderr=self.stderr)

        if self.webpack_process.poll() is not None:
            raise CommandError('Webpack failed to start')

        self.stdout.write('Webpack process on pid {0}'
                          .format(self.webpack_process.pid))

        self.webpack_process.wait()

        if self.webpack_process.returncode != 0 and not self.cleanup_closing:
            self.stdout.write(
                """
                ****************************************************************************
                Webpack exited unexpectedly - Javascript code will not be properly built.
                ****************************************************************************
                """)
