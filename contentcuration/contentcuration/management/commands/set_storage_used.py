from django.core.management.base import BaseCommand

from contentcuration.models import User


class Command(BaseCommand):
    def handle(self, *args, **options):
        for user in User.objects.filter(disk_space_used=0):
            user.set_space_used()
