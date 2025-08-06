import logging
import os
from datetime import datetime
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import F
from django.db.models import Q
from django.utils import timezone
from kolibri_public.models import ChannelMetadata
from kolibri_public.utils import export_channel_to_kolibri_public

from contentcuration.models import Channel
from contentcuration.models import User
from contentcuration.utils.publish import create_content_database

logger = logging.getLogger(__file__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--channel-id",
            type=str,
            dest="channel_id",
            help="The channel_id for which generate kolibri_public models [default: all channels]",
        )

    def handle(self, *args, **options):
        ids_to_export = []

        if options["channel_id"]:
            ids_to_export.append(options["channel_id"])
        else:
            self._republish_problem_channels()
            public_channel_ids = set(
                Channel.objects.filter(
                    public=True, deleted=False, main_tree__published=True
                ).values_list("id", flat=True)
            )
            kolibri_public_channel_ids = set(
                ChannelMetadata.objects.all().values_list("id", flat=True)
            )
            ids_to_export = public_channel_ids.difference(kolibri_public_channel_ids)

        count = 0
        for channel_id in ids_to_export:
            try:
                export_channel_to_kolibri_public(channel_id)
                count += 1
            except FileNotFoundError:
                logger.warning(
                    "Tried to export channel {} to kolibri_public but its published channel database could not be found".format(
                        channel_id
                    )
                )
            except Exception as e:
                logger.exception(
                    "Failed to export channel {} to kolibri_public because of error: {}".format(
                        channel_id, e
                    )
                )
        logger.info("Successfully put {} channels into kolibri_public".format(count))

    def _republish_problem_channels(self):
        twenty_19 = datetime(year=2019, month=1, day=1)
        five_minutes = timedelta(minutes=5)
        try:
            chef_user = User.objects.get(email="chef@learningequality.org")
        except User.DoesNotExist:
            logger.error("Could not find chef user to republish channels")
            return
        channel_qs = Channel.objects.filter(
            public=True, deleted=False, main_tree__published=True
        ).filter(
            Q(last_published__isnull=True)
            | Q(
                last_published__lt=twenty_19,
                main_tree__modified__lte=F("last_published") + five_minutes,
            )
        )

        for channel in channel_qs:
            try:
                kolibri_temp_db = create_content_database(
                    channel, True, chef_user.id, False
                )
                os.remove(kolibri_temp_db)
                channel.last_published = timezone.now()
                channel.save()
            except Exception as e:
                logger.exception(
                    "Failed to export channel {} to kolibri_public because of error: {}".format(
                        channel.id, e
                    )
                )
