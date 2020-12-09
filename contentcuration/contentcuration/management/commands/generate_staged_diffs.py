import logging

import progressbar
from django.core.management.base import BaseCommand

from contentcuration.api import get_staged_diff
from contentcuration.api import get_staged_diff_if_available
from contentcuration.models import Channel

logging.basicConfig()
logger = logging.getLogger('command')


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", dest="force", default=False)

    def handle(self, *args, **options):
        # Set up variables for restoration process
        logger.info("\n\n********** GENERATING STAGED DIFFS **********")
        channels_with_staged_changes = Channel.objects.exclude(staging_tree=None)
        bar = progressbar.ProgressBar(max_value=channels_with_staged_changes.count())
        for i, c in enumerate(channels_with_staged_changes):
            if options["force"] or not get_staged_diff_if_available(c.pk):
                get_staged_diff(c.pk)
            bar.update(i)
        logger.info("\n\nDONE")
