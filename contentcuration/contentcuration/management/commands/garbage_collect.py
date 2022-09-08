"""A management command that deletes the following from the database:

- ContentNodes older than 2 weeks, whose parents are in the designated "garbage
tree" (i.e. `settings.ORPHANAGE_ROOT_ID`). Also delete the associated Files in the
database and in object storage.
"""
import logging as logmodule

from django.core.management.base import BaseCommand

from contentcuration.utils.garbage_collect import clean_up_contentnodes
from contentcuration.utils.garbage_collect import clean_up_deleted_chefs
from contentcuration.utils.garbage_collect import clean_up_feature_flags
from contentcuration.utils.garbage_collect import clean_up_stale_files
from contentcuration.utils.garbage_collect import clean_up_tasks


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger('command')


class Command(BaseCommand):

    def handle(self, *args, **options):
        """
        Actual logic for garbage collection.
        """

        # clean up contentnodes, files and file objects on storage that are associated
        # with the orphan tree
        logging.info("Cleaning up contentnodes from the orphan tree")
        clean_up_contentnodes()
        logging.info("Cleaning up deleted chef nodes")
        clean_up_deleted_chefs()
        logging.info("Cleaning up feature flags")
        clean_up_feature_flags()
        logging.info("Cleaning up stale file objects")
        clean_up_stale_files()
        logging.info("Cleaning up tasks")
        clean_up_tasks()
