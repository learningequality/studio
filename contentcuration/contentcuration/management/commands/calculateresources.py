
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from contentcuration.models import ChannelResourceSize

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

class Command(BaseCommand):

    def handle(self, *args, **options):
        logging.debug("Recalculating channel resource sizes")
        with transaction.atomic():
            ChannelResourceSize.refresh_view()
