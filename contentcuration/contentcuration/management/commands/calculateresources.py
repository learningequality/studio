from django.core.management.base import BaseCommand
from django.db import transaction
from contentcuration.models import ChannelResourceSize

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--init', action='store_true', dest='init', default=False)

    def handle(self, *args, **options):
        if options['init']:
            logging.debug("Initializing channel resource sizes")
            ChannelResourceSize.initialize_view()
        else:
            logging.debug("Recalculating channel resource sizes")
            with transaction.atomic():
                ChannelResourceSize.refresh_view()
