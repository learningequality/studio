import logging

from django.conf import settings

from contentcuration.utils.sentry import report_exception
from contentcuration.viewsets.sync.constants import ALL_TABLES
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import COPIED
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import DEPLOYED
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import PUBLISHED
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import UPDATED_DESCENDANTS
from contentcuration.viewsets.sync.constants import PUBLISHED_NEXT


def validate_table(table):
    if table not in ALL_TABLES:
        raise ValueError("{} is not a valid table name".format(table))


def _generate_event(key, table, event_type, channel_id, user_id):
    validate_table(table)
    event = {
        "key": key,
        "table": table,
        "type": event_type,
    }
    if channel_id:
        event["channel_id"] = channel_id
    if user_id:
        event["user_id"] = user_id
    return event


def generate_create_event(key, table, obj, channel_id=None, user_id=None):
    event = _generate_event(key, table, CREATED, channel_id, user_id)
    event["obj"] = obj
    return event


def generate_update_event(key, table, mods, channel_id=None, user_id=None):
    event = _generate_event(key, table, UPDATED, channel_id, user_id)
    event["mods"] = mods
    return event


def generate_delete_event(key, table, channel_id=None, user_id=None):
    return _generate_event(key, table, DELETED, channel_id, user_id)


def generate_move_event(key, table, target, position, channel_id=None, user_id=None):
    event = _generate_event(key, table, MOVED, channel_id, user_id)
    event["target"] = target
    event["position"] = position
    return event


def generate_copy_event(
    key, table, from_key, target, position=None, mods=None, excluded_descendants=None, channel_id=None, user_id=None
):
    event = _generate_event(key, table, COPIED, channel_id, user_id)
    event["from_key"] = from_key
    event["target"] = target
    event["position"] = position
    event["mods"] = mods
    event["excluded_descendants"] = excluded_descendants
    return event


def generate_publish_event(
    key, version_notes="", language=None
):
    event = _generate_event(key, CHANNEL, PUBLISHED, key, None)
    event["version_notes"] = version_notes
    event["language"] = language
    return event


def generate_deploy_event(key, user_id):
    event = _generate_event(key, CHANNEL, DEPLOYED, channel_id=key, user_id=user_id)
    return event

def generate_update_descendants_event(key, mods, channel_id=None, user_id=None):
    event = _generate_event(key, CONTENTNODE, UPDATED_DESCENDANTS, channel_id, user_id)
    event["mods"] = mods
    return event

def generate_publish_next_event(key, version_notes="", language=None):
    event = _generate_event(key, CHANNEL, PUBLISHED_NEXT, key, None)
    event["version_notes"] = version_notes
    event["language"] = language
    return event

def log_sync_exception(e, user=None, change=None, changes=None):
    # Capture exception and report, but allow sync
    # to complete properly.

    contexts = {}

    if change is not None:
        contexts["change"] = change

    elif changes is not None:
        contexts["changes"] = changes

    # in production, we'll get duplicates in Sentry if we log the exception here.
    if settings.DEBUG:
        # make sure we leave a record in the logs just in case.
        logging.exception(e)

    report_exception(e, user=user, contexts=contexts)
