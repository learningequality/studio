import random

from django.urls import reverse

from contentcuration.celery import app
from contentcuration.models import Change
from contentcuration.tests.helpers import clear_tasks
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import SYNCED
from contentcuration.viewsets.sync.utils import _generate_event as base_generate_event
from contentcuration.viewsets.sync.utils import (
    generate_copy_event as base_generate_copy_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_create_event as base_generate_create_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_delete_event as base_generate_delete_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_deploy_event as base_generate_deploy_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_publish_event as base_generate_publish_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_publish_next_event as base_generate_publish_next_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_update_descendants_event as base_generate_update_descendants_event,
)
from contentcuration.viewsets.sync.utils import (
    generate_update_event as base_generate_update_event,
)


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


def generate_sync_channel_event(
    channel_id, titles_and_descriptions, resource_details, files, assessment_items
):
    event = base_generate_event(
        key=channel_id,
        table=CHANNEL,
        event_type=SYNCED,
        channel_id=channel_id,
        user_id=None,
    )
    event["rev"] = random.randint(1, 10000000)
    event["titles_and_descriptions"] = titles_and_descriptions
    event["resource_details"] = resource_details
    event["files"] = files
    event["assessment_items"] = assessment_items
    return event


def generate_deploy_channel_event(channel_id, user_id):
    event = base_generate_deploy_event(channel_id, user_id=user_id)
    event["rev"] = random.randint(1, 10000000)
    return event


def generate_update_descendants_event(*args, **kwargs):
    event = base_generate_update_descendants_event(*args, **kwargs)
    event["rev"] = random.randint(1, 10000000)
    return event


def generate_publish_channel_event(channel_id):
    event = base_generate_publish_event(channel_id)
    event["rev"] = random.randint(1, 10000000)
    return event


def generate_publish_next_event(channel_id, use_staging_tree=False):
    event = base_generate_publish_next_event(
        channel_id, use_staging_tree=use_staging_tree
    )
    event["rev"] = random.randint(1, 10000000)
    return event


class SyncTestMixin(object):
    celery_task_always_eager = None

    @classmethod
    def setUpClass(cls):
        super(SyncTestMixin, cls).setUpClass()
        # update celery so tasks are always eager for this test, meaning they'll execute synchronously
        cls.celery_task_always_eager = app.conf.task_always_eager
        app.conf.update(task_always_eager=True)

    def setUp(self):
        super(SyncTestMixin, self).setUp()
        clear_tasks()

    @classmethod
    def tearDownClass(cls):
        super(SyncTestMixin, cls).tearDownClass()
        app.conf.update(task_always_eager=cls.celery_task_always_eager)

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
        return Change.objects.filter(
            server_rev__in=[c["server_rev"] for c in response.json()["allowed"]]
        )
