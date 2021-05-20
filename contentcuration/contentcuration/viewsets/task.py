import uuid

from celery import states
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from rest_framework.permissions import IsAuthenticated

from contentcuration.celery import app
from contentcuration.models import Channel
from contentcuration.models import Task
from contentcuration.viewsets.base import DestroyModelMixin
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet


class TaskFilter(RequiredFilterSet):
    channel = UUIDFilter(method="filter_channel")

    def filter_channel(self, queryset, name, value):
        channel_queryset = Channel.filter_view_queryset(Channel.objects.all(), self.request.user)
        if channel_queryset.filter(id=value).exists():
            return queryset.filter(channel_id=value)
        return queryset.none()

    class Meta:
        model = Task
        fields = ("channel",)


class TaskViewSet(ReadOnlyValuesViewset, DestroyModelMixin):
    order_by = 'created'
    queryset = Task.objects.order_by(order_by)
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filterset_class = TaskFilter
    lookup_field = "task_id"

    values = (
        "task_id",
        "task_type",
        "created",
        "status",
        "is_progress_tracking",
        "user_id",
        "metadata",
        "channel_id"
    )

    field_map = {"user": "user_id", "channel": "channel_id"}

    @classmethod
    def id_attr(cls):
        return "task_id"

    def perform_destroy(self, instance):
        # TODO: Add logic to delete the Celery task using app.control.revoke(). This will require some extensive
        # testing to ensure terminating in-progress tasks will not put the db in an indeterminate state.
        app.control.revoke(instance.task_id, terminate=True)
        instance.delete()

    def get_edit_queryset(self):
        return Task.objects.filter(user=self.request.user).order_by(self.order_by)

    def consolidate(self, items, queryset):
        if app.conf.task_always_eager:
            return items

        for item in items:
            if isinstance(item["channel"], uuid.UUID):
                item["channel"] = item["channel"].hex

            # @see contentcuration.utils.celery.tasks:CeleryAsyncResult
            task_result = app.AsyncResult(item["task_id"])
            if not task_result:
                return item

            progress = task_result.progress
            result = task_result.result
            metadata = {}

            if task_result.status in states.EXCEPTION_STATES:
                metadata.update(error={'traceback': task_result.traceback})
                if isinstance(result, Exception):
                    result = task_result.traceback
                progress = 100
            elif not task_result.ready():
                # overwrite result if not complete, since it would have progress data
                result = None

            item["status"] = task_result.status
            item["metadata"].update(progress=progress, result=result, **metadata)

        return items
