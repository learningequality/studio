import json
import random
import uuid
from datetime import datetime
from datetime import timedelta

import pytest
import requests
from celery import states
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.urls import reverse_lazy
from django_celery_results.models import TaskResult
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration import models as cc
from contentcuration.constants import user_history
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import UserHistory
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.testdata import tree
from contentcuration.utils.db_tools import create_user
from contentcuration.utils.garbage_collect import clean_up_contentnodes
from contentcuration.utils.garbage_collect import clean_up_deleted_chefs
from contentcuration.utils.garbage_collect import clean_up_feature_flags
from contentcuration.utils.garbage_collect import clean_up_soft_deleted_users
from contentcuration.utils.garbage_collect import clean_up_stale_files
from contentcuration.utils.garbage_collect import clean_up_tasks
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.views.internal import api_commit_channel
from contentcuration.views.internal import create_channel

pytestmark = pytest.mark.django_db


class NodeSettingTestCase(BaseAPITestCase):
    def setUp(self):
        super(NodeSettingTestCase, self).setUp()
        # Set up ricecooker trees
        self.channel.staging_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="aaa"
        )
        self.channel.staging_tree.save()
        self.channel.previous_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="bbb"
        )
        self.channel.previous_tree.save()
        self.channel.chef_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="ccc"
        )
        self.channel.chef_tree.save()
        self.channel.save()

        self.contentnode = cc.ContentNode.objects.create(kind_id="video")

    def test_garbage_node_created(self):
        # Make sure loadconstants created the garbage node
        self.assertTrue(
            cc.ContentNode.objects.filter(pk=settings.ORPHANAGE_ROOT_ID).exists()
        )

    def test_file_move(self):
        node = self.contentnode

        # Move node and check if it's still in the garbage tree
        node.parent_id = self.channel.main_tree.pk
        node.save()
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Node shouldn't be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, node.tree_id)

    def test_old_chef_tree(self):
        # make an actual tree for deletion tests
        tree(parent=self.channel.chef_tree)
        chef_tree = self.channel.chef_tree
        self.assertTrue(chef_tree.get_descendant_count() > 0)
        garbage_node = get_deleted_chefs_root()

        self.assertNotEqual(chef_tree, self.channel.staging_tree)
        # Chef tree shouldn't be in garbage tree until create_channel is called
        self.assertFalse(
            garbage_node.get_descendants().filter(pk=chef_tree.pk).exists()
        )
        create_channel(self.channel.__dict__, self.user)
        garbage_node.refresh_from_db()
        chef_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # We can't use MPTT methods to test the deleted chefs tree because we are not running the sort code
        # for performance reasons, so just do a parent test instead.
        self.assertEquals(chef_tree.parent.pk, garbage_node.pk)

        # New staging tree should not be in garbage tree
        self.assertFalse(self.channel.chef_tree.parent)
        self.assertNotEqual(garbage_node.tree_id, self.channel.chef_tree.tree_id)

        child_pk = chef_tree.children.first().pk

        clean_up_deleted_chefs()

        self.assertFalse(cc.ContentNode.objects.filter(parent=garbage_node).exists())
        self.assertFalse(cc.ContentNode.objects.filter(pk=child_pk).exists())

    def test_old_staging_tree(self):
        staging_tree = self.channel.staging_tree
        garbage_node = get_deleted_chefs_root()

        tree(parent=staging_tree)
        self.assertTrue(staging_tree.get_descendant_count() > 0)

        # Staging tree shouldn't be in garbage tree until api_commit_channel is called
        self.assertFalse(
            garbage_node.get_descendants().filter(pk=staging_tree.pk).exists()
        )
        request = self.create_post_request(
            reverse_lazy("api_finish_channel"),
            data=json.dumps({"channel_id": self.channel.pk}),
            content_type="application/json",
        )
        response = api_commit_channel(request)
        self.assertEqual(response.status_code, 200)
        garbage_node.refresh_from_db()
        staging_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # We can't use MPTT methods on the deleted chefs tree because we are not running the sort code
        # for performance reasons, so just do a parent test instead.
        self.assertEqual(staging_tree.parent, garbage_node)

        # New staging tree should not be in garbage tree
        self.assertFalse(self.channel.main_tree.parent)
        self.assertNotEqual(garbage_node.tree_id, self.channel.main_tree.tree_id)

        child_pk = staging_tree.children.first().pk

        clean_up_deleted_chefs()

        self.assertFalse(cc.ContentNode.objects.filter(parent=garbage_node).exists())
        self.assertFalse(cc.ContentNode.objects.filter(pk=child_pk).exists())


