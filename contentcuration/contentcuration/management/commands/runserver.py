from __future__ import print_function

import atexit
import logging
import os
import socket
import subprocess
from threading import Thread

from django.conf import settings
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
        self.setup_remote_debugging()

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
            ptvsd.enable_attach(None, ("0.0.0.0", 3000))
            logging.info("ptvsd attached!")
        except ImportError:
            logging.info("ptvsd not installed; not setting up remote debugger")
            return
        except socket.error:
            logging.info("Someone is already listening to port 3000!")
