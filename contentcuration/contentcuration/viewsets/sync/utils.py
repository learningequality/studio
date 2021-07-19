import logging

from django.conf import settings
from django.core.cache import cache

from contentcuration.utils.sentry import report_exception
from contentcuration.viewsets.sync.constants import ALL_TABLES
from contentcuration.viewsets.sync.constants import COPIED
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import USER_CHANGES_PREFIX


def validate_table(table):
    if table not in ALL_TABLES:
        raise ValueError("{} is not a valid table name".format(table))


def generate_create_event(key, table, obj):
    validate_table(table)
    return {
        "obj": obj,
        "key": key,
        "table": table,
        "type": CREATED,
    }


def generate_update_event(key, table, mods):
    validate_table(table)
    return {
        "mods": mods,
        "key": key,
        "table": table,
        "type": UPDATED,
    }


def generate_delete_event(key, table):
    validate_table(table)
    return {
        "key": key,
        "table": table,
        "type": DELETED,
    }


def generate_move_event(key, table, target, position):
    validate_table(table)
    return {
        "key": key,
        "target": target,
        "position": position,
        "table": table,
        "type": MOVED,
    }


def generate_copy_event(
    key, table, from_key, target, position=None, mods=None, excluded_descendants=None
):
    validate_table(table)
    return {
        "key": key,
        "from_key": from_key,
        "target": target,
        "position": position,
        "mods": mods,
        "excluded_descendants": excluded_descendants,
        "table": table,
        "type": COPIED,
    }


def add_event_for_user(user_id, event):
    cache_key = USER_CHANGES_PREFIX.format(user_id=user_id)
    user_events = cache.get(cache_key) or []
    user_events.append(event)
    cache.set(cache_key, user_events, None)


def get_and_clear_user_events(user_id):
    cache_key = USER_CHANGES_PREFIX.format(user_id=user_id)
    user_events = cache.get(cache_key) or []
    cache.delete(cache_key)
    return user_events


def log_sync_exception(e):
    # Capture exception and report, but allow sync
    # to complete properly.
    report_exception(e)

    if getattr(settings, "DEBUG", False) or getattr(settings, "TEST_ENV", False):
        raise
    # make sure we leave a record in the logs just in case.
    logging.error(e)
