import base64
import json
import md5
import pytest
import requests
import tempfile

from cStringIO import StringIO
from django.test import Client
from mixer.backend.django import mixer
from contentcuration import models
from django.core.files.storage import default_storage
from django.core.urlresolvers import reverse_lazy

from rest_framework.test import APIClient

from contentcuration import models as cc

pytestmark = pytest.mark.django_db


# TODO: It might be good to move some of these helpers into a file all tests can import.
def text():
    """
    Create a video content kind entry.
    """
    return mixer.blend(cc.ContentKind, kind='text')


def preset_text():
    """
    Create a video format preset.
    """
    return mixer.blend(cc.FormatPreset, id='txt', kind=text())


def fileformat_txt():
    """
    Create an mp4 FileFormat entry.
    """
    return mixer.blend(cc.FileFormat, extension='txt', mimetype='text/plain')


@pytest.fixture
def admin_user():
    return models.User.objects.create_superuser('big_shot', 'bigshot@reallybigcompany.com', 'password')


@pytest.fixture
def fileobj_temp():
    randomfilebytes = ":)"

    fileobj = StringIO(randomfilebytes)
    digest = md5.new(randomfilebytes).hexdigest()
    filename = "{}.txt".format(digest)
    storage_file_path = cc.generate_object_storage_name(digest, filename)

    # Write out the file bytes on to object storage, with a filename specified with randomfilename
    default_storage.save(storage_file_path, fileobj)

    # then create a File object with that
    db_file_obj = mixer.blend(cc.File, file_format=fileformat_txt(), preset=preset_text(), file_on_disk=storage_file_path)

    return {'name': storage_file_path, 'data': randomfilebytes, 'file': fileobj, 'db_file': db_file_obj}


