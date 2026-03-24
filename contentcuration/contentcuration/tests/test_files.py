# -*- coding: utf-8 -*-
import json
from uuid import uuid4

import mock
import pytest
from django.core.exceptions import PermissionDenied
from django.core.files.storage import default_storage
from django.db.models import Exists
from django.db.models import OuterRef
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from mock import patch

from .base import BaseAPITestCase
from .base import StudioTestCase
from .testdata import base64encoding
from .testdata import generated_base64encoding
from .testdata import node
from contentcuration.api import write_raw_content_to_storage
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import delete_empty_file_reference
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import StagedFile
from contentcuration.models import User
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.publish import create_associated_thumbnail


pytestmark = pytest.mark.django_db


class FileThumbnailTestCase(BaseAPITestCase):
    def setUp(self):
        super(FileThumbnailTestCase, self).setUp()
        self.thumbnail_fobj = create_thumbnail_from_base64(base64encoding())
        filepath = generate_object_storage_name(
            self.thumbnail_fobj.checksum, str(self.thumbnail_fobj)
        )
        with default_storage.open(filepath, "rb") as fobj:
            self.thumbnail_contents = fobj.read()

    def test_get_thumbnail_encoding(self):
        encoding = get_thumbnail_encoding(str(self.thumbnail_fobj))
        self.assertEqual(encoding, generated_base64encoding())

    @patch("contentcuration.api.default_storage.save")
    @patch("contentcuration.api.default_storage.exists", return_value=True)
    def test_existing_thumbnail_is_not_created(
        self, storage_exists_mock, storage_save_mock
    ):
        create_thumbnail_from_base64(base64encoding())
        storage_exists_mock.assert_called()
        storage_save_mock.assert_not_called()

    def test_internal_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()

        file_data = [
            {
                "preset": None,
                "filename": str(self.thumbnail_fobj),
                "language": "en",
                "size": self.thumbnail_fobj.file_size,
            }
        ]
        map_files_to_node(self.user, node, file_data)
        self.assertTrue(isinstance(node.thumbnail_encoding, str))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data["base64"], generated_base64encoding())

    def test_exportchannel_thumbnail(self):
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()
        newfile = create_associated_thumbnail(node, self.thumbnail_fobj)
        self.assertTrue(isinstance(newfile, File))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data["base64"], generated_base64encoding())


class NodeFileDeletionTestCase(StudioTestCase):
    def test_delete_empty_file_reference(self):
        checksum, _, storage_path = write_raw_content_to_storage(
            b"some fake PDF data", ext=".pdf"
        )
        assert default_storage.exists(storage_path), "file should be saved"
        delete_empty_file_reference(checksum, "pdf")
        assert not default_storage.exists(storage_path), "file should be deleted"


