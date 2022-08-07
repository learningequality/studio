import uuid

from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration.models import Change
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.viewsets.sync.constants import BOOKMARK
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import EDITOR_M2M


class NoneCreatedByIdError(Exception):
    """
    Use to log change object whose created_by_id. We don't raise this error,
    just feed it to Sentry for reporting.
    """

    def __init__(self, instance):

        self.change_object = instance
        message = (
            "The change object did not have a created_by_id {}"
        )
        self.message = message.format(
            instance.__dict__
        )

        super(NoneCreatedByIdError, self).__init__(self.message)


def bookmark_metadata(channel):
    return {
        "channel": channel.id,
    }


def contentnode_db_metadata(channel):
    return {
        "title": "Aron's cool contentnode",
        "id": uuid.uuid4().hex,
        "kind_id": content_kinds.VIDEO,
        "description": "coolest contentnode this side of the Pacific",
        "parent_id": channel.main_tree_id,
    }


def create_user_specific_change_object(user, channel):
    bookmark = bookmark_metadata(channel)
    change_obj = Change.create_change(generate_create_event(
        bookmark["channel"],
        BOOKMARK,
        bookmark,
        user_id=user.id,
    ), created_by_id=user.id)
    change_obj.applied = True
    change_obj.save()
    change_serialized = Change.serialize(change_obj)
    return change_serialized


def create_channel_specific_change_object(user, channel):
    new_name = "This is not the old name"
    change_obj = Change.create_change(generate_update_event(channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id), created_by_id=user.id)
    change_obj.applied = True
    change_obj.save()
    change_serialized = Change.serialize(change_obj)
    return change_serialized


def create_channel_user_common_change_object(user, channel):
    editor = user
    change_obj = Change.create_change(generate_create_event([editor.id, channel.id], EDITOR_M2M, {},
                                                            channel_id=channel.id, user_id=editor.id), created_by_id=user.id)
    change_obj.applied = True
    change_obj.save()
    change_serialized = Change.serialize(change_obj)
    return change_serialized


def create_errored_change_object(user, channel):
    contentnode = models.ContentNode.objects.create(**contentnode_db_metadata(channel))
    tag = "howzat!"
    change_obj = Change.create_change(generate_update_event(contentnode.id, CONTENTNODE, {
        "tags": [tag]}, channel_id=channel.id), created_by_id=user.id)
    change_obj.errored = True
    change_obj.save()
    change_serialized = Change.serialize(change_obj)
    return change_serialized
