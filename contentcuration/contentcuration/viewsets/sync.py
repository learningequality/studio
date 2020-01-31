"""
A view that handles synchronization of changes from the frontend
and deals with processing all the changes to make appropriate
bulk creates, updates, and deletes.
"""
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

from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.contentnode import ContentNodeViewSet


viewset_mapping = {
    "channel": ChannelViewSet,
    "channelset": ChannelSetViewSet,
    "contentnode": ContentNodeViewSet,
}

# Change type constants
CREATED = 1
UPDATED = 2
DELETED = 3
MOVED = 4


def get_table(obj):
    return obj["table"]


def get_change_type(obj):
    return obj["type"]


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(["POST"])
def sync(request):
    # Collect all error objects, which consist of the original change
    # plus any validation errors raised.
    errors = []
    data = sorted(request.data, key=get_table)
    for table_name, group in groupby(data, get_table):
        if table_name in viewset_mapping:
            viewset_class = viewset_mapping[table_name]
            id_attr = viewset_class.serializer_class.id_attr()
            group = sorted(group, key=get_change_type)
            for change_type, changes in groupby(group, get_change_type):
                try:
                    change_type = int(change_type)
                    viewset = viewset_class(request=request)
                    viewset.initial(request)
                    if change_type == CREATED:
                        new_data = list(
                            map(
                                lambda x: dict(
                                    x["obj"].items() + [(id_attr, x["key"])]
                                ),
                                changes,
                            )
                        )
                        errors.extend(viewset.bulk_create(request, data=new_data))
                    elif change_type == UPDATED:
                        change_data = list(
                            map(
                                lambda x: dict(
                                    x["mods"].items() + [(id_attr, x["key"])]
                                ),
                                changes,
                            )
                        )
                        errors.extend(viewset.bulk_update(request, data=change_data))
                    elif change_type == DELETED:
                        ids_to_delete = list(map(lambda x: x["key"], changes))
                        viewset.bulk_delete(ids_to_delete)
                    elif change_type == MOVED and hasattr(viewset, "move"):
                        for move in changes:
                            # Move change will have key, must also have target property
                            # optionally can include the desired position.
                            move_error = viewset.move(move["key"], **move)
                            if move_error:
                                move.update({"errors": [move_error]})
                                errors.append(move)
                except ValueError:
                    pass
    if not errors:
        return Response()
    elif len(errors) < len(data):
        # If there are some errors, but not all, return a mixed response
        return Response(errors, status=HTTP_207_MULTI_STATUS)
    else:
        # If the errors are total, reject the response outright!
        return Response(errors, status=HTTP_400_BAD_REQUEST)