THREE_MONTHS_AGO = datetime.now() - timedelta(days=93)


def _create_expired_contentnode(creation_date=THREE_MONTHS_AGO):
    c = ContentNode.objects.create(
        kind_id=content_kinds.TOPIC,
        title="test",
        modified=creation_date,
        created=creation_date,
        parent_id=settings.ORPHANAGE_ROOT_ID,
    )
    # Use q queryset.update() to bypass auto_now's forced setting of
    # created to now()
    ContentNode.objects.filter(pk=c.pk).update(
        created=creation_date,
        modified=creation_date,
    )
    return c


def _create_deleted_user_in_past(deletion_datetime, email="test@test.com"):
    user = create_user(email, "password", "test", "test")
    user.delete()

    user_latest_delete_history = (
        UserHistory.objects.filter(user_id=user.id, action=user_history.DELETION)
        .order_by("-performed_at")
        .first()
    )
    user_latest_delete_history.performed_at = deletion_datetime
    user_latest_delete_history.save()
    return user


class CleanUpSoftDeletedExpiredUsersTestCase(StudioTestCase):
    def test_cleanup__all_expired_soft_deleted_users(self):
        expired_users = []
        for i in range(0, 5):
            expired_users.append(
                _create_deleted_user_in_past(
                    deletion_datetime=THREE_MONTHS_AGO, email=f"test-{i}@test.com"
                )
            )

        clean_up_soft_deleted_users()

        for user in expired_users:
            assert (
                UserHistory.objects.filter(
                    user_id=user.id, action=user_history.RELATED_DATA_HARD_DELETION
                ).exists()
                is True
            )

    def test_no_cleanup__unexpired_soft_deleted_users(self):
        two_months_ago = datetime.now() - timedelta(days=63)
        user = _create_deleted_user_in_past(deletion_datetime=two_months_ago)
        clean_up_soft_deleted_users()
        assert (
            UserHistory.objects.filter(
                user_id=user.id, action=user_history.RELATED_DATA_HARD_DELETION
            ).exists()
            is False
        )

    def test_no_cleanup__undeleted_users(self):
        user = create_user("test@test.com", "password", "test", "test")
        clean_up_soft_deleted_users()
        assert user.deleted is False
        assert (
            UserHistory.objects.filter(
                user_id=user.id, action=user_history.RELATED_DATA_HARD_DELETION
            ).exists()
            is False
        )


