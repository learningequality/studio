import pytest
import requests
import tempfile
import base64
import json
from django.test import Client
from mixer.backend.django import mixer
from contentcuration import models
from django.conf import settings
from contentcuration.api import get_file_diff
from django.core.urlresolvers import reverse_lazy

pytestmark = pytest.mark.django_db

@pytest.yield_fixture
def fileobj_temp():
    randomfilebytes = ":)"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        f.write(randomfilebytes)
        f.flush()
        f.seek(0)
        yield f

@pytest.fixture
def thumbnail(url, fileobj_temp):
    return base64.b64encode(fileobj_temp.read())

@pytest.fixture
def topic():
    return mixer.blend('contentcuration.ContentKind', kind='topic')

@pytest.fixture
def video():
    return mixer.blend('contentcuration.ContentKind', kind='video')

@pytest.fixture
def preset_video(video):
    return mixer.blend('contentcuration.FormatPreset', id='mp4', kind=video)

@pytest.fixture
def fileformat_mp4():
    return mixer.blend('contentcuration.FileFormat', extension='mp4', mimetype='application/video')

@pytest.yield_fixture
def fileobj_video(fileobj_temp, preset_video, fileformat_mp4):
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp4, preset=preset_video, file_on_disk=fileobj_temp.name)
    yield db_file_obj

@pytest.fixture
def license():
    return mixer.blend('contentcuration.License', license_name="License to Kill")

@pytest.fixture
def audio():
    return mixer.blend('contentcuration.ContentKind', kind='audio')

@pytest.fixture
def preset_audio(audio):
    return mixer.blend('contentcuration.FormatPreset', id='mp3', kind=audio)

@pytest.fixture
def fileformat_mp3():
    return mixer.blend('contentcuration.FileFormat', extension='mp3', mimetype='application/audio')

@pytest.yield_fixture
def fileobj_audio(fileobj_temp, preset_audio, fileformat_mp3):
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp3, preset=preset_audio, file_on_disk=fileobj_temp.name)
    yield db_file_obj


@pytest.fixture
def exercise():
    return mixer.blend('contentcuration.ContentKind', kind='exercise')

@pytest.fixture
def preset_exercise(exercise):
    return mixer.blend('contentcuration.FormatPreset', id='perseus', kind=exercise)

@pytest.fixture
def fileformat_perseus():
    return mixer.blend('contentcuration.FileFormat', extension='perseus', mimetype='application/perseus')

@pytest.yield_fixture
def fileobj_exercise(fileobj_temp, preset_exercise, fileformat_perseus):
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_perseus, preset=preset_exercise, file_on_disk=fileobj_temp.name)
    yield db_file_obj


@pytest.fixture
def document():
    return mixer.blend('contentcuration.ContentKind', kind='document')

@pytest.fixture
def preset_document(document):
    return mixer.blend('contentcuration.FormatPreset', id='pdf', kind=document)

@pytest.fixture
def fileformat_pdf():
    return mixer.blend('contentcuration.FileFormat', extension='pdf', mimetype='application/pdf')

@pytest.yield_fixture
def fileobj_document(fileobj_temp, preset_document, fileformat_pdf):
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_pdf, preset=preset_document, file_on_disk=fileobj_temp.name)
    yield db_file_obj

@pytest.fixture
def channel_metadata(thumbnail):
    return {
        "name": "Aron's cool channel",
        "id": "fasdfada",
        "has_changed": True,
        "description": "coolest channel this side of the Pacific",
        "language": "EN",
        "thumbnail": thumbnail,
    }

