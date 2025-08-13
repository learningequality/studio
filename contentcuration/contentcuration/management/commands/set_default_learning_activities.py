import logging as logmodule
import time

from django.core.management.base import BaseCommand

from contentcuration.constants.contentnode import kind_activity_map
from contentcuration.models import ContentNode

logging = logmodule.getLogger("command")


CHUNKSIZE = 10000


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()

        for kind, activity in kind_activity_map.items():
            kind_start = time.time()
            map_to_set = {activity: True}

            null_learning_activities = ContentNode.objects.filter(
                kind=kind, learning_activities__isnull=True
            ).values_list("id", flat=True)

            logging.info(
                "Setting default learning activities for kind: {}".format(kind)
            )

            while null_learning_activities.exists():
                updated_count = ContentNode.objects.filter(
                    id__in=null_learning_activities[0:CHUNKSIZE]
                ).update(learning_activities=map_to_set)
                logging.info(
                    "Updated {} content nodes of kind {} with learning activity {}".format(
                        updated_count, kind, activity
                    )
                )

            logging.info(
                "Finished setting default learning activities for kind: {} in {} seconds".format(
                    kind, time.time() - kind_start
                )
            )

        logging.info(
            "Finished setting all null learning activities in {} seconds".format(
                time.time() - start
            )
        )
