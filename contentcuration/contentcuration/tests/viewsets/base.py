import random

from django.urls import reverse

from contentcuration.models import Change
from contentcuration.viewsets.sync.utils import generate_copy_event as base_generate_copy_event
from contentcuration.viewsets.sync.utils import generate_create_event as base_generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event as base_generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event as base_generate_update_event


def generate_copy_event(*args, **kwargs):
    event = base_generate_copy_event(*args, **kwargs)
    event["rev"] = random.randint(1, 10000000)
    return event


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


class SyncTestMixin(object):
    @property
    def sync_url(self):
        return reverse("sync")

    def sync_changes(self, changes):
        channel_ids = set(c.get("channel_id") for c in changes)
        channel_revs = {}
        for channel_id in channel_ids:
            if channel_id:
                channel_revs[channel_id] = 0
        return self.client.post(
            self.sync_url,
            {"changes": changes, "channel_revs": channel_revs},
            format="json",
        )

    def get_allowed_changes(self, response):
        return Change.objects.filter(server_rev__in=[c['server_rev'] for c in response.json()["allowed"]])