class CleanUpContentNodesTestCase(StudioTestCase):
    def test_delete_all_contentnodes_in_orphanage_tree(self):
        """
        Make sure that by default, all nodes created with a timestamp of 3 months
        ago doesn't exist anymore.
        """

        # create our contentnodes that will go under our garbage tree
        num_contentnodes = 3
        for _ in range(num_contentnodes):
            _create_expired_contentnode()

        # sanity check to see if we have X contentnodes under the garbage tree
        assert (
            ContentNode.objects.filter(parent_id=settings.ORPHANAGE_ROOT_ID).count()
            == num_contentnodes
        )

        # now clean up our contentnodes, and check that our descendant count is indeed 0 now
        clean_up_contentnodes()
        assert (
            ContentNode.objects.filter(parent_id=settings.ORPHANAGE_ROOT_ID).count()
            == 0
        )

    def test_deletes_associated_files(self):

        # Delete all test data files created by StudioTestCase's setUp.
        File.objects.all().delete()

        c = _create_expired_contentnode()
        f = File.objects.create(
            contentnode_id=c.pk,
            file_on_disk=ContentFile(b"test"),
            checksum="aaa",
        )

        f.file_on_disk.save("aaa.jpg", ContentFile("aaa"))
        file_url = f.file_on_disk.url

        # check that file_url exists before cleaning up
        requests.head(file_url).raise_for_status()
        clean_up_contentnodes()

        # there should be no file object in the DB
        assert File.objects.count() == 0

    def test_doesnt_delete_shared_files(self):
        """
        Make sure that a file shared between two file objects doesn't
        get deleted when one of the file objects gets deleted
        """
        c = _create_expired_contentnode()
        file_on_disk = ContentFile(b"test")
        f = File.objects.create(
            contentnode_id=c.pk,
            file_on_disk=file_on_disk,
            checksum="aaa",
        )
        f.file_on_disk.save("aaa.jpg", file_on_disk)
        file_url = f.file_on_disk.url

        c2 = ContentNode.objects.create(kind_id=content_kinds.TOPIC, title="test")
        f2 = File.objects.create(
            contentnode_id=c2.pk,
            file_on_disk=file_on_disk,
            checksum="aaa",
        )
        f2.file_on_disk.save("aaa.jpg", file_on_disk)

        # check that file_url exists before cleaning up
        requests.head(file_url).raise_for_status()
        clean_up_contentnodes()

        # the file should still be available
        response = requests.head(file_url)
        assert response.status_code == 200

    def test_doesnt_delete_nonorphan_files_and_contentnodes(self):
        """
        Make sure that clean_up_contentnodes doesn't touch non-orphan files and
        contentnodes. Bad things will happen if we do.
        """
        # this legit tree, since it's not attached to our
        # orphan tree, should still exist after cleanup
        legit_tree = ContentNode.objects.create(
            kind_id=content_kinds.TOPIC,
        )
        # this file should still be here too since we attach
        # it to our legit tree
        f = File.objects.create(
            contentnode=legit_tree,
        )

        # this node should be gone
        expired_node = _create_expired_contentnode()

        # do our cleanup!
        clean_up_contentnodes()

        # assert that out expired node doesn't exist
        assert not ContentNode.objects.filter(pk=expired_node.pk).exists()

        # assert that our legit tree still exists
        assert ContentNode.objects.filter(pk=legit_tree.pk).exists()
        assert File.objects.filter(pk=f.pk).exists()

    def test_doesnt_delete_old_legit_tree(self):
        """
        Make sure we don't delete an old content tree, as long as it's not under the
        orphan tree.
        """

        # orphan node. This shouldn't exist anymore at the end of our test.
        orphan_node = _create_expired_contentnode()

        # our old, but not orphaned tree. This should exist at the end of our test.
        legit_node = ContentNode.objects.create(
            kind_id=content_kinds.TOPIC,
        )
        # mark the legit_node as old
        ContentNode.objects.filter(pk=legit_node.pk).update(
            created=THREE_MONTHS_AGO,
            modified=THREE_MONTHS_AGO,
        )

        clean_up_contentnodes()

        # is our orphan gone? :(
        assert not ContentNode.objects.filter(pk=orphan_node.pk).exists()
        # is our senior, legit node still around? :)
        assert ContentNode.objects.filter(pk=legit_node.pk).exists()

    def test_doesnt_delete_file_referenced_by_orphan_and_nonorphan_nodes(self):
        """
        Make sure we don't delete a file, as long as it's referenced
        by a non-orphan node.
        """

        # Our orphan, to be taken soon from this world
        orphan_node = _create_expired_contentnode()

        # our legit node, standing proud and high with its non-orphaned status
        legit_node = ContentNode.objects.create(
            kind_id=content_kinds.VIDEO,
        )

        f = File.objects.create(
            contentnode=legit_node,
            checksum="aaa",
        )
        forphan = File.objects.create(
            contentnode=orphan_node,
            checksum="aaa",
        )

        # The file they both share. This has the same checksum and contents.
        # Alas, a file cannot have an orphan and non-orphan reference. This must
        # not be deleted.
        f.file_on_disk.save("aaa.jpg", ContentFile("aaa"))
        forphan.file_on_disk.save("aaa.jpg", ContentFile("aaa"))

        # check that our file exists in object storage
        assert default_storage.exists("storage/a/a/aaa.jpg")

        clean_up_contentnodes()

        assert default_storage.exists("storage/a/a/aaa.jpg")


