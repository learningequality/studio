"""A management command that deletes the following from the database:

- ContentNodes older than 2 weeks, whose parents are in the designated "garbage
tree" (i.e. `settings.ORPHANAGE_ROOT_ID`). Also delete the associated Files in the
database and in object storage.
"""
from django.core.management.base import BaseCommand

from contentcuration.utils.garbage_collect import clean_up_contentnodes


class Command(BaseCommand):

    def handle(self, *args, **options):
        """
        Actual logic for garbage collection.
        """

        # clean up contentnodes, files and file objects on storage that are associated
        # with the orphan tree
        clean_up_contentnodes()
