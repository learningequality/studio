import json
import logging as logmodule

import progressbar
from builtins import range
from builtins import str
from django.core.management.base import BaseCommand
from past.builtins import basestring

from contentcuration.models import Channel
from contentcuration.models import User
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):

    def handle(self, *args, **options):  # noqa: C901
        failed = []
        channels = Channel.objects.all()
        users = User.objects.all()
        bar = progressbar.ProgressBar(max_value=channels.count() + users.count())

        index = 0
        for c in channels:
            try:
                for i in range(20):
                    if not isinstance(c.content_defaults, basestring):
                        break
                    c.content_defaults = json.loads(c.content_defaults.replace("'", '"').replace("\\", "").strip("\""))
                c.save()
                index += 1
                bar.update(index)
            except Exception as e:
                failed.append("FAILED {} ({}): {}".format(c.name, c.pk, str(e)))

        for u in users:
            try:
                for i in range(20):
                    if not isinstance(u.content_defaults, basestring):
                        break
                    u.content_defaults = json.loads(u.content_defaults.replace("'", '"').replace("\\", "").strip("\""))
                u.save()
                index += 1
                bar.update(index)
            except Exception as e:
                failed.append("FAILED {} ({}): {}".format(u.email, c.id, str(e)))

        for f in failed:
            print(f)