@pytest.fixture
def topic_tree_data(fileobj_document, fileobj_video, fileobj_exercise, fileobj_audio, license, topic):
    return [
        {
            "title": "Western Philosophy",
            "id": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "description": "Philosophy materials for the budding mind.",
            "kind": topic.pk,
            "children": [
                {
                    "title": "Nicomachean Ethics",
                    "id": "beadbeadbeadbeadbeadbeadbeadbead",
                    "author": "Aristotle",
                    "description": "The Nicomachean Ethics is the name normally given to ...",
                    "files": [fileobj_document.checksum + '.' + fileobj_document.file_format.extension],
                    "license": license.license_name,
                    "kind": fileobj_document.preset.kind.pk,
                },
                {
                    "title": "The Critique of Pure Reason",
                    "id": "fadefadefadefadefadefadefadefade",
                    "description": "Kant saw the Critique of Pure Reason as an attempt to bridge the gap...",
                    "kind": topic.pk,
                    "children": [
                        {
                            "title": "01 - The Critique of Pure Reason",
                            "id": "facefacefacefacefacefacefaceface",
                            "related":"deaddeaddeaddeaddeaddeaddeaddead",
                            "files": [fileobj_video.checksum + '.' + fileobj_video.file_format.extension],
                            "author": "Immanuel Kant",
                            "license": license.license_name,
                            "kind": fileobj_video.preset.kind.pk,
                        },
                        {
                            "title": "02 - Preface to the Second Edition",
                            "id": "deaddeaddeaddeaddeaddeaddeaddead",
                            "author": "Immanuel Kant",
                            "kind": topic.pk,
                            "children": [
                                {
                                    "title": "02.1 - A Deeply Nested Thought",
                                    "id": "badebadebadebadebadebadebadebade",
                                    "author": "Immanuel Kant",
                                    "kind": topic.pk,
                                }
                            ]
                        }
                    ]
                },
            ]
        },
        {
            "title": "Recipes",
            "id": "acedacedacedacedacedacedacedaced",
            "description": "Recipes for various dishes.",
            "kind": topic.pk,
            "children": [
                {
                    "title": "Smoked Brisket Recipe",
                    "id": "beefbeefbeefbeefbeefbeefbeefbeef",
                    "author": "Bradley Smoker",
                    "files": [fileobj_audio.checksum + '.' + fileobj_audio.file_format.extension],
                    "license": license.license_name,
                    "kind": fileobj_audio.preset.kind.pk,
                },
                {
                    "title": "Food Mob Bites 10: Garlic Bread",
                    "id": "cafecafecafecafecafecafecafecafe",
                    "author": "Revision 3",
                    "description": "Basic garlic bread recipe.",
                    "files": [fileobj_exercise.checksum + '.' + fileobj_exercise.file_format.extension],
                    "license": license.license_name,
                    "kind": fileobj_exercise.preset.kind.pk,
                }
            ]
        },
    ]

@pytest.fixture
def topic_tree_flat(fileobj_document, fileobj_video, fileobj_exercise, fileobj_audio, license, topic):
    return [
        {
            "title": "Western Philosophy",
            "id": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "description": "Philosophy materials for the budding mind.",
            "parent_check": None,
            "author": "",
            "license": None,
            "kind": topic.pk,
        },
        {
            "title": "Nicomachean Ethics",
            "id": "beadbeadbeadbeadbeadbeadbeadbead",
            "parent_check": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "author": "Aristotle",
            "description": "The Nicomachean Ethics is the name normally given to ...",
            "files": [fileobj_document.checksum + '.' + fileobj_document.file_format.extension],
            "license": license.license_name,
            "kind": fileobj_document.preset.kind.pk,
        },
        {
            "title": "The Critique of Pure Reason",
            "id": "fadefadefadefadefadefadefadefade",
            "parent_check": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "description": "Kant saw the Critique of Pure Reason as an attempt to bridge the gap...",
            "author": "",
            "license": None,
            "kind": topic.pk,
        },
        {
            "title": "01 - The Critique of Pure Reason",
            "id": "facefacefacefacefacefacefaceface",
            "parent_check": "fadefadefadefadefadefadefadefade",
            "related":"deaddeaddeaddeaddeaddeaddeaddead",
            "files": [fileobj_video.checksum + '.' + fileobj_video.file_format.extension],
            "description": "",
            "author": "Immanuel Kant",
            "license": license.license_name,
            "kind": fileobj_video.preset.kind.pk,
        },
        {
            "title": "02 - Preface to the Second Edition",
            "id": "deaddeaddeaddeaddeaddeaddeaddead",
            "parent_check": "fadefadefadefadefadefadefadefade",
            "author": "Immanuel Kant",
            "description": "",
            "license": None,
            "kind": topic.pk,
        },
        {
            "title": "02.1 - A Deeply Nested Thought",
            "id": "badebadebadebadebadebadebadebade",
            "parent_check": "deaddeaddeaddeaddeaddeaddeaddead",
            "author": "Immanuel Kant",
            "license": None,
            "kind": topic.pk,
            "description": "",
        },
        {
            "title": "Recipes",
            "id": "acedacedacedacedacedacedacedaced",
            "description": "Recipes for various dishes.",
            "parent_check": None,
            "author": "",
            "license": None,
            "kind": topic.pk,
        },
        {
            "title": "Smoked Brisket Recipe",
            "id": "beefbeefbeefbeefbeefbeefbeefbeef",
            "parent_check": "acedacedacedacedacedacedacedaced",
            "author": "Bradley Smoker",
            "description": "",
            "files": [fileobj_audio.checksum + '.' + fileobj_audio.file_format.extension],
            "license": license.license_name,
            "kind": fileobj_audio.preset.kind.pk,
        },
        {
            "title": "Food Mob Bites 10: Garlic Bread",
            "id": "cafecafecafecafecafecafecafecafe",
            "parent_check": "acedacedacedacedacedacedacedaced",
            "author": "Revision 3",
            "description": "Basic garlic bread recipe.",
            "files": [fileobj_exercise.checksum + '.' + fileobj_exercise.file_format.extension],
            "license": license.license_name,
            "kind": fileobj_exercise.preset.kind.pk,
        }
    ]

@pytest.fixture
def url():
    return "http://127.0.0.1:8000"

@pytest.fixture
def fileobj_id1():
    return 'notarealid.pdf'

