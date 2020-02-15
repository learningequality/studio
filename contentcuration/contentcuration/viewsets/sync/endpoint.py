"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
from collections import OrderedDict
from itertools import groupby

from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_207_MULTI_STATUS
from rest_framework.status import HTTP_400_BAD_REQUEST

from contentcuration.viewsets.assessmentitem import AssessmentItemViewSet
from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.contentnode import ContentNodeViewSet
from contentcuration.viewsets.file import FileViewSet
from contentcuration.viewsets.tree import TreeViewSet
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.constants import FILE
from contentcuration.viewsets.sync.constants import TREE


# Uses ordered dict behaviour to enforce operation orders
viewset_mapping = OrderedDict(
    [
        # If a new channel has been created, then any other operations that happen
        # within that channel depend on that, so we prioritize channel operations
        (CHANNEL, ChannelViewSet),
        # Tree operations require content nodes to exist, and any new assessment items
        # need to point to an existing content node
        (CONTENTNODE, ContentNodeViewSet),
        # The exact order of these three is not important.
        (ASSESSMENTITEM, AssessmentItemViewSet),
        (CHANNELSET, ChannelSetViewSet),
        (TREE, TreeViewSet),
        (FILE, FileViewSet),
    ]
)

table_name_indices = {
    table_name: i for i, table_name in enumerate(viewset_mapping.keys())
}


def get_table(obj):
    return obj["table"]


def get_table_sort_order(obj):
    return table_name_indices[get_table(obj)]


def get_change_type(obj):
    return obj["type"]


def apply_changes(request, viewset, change_type, id_attr, changes_from_client):
    errors = []
    changes_to_return = []
    if change_type == CREATED:
        new_data = list(
            map(
                lambda x: dict([(k, v) for k, v in x["obj"].items()] + [(id_attr, x["key"])]),
                changes_from_client,
            )
        )
        errors, changes_to_return = viewset.bulk_create(request, data=new_data)
    elif change_type == UPDATED:
        change_data = list(
            map(
                lambda x: dict([(k, v) for k, v in x["mods"].items()] + [(id_attr, x["key"])]),
                changes_from_client,
            )
        )
        errors, changes_to_return = viewset.bulk_update(request, data=change_data)
    elif change_type == DELETED:
        ids_to_delete = list(map(lambda x: x["key"], changes_from_client))
        errors, changes_to_return = viewset.bulk_delete(ids_to_delete)
    elif change_type == MOVED and hasattr(viewset, "move"):
        for move in changes_from_client:
            # Move change will have key, must also have target property
            # optionally can include the desired position.
            move_error, move_change = viewset.move(move["key"], **move)
            if move_error:
                move.update({"errors": [move_error]})
                errors.append(move)
            if move_change:
                changes_to_return.append(move_change)
    return errors, changes_to_return


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
            id_attr = viewset_class.id_attr()
            group = sorted(group, key=get_change_type)
            for change_type, changes in groupby(group, get_change_type):
                try:
                    change_type = int(change_type)
                except ValueError:
                    pass
                else:
                    viewset = viewset_class(request=request)
                    viewset.initial(request)
                    es, cs = apply_changes(
                        request, viewset, change_type, id_attr, changes
                    )
                    errors.extend(es)
                    changes_to_return.extend(cs)
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