class CleanUpFeatureFlagsTestCase(StudioTestCase):
    def setUp(self):
        return super(CleanUpFeatureFlagsTestCase, self).setUpBase()

    def test_clean_up(self):
        key = "feature_flag_does_not_exist"
        self.user.feature_flags = {key: True}
        self.user.save()
        clean_up_feature_flags()
        self.user.refresh_from_db()
        self.assertNotIn(key, self.user.feature_flags)


class CleanupTaskTestCase(StudioTestCase):
    def setUp(self):
        self.pruned_task = TaskResult.objects.create(
            task_id=uuid.uuid4().hex, status=states.SUCCESS, task_name="pruned_task"
        )
        self.failed_task = TaskResult.objects.create(
            task_id=uuid.uuid4().hex, status=states.FAILURE, task_name="failed_task"
        )
        self.recent_task = TaskResult.objects.create(
            task_id=uuid.uuid4().hex, status=states.SUCCESS, task_name="recent_task"
        )

        # `date_done` uses `auto_now`, so manually set it
        done = datetime.now() - timedelta(days=8)
        TaskResult.objects.filter(
            pk__in=[self.pruned_task.pk, self.failed_task.pk]
        ).update(date_done=done)
        # run
        clean_up_tasks()

    def test_pruned_task(self):
        with self.assertRaises(TaskResult.DoesNotExist):
            TaskResult.objects.get(task_id=self.pruned_task.task_id)

    def test_failed_task(self):
        with self.assertRaises(TaskResult.DoesNotExist):
            TaskResult.objects.get(task_id=self.pruned_task.task_id)

    def test_recent_task(self):
        try:
            TaskResult.objects.get(task_id=self.recent_task.task_id)
        except TaskResult.DoesNotExist:
            self.fail("Task was removed")


TWO_DAYS_AGO = datetime.now() - timedelta(days=2)


def _create_stale_file(user, modified_date):
    checksum = "%32x" % random.getrandbits(16 * 8)
    file = File(
        file_size=5,
        checksum=checksum,
        original_filename="SomeAudio.mp3",
        file_on_disk=f"{checksum}.mp3",
        file_format_id=file_formats.MP3,
        preset_id=format_presets.AUDIO,
        uploaded_by=user,
        duration=365,
    )
    file.save()

    # Manually setting last modified date of file
    File.objects.filter(id=file.id).update(modified=modified_date)

    return file


class CleanupStaleFilesTestCase(StudioTestCase):
    def setUp(self):
        user = self.admin_user

        # create test stale files
        self.file_to_be_deleted = _create_stale_file(user, THREE_MONTHS_AGO)
        self.file_to_keep = _create_stale_file(user, TWO_DAYS_AGO)

        # run
        clean_up_stale_files()

    def test_deletes_correct_files(self):
        """
        Function should only get files where ContentNode, Assessmentitem, and SlideshowSlide are null
        and modified date is older than the date specified
        """
        with self.assertRaises(File.DoesNotExist):
            File.objects.get(id=self.file_to_be_deleted.id)

    def test_doesnt_delete_files_with_modified_date_less_than_date_specified(self):
        """
        Function should not delete files where the modified date is more recent than the date specified
        """
        try:
            File.objects.get(id=self.file_to_keep.id)
        except File.DoesNotExist:
            self.fail("File was deleted")
