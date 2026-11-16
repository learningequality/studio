import uuid
from contextlib import contextmanager

from django.db import connection
from django.db import connections
from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration.constants.locking import CHANNEL_CHANGE_LOCK
from contentcuration.constants.locking import USER_CHANGE_LOCK
from contentcuration.db.advisory_lock import _prepare_keys
from contentcuration.tasks import apply_channel_changes_task
from contentcuration.tasks import apply_user_changes_task
from contentcuration.tasks import channel_lock_key
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import BOOKMARK
from contentcuration.viewsets.sync.constants import CONTENTNODE


@contextmanager
def lock_held_elsewhere(key1, key2):
    other = connections.create_connection("default")
    try:
        with other.cursor() as c:
            c.execute("SELECT pg_advisory_lock(%s, %s)", _prepare_keys([key1, key2]))
        yield
    finally:
        other.close()


def lock_is_free(key1, key2):
    other = connections.create_connection("default")
    try:
        with other.cursor() as c:
            c.execute(
                "SELECT pg_try_advisory_lock(%s, %s)", _prepare_keys([key1, key2])
            )
            return c.fetchone()[0]
    finally:
        other.close()


class ApplyChangesTaskTestCase(SyncTestMixin, StudioTestCase):
    def setUp(self):
        super().setUp()
        self.user = testdata.user()
        self.channel = testdata.channel()
        self.channel.editors.add(self.user)
        self.other_channel = testdata.channel()
        self.other_channel.editors.add(self.user)

    def create_node_change(self, channel):
        node_id = uuid.uuid4().hex
        change = models.Change.create_change(
            generate_create_event(
                node_id,
                CONTENTNODE,
                {
                    "title": "node",
                    "id": node_id,
                    "kind": content_kinds.TOPIC,
                    "parent": channel.main_tree_id,
                },
                channel_id=channel.id,
            ),
            created_by_id=self.user.id,
        )
        return change, node_id

    def create_bookmark_change(self):
        return models.Change.create_change(
            generate_create_event(
                self.channel.id,
                BOOKMARK,
                {"channel": self.channel.id},
                user_id=self.user.id,
            ),
            created_by_id=self.user.id,
        )

    def run_channel_task(self, channel):
        apply_channel_changes_task.fetch_or_enqueue(self.user, channel_id=channel.id)

    def run_user_task(self):
        apply_user_changes_task.fetch_or_enqueue(self.user, user_id=self.user.id)

    def test_channel_lock__excludes_only_its_own_channel(self):
        locked_change, locked_node_id = self.create_node_change(self.channel)
        other_change, other_node_id = self.create_node_change(self.other_channel)
        self.create_bookmark_change()

        with lock_held_elsewhere(
            CHANNEL_CHANGE_LOCK, channel_lock_key(self.channel.id)
        ):
            self.run_channel_task(self.channel)
            self.run_channel_task(self.other_channel)
            self.run_user_task()

        self.assertEqual(models.CustomTaskMetadata.objects.count(), 3)
        locked_change.refresh_from_db()
        self.assertFalse(locked_change.applied)
        self.assertFalse(locked_change.errored)
        self.assertFalse(models.ContentNode.objects.filter(id=locked_node_id).exists())
        other_change.refresh_from_db()
        self.assertTrue(other_change.applied)
        self.assertTrue(models.ContentNode.objects.filter(id=other_node_id).exists())
        self.assertTrue(
            self.user.bookmarked_channels.filter(id=self.channel.id).exists()
        )

    def test_user_lock__excludes_its_own_user(self):
        change = self.create_bookmark_change()

        with lock_held_elsewhere(USER_CHANGE_LOCK, self.user.id):
            self.run_user_task()

        self.assertEqual(models.CustomTaskMetadata.objects.count(), 1)
        change.refresh_from_db()
        self.assertFalse(change.applied)
        self.assertFalse(change.errored)
        self.assertFalse(self.user.bookmarked_channels.exists())

    def test_channel_task__holds_lock_while_applying_changes(self):
        self.create_node_change(self.channel)
        lock_free_during_insert = []

        def probe_lock(execute, sql, params, many, context):
            if not lock_free_during_insert and sql.startswith(
                'INSERT INTO "contentcuration_contentnode"'
            ):
                lock_free_during_insert.append(
                    lock_is_free(CHANNEL_CHANGE_LOCK, channel_lock_key(self.channel.id))
                )
            return execute(sql, params, many, context)

        with connection.execute_wrapper(probe_lock):
            self.run_channel_task(self.channel)

        self.assertEqual(lock_free_during_insert, [False])

    def test_channel_task__requeues_for_change_created_before_unlock(self):
        self.create_node_change(self.channel)
        late_node_ids = []

        def create_change_before_unlock(execute, sql, params, many, context):
            if not late_node_ids and "pg_advisory_unlock" in sql:
                late_node_ids.append(self.create_node_change(self.channel)[1])
            return execute(sql, params, many, context)

        with connection.execute_wrapper(create_change_before_unlock):
            self.run_channel_task(self.channel)

        self.assertTrue(models.ContentNode.objects.filter(id=late_node_ids[0]).exists())
