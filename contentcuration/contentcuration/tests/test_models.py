import uuid

import mock
import pytest
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.db.utils import IntegrityError
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.constants import channel_history
from contentcuration.constants import community_library_submission
from contentcuration.constants import user_history
from contentcuration.models import AssessmentItem
from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ChannelHistory
from contentcuration.models import ChannelSet
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.models import ContentNode
from contentcuration.models import CONTENTNODE_TREE_ID_CACHE_KEY
from contentcuration.models import File
from contentcuration.models import FILE_DURATION_CONSTRAINT
from contentcuration.models import FlagFeedbackEvent
from contentcuration.models import generate_object_storage_name
from contentcuration.models import Invitation
from contentcuration.models import object_storage_name
from contentcuration.models import RecommendationsEvent
from contentcuration.models import RecommendationsInteractionEvent
from contentcuration.models import User
from contentcuration.models import UserHistory
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.helpers import EagerTasksTestMixin
from contentcuration.viewsets.sync.constants import DELETED


@pytest.fixture
def object_storage_name_tests():
    return [
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.vtt",  # expected
        ),
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4",  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt",  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt",  # expected
        ),
    ]


def test_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        test_file = File(checksum=checksum, file_format_id=file_format_id)

        actual_name = object_storage_name(test_file, filename)

        assert (
            actual_name == expected_name
        ), "Storage names don't match: Expected: '{}' Actual '{}'".format(
            expected_name, actual_name
        )


def test_generate_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        default_ext = ""
        if file_format_id:
            default_ext = ".{}".format(file_format_id)

        actual_name = generate_object_storage_name(checksum, filename, default_ext)

        assert (
            actual_name == expected_name
        ), "Storage names don't match: Expected: '{}' Actual '{}'".format(
            expected_name, actual_name
        )


def create_contentnode(parent_id):
    contentnode = ContentNode.objects.create(
        title="Aron's cool contentnode",
        id=uuid.uuid4().hex,
        kind_id=content_kinds.VIDEO,
        description="coolest contentnode this side of the Pacific",
        parent_id=parent_id,
    )
    return contentnode


def create_assessment_item(parent_id):
    return AssessmentItem.objects.create(contentnode=create_contentnode(parent_id))


def create_assessment_item_file(parent_id):
    return File.objects.create(assessment_item=create_assessment_item(parent_id))


def create_file(parent_id):
    return File.objects.create(contentnode=create_contentnode(parent_id))


class PermissionQuerysetTestCase(StudioTestCase):
    @property
    def public_channel(self):
        channel = testdata.channel()
        channel.public = True
        channel.save()
        return channel

    @property
    def anonymous_user(self):
        user = mock.Mock()
        user.is_anonymous.return_value = True
        user.is_admin = False
        return user

    @property
    def forbidden_user(self):
        user = testdata.user(email="forbiddentester@le.com")
        return user

    def assertQuerysetContains(self, queryset, **filters):
        self.assertGreater(
            queryset.filter(**filters).count(),
            0,
            "Queryset does not contain objects for: {}".format(filters),
        )

    def assertQuerysetDoesNotContain(self, queryset, **filters):
        self.assertEqual(
            queryset.filter(**filters).count(),
            0,
            "Queryset contains objects for: {}".format(filters),
        )


class ChannelTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return Channel.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel

        queryset = Channel.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetContains(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__public_channel__deleted(self):
        channel = self.public_channel
        channel.deleted = True
        channel.save(actor_id=self.admin_user.id)

        queryset = Channel.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel

        queryset = Channel.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()

        queryset = Channel.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__private_channel__pending_editor(self):
        channel = testdata.channel()

        user = testdata.user()
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        Invitation.objects.create(email=user.email, channel=channel)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()

        queryset = Channel.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel

        queryset = Channel.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        channel.editors.add(user)
        queryset = Channel.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel

        queryset = Channel.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()

        queryset = Channel.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        channel.editors.add(user)
        queryset = Channel.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()

        queryset = Channel.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

    def test_get_server_rev(self):
        channel = testdata.channel()

        def create_change(server_rev, applied):
            return Change(
                channel=channel,
                server_rev=server_rev,
                user=self.admin_user,
                created_by=self.admin_user,
                change_type=DELETED,
                table=Channel.__name__,
                applied=applied,
                kwargs={},
            )

        Change.objects.bulk_create(
            [
                create_change(1, True),
                create_change(2, True),
                create_change(3, False),
            ]
        )

        self.assertEqual(channel.get_server_rev(), 2)


class ContentNodeTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return ContentNode.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_view_queryset__orphan_tree(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        user = testdata.user()
        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_view_queryset__orphan_tree__anonymous(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        queryset = ContentNode.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        channel.editors.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        channel.editors.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__orphan_tree(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        user = testdata.user()
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__orphan_tree__anonymous(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        queryset = ContentNode.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_initial_setting_for_contentnode_table_partition(self):
        self.assertEqual(settings.IS_CONTENTNODE_TABLE_PARTITIONED, False)

    def test_filter_by_pk__when_node_exists(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=False):
            node = ContentNode.filter_by_pk(pk=contentnode.id).first()
            self.assertEqual(node.id, contentnode.id)

        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=True):
            node = ContentNode.filter_by_pk(pk=contentnode.id).first()
            self.assertEqual(node.id, contentnode.id)

    def test_filter_by_pk__when_node_doesnot_exists(self):
        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=False):
            node = ContentNode.filter_by_pk(pk=uuid.uuid4().hex).first()
            self.assertEqual(node, None)

        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=True):
            node = ContentNode.filter_by_pk(pk=uuid.uuid4().hex).first()
            self.assertEqual(node, None)

    def test_filter_by_pk__sets_cache(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=True):
            node = ContentNode.filter_by_pk(pk=contentnode.id).first()
            tree_id_from_cache = cache.get(
                CONTENTNODE_TREE_ID_CACHE_KEY.format(pk=contentnode.id)
            )
            self.assertEqual(node.tree_id, tree_id_from_cache)

    def test_filter_by_pk__doesnot_query_db_when_cache_hit(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=True):

            # First, set cache by using filter_by_pk
            ContentNode.filter_by_pk(pk=contentnode.id)

            with mock.patch("contentcuration.models.ContentNode") as mock_contentnode:
                ContentNode.filter_by_pk(contentnode.id)
                mock_contentnode.objects.filter.values_list.first.assert_not_called()

    def test_filter_by_pk__tree_id_updated_on_move(self):
        with self.settings(IS_CONTENTNODE_TABLE_PARTITIONED=True):
            testchannel = testdata.channel()

            sourcenode = ContentNode.objects.create(
                title="Main", parent=testchannel.main_tree, kind_id="topic"
            )
            targetnode = ContentNode.objects.create(
                title="Trashed", parent=testchannel.trash_tree, kind_id="topic"
            )

            sourcenode.move_to(targetnode, "last-child")

            after_move_sourcenode = ContentNode.filter_by_pk(sourcenode.id).first()
            tree_id_from_cache = cache.get(
                CONTENTNODE_TREE_ID_CACHE_KEY.format(pk=sourcenode.id)
            )

            self.assertEqual(
                after_move_sourcenode.tree_id, testchannel.trash_tree.tree_id
            )
            self.assertEqual(tree_id_from_cache, testchannel.trash_tree.tree_id)

    def test_make_content_id_unique(self):
        channel_original = testdata.channel()
        channel_importer = testdata.channel()

        # Import a node from a channel.
        original_node = channel_original.main_tree.get_descendants().first()
        copied_node = original_node.copy_to(target=channel_importer.main_tree)

        original_node.refresh_from_db()
        copied_node.refresh_from_db()

        original_node_old_content_id = original_node.content_id
        copied_node_old_content_id = copied_node.content_id

        original_node.make_content_id_unique()
        copied_node.make_content_id_unique()

        original_node.refresh_from_db()
        copied_node.refresh_from_db()

        # Assert that original node's content_id doesn't change.
        self.assertEqual(original_node_old_content_id, original_node.content_id)
        # Assert copied node's content_id changes.
        self.assertNotEqual(copied_node_old_content_id, copied_node.content_id)


@mock.patch(
    "contentcuration.tasks.ensure_versioned_database_exists_task.fetch_or_enqueue",
    return_value=None,
)
class CommunityLibrarySubmissionTestCase(
    EagerTasksTestMixin, PermissionQuerysetTestCase
):
    @property
    def base_queryset(self):
        return CommunityLibrarySubmission.objects.all()

    def test_create_submission(self, mock_ensure_db_exists_task_fetch_or_enqueue):
        # Smoke test
        channel = testdata.channel()
        author = testdata.user()
        channel.editors.add(author)
        channel.version = 1
        channel.save()

        country = testdata.country()

        submission = CommunityLibrarySubmission.objects.create(
            description="Test submission",
            channel=channel,
            channel_version=1,
            author=author,
            categories=["test_category"],
            status=community_library_submission.STATUS_PENDING,
        )
        submission.countries.add(country)

        submission.full_clean()
        submission.save()

    def test_save__author_not_editor(self, mock_ensure_db_exists):
        submission = testdata.community_library_submission()
        user = testdata.user("some@email.com")
        submission.author = user
        with self.assertRaises(ValidationError):
            submission.save()

    def test_save__nonpositive_channel_version(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()
        submission.channel_version = 0
        with self.assertRaises(ValidationError):
            submission.save()

    def test_save__matching_channel_version(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()
        submission.channel.version = 5
        submission.channel.save()
        submission.channel_version = 5
        submission.save()

    def test_save__impossibly_high_channel_version(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()
        submission.channel.version = 5
        submission.channel.save()
        submission.channel_version = 6
        with self.assertRaises(ValidationError):
            submission.save()

    def test_save__ensure_versioned_database_exists_on_create(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()

        mock_ensure_db_exists_task_fetch_or_enqueue.assert_called_once_with(
            user=submission.author,
            channel_id=submission.channel.id,
            channel_version=submission.channel.version,
        )

    def test_save__dont_ensure_versioned_database_exists_on_update(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()
        mock_ensure_db_exists_task_fetch_or_enqueue.reset_mock()

        submission.description = "Updated description"
        submission.save()

        mock_ensure_db_exists_task_fetch_or_enqueue.assert_not_called()

    def test_filter_view_queryset__anonymous(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        _ = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertFalse(queryset.exists())

    def test_filter_view_queryset__forbidden_user(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        _ = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertFalse(queryset.exists())

    def test_filter_view_queryset__channel_editor(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission_a = testdata.community_library_submission()
        submission_b = testdata.community_library_submission()

        user = testdata.user()
        submission_a.channel.editors.add(user)
        submission_a.save()

        queryset = CommunityLibrarySubmission.filter_view_queryset(
            self.base_queryset, user=user
        )
        self.assertQuerysetContains(queryset, pk=submission_a.id)
        self.assertQuerysetDoesNotContain(queryset, pk=submission_b.id)

    def test_filter_view_queryset__admin(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission_a = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_view_queryset(
            self.base_queryset, user=self.admin_user
        )
        self.assertQuerysetContains(queryset, pk=submission_a.id)

    def test_filter_edit_queryset__anonymous(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        _ = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertFalse(queryset.exists())

    def test_filter_edit_queryset__forbidden_user(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        _ = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertFalse(queryset.exists())

    def test_filter_edit_queryset__channel_editor(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission = testdata.community_library_submission()

        user = testdata.user()
        submission.channel.editors.add(user)
        submission.save()

        queryset = CommunityLibrarySubmission.filter_edit_queryset(
            self.base_queryset, user=user
        )
        self.assertFalse(queryset.exists())

    def test_filter_edit_queryset__author(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission_a = testdata.community_library_submission()
        submission_b = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_edit_queryset(
            self.base_queryset, user=submission_a.author
        )
        self.assertQuerysetContains(queryset, pk=submission_a.id)
        self.assertQuerysetDoesNotContain(queryset, pk=submission_b.id)

    def test_filter_edit_queryset__admin(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        submission_a = testdata.community_library_submission()

        queryset = CommunityLibrarySubmission.filter_edit_queryset(
            self.base_queryset, user=self.admin_user
        )
        self.assertQuerysetContains(queryset, pk=submission_a.id)

    def test_mark_live(self, mock_ensure_db_exists_task_fetch_or_enqueue):
        submission_a = testdata.community_library_submission()
        submission_b = testdata.community_library_submission()

        channel = submission_a.channel
        channel.version = 2
        submission_b.channel = channel

        submission_a.channel_version = 1
        submission_a.status = community_library_submission.STATUS_LIVE
        submission_a.save()

        submission_b.channel_version = 2
        submission_b.author = submission_a.author
        submission_b.status = community_library_submission.STATUS_APPROVED
        submission_b.save()

        submission_other_channel = testdata.community_library_submission()
        submission_other_channel.status = community_library_submission.STATUS_LIVE
        submission_other_channel.save()

        submission_b.mark_live()

        submission_a.refresh_from_db()
        submission_b.refresh_from_db()
        submission_other_channel.refresh_from_db()

        self.assertEqual(
            submission_a.status, community_library_submission.STATUS_APPROVED
        )
        self.assertEqual(submission_b.status, community_library_submission.STATUS_LIVE)
        self.assertEqual(
            submission_other_channel.status,
            community_library_submission.STATUS_LIVE,
        )

    def test_cannot_create_multiple_submissions_same_channel_same_version(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        from django.db import IntegrityError, transaction

        channel = testdata.channel()
        author = testdata.user()
        channel.editors.add(author)
        channel.version = 1
        channel.save()

        country = testdata.country()

        submission1 = CommunityLibrarySubmission.objects.create(
            description="First submission",
            channel=channel,
            channel_version=1,
            author=author,
            categories=["test_category"],
            status=community_library_submission.STATUS_PENDING,
        )
        submission1.countries.add(country)

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                submission2 = CommunityLibrarySubmission.objects.create(
                    description="Second submission",
                    channel=channel,
                    channel_version=1,
                    author=author,
                    categories=["test_category"],
                    status=community_library_submission.STATUS_PENDING,
                )
                submission2.countries.add(country)

        submissions = CommunityLibrarySubmission.objects.filter(
            channel=channel, channel_version=1
        )
        self.assertEqual(submissions.count(), 1)
        self.assertEqual(submission1.channel, channel)
        self.assertEqual(submission1.channel_version, 1)

    def test_can_create_submission_for_new_version_when_previous_pending(
        self, mock_ensure_db_exists_task_fetch_or_enqueue
    ):
        channel = testdata.channel()
        author = testdata.user()
        channel.editors.add(author)
        channel.version = 1
        channel.save()

        country = testdata.country()

        submission_v1 = CommunityLibrarySubmission.objects.create(
            description="Pending submission for version 1",
            channel=channel,
            channel_version=1,
            author=author,
            categories=["test_category"],
            status=community_library_submission.STATUS_PENDING,
        )
        submission_v1.countries.add(country)

        channel.version = 2
        channel.save()

        submission_v2 = CommunityLibrarySubmission.objects.create(
            description="New submission for version 2",
            channel=channel,
            channel_version=2,
            author=author,
            categories=["test_category"],
            status=community_library_submission.STATUS_PENDING,
        )
        submission_v2.countries.add(country)

        submissions_v1 = CommunityLibrarySubmission.objects.filter(
            channel=channel, channel_version=1
        )
        submissions_v2 = CommunityLibrarySubmission.objects.filter(
            channel=channel, channel_version=2
        )

        self.assertEqual(submissions_v1.count(), 1)
        self.assertEqual(submissions_v2.count(), 1)
        self.assertEqual(submission_v1.channel_version, 1)
        self.assertEqual(submission_v2.channel_version, 2)


class AssessmentItemTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return AssessmentItem.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        channel.editors.add(user)
        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        channel.editors.add(user)
        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)


class FileTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return File.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetContains(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_view_queryset__uploaded_by(self):
        user = testdata.user()
        node_file = File.objects.create(uploaded_by=user)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        channel.editors.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        channel.editors.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_edit_queryset__uploaded_by(self):
        user = testdata.user()
        node_file = File.objects.create(uploaded_by=user)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_duration_check_constraint__acceptable(self):
        channel = testdata.channel()
        File.objects.create(
            contentnode=create_contentnode(channel.main_tree_id),
            preset_id=format_presets.AUDIO,
            duration=10,
        )
        File.objects.create(
            contentnode=create_contentnode(channel.main_tree_id),
            preset_id=format_presets.VIDEO_HIGH_RES,
            duration=1123123,
        )

    def test_duration_check_constraint__negative(self):
        channel = testdata.channel()
        with self.assertRaises(IntegrityError, msg=FILE_DURATION_CONSTRAINT):
            File.objects.create(
                contentnode=create_contentnode(channel.main_tree_id),
                preset_id=format_presets.AUDIO,
                duration=-10,
            )

    def test_duration_check_constraint__not_media(self):
        channel = testdata.channel()
        with self.assertRaises(IntegrityError, msg=FILE_DURATION_CONSTRAINT):
            File.objects.create(
                contentnode=create_contentnode(channel.main_tree_id),
                preset_id=format_presets.EPUB,
                duration=10,
            )

    def test_invalid_file_format(self):
        channel = testdata.channel()
        with self.assertRaises(ValidationError, msg="Invalid file_format"):
            File.objects.create(
                contentnode=create_contentnode(channel.main_tree_id),
                preset_id=format_presets.EPUB,
                file_format_id="pptx",
            )


class AssessmentItemFilePermissionTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return File.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        channel.editors.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.forbidden_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        channel.editors.add(user)
        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(
            self.base_queryset, user=self.anonymous_user
        )
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)


class UserTestCase(StudioTestCase):
    def _create_user(self, email, password="password", is_active=True):
        user = User.objects.create(email=email)
        user.set_password(password)
        user.is_active = is_active
        user.save()
        return user

    def _setup_user_related_data(self):
        user_a = self._create_user("a@tester.com")
        user_b = self._create_user("b@tester.com")

        # Create a sole editor non-public channel.
        sole_editor_channel = Channel.objects.create(
            name="sole-editor", actor_id=user_a.id
        )
        sole_editor_channel.editors.add(user_a)

        # Create sole-editor channel nodes.
        for i in range(0, 3):
            testdata.node(
                {
                    "title": "sole-editor-channel-node",
                    "kind_id": "video",
                },
                parent=sole_editor_channel.main_tree,
            )

        # Create a sole editor public channel.
        public_channel = testdata.channel("public")
        public_channel.editors.add(user_a)
        public_channel.public = True
        public_channel.save()

        # Create a shared channel.
        shared_channel = testdata.channel("shared-channel")
        shared_channel.editors.add(user_a)
        shared_channel.editors.add(user_b)

        # Invitations.
        Invitation.objects.create(sender_id=user_a.id, invited_id=user_b.id)
        Invitation.objects.create(sender_id=user_b.id, invited_id=user_a.id)

        # Channel sets.
        channel_set = ChannelSet.objects.create(name="sole-editor")
        channel_set.editors.add(user_a)

        channel_set = ChannelSet.objects.create(name="public")
        channel_set.editors.add(user_a)
        channel_set.public = True
        channel_set.save()

        channel_set = ChannelSet.objects.create(name="shared-channelset")
        channel_set.editors.add(user_a)
        channel_set.editors.add(user_b)

        return user_a

    def test_unique_lower_email(self):
        self._create_user("tester@tester.com")
        with self.assertRaises(IntegrityError):
            self._create_user("Tester@tester.com")

    def test_get_for_email(self):
        user1 = self._create_user("tester@tester.com", is_active=False)
        user2 = self._create_user("tester@Tester.com", is_active=False)
        user3 = self._create_user("Tester@Tester.com", is_active=True)
        user4 = self._create_user("testing@test.com", is_active=True)

        # active should be returned first
        self.assertEqual(user3, User.get_for_email("tester@tester.com"))

        # then the most recent inactive
        User.objects.filter(id=user3.id).delete()
        self.assertEqual(user2, User.get_for_email("tester@tester.com"))
        User.objects.filter(id=user2.id).delete()
        self.assertEqual(user1, User.get_for_email("tester@tester.com"))
        User.objects.filter(id=user1.id).delete()

        # ensure nothing found doesn't error
        self.assertIsNone(User.get_for_email("tester@tester.com"))

        # ensure we don't return soft-deleted users
        user4.delete()
        self.assertIsNone(User.get_for_email("testing@test.com"))

    def test_delete(self):
        user = self._create_user("tester@tester.com")
        user.delete()

        # Sets deleted?
        self.assertEqual(user.deleted, True)
        # Sets is_active to False?
        self.assertEqual(user.is_active, False)
        # Creates user history?
        user_delete_history = UserHistory.objects.filter(
            user_id=user.id, action=user_history.DELETION
        ).first()
        self.assertIsNotNone(user_delete_history)

    def test_recover(self):
        user = self._create_user("tester@tester.com")
        user.delete()
        user.recover()

        # Sets deleted to False?
        self.assertEqual(user.deleted, False)
        # Keeps is_active to False?
        self.assertEqual(user.is_active, False)
        # Creates user history?
        user_recover_history = UserHistory.objects.filter(
            user_id=user.id, action=user_history.RECOVERY
        ).first()
        self.assertIsNotNone(user_recover_history)

    def test_hard_delete_user_related_data(self):
        user = self._setup_user_related_data()
        user.hard_delete_user_related_data()

        # Deletes sole-editor channels.
        self.assertFalse(Channel.objects.filter(name="sole-editor").exists())
        # Preserves shared channels.
        self.assertTrue(Channel.objects.filter(name="shared-channel").exists())
        # Preserves public channels.
        self.assertTrue(Channel.objects.filter(name="public").exists())

        # Deletes all user related invitations.
        self.assertFalse(
            Invitation.objects.filter(
                Q(sender_id=user.id) | Q(invited_id=user.id)
            ).exists()
        )

        # Deletes sole-editor channelsets.
        self.assertFalse(ChannelSet.objects.filter(name="sole-editor").exists())
        # Preserves shared channelsets.
        self.assertTrue(ChannelSet.objects.filter(name="shared-channelset").exists())
        # Preserves public channelsets.
        self.assertTrue(ChannelSet.objects.filter(name="public").exists())

        # All contentnodes of sole-editor channel points to ORPHANGE ROOT NODE?
        self.assertFalse(
            ContentNode.objects.filter(
                ~Q(parent_id=settings.ORPHANAGE_ROOT_ID)
                & Q(title="sole-editor-channel-node")
            ).exists()
        )
        # Creates user history?
        user_hard_delete_history = UserHistory.objects.filter(
            user_id=user.id, action=user_history.RELATED_DATA_HARD_DELETION
        ).first()
        self.assertIsNotNone(user_hard_delete_history)

    def test_get_server_rev(self):
        user = testdata.user()

        def create_change(server_rev, applied):
            return Change(
                user=user,
                server_rev=server_rev,
                created_by=user,
                change_type=DELETED,
                table=User.__name__,
                applied=applied,
                kwargs={},
            )

        Change.objects.bulk_create(
            [
                create_change(1, True),
                create_change(2, True),
                create_change(3, False),
            ]
        )

        self.assertEqual(user.get_server_rev(), 2)


class ChannelHistoryTestCase(StudioTestCase):
    def setUp(self):
        super(ChannelHistoryTestCase, self).setUp()
        self.channel = testdata.channel()

    def test_mark_channel_created(self):
        self.assertEqual(
            1, self.channel.history.filter(action=channel_history.CREATION).count()
        )

    def test_mark_channel_deleted(self):
        self.assertEqual(0, self.channel.deletion_history.count())
        self.channel.deleted = True
        self.channel.save(actor_id=self.admin_user.id)
        self.assertEqual(
            1, self.channel.deletion_history.filter(actor=self.admin_user).count()
        )

    def test_mark_channel_recovered(self):
        self.assertEqual(
            0,
            self.channel.history.filter(
                actor=self.admin_user, action=channel_history.RECOVERY
            ).count(),
        )
        self.channel.deleted = True
        self.channel.save(actor_id=self.admin_user.id)
        self.channel.deleted = False
        self.channel.save(actor_id=self.admin_user.id)
        self.assertEqual(
            1,
            self.channel.history.filter(
                actor=self.admin_user, action=channel_history.RECOVERY
            ).count(),
        )

    def test_prune(self):
        i = 10
        now = timezone.now()
        channels = [self.channel, testdata.channel()]
        last_history_ids = []
        ChannelHistory.objects.all().delete()

        self.assertEqual(0, ChannelHistory.objects.count())

        while i > 0:
            last_history_ids = [
                ChannelHistory.objects.create(
                    channel=channel,
                    actor=self.admin_user,
                    action=channel_history.PUBLICATION,
                    performed=now - timezone.timedelta(hours=i),
                ).id
                for channel in channels
            ]
            i -= 1

        self.assertEqual(20, ChannelHistory.objects.count())
        ChannelHistory.prune()
        self.assertEqual(2, ChannelHistory.objects.count())
        self.assertEqual(
            2, ChannelHistory.objects.filter(id__in=last_history_ids).count()
        )


class FeedbackModelTests(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(FeedbackModelTests, cls).setUpClass()

    def setUp(self):
        super(FeedbackModelTests, self).setUp()
        self.user = testdata.user()

    def _create_base_feedback_data(self, context, contentnode_id, content_id):
        base_feedback_data = {
            "context": context,
            "contentnode_id": contentnode_id,
            "content_id": content_id,
        }
        return base_feedback_data

    def _create_recommendation_event(self):
        channel = testdata.channel()
        node_where_import_was_initiated = testdata.node(
            {"kind_id": content_kinds.TOPIC, "title": "recomendations provided here"}
        )
        base_feedback_data = self._create_base_feedback_data(
            {"model_version": 1, "breadcrums": "#Title#->Random"},
            node_where_import_was_initiated.id,
            node_where_import_was_initiated.content_id,
        )
        recommendations_event = RecommendationsEvent.objects.create(
            user=self.user,
            target_channel_id=channel.id,
            time_hidden=timezone.now(),
            content=[
                {
                    "content_id": str(uuid.uuid4()),
                    "node_id": str(uuid.uuid4()),
                    "channel_id": str(uuid.uuid4()),
                    "score": 4,
                }
            ],
            **base_feedback_data
        )

        return recommendations_event

    def test_create_flag_feedback_event(self):
        channel = testdata.channel("testchannel")
        flagged_node = testdata.node(
            {"kind_id": content_kinds.TOPIC, "title": "SuS ContentNode"}
        )
        base_feedback_data = self._create_base_feedback_data(
            {"spam": "Spam or misleading"}, flagged_node.id, flagged_node.content_id
        )
        flag_feedback_event = FlagFeedbackEvent.objects.create(
            user=self.user, target_channel_id=channel.id, **base_feedback_data
        )
        self.assertEqual(flag_feedback_event.user, self.user)
        self.assertEqual(flag_feedback_event.context["spam"], "Spam or misleading")

    def test_create_recommendations_interaction_event(self):
        # This represents a node that was recommended by the model and was interacted by user!
        recommended_node = testdata.node(
            {
                "kind_id": content_kinds.TOPIC,
                "title": "This node was recommended by the model",
            }
        )
        base_feedback_data = self._create_base_feedback_data(
            {"comment": "explicit reason given by user why he rejected this node!"},
            recommended_node.id,
            recommended_node.content_id,
        )
        fk = self._create_recommendation_event().id
        rec_interaction_event = RecommendationsInteractionEvent.objects.create(
            feedback_type="rejected",
            feedback_reason="some predefined reasons like (not related)",
            recommendation_event_id=fk,
            **base_feedback_data
        )
        self.assertEqual(rec_interaction_event.feedback_type, "rejected")
        self.assertEqual(
            rec_interaction_event.feedback_reason,
            "some predefined reasons like (not related)",
        )

    def test_create_recommendations_event(self):
        channel = testdata.channel()
        node_where_import_was_initiated = testdata.node(
            {"kind_id": content_kinds.TOPIC, "title": "recomendations provided here"}
        )
        base_feedback_data = self._create_base_feedback_data(
            {"model_version": 1, "breadcrums": "#Title#->Random"},
            node_where_import_was_initiated.id,
            node_where_import_was_initiated.content_id,
        )
        recommendations_event = RecommendationsEvent.objects.create(
            user=self.user,
            target_channel_id=channel.id,
            time_hidden=timezone.now(),
            content=[
                {
                    "content_id": str(uuid.uuid4()),
                    "node_id": str(uuid.uuid4()),
                    "channel_id": str(uuid.uuid4()),
                    "score": 4,
                }
            ],
            **base_feedback_data
        )
        self.assertEqual(len(recommendations_event.content), 1)
        self.assertEqual(recommendations_event.content[0]["score"], 4)


class AuditedSpecialPermissionsLicenseTestCase(StudioTestCase):
    def setUp(self):
        super().setUp()
        self.user = testdata.user()

    def test_create_audited_special_permissions_license(self):
        """Test creating an AuditedSpecialPermissionsLicense instance"""
        description = "This is all rights reserved, but can be distributed for Kolibri"
        audited_license = AuditedSpecialPermissionsLicense.objects.create(
            description=description
        )

        self.assertIsNotNone(audited_license.id)
        self.assertEqual(audited_license.description, description)
        self.assertFalse(audited_license.distributable)

    def test_audited_special_permissions_license_unique_description(self):
        """Test that description field is unique"""
        description = "Unique description"
        AuditedSpecialPermissionsLicense.objects.create(description=description)

        with self.assertRaises(IntegrityError):
            AuditedSpecialPermissionsLicense.objects.create(description=description)

    def test_audited_special_permissions_license_get_or_create(self):
        """Test get_or_create functionality"""
        description = "Test description for get_or_create"
        audited_license, created = AuditedSpecialPermissionsLicense.objects.get_or_create(
            description=description, defaults={"distributable": False}
        )

        self.assertTrue(created)
        self.assertEqual(audited_license.description, description)
        self.assertFalse(audited_license.distributable)

        audited_license2, created2 = AuditedSpecialPermissionsLicense.objects.get_or_create(
            description=description, defaults={"distributable": False}
        )

        self.assertFalse(created2)
        self.assertEqual(audited_license.id, audited_license2.id)

    def test_audited_special_permissions_license_str(self):
        """Test __str__ method"""
        short_description = "Short description"
        audited_license = AuditedSpecialPermissionsLicense.objects.create(
            description=short_description
        )
        self.assertEqual(str(audited_license), short_description)

        long_description = "A" * 150
        audited_license2 = AuditedSpecialPermissionsLicense.objects.create(
            description=long_description
        )
        self.assertEqual(len(str(audited_license2)), 100)
        self.assertEqual(str(audited_license2), "A" * 100)
