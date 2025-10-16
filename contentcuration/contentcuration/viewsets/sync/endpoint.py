"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
from celery import states
from django.db.models import Q
from django_celery_results.models import TaskResult
from django_cte import CTEQuerySet
from django_cte import With
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import CustomTaskMetadata
from contentcuration.tasks import apply_channel_changes_task
from contentcuration.tasks import apply_user_changes_task
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import SERVER_ONLY_CHANGES


CHANGE_RETURN_LIMIT = 200


class SyncView(APIView):
    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def handle_changes(self, request):
        session_key = request.session.session_key
        changes = list(
            filter(lambda x: type(x) is dict, request.data.get("changes", []))
        )

        if changes:
            change_channel_ids = set(
                x.get("channel_id") for x in changes if x.get("channel_id")
            )
            # Channels that have been created on the client side won't exist on the server yet, so we need to add a special exception for them.
            created_channel_ids = set(
                x.get("channel_id")
                for x in changes
                if x.get("channel_id")
                and x.get("table") == CHANNEL
                and x.get("type") == CREATED
            )
            # However, this would also give people a mechanism to edit existing channels on the server side by adding a channel create event for an
            # already existing channel, so we have to filter out the channel ids that are already created on the server side, regardless of whether
            # the user making the requests has permissions for those channels.
            created_channel_ids = created_channel_ids.difference(
                set(
                    Channel.objects.filter(id__in=created_channel_ids)
                    .values_list("id", flat=True)
                    .distinct()
                )
            )
            allowed_ids = set(
                Channel.filter_edit_queryset(
                    Channel.objects.filter(id__in=change_channel_ids), request.user
                )
                .values_list("id", flat=True)
                .distinct()
            ).union(created_channel_ids)
            # Allow changes that are either:
            # Not related to a channel and instead related to the user if the user is the current user.
            user_only_changes = []
            # Related to a channel that the user is an editor for.
            channel_changes = []
            # Changes that cannot be made
            disallowed_changes = []
            for c in changes:
                if c.get("type") in SERVER_ONLY_CHANGES:
                    disallowed_changes.append(c)
                elif (
                    c.get("channel_id") is None and c.get("user_id") == request.user.id
                ):
                    user_only_changes.append(c)
                elif c.get("channel_id") in allowed_ids:
                    channel_changes.append(c)
                else:
                    disallowed_changes.append(c)
            change_models = Change.create_changes(
                user_only_changes + channel_changes,
                created_by_id=request.user.id,
                session_key=session_key,
            )
            if user_only_changes:
                apply_user_changes_task.fetch_or_enqueue(
                    request.user, user_id=request.user.id
                )
            for channel_id in allowed_ids:
                apply_channel_changes_task.fetch_or_enqueue(
                    request.user, channel_id=channel_id
                )
            allowed_changes = [
                {"rev": c.client_rev, "server_rev": c.server_rev} for c in change_models
            ]

            return {"disallowed": disallowed_changes, "allowed": allowed_changes}
        return {}

    def get_channel_revs(self, request):
        channel_revs = request.data.get("channel_revs", {})
        if channel_revs:
            # Filter to only the channels that the user has permissions to view.
            channel_ids = (
                Channel.filter_view_queryset(Channel.objects.all(), request.user)
                .filter(id__in=channel_revs.keys())
                .values_list("id", flat=True)
            )
            channel_revs = {
                channel_id: channel_revs[channel_id] for channel_id in channel_ids
            }
        return channel_revs

    def return_changes(self, request, channel_revs):
        user_rev = request.data.get("user_rev") or 0
        unapplied_revs = request.data.get("unapplied_revs", [])
        session_key = request.session.session_key

        unapplied_revs_filter = Q(server_rev__in=unapplied_revs)

        # Create a filter that returns all applied changes, and any errored changes made by this session
        relevant_to_session_filter = Q(applied=True) | Q(
            errored=True, session_id=session_key
        )

        change_filter = (
            Q(user=request.user)
            & (unapplied_revs_filter | Q(server_rev__gt=user_rev))
            & relevant_to_session_filter
        )

        for channel_id, rev in channel_revs.items():
            change_filter |= (
                Q(channel_id=channel_id)
                & (unapplied_revs_filter | Q(server_rev__gt=rev))
                & relevant_to_session_filter
            )

        changes_to_return = list(
            Change.objects.filter(change_filter)
            .values(
                "server_rev",
                "session_id",
                "channel_id",
                "user_id",
                "created_by_id",
                "applied",
                "errored",
                "table",
                "change_type",
                "kwargs",
            )
            .order_by("server_rev")[:CHANGE_RETURN_LIMIT]
        )

        if not changes_to_return:
            return {}

        changes = []
        successes = []
        errors = []

        for c in changes_to_return:
            if c["applied"]:
                if c["session_id"] == session_key:
                    successes.append(Change.serialize(c))
                else:
                    changes.append(Change.serialize(c))
            if c["errored"] and c["session_id"] == session_key:
                errors.append(Change.serialize(c))

        return {"changes": changes, "errors": errors, "successes": successes}

    def return_tasks(self, request, channel_revs):
        custom_task_cte = With(
            CustomTaskMetadata.objects.filter(channel_id__in=channel_revs.keys())
        )
        task_result_querySet = CTEQuerySet(model=TaskResult)
        query = (
            custom_task_cte.join(
                task_result_querySet, task_id=custom_task_cte.col.task_id
            )
            .with_cte(custom_task_cte)
            .filter(
                status__in=[states.STARTED, states.FAILURE],
            )
            .exclude(
                task_name__in=[
                    apply_channel_changes_task.name,
                    apply_user_changes_task.name,
                ]
            )
            .annotate(
                progress=custom_task_cte.col.progress,
                channel_id=custom_task_cte.col.channel_id,
            )
        )

        response_payload = {
            "tasks": [],
        }

        if query.exists():
            response_payload = {
                "tasks": query.values(
                    "task_id",
                    "task_name",
                    "traceback",
                    "progress",
                    "channel_id",
                    "status",
                ),
            }

        return response_payload

    def post(self, request):
        response_payload = {
            "disallowed": [],
            "allowed": [],
            "changes": [],
            "errors": [],
            "successes": [],
            "tasks": [],
        }

        channel_revs = self.get_channel_revs(request)

        response_payload.update(self.handle_changes(request))

        response_payload.update(self.return_changes(request, channel_revs))

        response_payload.update(self.return_tasks(request, channel_revs))

        return Response(response_payload)
