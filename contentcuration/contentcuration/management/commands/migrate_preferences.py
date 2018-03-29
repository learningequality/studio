import json

from django.core.management.base import BaseCommand
from django.db import transaction
from contentcuration.models import Channel, User
import progressbar
import time

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        failed = []
        channels = Channel.objects.all()
        users = User.objects.all()
        bar = progressbar.ProgressBar(max_value=channels.count() + users.count())

        index = 0
        for c in channels:
            try:
                c.content_defaults = json.loads(c.preferences.replace("\\", "").strip("\""))
                c.save()
                index += 1
                bar.update(index)
                time.sleep(0.2)
            except Exception as e:
                failed.append("FAILED {} ({}): {}".format(c.name, c.pk, str(e)))

        for u in users:
            try:
                u.content_defaults = json.loads(u.preferences.replace("\\", "").strip("\""))
                u.save()
                index += 1
                bar.update(index)
                time.sleep(0.2)
            except Exception as e:
                failed.append("FAILED {} ({}): {}".format(u.email, c.id, str(e)))



        for f in failed:
            print f