class StagedChannelSpaceTestCase(StudioTestCase):
    """
    Tests for
    - User.check_channel_space()
    - User.get_available_staged_space()
    - User.check_staged_space()
    """

    def setUp(self):
        super().setUpBase()

        self.staged_channel = Channel.objects.create(
            name="Staged", actor_id=self.user.id, language_id="en"
        )
        self.staged_channel.save()

        file_node_id = uuid4().hex
        self.staged_channel.staging_tree = node(
            {
                "node_id": uuid4().hex,
                "kind_id": "topic",
                "title": "Root Node",
                "children": [
                    {
                        "node_id": file_node_id,
                        "kind_id": "video",
                        "title": "Video 1",
                    }
                ],
            },
            parent=None,
        )
        self.staged_channel.save()
        self.node = ContentNode.objects.get(node_id=file_node_id)
        self._set_uploader(self.channel)
        self._set_uploader(
            self.staged_channel, self.staged_channel.staging_tree.tree_id
        )
        self.node_file = self.node.files.all()[0]

    def _set_uploader(self, channel: Channel, tree_id=None):
        if tree_id is None:
            tree_id = channel.main_tree.tree_id

        File.objects.filter(
            Exists(
                ContentNode.objects.filter(
                    tree_id=tree_id, id=OuterRef("contentnode_id")
                )
            )
        ).update(uploaded_by=self.user)

    def _create_duplicate(self, file: File):
        dupe_node = node(
            {
                "node_id": uuid4().hex,
                "kind_id": "video",
                "title": "Video 2",
            },
            parent=self.node.parent,
        )
        dupe_file = dupe_node.files.all()[0]
        dupe_file.file_size = file.file_size
        dupe_file.checksum = file.checksum
        dupe_file.uploaded_by = self.user
        dupe_file.save(set_by_file_on_disk=False)

    def test_check_channel_space__okay(self):
        try:
            self.user.check_channel_space(self.staged_channel)
        except PermissionDenied:
            self.fail("Staging channel space is larger than available")

    def test_check_channel_space__duplicate_checksum_same_tree(self):
        # set file to slightly more than half, such that if both files are included, it should
        # exceed the available space
        self.node_file.file_size = self.user.disk_space / 2 + 1
        self.node_file.checksum = uuid4().hex
        self.node_file.save(set_by_file_on_disk=False)
        self._create_duplicate(self.node_file)

        try:
            self.user.check_channel_space(self.staged_channel)
        except PermissionDenied:
            self.fail("Staging channel space is larger than available")

    def test_check_channel_space__duplicate_checksum_different_tree(self):
        # set file larger than space
        self.node_file.file_size = self.user.disk_space + 1
        self.node_file.save(set_by_file_on_disk=False)

        # ensure file has matching checksum to another file in deployed channel tree,
        # which should be the case because of how the test fixtures function
        deployed_file_count = File.objects.filter(
            Exists(
                ContentNode.objects.filter(
                    tree_id=self.channel.main_tree.tree_id,
                    id=OuterRef("contentnode_id"),
                )
            ),
            checksum=self.node_file.checksum,
        ).count()
        self.assertGreaterEqual(deployed_file_count, 1)

        try:
            self.user.check_channel_space(self.staged_channel)
        except PermissionDenied:
            self.fail("Staging channel space is larger than available")

    def test_check_channel_space__fail(self):
        self.node_file.file_size = self.user.disk_space + 1
        self.node_file.checksum = uuid4().hex
        self.node_file.save(set_by_file_on_disk=False)

        with self.assertRaises(PermissionDenied):
            self.user.check_channel_space(self.staged_channel)

    def test_get_available_staged_space(self):
        f = StagedFile.objects.create(
            checksum=uuid4().hex,
            uploaded_by=self.user,
            file_size=100,
        )
        expected_available_space = self.user.disk_space - f.file_size
        self.assertEqual(
            expected_available_space, self.user.get_available_staged_space()
        )

    def test_check_staged_space__exists(self):
        f = StagedFile.objects.create(
            checksum=uuid4().hex,
            uploaded_by=self.user,
            file_size=100,
        )
        with mock.patch.object(
            User, "get_available_staged_space"
        ) as get_available_staged_space:
            get_available_staged_space.return_value = 0
            self.assertTrue(self.user.check_staged_space(100, f.checksum))

    def test_check_channel_space_ignores_perseus_exports(self):
        with mock.patch("contentcuration.utils.user.calculate_user_storage"):
            self.node_file.file_format_id = file_formats.PERSEUS
            self.node_file.file_size = self.user.disk_space + 1
            self.node_file.checksum = uuid4().hex
            self.node_file.uploaded_by = self.user
            self.node_file.save(set_by_file_on_disk=False)

        try:
            self.user.check_channel_space(self.staged_channel)
        except PermissionDenied:
            self.fail("Perseus exports should not count against staging space")


class UserStorageUsageTestCase(StudioTestCase):
    def setUp(self):
        super().setUpBase()
        self.contentnode = (
            self.channel.main_tree.get_descendants(include_self=True)
            .filter(files__isnull=False)
            .first()
        )
        self.assertIsNotNone(self.contentnode)
        self.base_file = self.contentnode.files.first()
        self.assertIsNotNone(self.base_file)

    def _create_file(self, *, file_format, size):
        file_record = File(
            contentnode=self.contentnode,
            checksum=uuid4().hex,
            file_format_id=file_format,
            file_size=size,
            uploaded_by=self.user,
        )
        file_record.save(set_by_file_on_disk=False)
        return file_record

    def test_get_space_used_excludes_perseus_exports(self):
        baseline_usage = self.user.get_space_used()

        perseus_size = 125
        with mock.patch("contentcuration.utils.user.calculate_user_storage"):
            self._create_file(file_format=file_formats.PERSEUS, size=perseus_size)
        self.assertEqual(self.user.get_space_used(), baseline_usage)

        non_perseus_size = 275
        with mock.patch("contentcuration.utils.user.calculate_user_storage"):
            self._create_file(
                file_format=self.base_file.file_format_id, size=non_perseus_size
            )

        expected_usage = baseline_usage + non_perseus_size
        self.assertEqual(self.user.get_space_used(), expected_usage)
