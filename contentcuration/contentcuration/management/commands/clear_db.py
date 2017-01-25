from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from contentcuration import models
import logging as logmodule
logging = logmodule.getLogger(__name__)

class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):
    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        try:
            self.stdout.write("***** CLEARING OUT USER GENERATED MODELS *****")
            print models.ContentNode.objects.all().delete()
            print models.ContentTag.objects.all().delete()
            print models.Channel.objects.all().delete()
            print models.AssessmentItem.objects.all().delete()
            print models.File.objects.all().delete()
            print models.Invitation.objects.all().delete()

            self.stdout.write("************ DONE. ************")

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
