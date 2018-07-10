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
from rest_framework.test import APITestCase, APIClient
from django.test.utils import override_settings
from mixer.backend.django import mixer

from contentcuration import models as cc
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


def node(data):
    new_node = None
    # Create topics
    if data['kind_id'] == "topic":
        new_node = mixer.blend(cc.ContentNode, kind=topic(), title=data['title'], node_id=data['node_id'])
        for child in data['children']:
            new_node.children.add(node(child))

    # Create videos
    elif data['kind_id'] == "video":
        new_node = mixer.blend(cc.ContentNode, kind=video(), title=data['title'], node_id=data['node_id'], license=license_wtfpl())
        video_file = fileobj_video().next()
        video_file.contentnode = new_node
        video_file.save()

    # Create exercises
    elif data['kind_id'] == "exercise":
        extra_fields = "{{\"mastery_model\":\"{}\",\"randomize\":true}}".format(data['mastery_model'])
        new_node = mixer.blend(cc.ContentNode, kind=exercise(), title=data['title'], node_id=data['node_id'], license=license_wtfpl(), extra_fields=extra_fields)
        for assessment_item in data['assessment_items']:
            mixer.blend(cc.AssessmentItem,
                contentnode=new_node,
                assessment_id=assessment_item['assessment_id'],
                question=assessment_item['question'],
                type=assessment_item['type'],
                answers=json.dumps(assessment_item['answers'])
            )
    new_node.save()
    return new_node
def channel():
    with cc.ContentNode.objects.delay_mptt_updates():
        root = mixer.blend(cc.ContentNode, title="root", parent=None, kind=topic())
        level1 = mixer.blend(cc.ContentNode, parent=root, kind=topic())
        level2 = mixer.blend(cc.ContentNode, parent=level1, kind=topic())
        leaf = mixer.blend(cc.ContentNode, parent=level2, kind=video())
        leaf2 = mixer.blend(cc.ContentNode, parent=level2, kind=exercise(), title='EXERCISE 1', extra_fields="{\"mastery_model\":\"do_all\",\"randomize\":true}")

        video_file = fileobj_video().next()
        video_file.contentnode = leaf
        video_file.save()

        # item = assessment_item()
        # item.contentnode = leaf2
        # item.save()

        # item2 = assessment_item()
        # item2.contentnode = leaf2
        # item2.save()

        # item3 = assessment_item()
        # item3.contentnode = leaf2
        # item3.save()

        # item4 = assessment_item()
        # item4.contentnode = leaf2
        # item4.save()

    channel = mixer.blend(cc.Channel, main_tree=root, name='testchannel', thumbnail="")

    return channel

# def channel():
#     # Read from json fixture
#     filepath = os.path.dirname(__file__) + os.path.sep + "tree.json"
#     with open(filepath, "rb") as jsonfile:
#         data = json.load(jsonfile)
#     with cc.ContentNode.objects.delay_mptt_updates():
#         root = node(data)
#     return mixer.blend(cc.Channel, main_tree=root, name='testchannel', thumbnail="")

def user():
    user = cc.User.objects.create(email='user@test.com')
    user.set_password('password')
    user.save()
    return user

class BaseTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super(BaseTestCase, cls).setUpClass()
        call_command('loadconstants')
        cls.channel = channel()
        cls.user = user()

class BaseAPITestCase(APITestCase):
    @classmethod
    def setUpClass(cls):
        super(BaseAPITestCase, cls).setUpClass()
        call_command('loadconstants')
        cls.channel = channel()
        cls.user = user()
        cls.client = APIClient()
        cls.client.login(email="user@test.com", password="password")
