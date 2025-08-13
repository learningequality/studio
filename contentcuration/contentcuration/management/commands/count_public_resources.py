import logging

from django.core.management.base import BaseCommand

from contentcuration.models import Channel
from contentcuration.models import ContentNode

logger = logging.getLogger("command")


class Command(BaseCommand):
    def handle(self, *args, **options):
        public_tree_ids = Channel.objects.filter(
            public=True, deleted=False
        ).values_list("main_tree__tree_id", flat=True)
        count = (
            ContentNode.objects.filter(tree_id__in=public_tree_ids)
            .exclude(kind_id="topic")
            .values("content_id", "language_id")
            .distinct()
            .count()
        )
        logger.info("{} unique resources".format(count))
