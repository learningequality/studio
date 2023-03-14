import logging

from django.core.management.base import BaseCommand

from contentcuration.celery import app
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.viewsets.sync.constants import PUBLISHED

logging.basicConfig()
logger = logging.getLogger("command")


class Command(BaseCommand):
    """
    Reconciles publishing status of channels.
    """

    def handle(self, *args, **options):
        from contentcuration.tasks import apply_channel_changes_task

        # Channels that are in `publishing` state according to our change event.
        publishing_channels = list(Change.objects.filter(channel_id__isnull=False, applied=False,
                                                         errored=False, change_type=PUBLISHED)
                                   .values_list("channel_id", flat=True).distinct())

        # channel_ids of tasks that are in Redis queue.
        queued_channel_tasks = [task[1].get("channel_id") for task in app.get_queued_tasks()]

        # channel_ids of tasks that are being run by the celery workers or are waiting to be run.
        active_channel_tasks = [task["kwargs"].get("channel_id") for task in app.get_active_and_reserved_tasks()
                                if task["name"] == apply_channel_changes_task.name]

        # If channel is in publishing state and doesnot have any queued and running task,
        # that means the worker has crashed. So, we reset the publishing state to False.
        for channel_id in publishing_channels:
            if (channel_id not in queued_channel_tasks) and (channel_id not in active_channel_tasks):
                channel = Channel.objects.get(pk=channel_id)
                if channel.main_tree.publishing:
                    channel.main_tree.publishing = False
                    channel.main_tree.save()
                    logger.info(f"Resetted publishing status to False for channel {channel.id}.")
