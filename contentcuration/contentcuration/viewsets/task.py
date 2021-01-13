from django.conf import settings
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from rest_framework.permissions import IsAuthenticated

from contentcuration.celery import app
from contentcuration.models import Channel
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.viewsets.base import DestroyModelMixin
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet


class TaskFilter(RequiredFilterSet):
    channel = UUIDFilter(method="filter_channel")

    def filter_channel(self, queryset, name, value):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_email = not self.request.user.is_anonymous() and self.request.user.email
        user_queryset = User.objects.filter(id=user_id)
        channel_queryset = Channel.objects.annotate(
            edit=Exists(user_queryset.filter(editable_channels=OuterRef("id"))),
            view=Exists(user_queryset.filter(view_only_channels=OuterRef("id"))),
        )
        channel_queryset = channel_queryset.filter(
            Q(view=True)
            | Q(edit=True)
            | Q(
                id__in=Channel.objects.filter(deleted=False)
                .filter(Q(public=True) | Q(pending_editors__email=user_email))
                .values_list("id", flat=True)
                .distinct()
            )
        )

        if channel_queryset.filter(id=value).exists():
            return queryset.filter(metadata__affects__channel=value.hex)
        return queryset.none()

    class Meta:
        model = Task
        fields = ("channel",)


class TaskViewSet(ReadOnlyValuesViewset, DestroyModelMixin):
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = TaskFilter
    lookup_field = "task_id"

    values = (
        "task_id",
        "task_type",
        "created",
        "status",
        "is_progress_tracking",
        "user_id",
        "metadata",
    )

    field_map = {"user": "user_id"}

    @classmethod
    def id_attr(cls):
        return "task_id"

    def perform_destroy(self, instance):
        # TODO: Add logic to delete the Celery task using app.control.revoke(). This will require some extensive
        # testing to ensure terminating in-progress tasks will not put the db in an indeterminate state.
        app.control.revoke(instance.task_id, terminate=True)
        instance.delete()

    def get_edit_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def consolidate(self, items, queryset):
        if not settings.CELERY_TASK_ALWAYS_EAGER:
            for item in items:
                result = app.AsyncResult(item["task_id"])
                if result and result.status:
                    item["status"] = result.status
                if "progress" not in item["metadata"]:
                    # Just flagging this, but this appears to be the correct way to get task metadata,
                    # even though the API is marked as private.
                    meta = result._get_task_meta()
                    if (
                        meta
                        and "result" in meta
                        and meta["result"]
                        and not isinstance(meta["result"], Exception)
                        and "progress" in meta["result"]
                    ):
                        item["metadata"]["progress"] = meta["result"]["progress"]
                    else:
                        item["metadata"]["progress"] = None
                item["channel"] = (
                    item.get("metadata", {}).get("affects", {}).get("channel")
                )
        return items
