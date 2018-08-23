import hashlib
import json
import md5
import os
import random
import string
import tempfile
from cStringIO import StringIO

import pytest
from django.core.files.storage import default_storage
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


def node_json(data):
    node_data = {
        "title": "Recipes",
        "node_id": "acedacedacedacedacedacedacedaced",
        "content_id": "aa480b60a7f4526f886e7df9f4e9b8cc",
        "description": "Recipes for various dishes.",
        "author": "Bradley Smoker",
        "kind": data['kind'],
        "license": data['license'],
        "extra_fields": "",
        "files": [],
        "questions": []
    }

    return node_data


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


def tree(parent=None):
    # Read from json fixture
    filepath = os.path.sep.join([os.path.dirname(__file__), "fixtures", "tree.json"])
    with open(filepath, "rb") as jsonfile:
        data = json.load(jsonfile)

    return node(data, parent)


def channel():
    channel = cc.Channel.objects.create(name="testchannel")
    channel.save()

    channel.main_tree = tree()
    channel.save()

    return channel

def user():
    user = cc.User.objects.create(email='user@test.com')
    user.set_password('password')
    user.save()
    return user


def create_temp_file(filebytes, kind='text', ext='txt', mimetype='text/plain'):
    """
    Create a file and store it in Django's object db temporarily for tests.

    :param filebytes: The data to be stored in the file, as a series of bytes
    :param kind: String identifying the kind of file
    :param ext: File extension, omitting the initial period
    :param mimetype: Mimetype of the file
    :return: A dict containing the keys name (filename), data (actual bytes), file (StringIO obj) and db_file (File object in db) of the temp file.
    """
    fileobj = StringIO(filebytes)
    checksum = hashlib.md5(filebytes)
    digest = checksum.hexdigest()
    filename = "{}.{}".format(digest, ext)
    storage_file_path = cc.generate_object_storage_name(digest, filename)

    # Write out the file bytes on to object storage, with a filename specified with randomfilename
    default_storage.save(storage_file_path, fileobj)

    assert default_storage.exists(storage_file_path)

    file_kind = mixer.blend(cc.ContentKind, kind=kind)
    file_format = mixer.blend(cc.FileFormat, extension=ext, mimetype=mimetype)
    preset = mixer.blend(cc.FormatPreset, id=ext, kind=file_kind)
    # then create a File object with that
    db_file_obj = mixer.blend(cc.File, file_format=file_format, preset=preset, file_on_disk=storage_file_path)

    return {'name': os.path.basename(storage_file_path), 'data': filebytes, 'file': fileobj, 'db_file': db_file_obj}

invalid_file_json = [
    {
        "slug": "counting-out-1-20-objects",
        "kind": "exercise",
        "title": "Count with small numbers",
        "source_id": "counting-out-1-20-objects",
        "node_id": "1243434343434343434343",
        "content_id": "abcabcddafadfadsfsafs",
        "thumbnail": "https://cdn.kastatic.org/ka-exercise-screenshots/counting-out-1-20-objects.png",
        "description": "Practice counting up to 10 objects.",
        "author": "Khan Academy",
        "extra_fields": {},
        "exercise_data": {
            "m": 5,
            "n": 7,
            "mastery_model": "m_of_n"
        },
        "license": "CC-BY",
        "files": [],
        "questions": [
            {
                'type': 'single_selection',
                'question': 'What is your quest?',
                'hints': ['Holy', 'Coconuts'],
                'answers': [
                    'To seek the grail',
                    'To eat some hail',
                    'To spectacularly fail',
                    'To post bail'
                ],
                'files': [
                    {
                        'filename': 'nonexistant.mp4',
                        'size': 0,
                    }
                ],
                'source_url': '',
                'raw_data': '',
                'assessment_id': '1'
            }
        ]

    }
]
