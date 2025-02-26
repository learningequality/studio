from __future__ import absolute_import

import uuid

from django.urls import reverse
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants.labels import accessibility_categories
from le_utils.constants.labels import learning_activities
from le_utils.constants.labels import levels
from le_utils.constants.labels import needs
from le_utils.constants.labels import resource_type
from le_utils.constants.labels import subjects

from .base import StudioTestCase
from .testdata import create_temp_file
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import License
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.utils.publish import mark_all_nodes_as_published
from contentcuration.utils.sync import sync_channel
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.constants import FILE


class SyncTestCase(StudioTestCase):
    """
    Test channel and node sync operations.
    """

    def setUp(self):
        super(SyncTestCase, self).setUpBase()
        self.derivative_channel = Channel.objects.create(name="testchannel", actor_id=self.admin_user.id)
        self.channel.main_tree.copy_to(self.derivative_channel.main_tree)
        self.derivative_channel.main_tree.refresh_from_db()
        self.derivative_channel.save()
        assert self.derivative_channel.has_changes()
        assert (
            self.channel.main_tree.get_descendant_count()
            == self.derivative_channel.main_tree.get_descendant_count() - 1
        )

        # Put all nodes into a clean state so we can track when syncing
        # causes changes in the tree.
        mark_all_nodes_as_published(self.channel)
        mark_all_nodes_as_published(self.derivative_channel)

    def _add_temp_file_to_content_node(self, node):
        new_file = create_temp_file("mybytes")
        db_file = new_file["db_file"]
        assert node.files.filter(checksum=db_file.checksum).count() == 0

        db_file.contentnode = node
        db_file.save()
        node.changed = True
        node.save()
        return db_file

    def _add_temp_file_to_assessment_item(self, assessment_item):
        new_file = create_temp_file("mybytes")
        db_file = new_file["db_file"]

        db_file.assessment_item = assessment_item
        db_file.save()
        return db_file

    def test_sync_channel_noop(self):
        """
        Test that calling sync channel with no changed nodes does not change the target channel.
        """

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

        sync_channel(
            self.derivative_channel,
            sync_titles_and_descriptions=True,
            sync_resource_details=True,
            sync_files=True,
            sync_assessment_items=True,
        )

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

    def test_sync_files_add(self):
        """
        Test that calling sync_files successfully syncs a file added to the original node to
        the copied node.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = self.channel.main_tree.children.first()

        target_child = None
        children = self.derivative_channel.main_tree.children.first().get_children()
        self.assertTrue(len(children) > 0)
        for child in children:
            if child.title == contentnode.title:
                target_child = child
                break
        self.assertIsNotNone(target_child)
        self.assertEqual(target_child.files.count(), contentnode.files.count())

        db_file = self._add_temp_file_to_content_node(contentnode)
        self.assertNotEqual(target_child.files.count(), contentnode.files.count())

        self.assertTrue(self.channel.has_changes())

        sync_channel(self.derivative_channel, sync_files=True)
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(target_child.files.count(), contentnode.files.count())

        self.assertEqual(
            target_child.files.filter(checksum=db_file.checksum).count(), 1
        )
        self.assertTrue(self.derivative_channel.has_changes())

    def test_sync_files_remove(self):
        """
        Tests whether sync_files remove additional files from the copied node or not.
        """
        video_node = (self.channel.main_tree.get_descendants()
                      .filter(kind_id=content_kinds.VIDEO)
                      .first()
                      )
        video_node_copy = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=video_node.node_id
        )

        self.assertEqual(video_node.files.count(), video_node_copy.files.count())

        self._add_temp_file_to_content_node(video_node_copy)

        self.assertNotEqual(video_node.files.count(), video_node_copy.files.count())

        sync_channel(channel=self.derivative_channel, sync_files=True)

        self.assertEqual(video_node.files.count(), video_node_copy.files.count())

        for file in File.objects.filter(contentnode=video_node.id):
            self.assertTrue(video_node_copy.files.filter(checksum=file.checksum).exists())

    def test_sync_assessment_item_add(self):
        """
        Test that calling sync_assessment_items successfully syncs a file added to the original node to
        the copied node.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)
        self.assertEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        ai = AssessmentItem.objects.create(contentnode=contentnode)

        db_file = self._add_temp_file_to_assessment_item(ai)
        self.assertNotEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        sync_channel(self.derivative_channel, sync_assessment_items=True)
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        self.assertEqual(
            target_child.assessment_items.filter(
                assessment_id=ai.assessment_id
            ).count(),
            1,
        )

        target_ai = target_child.assessment_items.get(assessment_id=ai.assessment_id)

        self.assertEqual(target_ai.files.count(), ai.files.count())

        self.assertEqual(target_ai.files.filter(checksum=db_file.checksum).count(), 1)

        self.assertTrue(self.derivative_channel.has_changes())

    def test_sync_tags_add(self):
        """
        Test that calling sync_node_tags successfully syncs a tag added to the original node to
        the copied node.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = (
            self.channel.main_tree.get_descendants()
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)
        self.assertEqual(
            target_child.tags.count(), contentnode.tags.count()
        )

        tag = ContentTag.objects.create(tag_name="tagname")

        contentnode.tags.add(tag)

        self.assertNotEqual(
            target_child.tags.count(), contentnode.tags.count()
        )

        sync_channel(self.derivative_channel, sync_resource_details=True)
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(
            target_child.tags.count(), contentnode.tags.count()
        )

        self.assertEqual(
            target_child.tags.filter(
                tag_name=tag.tag_name
            ).count(),
            1,
        )

        self.assertTrue(self.derivative_channel.has_changes())

    def test_sync_tags_add_multiple_tags(self):
        """
        Test that calling sync_node_tags does not raise an error when there
        are multiple tags with the same tag_name and null channel_id.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = (
            self.channel.main_tree.get_descendants()
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)
        self.assertEqual(
            target_child.tags.count(), contentnode.tags.count()
        )

        # Create the same tag twice
        ContentTag.objects.create(tag_name="tagname")

        tag = ContentTag.objects.create(tag_name="tagname")

        contentnode.tags.add(tag)

        self.assertNotEqual(
            target_child.tags.count(), contentnode.tags.count()
        )
        try:
            sync_channel(self.derivative_channel, sync_resource_details=True)
        except Exception as e:
            self.fail("Could not run sync_channel without raising exception: {}".format(e))
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(
            target_child.tags.count(), contentnode.tags.count()
        )

        self.assertEqual(
            target_child.tags.filter(
                tag_name=tag.tag_name
            ).count(),
            1,
        )

        self.assertTrue(self.derivative_channel.has_changes())

    def test_sync_channel_titles_and_descriptions(self):
        """
        Test that calling sync channel will update titles and descriptions.
        """

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

        labels = {
            "title": "Some channel title",
            "description": "Some channel description",
        }

        contentnode = (
            self.channel.main_tree.get_descendants()
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)

        for key, value in labels.items():
            setattr(contentnode, key, value)
        contentnode.save()

        sync_channel(
            self.derivative_channel,
            sync_titles_and_descriptions=True,
            sync_resource_details=False,
            sync_files=False,
            sync_assessment_items=False,
        )

        self.assertTrue(self.channel.has_changes())
        self.assertTrue(self.derivative_channel.has_changes())

        target_child.refresh_from_db()

        for key, value in labels.items():
            self.assertEqual(getattr(target_child, key), value)

    def test_sync_license_description(self):
        """
        Test that the license description field is synced correctly
        Added as a regression test, as this was previously omitted.
        """
        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = (
            self.channel.main_tree.get_descendants()
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )

        special_permissions_license = License.objects.get(license_name="Special Permissions")

        contentnode.license = special_permissions_license
        contentnode.license_description = "You cannot use this content on a Thursday"
        contentnode.copyright_holder = "Thursday's child has far to go"
        contentnode.save()

        sync_channel(
            self.derivative_channel,
            sync_titles_and_descriptions=False,
            sync_resource_details=True,
            sync_files=False,
            sync_assessment_items=False,
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertEqual(target_child.license, special_permissions_license)
        self.assertEqual(target_child.license_description, "You cannot use this content on a Thursday")
        self.assertEqual(target_child.copyright_holder, "Thursday's child has far to go")

    def test_sync_channel_other_metadata_labels(self):
        """
        Test that calling sync channel will also bring in other metadata label updates.
        """

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

        labels = {
            "categories": subjects.MATHEMATICS,
            "learner_needs": needs.PRIOR_KNOWLEDGE,
            "accessibility_labels": accessibility_categories.CAPTIONS_SUBTITLES,
            "grade_levels": levels.LOWER_SECONDARY,
            "resource_types": resource_type.LESSON_PLAN,
            "learning_activities": learning_activities.LISTEN,
        }

        contentnode = (
            self.channel.main_tree.get_descendants()
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)

        for key, value in labels.items():
            setattr(contentnode, key, {value: True})
        contentnode.save()

        sync_channel(
            self.derivative_channel,
            sync_titles_and_descriptions=False,
            sync_resource_details=True,
            sync_files=False,
            sync_assessment_items=False,
        )

        self.assertTrue(self.channel.has_changes())
        self.assertTrue(self.derivative_channel.has_changes())

        target_child.refresh_from_db()

        for key, value in labels.items():
            self.assertEqual(getattr(target_child, key), {value: True})


class ContentIDTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super(ContentIDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def _get_assessmentitem_metadata(self, assessment_id=None, contentnode_id=None):
        return {
            "assessment_id": assessment_id or uuid.uuid4().hex,
            "contentnode_id": contentnode_id or self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    def _get_file_metadata(self):
        return {
            "size": 2500,
            "checksum": uuid.uuid4().hex,
            "name": "le_studio_file",
            "file_format": file_formats.MP3,
            "preset": format_presets.AUDIO,
        }

    def _upload_file_to_contentnode(self, file_metadata=None, contentnode_id=None):
        """
        This method mimics the frontend file upload process which is a two-step
        process for the backend.
        First, file's upload URL is fetched and then that file's ORM object is updated
        to point to the contentnode.
        """
        file = file_metadata or self._get_file_metadata()
        self.client.post(reverse("file-upload-url"), file, format="json",)
        file_from_db = File.objects.get(checksum=file["checksum"])
        self.sync_changes(
            [generate_update_event(
                file_from_db.id,
                FILE,
                {
                    "contentnode": contentnode_id or self.channel.main_tree.get_descendants().first().id
                },
                channel_id=self.channel.id)],)
        file_from_db.refresh_from_db()
        return file_from_db

    def _create_assessmentitem(self, assessmentitem, channel_id):
        self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode_id"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=channel_id,
                )
            ],
        )

    def test_content_id__becomes_equal_on_channel_sync_assessment_item(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = self.channel.main_tree.get_descendants().filter(kind_id=content_kinds.EXERCISE).first()
        assessmentitem_node_copy = assessmentitem_node.copy_to(target=self.channel.main_tree)

        # Create a new assessmentitem.
        self._create_assessmentitem(
            assessmentitem=self._get_assessmentitem_metadata(contentnode_id=assessmentitem_node_copy.id),
            channel_id=self.channel.id
        )

        # Assert after creating a new assessmentitem on copied node, it's content_id is changed.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertNotEqual(assessmentitem_node.content_id, assessmentitem_node_copy.content_id)

        # Syncs channel.
        self.channel.main_tree.refresh_from_db()
        self.channel.save()
        sync_channel(
            self.channel,
            sync_assessment_items=True,
        )

        # Now after syncing the original and copied node should have same content_id.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertEqual(assessmentitem_node.content_id, assessmentitem_node_copy.content_id)

    def test_content_id__becomes_equal_on_channel_sync_file(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        # Upload a new file to the copied contentnode.
        self._upload_file_to_contentnode(contentnode_id=file_contentnode_copy.id)

        # Assert after new file upload, content_id changes.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        self.assertNotEqual(file.contentnode.content_id, file_contentnode_copy.content_id)

        # Syncs channel.
        self.channel.main_tree.refresh_from_db()
        self.channel.save()
        sync_channel(
            self.channel,
            sync_files=True,
        )

        # Assert that after channel syncing, content_id becomes equal.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        self.assertEqual(file.contentnode.content_id, file_contentnode_copy.content_id)