@pytest.fixture
def thumbnail():
    return base64.b64encode(":)")


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
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp4, preset=preset_video, file_on_disk=fileobj_temp['name'])
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
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp3, preset=preset_audio, file_on_disk=fileobj_temp['name'])
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
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_perseus, preset=preset_exercise, file_on_disk=fileobj_temp['name'])
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
    db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_pdf, preset=preset_document, file_on_disk=fileobj_temp['name'])
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
            "node_id": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "description": "Philosophy materials for the budding mind.",
            "kind": topic.pk,
            "license": license.license_name,
            "children": [
                {
                    "title": "Nicomachean Ethics",
                    "node_id": "beadbeadbeadbeadbeadbeadbeadbead",
                    "author": "Aristotle",
                    "description": "The Nicomachean Ethics is the name normally given to ...",
                    "files": [fileobj_document.checksum + '.' + fileobj_document.file_format.extension],
                    "license": license.license_name,
                    "kind": fileobj_document.preset.kind.pk,
                },
                {
                    "title": "The Critique of Pure Reason",
                    "node_id": "fadefadefadefadefadefadefadefade",
                    "description": "Kant saw the Critique of Pure Reason as an attempt to bridge the gap...",
                    "kind": topic.pk,
                    "license": license.license_name,
                    "children": [
                        {
                            "title": "01 - The Critique of Pure Reason",
                            "node_id": "facefacefacefacefacefacefaceface",
                            "related": "deaddeaddeaddeaddeaddeaddeaddead",
                            "files": [fileobj_video.checksum + '.' + fileobj_video.file_format.extension],
                            "author": "Immanuel Kant",
                            "license": license.license_name,
                            "kind": fileobj_video.preset.kind.pk,
                        },
                        {
                            "title": "02 - Preface to the Second Edition",
                            "node_id": "deaddeaddeaddeaddeaddeaddeaddead",
                            "author": "Immanuel Kant",
                            "kind": topic.pk,
                            "license": license.license_name,
                            "children": [
                                {
                                    "title": "02.1 - A Deeply Nested Thought",
                                    "node_id": "badebadebadebadebadebadebadebade",
                                    "author": "Immanuel Kant",
                                    "license": license.license_name,
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
            "node_id": "acedacedacedacedacedacedacedaced",
            "description": "Recipes for various dishes.",
            "kind": topic.pk,
            "license": license.license_name,
            "children": [
                {
                    "title": "Smoked Brisket Recipe",
                    "node_id": "beefbeefbeefbeefbeefbeefbeefbeef",
                    "author": "Bradley Smoker",
                    "files": [fileobj_audio.checksum + '.' + fileobj_audio.file_format.extension],
                    "license": license.license_name,
                    "kind": fileobj_audio.preset.kind.pk,
                },
                {
                    "title": "Food Mob Bites 10: Garlic Bread",
                    "node_id": "cafecafecafecafecafecafecafecafe",
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
def api_file_upload_response(auth_client, url, fileobj_temp, fileformat_mp4, filename, source_url):
    name = fileobj_temp['name']
    contenttype = fileformat_mp4.mimetype
    file_upload_url = url + str(reverse_lazy('api_file_upload'))
    with tempfile.NamedTemporaryFile() as temp_file:
        payload = {
            'file': temp_file.file,
        }
        response = auth_client.post(file_upload_url, payload)
        return response


@pytest.fixture
def auth_client(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    return client


@pytest.fixture
def api_create_channel_response(url, channel_metadata, auth_client):
    create_channel_url = url + str(reverse_lazy('api_create_channel'))
    payload = {
        'channel_data': channel_metadata,
    }
    response = auth_client.post(create_channel_url, data=json.dumps(payload), content_type='text/json')
    return response


@pytest.fixture
def api_add_nodes_response(url, api_create_channel_response, channel_metadata, topic_tree_data, auth_client):
    root_id = json.loads(api_create_channel_response.content)['root']
    add_nodes_url = url + str(reverse_lazy('api_add_nodes_to_tree'))
    payload = {
        'root_id': root_id,
        'content_data': topic_tree_data,
    }
    response = auth_client.post(add_nodes_url, data=json.dumps(payload), content_type='text/json')
    return response



@pytest.fixture
def staging_tree_root(api_create_channel_response):
    channel_id = json.loads(api_create_channel_response.content)['channel_id']
    channel = models.Channel.objects.get(pk=channel_id)
    return channel.staging_tree

@pytest.fixture
def chef_tree_root(api_create_channel_response):
    channel_id = json.loads(api_create_channel_response.content)['channel_id']
    channel = models.Channel.objects.get(pk=channel_id)
    return channel.chef_tree

""" FILE ENDPOINT TESTS """
@pytest.mark.skip(reason="For test to work, need to figure out how to format file upload data for api_file_upload_response")
def test_api_file_upload_status(api_file_upload_response):
    assert api_file_upload_response.status_code == requests.codes.ok

@pytest.mark.skip(reason="For test to work, need to figure out how to format file upload data for api_file_upload_response")
def test_api_file_upload_data(api_file_upload_response, filename, source_url):
    response = json.loads(api_file_upload_response.content)['new_file']
    file_hash = response['hash'].split('.')[0]
    assert models.File.objects.filter(pk=response['file_id'], checksum=file_hash, contentnode=None, original_filename=filename, source_url=source_url).exists()


""" TOPIC TREE CREATION TESTS """


def test_channel_create_success(api_create_channel_response):
    assert api_create_channel_response.status_code == requests.codes.ok


def test_channel_create_channel_created(api_create_channel_response, channel_metadata):
    channel_id = json.loads(api_create_channel_response.content)['channel_id']
    name_check = channel_metadata['name']
    description_check = channel_metadata['description']
    thumbnail_check = channel_metadata['thumbnail']
    assert models.Channel.objects.filter(pk=channel_id, name=name_check, description=description_check, thumbnail=thumbnail_check).exists()

def test_channel_create_staging_tree_is_none(staging_tree_root):
    """
    Tests that staging_tree is None after channel creation and before sushi chef starts
    """
    assert staging_tree_root is None


def test_channel_create_chef_tree_is_set(chef_tree_root):
    """
    Tests that chef_tree is set after channel creation and before sushi chef starts
    """
    assert chef_tree_root is not None

@pytest.mark.skip(reason="topic_tree_data creation data structures need updated with content_id and possibly other fields")
def test_channel_create_tree_created(api_add_nodes_response, topic_tree_data, staging_tree_root):
    assert api_add_nodes_response.status == 201
    def check_tree_node(n):
        node = models.ContentNode.objects.get(node_id=n['node_id'])
        assert node.title == n['title'] and node.description == n['description'] and node.author == n['author'] and node.kind.pk == n['kind']
        assert node.license.license_name == n['license'] if node.license else n['license'] is None
        assert node.parent.node_id == n['parent_check'] or node.parent == staging_tree_root
        if 'children' in n:
            for child in n['children']:
                check_tree_node(child)

    for n in topic_tree_data:
        check_tree_node(n)

@pytest.mark.skip(reason="topic_tree_data creation data structures need updated with content_id and possibly other fields")
def test_channel_create_files_created(api_create_channel_response, topic_tree_data):
    def check_tree_files(n):
        if 'files' in n:
            node = models.ContentNode.objects.get(node_id=n['id'])
            assert len(n['files']) == node.files.all().count()
            for file_obj in node.files.all():
                assert str(file_obj.checksum + '.' + file_obj.file_format.extension) in n['files']

        if 'children' in n:
            for child in n['children']:
                check_tree_files(child)

    for n in topic_tree_data:
        check_tree_files(n)


def test_channel_create_main_tree_unset(api_create_channel_response):
    """
    When a newly created channel is saved to the database, main_tree will be set to a new ContentNode if it doesn't already
    exist. Ensure main_tree is created.
    """
    channel_id = json.loads(api_create_channel_response.content)['channel_id']
    channel = models.Channel.objects.get(pk=channel_id)
    assert channel.main_tree is not None


def test_channel_create_version_not_incremented(api_create_channel_response):
    """
    Channel version should not be incremented until a cheffing or publishing operation is committed.
    """
    channel_id = json.loads(api_create_channel_response.content)['channel_id']
    channel = models.Channel.objects.get(pk=channel_id)
    assert channel.version == 0
