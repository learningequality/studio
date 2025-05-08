import logging

from django.core.management.base import BaseCommand

from contentcuration.celery import app
from contentcuration.models import Channel

logging.basicConfig()
logger = logging.getLogger("command")


class Command(BaseCommand):
    """
    Reconciles publishing status of channels.
    If there's no active task for a publishing channel then we reset its publishing status
    to False.
    """

    def handle(self, *args, **options):
        from contentcuration.tasks import apply_channel_changes_task

        # Channels that are in `publishing` state.
        publishing_channels = list(
            Channel.objects.filter(
                deleted=False, main_tree__publishing=True
            ).values_list("id", flat=True)
        )

        # channel_ids of tasks that are currently being run by the celery workers.
        active_channel_tasks = [
            task["kwargs"].get("channel_id")
            for task in app.get_active_tasks()
            if task["name"] == apply_channel_changes_task.name
        ]

        # If channel is in publishing state and doesnot have any active task,
        # that means the worker has crashed. So, we reset the publishing state to False.
        for channel_id in publishing_channels:
            if channel_id not in active_channel_tasks:
                channel = Channel.objects.get(pk=channel_id)
                channel.main_tree.publishing = False
                channel.main_tree.save()
                logger.info(
                    f"Resetted publishing status to False for channel {channel.id}."
                )
