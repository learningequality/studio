import random

from contentcuration.viewsets.sync.utils import generate_create_event as base_generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event as base_generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event as base_generate_update_event


def generate_create_event(*args, **kwargs):
    event = base_generate_create_event(*args, **kwargs)
    event["rev"] = random.randint(1, 10000000)
    return event


def generate_delete_event(*args, **kwargs):
    event = base_generate_delete_event(*args, **kwargs)
    event["rev"] = random.randint(1, 10000000)
    return event


def generate_update_event(*args, **kwargs):
    event = base_generate_update_event(*args, **kwargs)
    event["rev"] = random.randint(1, 10000000)
    return event
