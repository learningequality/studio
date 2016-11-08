import tempfile
import json
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from le_utils.constants import format_presets, file_formats
from contentcuration.models import Channel, File, ContentNode
from contentcuration.api import calculate_node_metadata
from django.core.files.uploadedfile import SimpleUploadedFile

class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):
    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        try:
            self.stdout.write("***** Converting channel thumbnails *****")
            for channel in Channel.objects.filter(thumbnail__startswith="data:image/png;base64,"):
                with SimpleUploadedFile('temp.png',channel.thumbnail.replace('data:image/png;base64,', '').decode('base64')) as tempf:
                    file_object = File(file_on_disk=tempf, file_format_id=file_formats.PNG, preset_id=format_presets.CHANNEL_THUMBNAIL)
                    file_object.save()
                    channel.thumbnail = "{0}.{ext}".format(file_object.checksum, ext=file_formats.PNG)
                    channel.save()
                    self.stdout.write("Channel {0} now has thumbnail {1}".format(channel.name, channel.thumbnail))
            # self.stdout.write("***** Precalculating node metadata *****")
            # for node in ContentNode.objects.all():
            #     data = "{}" if node.extra_fields is None else node.extra_fields
            #     data = json.loads(data)
            #     data.update({'metadata':calculate_node_metadata(node)})
            #     node.extra_fields = json.dumps(data)
            #     node.save()
            #     self.stdout.write("Node {0} now has metadata {1}".format(node.title, node.extra_fields))

            self.stdout.write("************ DONE. ************")

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
            self.stdout.write("You can find your database in {path}".format(
                path=e.db_path))
