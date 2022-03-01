"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
from django.db.models import Q
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.tasks import get_or_create_async_task


def change_model_values_to_change_dict(c):
    datum = c["kwargs"]
    datum.update({"server_rev": c["server_rev"], "table": c["table"], "type": c["change_type"], "channel_id": c["channel_id"], "user_id": c["user_id"]})
    return datum


class SyncView(APIView):
    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def handle_changes(self, request):
        session_key = request.session.session_key
        changes = request.data.get("changes", [])

        if changes:
            change_channel_ids = set(x.get("channel_id") for x in changes if x.get("channel_id"))
            allowed_ids = set(
                Channel.filter_edit_queryset(Channel.objects.filter(id__in=change_channel_ids), request.user).values_list("id", flat=True).distinct()
            )
            # Allow changes that are either:
            # Not related to a channel and instead related to the user if the user is the current user.
            user_only_changes = []
            # Related to a channel that the user is an editor for.
            channel_changes = []
            # Changes that cannot be made
            disallowed_changes = []
            for c in changes:
                if c.get("channel_id") is None and c.get("user_id") == request.user.id:
                    user_only_changes.append(c)
                elif c.get("channel_id") in allowed_ids:
                    channel_changes.append(c)
                else:
                    disallowed_changes.append(c)
            change_models = Change.create_changes(user_only_changes + channel_changes, created_by_id=request.user.id, session_key=session_key)
            if user_only_changes:
                get_or_create_async_task("apply_user_changes", request.user, user_id=request.user.id)
            for channel_id in allowed_ids:
                get_or_create_async_task("apply_channel_changes", request.user, channel_id=channel_id)
            allowed_changes = [{"rev": c.client_rev, "server_rev": c.server_rev} for c in change_models]

            return {"disallowed": disallowed_changes, "allowed": allowed_changes}
        return {}

    def return_changes(self, request):
        channel_revs = request.data.get("channel_revs", {})
        user_rev = request.data.get("user_rev") or 0
        session_key = request.session.session_key
        if channel_revs:
            # Filter to only the channels that the user has permissions to view.
            channel_ids = Channel.filter_view_queryset(Channel.objects.all(), request.user).filter(id__in=channel_revs.keys()).values_list("id", flat=True)
            channel_revs = {channel_id: channel_revs[channel_id] for channel_id in channel_ids}

        # Create a filter that returns all applied changes, and any errored changes made by this session
        relevant_to_session_filter = (Q(applied=True) | Q(errored=True, session_id=session_key))

        change_filter = (Q(user=request.user, server_rev__gt=user_rev) & relevant_to_session_filter)

        for channel_id, rev in channel_revs.items():
            change_filter |= (Q(channel_id=channel_id, server_rev__gt=rev) & relevant_to_session_filter)

        changes_to_return = list(
            Change.objects.filter(
                change_filter
            ).values("server_rev", "session_id", "channel_id", "user_id", "applied", "errored", "table", "change_type", "kwargs")
        )

        if not changes_to_return:
            return {}

        changes = []
        successes = []
        errors = []

        for c in changes_to_return:
            if c["applied"]:
                if c["session_id"] == session_key:
                    successes.append(change_model_values_to_change_dict(c))
                else:
                    changes.append(change_model_values_to_change_dict(c))
            if c["errored"] and c["session_id"] == session_key:
                errors.append(change_model_values_to_change_dict(c))

        return {"changes": changes, "errors": errors, "successes": successes}

    def post(self, request):
        response_payload = {
            "disallowed": [],
            "allowed": [],
            "changes": [],
            "errors": [],
            "successess": [],
        }

        response_payload.update(self.handle_changes(request))

        response_payload.update(self.return_changes(request))

        return Response(response_payload)
