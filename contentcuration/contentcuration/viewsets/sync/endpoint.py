"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
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

from contentcuration.viewsets.assessmentitem import AssessmentItemViewSet
from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.contentnode import ContentNodeViewSet
from contentcuration.viewsets.file import FileViewSet
from contentcuration.viewsets.invitation import InvitationViewSet
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import COPIED
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import CREATED_RELATION
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import DELETED_RELATION
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import FILE
from contentcuration.viewsets.sync.constants import INVITATION
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import SAVEDSEARCH
from contentcuration.viewsets.sync.constants import TREE
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import USER
from contentcuration.viewsets.sync.constants import VIEWER_M2M
from contentcuration.viewsets.sync.utils import get_and_clear_user_events
from contentcuration.viewsets.tree import TreeViewSet
from contentcuration.viewsets.user import ChannelUserViewSet
from contentcuration.viewsets.user import UserViewSet
from contentcuration.utils.sentry import report_exception


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
        # The exact order of these three is not important.
        (ASSESSMENTITEM, AssessmentItemViewSet),
        (CHANNELSET, ChannelSetViewSet),
        (TREE, TreeViewSet),
        (FILE, FileViewSet),
        (EDITOR_M2M, ChannelUserViewSet),
        (VIEWER_M2M, ChannelUserViewSet),
        (SAVEDSEARCH, SavedSearchViewSet),
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
    CREATED_RELATION,
    DELETED_RELATION,
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
    CREATED_RELATION: "create_relation_from_changes",
    DELETED_RELATION: "delete_relation_from_changes",
}


def handle_changes(request, viewset_class, change_type, changes):
    try:
        change_type = int(change_type)
    except ValueError:
        pass
    else:
        viewset = viewset_class(request=request)
        viewset.initial(request)
        if change_type in event_handlers:
            try:
                return getattr(viewset, event_handlers[change_type])(changes)
            except Exception as e:
                # Capture exception and report, but allow sync
                # to complete properly.
                report_exception(e)
                if getattr(settings, "DEBUG", False):
                    raise
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
