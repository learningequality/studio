import json
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
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient
from django.test.utils import override_settings
from mixer.backend.django import mixer

from contentcuration import models as cc
from le_utils.constants import format_presets
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

@pytest.fixture
def license_wtfpl():
    """
    Create a license object called WTF License.
    """
    return cc.License.objects.first() or mixer.blend(cc.License, license_name="WTF License")


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

    yield db_file_obj


def node(data, parent=None):
    new_node = None
    # Create topics
    if data['kind_id'] == "topic":
        new_node = cc.ContentNode(kind=topic(), parent=parent, title=data['title'], node_id=data['node_id'])
        new_node.save()

        for child in data['children']:
            child_node = node(child, parent=new_node)

    # Create videos
    elif data['kind_id'] == "video":
        new_node = cc.ContentNode(kind=video(), parent=parent, title=data['title'], node_id=data['node_id'], license=license_wtfpl())
        new_node.save()
        video_file = fileobj_video(contents="Video File").next()
        video_file.contentnode = new_node
        video_file.preset_id = format_presets.VIDEO_HIGH_RES
        video_file.save()

    # Create exercises
    elif data['kind_id'] == "exercise":
        extra_fields = "{{\"mastery_model\":\"{}\",\"randomize\":true,\"m\":{},\"n\":{}}}".format(data['mastery_model'], data.get('m') or 0, data.get('n') or 0)
        new_node = cc.ContentNode(kind=exercise(), parent=parent, title=data['title'], node_id=data['node_id'], license=license_wtfpl(), extra_fields=extra_fields)
        new_node.save()
        for assessment_item in data['assessment_items']:
            mixer.blend(cc.AssessmentItem,
                contentnode=new_node,
                assessment_id=assessment_item['assessment_id'],
                question=assessment_item['question'],
                type=assessment_item['type'],
                answers=json.dumps(assessment_item['answers'])
            )

    return new_node

def channel():
    channel = cc.Channel.objects.create(name="testchannel")
    channel.save()

    # Read from json fixture
    filepath = os.path.dirname(__file__) + os.path.sep + "tree.json"
    with open(filepath, "rb") as jsonfile:
        data = json.load(jsonfile)

    channel.main_tree = node(data)
    channel.save()

    return channel

def user():
    user = cc.User.objects.create(email='user@test.com')
    user.set_password('password')
    user.save()
    return user

class BaseTestCase(TestCase):
    @classmethod
    def setUpClass(self):
        super(BaseTestCase, self).setUpClass()
        call_command('loadconstants')
        self.channel = channel()
        self.user = user()
        self.channel.main_tree.refresh_from_db()

class BaseAPITestCase(APITestCase):
    @classmethod
    def setUpClass(self):
        super(BaseAPITestCase, self).setUpClass()
        call_command('loadconstants')
        self.channel = channel()
        self.user = user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.channel.main_tree.refresh_from_db()

    @classmethod
    def get(self, url):
        token, _new = Token.objects.get_or_create(user=self.user)
        return self.client.get(url, headers={"Authorization": "Token {0}".format(token)})
