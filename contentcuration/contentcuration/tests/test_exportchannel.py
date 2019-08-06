import os
import random
import string
import tempfile

import pytest
from base import StudioTestCase
from django.test.utils import override_settings
from kolibri_content import models
from kolibri_content.router import using_content_database
from mixer.backend.django import mixer
from mock import patch

from .testdata import create_studio_file
from .testdata import exercise
from .testdata import slideshow
from .testdata import topic
from .testdata import video
from contentcuration import models as cc
from contentcuration.utils.publish import convert_channel_thumbnail
from contentcuration.utils.publish import create_bare_contentnode
from contentcuration.utils.publish import create_content_database
from contentcuration.utils.publish import create_slideshow_manifest
from contentcuration.utils.publish import MIN_SCHEMA_VERSION

pytestmark = pytest.mark.django_db


def fileobj_video(contents=None):
    """
    Create an mp4 video file in storage and then create a File model from it.
    If contents is given and is a string, then write said contents to the file.
    If not given, a random string is generated and set as the contents of the file.
    """
    if contents:
        filecontents = contents
    else:
        filecontents = "".join(random.sample(string.printable, 20))
    # leverage existing function in testdata
    file_data = create_studio_file(filecontents, preset='high_res_video', ext='mp4')
    return file_data['db_file']


def assessment_item():
    answers = "[{\"correct\": false, \"answer\": \"White Rice\", \"help_text\": \"\"}, " \
              "{\"correct\": true, \"answer\": \"Brown Rice\", \"help_text\": \"\"}, " \
              "{\"correct\": false, \"answer\": \"Rice Krispies\", \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='Which rice is the healthiest?',
                       type='single_selection', answers=answers)


def assessment_item2():
    answers = "[{\"correct\": true, \"answer\": \"Eggs\", \"help_text\": \"\"}, " \
              "{\"correct\": true, \"answer\": \"Tofu\", \"help_text\": \"\"}, " \
              "{\"correct\": true, \"answer\": \"Meat\", \"help_text\": \"\"}, " \
              "{\"correct\": true, \"answer\": \"Beans\", \"help_text\": \"\"}, " \
              "{\"correct\": false, \"answer\": \"Rice\", \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='Which of the following are proteins?',
                       type='multiple_selection', answers=answers)


def assessment_item3():
    answers = "[]"
    return mixer.blend(cc.AssessmentItem, question='Why a rice cooker?', type='free_response', answers=answers)


def assessment_item4():
    answers = "[{\"correct\": true, \"answer\": 20, \"help_text\": \"\"}]"
    return mixer.blend(cc.AssessmentItem, question='How many minutes does it take to cook rice?',
                       type='input_question', answers=answers)


def channel():
    with cc.ContentNode.objects.delay_mptt_updates():
        root = mixer.blend(cc.ContentNode, title="root", parent=None, kind=topic())
        level1 = mixer.blend(cc.ContentNode, parent=root, kind=topic())
        level2 = mixer.blend(cc.ContentNode, parent=level1, kind=topic())
        leaf = mixer.blend(cc.ContentNode, parent=level2, kind=video())
        leaf2 = mixer.blend(cc.ContentNode, parent=level2, kind=exercise(), title='EXERCISE 1',
                            extra_fields="{\"mastery_model\":\"do_all\",\"randomize\":true}")
        leaf3 = mixer.blend(cc.ContentNode, parent=level2, kind=slideshow(), title="SLIDESHOW 1", extra_fields="{}")

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
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3", dir=CONTENT_DATABASE_DIR_TEMP)
        output_db = output_db
        output_db_alias = os.path.splitext(os.path.basename(output_db))[0]

        class testing_content_database(using_content_database):

            def __init__(self, alias):
                self.alias = output_db_alias

            def __exit__(self, exc_type, exc_value, traceback):
                return
        cls.patch_using = patch('contentcuration.utils.publish.using_content_database.__new__',
                                return_value=testing_content_database('alias'))
        cls.patch_using.start()
        cls.patch_copy_db = patch('contentcuration.utils.publish.save_export_database')
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


class ChannelExportUtilityFunctionTestCase(StudioTestCase):
    def test_convert_channel_thumbnail_empty_thumbnail(self):
        channel = cc.Channel.objects.create()
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_static_thumbnail(self):
        channel = cc.Channel.objects.create(thumbnail="/static/kolibri_flapping_bird.png")
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_valid(self):
        channel = cc.Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={"base64": "flappy_bird"})
        self.assertEqual("flappy_bird", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_invalid(self):
        with patch("contentcuration.utils.publish.get_thumbnail_encoding", return_value="this is a test"):
            channel = cc.Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={})
            self.assertEquals("this is a test", convert_channel_thumbnail(channel))

    def test_create_slideshow_manifest(self):
        content_channel = cc.Channel.objects.create()
        ccnode = cc.ContentNode.objects.create(kind_id=slideshow(), extra_fields="{}")
        kolibrinode = create_bare_contentnode(ccnode, ccnode.language, content_channel.id, content_channel.name)
        create_slideshow_manifest(ccnode, kolibrinode)
        manifest_collection = cc.File.objects.filter(contentnode=ccnode, preset_id=u"slideshow_manifest")
        assert len(manifest_collection) is 1
