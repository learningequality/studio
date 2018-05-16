from __future__ import print_function

import atexit
import logging
import os
import subprocess
from threading import Thread

from django.conf import settings
from django.contrib.staticfiles.management.commands.runserver import \
    Command as RunserverCommand
from django.core.management.base import CommandError

from contentcuration.utils.minio_utils import (ensure_storage_bucket_public,
                                               start_minio)


class Command(RunserverCommand):
    """
    Subclass the RunserverCommand from Staticfiles to run webpack.
    """

    def __init__(self, *args, **kwargs):
        super(Command, self).__init__(*args, **kwargs)

    def handle(self, *args, **options):
        return super(Command, self).handle(*args, **options)

    def setup_remote_debugging(self):
        """
        If you have Visual Studio Code running, you can connect to port 3000
        and set up breakpoints through your editor.
        """
        # Don't attempt to set up remote debugging if we're not in
        # debug mode
        if not settings.DEBUG:
            return

        try:
            import ptvsd
        except ImportError:
            logging.info("ptvsd not installed; not setting up remote debugger")
            return
