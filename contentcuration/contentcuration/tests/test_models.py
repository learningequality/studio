import uuid

import mock
import pytest
from django.conf import settings
from django.db.utils import IntegrityError
from le_utils.constants import content_kinds

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import Invitation
from contentcuration.models import object_storage_name
from contentcuration.models import User
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


@pytest.fixture
def object_storage_name_tests():
    return [
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.vtt"  # expected
        ),
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4"  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt"  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt"  # expected
        ),
    ]


def test_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        test_file = File(checksum=checksum, file_format_id=file_format_id)

        actual_name = object_storage_name(test_file, filename)

        assert actual_name == expected_name, \
            "Storage names don't match: Expected: '{}' Actual '{}'".format(expected_name,
                                                                           actual_name)


def test_generate_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        default_ext = ''
        if file_format_id:
            default_ext = '.{}'.format(file_format_id)

        actual_name = generate_object_storage_name(checksum, filename, default_ext)

        assert actual_name == expected_name, \
            "Storage names don't match: Expected: '{}' Actual '{}'".format(expected_name,
                                                                           actual_name)


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
    return AssessmentItem.objects.create(
        contentnode=create_contentnode(parent_id)
    )


def create_assessment_item_file(parent_id):
    return File.objects.create(
        assessment_item=create_assessment_item(parent_id)
    )


def create_file(parent_id):
    return File.objects.create(
        contentnode=create_contentnode(parent_id)
    )


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
        return user

    @property
    def forbidden_user(self):
        user = testdata.user(email="forbiddentester@le.com")
        return user

    def assertQuerysetContains(self, queryset, **filters):
        self.assertGreater(queryset.filter(**filters).count(), 0,
                           "Queryset does not contain objects for: {}".format(filters))

    def assertQuerysetDoesNotContain(self, queryset, **filters):
        self.assertEqual(queryset.filter(**filters).count(), 0,
                         "Queryset contains objects for: {}".format(filters))


class ChannelTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return Channel.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel

        queryset = Channel.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetContains(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__public_channel__deleted(self):
        channel = self.public_channel
        channel.deleted = True
        channel.save()

        queryset = Channel.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = Channel.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel

        queryset = Channel.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetContains(queryset, pk=channel.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()

        queryset = Channel.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = Channel.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel

        queryset = Channel.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = Channel.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()

        queryset = Channel.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = Channel.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=channel.id)


class ContentNodeTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return ContentNode.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_view_queryset__orphan_tree(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        user = testdata.user()
        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_view_queryset__orphan_tree__anonymous(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        queryset = ContentNode.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

    def test_filter_edit_queryset__public_channel__user_id(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=987)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=user.id)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        channel.editors.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=user.id)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

    def test_filter_edit_queryset__private_channel__user_id(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=987)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=user.id)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

        channel.editors.add(user)
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=user.id)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        contentnode = create_contentnode(channel.main_tree_id)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__orphan_tree(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        user = testdata.user()
        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__orphan_tree__user_id(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user_id=987)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetContains(queryset, pk=contentnode.id)

    def test_filter_edit_queryset__orphan_tree__anonymous(self):
        contentnode = create_contentnode(settings.ORPHANAGE_ROOT_ID)

        queryset = ContentNode.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=settings.ORPHANAGE_ROOT_ID)
        self.assertQuerysetDoesNotContain(queryset, pk=contentnode.id)


class AssessmentItemTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return AssessmentItem.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_item.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_item = create_assessment_item(channel.main_tree_id)

        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = AssessmentItem.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_item.id)


class FileTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return File.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_view_queryset__uploaded_by(self):
        user = testdata.user()
        node_file = File.objects.create(uploaded_by=user)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        node_file = create_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

    def test_filter_edit_queryset__uploaded_by(self):
        user = testdata.user()
        node_file = File.objects.create(uploaded_by=user)

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=node_file.id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=node_file.id)


class AssessmentItemFilePermissionTestCase(PermissionQuerysetTestCase):
    @property
    def base_queryset(self):
        return File.objects.all()

    def test_filter_view_queryset__public_channel(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__public_channel__anonymous(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.forbidden_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

        user = testdata.user()
        channel.viewers.add(user)
        queryset = File.filter_view_queryset(self.base_queryset, user=user)
        self.assertQuerysetContains(queryset, pk=assessment_file.id)

    def test_filter_view_queryset__private_channel__anonymous(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_view_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__public_channel(self):
        channel = self.public_channel
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)

    def test_filter_edit_queryset__private_channel(self):
        channel = testdata.channel()
        assessment_file = create_assessment_item_file(channel.main_tree_id)

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.forbidden_user)
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

        queryset = File.filter_edit_queryset(self.base_queryset, user=self.anonymous_user)
        self.assertQuerysetDoesNotContain(queryset, pk=assessment_file.id)


class UserTestCase(StudioTestCase):
    def _create_user(self, email, password='password', is_active=True):
        user, _ = User.objects.get_or_create(email=email)
        user.set_password(password)
        user.is_active = is_active
        user.save()
        return user

    def test_unique_lower_email(self):
        self._create_user("tester@tester.com")
        with self.assertRaises(IntegrityError):
            self._create_user("Tester@tester.com")

    def test_get_for_email(self):
        user1 = self._create_user("tester@tester.com", is_active=False)
        user2 = self._create_user("tester@Tester.com", is_active=False)
        user3 = self._create_user("Tester@Tester.com", is_active=True)

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
