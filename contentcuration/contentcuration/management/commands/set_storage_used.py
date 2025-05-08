import logging

from django.core.management.base import BaseCommand

from contentcuration.models import User


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", dest="force", default=False)

    def handle(self, *args, **options):
        users = (
            User.objects.all()
            if options["force"]
            else User.objects.filter(disk_space_used=0)
        )
        for index, user in enumerate(users):
            user.set_space_used()
            logger.info("Updated storage used for {} user(s)".format(index + 1))
