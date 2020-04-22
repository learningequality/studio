from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import MOVED
from contentcuration.viewsets.sync.constants import ALL_TABLES


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