@pytest.fixture
def fileobj_id2():
    return 'notarealid.mp3'

@pytest.fixture
def fileobj_id3():
    return 'notarealid.mp4'

@pytest.fixture
def fileobj_id4():
    return 'notarealid.perseus'

@pytest.fixture
def file_list(fileobj_video, fileobj_audio, fileobj_document, fileobj_exercise, fileobj_id1, fileobj_id2, fileobj_id3, fileobj_id4):
    return [
        str(fileobj_video),
        str(fileobj_audio),
        str(fileobj_document),
        str(fileobj_exercise),
        fileobj_id1,
        fileobj_id2,
        fileobj_id3,
        fileobj_id4,
    ]

@pytest.fixture
def file_diff(fileobj_id1, fileobj_id2, fileobj_id3, fileobj_id4):
    return [
        fileobj_id1,
        fileobj_id2,
        fileobj_id3,
        fileobj_id4,
    ]

@pytest.fixture
def filename():
    return "Filename"

@pytest.fixture
def source_url():
    return "http://abc@xyz.com"


@pytest.fixture
def api_file_upload_response(url, fileobj_temp, fileformat_mp4, filename, source_url):
    name = fileobj_temp.name + "." + fileformat_mp4.extension
    contenttype = fileformat_mp4.mimetype
    file_upload_url = url + str(reverse_lazy('api_file_upload'))
    payload={
        'filename':filename,
        'source_url':source_url,
        'content_type': contenttype,
        'name': name,
        'file': fileobj_temp.read(),
    }
    return Client().post(file_upload_url, data=json.dumps(payload), content_type='text/json')

@pytest.fixture
def api_create_channel_response(url, channel_metadata, topic_tree_data):
    create_channel_url = url + str(reverse_lazy('api_create_channel'))
    payload={
        'channel_data': channel_metadata,
        'content_data':topic_tree_data,
    }
    return Client().post(create_channel_url, data=json.dumps(payload), content_type='text/json')

@pytest.fixture
def staging_tree_root(api_create_channel_response):
    channel_id = json.loads(api_create_channel_response.content)['new_channel']
    channel = models.Channel.objects.get(pk=channel_id)
    return channel.staging_tree

""" FILE ENDPOINT TESTS """
def test_api_file_upload_status(api_file_upload_response):
    assert api_file_upload_response.status_code == requests.codes.ok

def test_api_file_upload_data(api_file_upload_response, filename, source_url):
    response = json.loads(api_file_upload_response.content)['new_file']
    file_hash = response['hash'].split('.')[0]
    assert models.File.objects.filter(pk=response['file_id'], checksum=file_hash, contentnode=None, original_filename=filename, source_url=source_url).exists()

def test_file_diff(file_list, file_diff):
    returned_list = get_file_diff(file_list)
    assert set(returned_list) == set(file_diff) and len(returned_list) == len(file_diff)


""" TOPIC TREE CREATION TESTS """
def test_channel_create_success(api_create_channel_response):
    assert api_create_channel_response.status_code == requests.codes.ok

def test_channel_create_channel_created(api_create_channel_response, channel_metadata):
    channel_id = json.loads(api_create_channel_response.content)['new_channel']
    name_check = channel_metadata['name']
    description_check = channel_metadata['description']
    thumbnail_check = channel_metadata['thumbnail']
    assert models.Channel.objects.filter(pk=channel_id, name=name_check, description=description_check, thumbnail=thumbnail_check).exists()

def test_channel_create_staging_tree_created(staging_tree_root, topic):
    assert staging_tree_root is not None and staging_tree_root.kind == topic

def test_channel_create_tree_created(api_create_channel_response, topic_tree_flat, staging_tree_root):
    for n in topic_tree_flat:
        node = models.ContentNode.objects.get(node_id=n['id'])
        assert node.title==n['title'] and node.description==n['description'] and node.author == n['author'] and node.kind.pk == n['kind']
        assert node.license.license_name==n['license'] if node.license else n['license'] is None
        assert node.parent.node_id==n['parent_check'] or node.parent == staging_tree_root

def test_channel_create_files_created(api_create_channel_response, topic_tree_flat):
    for n in topic_tree_flat:
        if 'files' in n:
            node = models.ContentNode.objects.get(node_id=n['id'])
            assert len(n['files']) == node.files.all().count()
            for file_obj in node.files.all():
                assert str(file_obj.checksum+'.'+file_obj.file_format.extension) in n['files']

def test_channel_create_main_tree_set(api_create_channel_response, staging_tree_root):
    channel_id = json.loads(api_create_channel_response.content)['new_channel']
    channel =  models.Channel.objects.get(pk=channel_id)
    assert channel.main_tree == staging_tree_root

def test_channel_create_version_incremented(api_create_channel_response):
    channel_id = json.loads(api_create_channel_response.content)['new_channel']
    channel =  models.Channel.objects.get(pk=channel_id)
    assert channel.version == 1