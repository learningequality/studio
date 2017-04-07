from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from contentcuration.models import Channel

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

class Command(BaseCommand):

    def handle(self, *args, **options):
        with transaction.atomic():
            for channel in Channel.objects.filter(main_tree__published=True):
                logging.debug("Republishing channel {} ({})".format(channel.pk, channel.name))
                call_command("exportchannel", channel.pk, force=True)
