import logging

from django.core.management.base import BaseCommand

from contentcuration.celery import app
from contentcuration.models import Change
from contentcuration.models import User

logger = logging.getLogger("command")


class Command(BaseCommand):
    """
    Reconciles that unready tasks are marked as reserved or active according to celery control
    """

    def handle(self, *args, **options):
        from contentcuration.tasks import apply_channel_changes_task
        from contentcuration.tasks import apply_user_changes_task

        active_task_ids = [task["id"] for task in app.get_active_and_reserved_tasks()]

        channel_changes = (
            Change.objects.filter(
                channel_id__isnull=False, applied=False, errored=False
            )
            .order_by("channel_id", "created_by_id")
            .values("channel_id", "created_by_id")
            .distinct()
        )
        for channel_change in channel_changes:
            apply_channel_changes_task.revoke(
                exclude_task_ids=active_task_ids,
                channel_id=channel_change["channel_id"],
            )
            apply_channel_changes_task.fetch_or_enqueue(
                User.objects.get(pk=channel_change["created_by_id"]),
                channel_id=channel_change["channel_id"],
            )

        user_changes = (
            Change.objects.filter(
                channel_id__isnull=True,
                user_id__isnull=False,
                applied=False,
                errored=False,
            )
            .order_by("user_id", "created_by_id")
            .values("user_id", "created_by_id")
            .distinct()
        )
        for user_change in user_changes:
            apply_user_changes_task.revoke(
                exclude_task_ids=active_task_ids, user_id=user_change["user_id"]
            )
            apply_user_changes_task.fetch_or_enqueue(
                User.objects.get(pk=user_change["created_by_id"]),
                user_id=user_change["user_id"],
            )
