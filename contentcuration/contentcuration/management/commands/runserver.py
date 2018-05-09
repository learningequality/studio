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
        super(Command, self).__init__(*args, **kwargs)

    def handle(self, *args, **options):
        return super(Command, self).handle(*args, **options)

    def start_minio(self):
        self.stdout.write("Starting minio")

        self.minio_process = subprocess.Popen(
            ["run_minio.py"],
            stdin=subprocess.PIPE,
        )
