from __future__ import division

import logging as logmodule
from abc import abstractmethod

from builtins import object
from django.core.management.base import BaseCommand
from past.utils import old_div

logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Progress(object):
    """
    A Progress contains the progress of the tasks, the total number of expected
    tasks/data, and the fraction which equals to progress divided by total.
    """

    def __init__(self, total):
        self.progress = 0
        self.total = total
        self.fraction = 0

    def update(self, increment):
        self.progress += increment

        # Raise an error when the progress exceeds the total value after increment
        if self.progress > self.total:
            logging.error("Progress reaches over 100%.")

        self.fraction = 1.0 * self.progress / self.total

        logging.info("\rProgress: [{}{}] ({}%)".format(
            "=" * (old_div(int(self.fraction * 100), 2)),
            " " * (50 - old_div(int(self.fraction * 100), 2)),
            int(self.fraction * 100),
        ))


class TaskCommand(BaseCommand):
    """
    A management command that serves as a base command for asynchronous tasks,
    with a progresstracker attribute to track the progress of the tasks.
    """
    def handle(self, *args, **options):
        """
        Define the progress tracker and call handle_async method to handle
        different asynchronous task commands.
        """
        self.progresstracker = None
        return self.handle_async(*args, **options)

    def start_progress(self, total):
        """
        Initialize the progress tracker.
        """
        self.progresstracker = Progress(total)

    def update_progress(self, increment):
        """
        Update the progress tracker with the given value
        """
        self.progresstracker.update(increment)

    @abstractmethod
    def handle_async(self, *args, **options):
        pass
