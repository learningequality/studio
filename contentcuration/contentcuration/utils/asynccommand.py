from abc import abstractmethod

from django.core.management.base import BaseCommand


class TaskCommand(BaseCommand):
    def start_progress(self, *args, **options):
        # TODO: needs implementation
        pass

    def update_progress(self, *args, **options):
        # TODO: needs implementation
        pass

    @abstractmethod
    def handle_async(self, *args, **options):
        pass
