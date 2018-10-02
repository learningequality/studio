import logging as logmodule

from django.core.management.base import BaseCommand

from contentcuration.models import Channel
from contentcuration.views.nodes import sync_channel
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('--attributes', action='store_true', dest='attributes', default=False)
        parser.add_argument('--sort', action='store_true', dest='sort', default=False)
        parser.add_argument('--tags', action='store_true', dest='tags', default=False)
        parser.add_argument('--files', action='store_true', dest='files', default=False)
        parser.add_argument('--assessment-items', action='store_true', dest='assessment_items', default=False)

    def handle(self, *args, **options):
        sync_channel(Channel.objects.get(pk=options['channel_id']),
                     sync_attributes=options.get('attributes'),
                     sync_tags=options.get('tags'),
                     sync_files=options.get('files'),
                     sync_assessment_items=options.get('assessment_items'),
                     sync_sort_order=options.get('sort'),
                     )
