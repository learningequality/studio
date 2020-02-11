def generate_create_event(key, obj):
    return {
        "obj": obj,
        "key": key,
    }


def generate_update_event(key, mods):
    return {
        "mods": mods,
        "key": key,
    }


def generate_delete_event(key):
    return {
        "key": key,
    }


def generate_move_event(key, target, position):
    return {"key": key, "target": target, "position": position}
