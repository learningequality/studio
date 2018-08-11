import md5
import os
import random
import string
import tempfile
from cStringIO import StringIO

import pytest
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings
from mixer.backend.django import mixer
from mock import patch

from base import StudioTestCase
from contentcuration import models as cc
from contentcuration.management.commands.exportchannel import (MIN_SCHEMA_VERSION,
                                                               create_content_database)
from kolibri_content import models
from kolibri_content.router import using_content_database

pytestmark = pytest.mark.django_db


def video():
    """
    Create a video content kind entry.
    """
    return mixer.blend(cc.ContentKind, kind='video')


def preset_video():
    """
    Create a video format preset.
    """
    return mixer.blend(cc.FormatPreset, id='mp4', kind=video())


def topic():
    """
    Create a topic content kind.
    """
    return mixer.blend(cc.ContentKind, kind='topic')


def exercise():
    """
    Create a topic content kind.
    """
    return mixer.blend(cc.ContentKind, kind='exercise')


def preset_exercise():
    """
    Create an exercise format preset.
    """
    return mixer.blend(cc.FormatPreset, id='exercise', kind=exercise())


def fileformat_perseus():
    """
    Create a perseus FileFormat entry.
    """
    return mixer.blend(cc.FileFormat, extension='perseus', mimetype='application/exercise')


def fileformat_mp4():
    """
    Create an mp4 FileFormat entry.
    """
    return mixer.blend(cc.FileFormat, extension='mp4', mimetype='application/video')


def license_wtfpl():
    """
    Create a license object called WTF License.
    """
    return mixer.blend(cc.License, license_name="WTF License")


def fileobj_video(contents=None):
    """
    Create an "mp4" video file on storage, and then create a File model pointing to it.

    if contents is given and is a string, then write said contents to the file. If not given,
    a random string is generated and set as the contents of the file.
    """
    if contents:
        filecontents = contents
    else:
        filecontents = "".join(random.sample(string.printable, 20))

    fileobj = StringIO(filecontents)
    digest = md5.new(filecontents).hexdigest()
    filename = "{}.mp4".format(digest)
    storage_file_path = cc.generate_object_storage_name(digest, filename)

    # Write out the file bytes on to object storage, with a filename specified with randomfilename
    default_storage.save(storage_file_path, fileobj)

    # then create a File object with that
    db_file_obj = mixer.blend(cc.File, file_format=fileformat_mp4(), preset=preset_video(), file_on_disk=storage_file_path)

    return db_file_obj


def assessment_item():
    answers = "[{\"correct\": false, \"answer\": \"White Rice\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Brown Rice\", \"help_text\": \"\"}, {\"correct\": false, \"answer\": \"Rice Krispies\", \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='Which rice is the healthiest?', type='single_selection', answers=answers)


def assessment_item2():
    answers = "[{\"correct\": true, \"answer\": \"Eggs\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Tofu\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Meat\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Beans\", \"help_text\": \"\"}, {\"correct\": false, \"answer\": \"Rice\", \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='Which of the following are proteins?', type='multiple_selection', answers=answers)


def assessment_item3():
    answers = "[]"
    return mixer.blend(cc.AssessmentItem, question='Why a rice cooker?', type='free_response', answers=answers)


def assessment_item4():
    answers = "[{\"correct\": true, \"answer\": 20, \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='How many minutes does it take to cook rice?', type='input_question', answers=answers)


def channel():
    with cc.ContentNode.objects.delay_mptt_updates():
        root = mixer.blend(cc.ContentNode, title="root", parent=None, kind=topic())
        level1 = mixer.blend(cc.ContentNode, parent=root, kind=topic())
        level2 = mixer.blend(cc.ContentNode, parent=level1, kind=topic())
        leaf = mixer.blend(cc.ContentNode, parent=level2, kind=video())
        leaf2 = mixer.blend(cc.ContentNode, parent=level2, kind=exercise(), title='EXERCISE 1', extra_fields="{\"mastery_model\":\"do_all\",\"randomize\":true}")

        video_file = fileobj_video()
        video_file.contentnode = leaf
        video_file.save()

        item = assessment_item()
        item.contentnode = leaf2
        item.save()

        item2 = assessment_item()
        item2.contentnode = leaf2
        item2.save()

        item3 = assessment_item()
        item3.contentnode = leaf2
        item3.save()

        item4 = assessment_item()
        item4.contentnode = leaf2
        item4.save()

    channel = mixer.blend(cc.Channel, main_tree=root, name='testchannel', thumbnail="")

    return channel


CONTENT_DATABASE_DIR_TEMP = tempfile.mkdtemp()

@override_settings(
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class ExportChannelTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ExportChannelTestCase, cls).setUpClass()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3",dir=CONTENT_DATABASE_DIR_TEMP)
        output_db = output_db
        output_db_alias = os.path.splitext(os.path.basename(output_db))[0]
        class testing_content_database(using_content_database):
            def __init__(self, alias):
                self.alias = output_db_alias

            def __exit__(self, exc_type, exc_value, traceback):
                return
        cls.patch_using = patch('contentcuration.management.commands.exportchannel.using_content_database.__new__', return_value=testing_content_database('alias'))
        cls.patch_using.start()
        cls.patch_copy_db = patch('contentcuration.management.commands.exportchannel.save_export_database')
        cls.patch_copy_db.start()

    def setUp(self):
        super(ExportChannelTestCase, self).setUp()
        content_channel = channel()
        create_content_database(content_channel.id, True, None, True)

    def tearDown(self):
        super(ExportChannelTestCase, self).tearDown()

    def test_channel_rootnode_data(self):
        channel = models.ChannelMetadata.objects.first()
        self.assertEqual(channel.root_pk, channel.root_id)

    def test_channel_version_data(self):
        channel = models.ChannelMetadata.objects.first()
        self.assertEqual(channel.min_schema_version, MIN_SCHEMA_VERSION)

    def test_contentnode_license_data(self):
        for node in models.ContentNode.objects.all():
            if node.license:
                self.assertEqual(node.license_name, node.license.license_name)
                self.assertEqual(node.license_description, node.license.license_description)

    def test_contentnode_channel_id_data(self):
        channel = models.ChannelMetadata.objects.first()
        for node in models.ContentNode.objects.all():
            self.assertEqual(node.channel_id, channel.id)

    def test_contentnode_file_checksum_data(self):
        for file in models.File.objects.all():
            self.assertEqual(file.checksum, file.local_file_id)

    def test_contentnode_file_extension_data(self):
        for file in models.File.objects.all().prefetch_related('local_file'):
            self.assertEqual(file.extension, file.local_file.extension)

    def test_contentnode_file_size_data(self):
        for file in models.File.objects.all().prefetch_related('local_file'):
            self.assertEqual(file.file_size, file.local_file.file_size)

    @classmethod
    def tearDownClass(cls):
        super(ExportChannelTestCase, cls).tearDownClass()
        cls.patch_using.stop()
        cls.patch_copy_db.stop()
