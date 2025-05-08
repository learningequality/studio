import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants.labels import accessibility_categories

from contentcuration.models import ContentNode
from contentcuration.models import File

logging = logmodule.getLogger("command")


CHUNKSIZE = 10000


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()

        logging.info("Setting 'has captions' for audio kinds")

        has_captions_subquery = Exists(
            File.objects.filter(
                contentnode=OuterRef("id"),
                language=OuterRef("language"),
                preset_id=format_presets.VIDEO_SUBTITLE,
            )
        )
        # Only try to update audio nodes which have not had any accessibility labels set on them
        # this will allow this management command to be rerun and resume from where it left off
        # and also prevent stomping previous edits to the accessibility_labels field.
        updateable_nodes = ContentNode.objects.filter(
            has_captions_subquery,
            kind=content_kinds.AUDIO,
            accessibility_labels__isnull=True,
        )

        updateable_node_slice = updateable_nodes.values_list("id", flat=True)[
            0:CHUNKSIZE
        ]

        count = 0

        while updateable_nodes.exists():
            this_count = ContentNode.objects.filter(
                id__in=updateable_node_slice
            ).update(
                accessibility_labels={accessibility_categories.CAPTIONS_SUBTITLES: True}
            )

            logging.info("Set has captions metadata for {} nodes".format(this_count))

            count += this_count

            updateable_node_slice = updateable_nodes.values_list("id", flat=True)[
                0:CHUNKSIZE
            ]

        logging.info(
            "Finished setting all has captions metadata for {} nodes in {} seconds".format(
                count, time.time() - start
            )
        )
