from abc import abstractmethod
from collections import namedtuple

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

Progress = namedtuple(
    'Progress',
    [
        'progress',
        'total',
        'fraction',
    ]
)


class TaskCommand(BaseCommand):
    def handle(self, *args, **options):
        self.progresstracker = None
        return self.handle_async(*args, **options)

    def start_progress(self, total):
        self.progresstracker = Progress(progress=0, total=total, fraction=0)

    def update_progress(self, increment):
        tracker = self.progresstracker
        progress = tracker.progress + increment
        if progress > tracker.total:
            raise CommandError("Progress reaches over 100%.")

        fraction = 1.0 * progress / tracker.total
        updated_tracker = tracker._replace(progress=progress, fraction=fraction)
        self.progresstracker = updated_tracker

    @abstractmethod
    def handle_async(self, *args, **options):
        pass
