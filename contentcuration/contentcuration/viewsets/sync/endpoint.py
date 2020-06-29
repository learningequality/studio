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
from contentcuration.viewsets.invitation import InvitationViewSet
from contentcuration.viewsets.user import ChannelUserViewSet
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import COPIED
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import FILE
from contentcuration.viewsets.sync.constants import INVITATION
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import TREE
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import VIEWER_M2M
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import CREATED_RELATION
from contentcuration.viewsets.sync.constants import DELETED_RELATION
from contentcuration.viewsets.sync.constants import USER
from contentcuration.viewsets.sync.utils import get_and_clear_user_events
from contentcuration.viewsets.tree import TreeViewSet
from contentcuration.viewsets.user import UserViewSet


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


def listify(thing):
    return thing if isinstance(thing, list) else [thing]


def apply_changes(
    request, viewset, change_type, id_attr, changes_from_client
):  # noqa:C901
    errors = []
    changes_to_return = []
    if change_type == CREATED:
        new_data = list(
            map(
                lambda x: dict(
                    [(k, v) for k, v in x["obj"].items()] + [(id_attr, x["key"])]
                ),
                changes_from_client,
            )
        )
        errors, changes_to_return = viewset.bulk_create(request, data=new_data)
    elif change_type == UPDATED:
        change_data = list(
            map(
                lambda x: dict(
                    [(k, v) for k, v in x["mods"].items()] + [(id_attr, x["key"])]
                ),
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
            move_error, move_change = viewset.move(move["key"], **move["mods"])
            if move_error:
                move.update({"errors": [move_error]})
                errors.append(move)
            if move_change:
                changes_to_return.extend(listify(move_change))
    elif change_type == COPIED and hasattr(viewset, "copy"):
        for copy in changes_from_client:
            # Copy change will have key, must also have other attributes, defined in `copy`
            copy_error, copy_change = viewset.copy(
                copy["key"],
                user=request.user,
                from_key=copy["from_key"],
                **copy["mods"]
            )
            if copy_error:
                copy.update({"errors": [copy_error]})
                errors.append(copy)
            if copy_change:
                changes_to_return.extend(listify(copy_change))
    elif change_type == CREATED_RELATION and hasattr(viewset, "create_relation"):
        for relation in changes_from_client:
            # Create relation will have an object that at minimum has the keys
            # for the two objects being related.
            relation_error, relation_change = viewset.create_relation(request, relation)
            if relation_error:
                relation.update({"errors": [relation_error]})
                errors.append(relation)
            if relation_change:
                changes_to_return.extend(listify(relation_change))
    elif change_type == DELETED_RELATION and hasattr(viewset, "delete_relation"):
        for relation in changes_from_client:
            # Delete relation will have an object that at minimum has the keys
            # for the two objects whose relationship is being destroyed.
            relation_error, relation_change = viewset.delete_relation(request, relation)
            if relation_error:
                relation.update({"errors": [relation_error]})
                errors.append(relation)
            if relation_change:
                changes_to_return.extend(listify(relation_change))
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
            group = sorted(group, key=get_change_order)
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
