"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
import logging
import time
from collections import OrderedDict
from itertools import groupby

from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_207_MULTI_STATUS
from rest_framework.status import HTTP_400_BAD_REQUEST
from search.viewsets.savedsearch import SavedSearchViewSet

from contentcuration.utils.sentry import report_exception
from contentcuration.viewsets.assessmentitem import AssessmentItemViewSet
from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.clipboard import ClipboardViewSet
from contentcuration.viewsets.contentnode import ContentNodeViewSet
from contentcuration.viewsets.contentnode import PrerequisitesUpdateHandler
from contentcuration.viewsets.file import FileViewSet
from contentcuration.viewsets.invitation import InvitationViewSet
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.constants import CLIPBOARD
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import CONTENTNODE_PREREQUISITE
from contentcuration.viewsets.sync.constants import COPIED
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import FILE
from contentcuration.viewsets.sync.constants import INVITATION
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import SAVEDSEARCH
from contentcuration.viewsets.sync.constants import TASK
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import USER
from contentcuration.viewsets.sync.constants import VIEWER_M2M
from contentcuration.viewsets.sync.utils import get_and_clear_user_events
from contentcuration.viewsets.task import TaskViewSet
from contentcuration.viewsets.user import ChannelUserViewSet
from contentcuration.viewsets.user import UserViewSet


# Kept low to get more data on slow calls, we may make this more tolerant
# once we move to production.
SLOW_UPDATE_THRESHOLD = 10


class SlowSyncError(Exception):
    """
    Used to track slow sync operations. We don't raise this error,
    just feed it to Sentry for reporting.
    """

    def __init__(self, change_type, time, changes):
        self.change_type = change_type
        self.time = time
        self.changes = changes

        message = (
            "Change type {} took {} seconds to complete, exceeding {} second threshold."
        )
        self.message = message.format(
            self.change_type, self.time, SLOW_UPDATE_THRESHOLD
        )

        super(SlowSyncError, self).__init__(self.message)


class ChangeNotAllowed(Exception):
    """
    Used to report changes that are not supported by the backend
    """

    def __init__(self, change_type, viewset_class):
        self.change_type = change_type
        self.viewset_class = viewset_class
        self.message = "Change type {} not allowed on viewset {}.".format(
            change_type, viewset_class
        )

        super(ChangeNotAllowed, self).__init__(self.message)


# Uses ordered dict behaviour to enforce operation orders
viewset_mapping = OrderedDict(
    [
        (USER, UserViewSet),
        # If a new channel has been created, then any other operations that happen
        # within that channel depend on that, so we prioritize channel operations
        (CHANNEL, ChannelViewSet),
        (INVITATION, InvitationViewSet),
        # Tree operations require content nodes to exist, and any new assessment items
        # need to point to an existing content node
        (CONTENTNODE, ContentNodeViewSet),
        (CONTENTNODE_PREREQUISITE, PrerequisitesUpdateHandler),
        (CLIPBOARD, ClipboardViewSet),
        # The exact order of these three is not important.
        (ASSESSMENTITEM, AssessmentItemViewSet),
        (CHANNELSET, ChannelSetViewSet),
        (FILE, FileViewSet),
        (EDITOR_M2M, ChannelUserViewSet),
        (VIEWER_M2M, ChannelUserViewSet),
        (SAVEDSEARCH, SavedSearchViewSet),
        (TASK, TaskViewSet),
    ]
)

change_order = [
    # inserts
    COPIED,
    CREATED,
    # updates
    UPDATED,
    DELETED,
    MOVED,
]

table_name_indices = {
    table_name: i for i, table_name in enumerate(viewset_mapping.keys())
}


def get_table(obj):
    return obj["table"]


def get_table_sort_order(obj):
    return table_name_indices[get_table(obj)]


def get_change_type(obj):
    return obj["type"]


def get_change_order(obj):
    try:
        change_type = int(obj["type"])
    except ValueError:
        change_type = -1
    return change_order.index(change_type)


event_handlers = {
    CREATED: "create_from_changes",
    UPDATED: "update_from_changes",
    DELETED: "delete_from_changes",
    MOVED: "move_from_changes",
    COPIED: "copy_from_changes",
}


def handle_changes(request, viewset_class, change_type, changes):
    try:
        change_type = int(change_type)
        viewset = viewset_class(request=request)
        viewset.initial(request)
        if change_type in event_handlers:
            start = time.time()
            event_handler = getattr(viewset, event_handlers[change_type], None)
            if event_handler is None:
                raise ChangeNotAllowed(change_type, viewset_class)
            result = event_handler(changes)
            elapsed = time.time() - start

            if elapsed > SLOW_UPDATE_THRESHOLD:
                # This is really a warning rather than an actual error,
                # but using exceptions simplifies reporting it to Sentry,
                # so create and pass along the error but do not raise it.
                try:
                    # we need to raise it to get Python to fill out the stack trace.
                    raise SlowSyncError(change_type, elapsed, changes)
                except SlowSyncError as e:
                    report_exception(e)
            return result
    except Exception as e:
        # Capture exception and report, but allow sync
        # to complete properly.
        report_exception(e)

        if getattr(settings, "DEBUG", False) or getattr(settings, "TEST_ENV", False):
            raise
        else:
            # make sure we leave a record in the logs just in case.
            logging.error(e)
        for change in changes:
            change["errors"] = [str(e)]
        return changes, None


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(["POST"])
def sync(request):
    # Collect all error objects, which consist of the original change
    # plus any validation errors raised.
    errors = []
    # Collect all changes that should be propagated back to the client
    # this allows internal validation to take place and fields to be added
    # if needed by the server.
    changes_to_return = []
    data = sorted(request.data, key=get_table_sort_order)
    for table_name, group in groupby(data, get_table):
        if table_name in viewset_mapping:
            viewset_class = viewset_mapping[table_name]
            group = sorted(group, key=get_change_order)
            for change_type, changes in groupby(group, get_change_type):
                # Coerce changes iterator to list so it can be read multiple times
                es, cs = handle_changes(
                    request, viewset_class, change_type, list(changes)
                )
                if es:
                    errors.extend(es)
                if cs:
                    changes_to_return.extend(cs)

    # Add any changes that have been logged from elsewhere in our hacky redis
    # cache mechanism
    changes_to_return.extend(get_and_clear_user_events(request.user.id))
    if not errors:
        if changes_to_return:
            return Response({"changes": changes_to_return})
        else:
            return Response({})
    elif len(errors) < len(data) or len(changes_to_return):
        # If there are some errors, but not all, or all errors and some changes return a mixed response
        return Response(
            {"changes": changes_to_return, "errors": errors},
            status=HTTP_207_MULTI_STATUS,
        )
    else:
        # If the errors are total, and there are no changes reject the response outright!
        return Response({"errors": errors}, status=HTTP_400_BAD_REQUEST)
