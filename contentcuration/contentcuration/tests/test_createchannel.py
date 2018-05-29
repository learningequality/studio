import base64
import hashlib
import json
import os
import pytest
import requests
import tempfile

from cStringIO import StringIO
from django.test import Client
from mixer.backend.django import mixer
from contentcuration import models
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy

from rest_framework.test import APIClient

from contentcuration import models as cc

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_user():
    return models.User.objects.create_superuser('big_shot', 'bigshot@reallybigcompany.com', 'password')


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


def upload_file(admin_client, url, fileobj_temp):
    """
    Uploads a file to the server using an authorized client.
    """
    name = fileobj_temp['name']
    file_upload_url = url + str(reverse_lazy('api_file_upload'))
    f = SimpleUploadedFile(name, fileobj_temp['data'])
    return admin_client.post(file_upload_url, {"file": f})


@pytest.fixture
def fileobj_temp():
    return create_temp_file(":)")


@pytest.fixture
def thumbnail():
    return base64.b64encode(":)")


@pytest.fixture
def topic():
    return mixer.blend('contentcuration.ContentKind', kind='topic')


@pytest.fixture
def fileobj_video():
    return create_temp_file("def", 'video', 'mp4', 'application/video')


@pytest.fixture
def license():
    return mixer.blend('contentcuration.License', license_name="License to Kill")


@pytest.fixture
def fileobj_audio():
    return create_temp_file("abc", 'audio', 'mp3', 'application/audio')


@pytest.fixture
def fileobj_exercise():
    return create_temp_file("jkl", 'exercise', 'perseus', 'application/perseus')


@pytest.fixture
def fileobj_document():
    return create_temp_file("ghi", 'document', 'pdf', 'application/pdf')


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
    def get_file_data(fileinfo):
        fileobj = fileinfo['db_file']
        return {
                'filename': fileinfo['name'],
                'size': fileobj.file_size,
                'preset': None
            }

    data = [
        {
            "title": "Western Philosophy",
            "node_id": "deafdeafdeafdeafdeafdeafdeafdeaf",
            "content_id": "f52d3e2e6ccc59eaaf676aa131edd6ad",
            "description": "Philosophy materials for the budding mind.",
            "kind": topic.pk,
            "license": license.license_name,
            "author": "Bradley Smoker",
            "children": [
                {
                    "title": "Nicomachean Ethics",
                    "node_id": "beadbeadbeadbeadbeadbeadbeadbead",
                    "content_id": "fd373d00523b5484a5586c81e4004afb",
                    "author": "Aristotle",
                    "description": "The Nicomachean Ethics is the name normally given to ...",
                    "files": [get_file_data(fileobj_document)],
                    "license": license.license_name,
                    "kind": fileobj_document['db_file'].preset.kind.pk,
                },
                {
                    "title": "The Critique of Pure Reason",
                    "node_id": "fadefadefadefadefadefadefadefade",
                    "content_id": "07563644b3c059429a0b42853e83c2db",
                    "author": "Bradley Smoker",
                    "description": "Kant saw the Critique of Pure Reason as an attempt to bridge the gap...",
                    "kind": topic.pk,
                    "license": license.license_name,
                    "children": [
                        {
                            "title": "01 - The Critique of Pure Reason",
                            "node_id": "facefacefacefacefacefacefaceface",
                            "content_id": "9ec91b66dc175c93a4c6a599a76cbc25",
                            "related": "deaddeaddeaddeaddeaddeaddeaddead",
                            "files": [get_file_data(fileobj_video)],
                            "author": "Immanuel Kant",
                            "license": license.license_name,
                            "kind": fileobj_video['db_file'].preset.kind.pk,
                        },
                        {
                            "title": "02 - Preface to the Second Edition",
                            "node_id": "deaddeaddeaddeaddeaddeaddeaddead",
                            "content_id": "b249c05125775c479c579e57e66a0a6e",
                            "author": "Immanuel Kant",
                            "kind": topic.pk,
                            "license": license.license_name,
                            "children": [
                                {
                                    "title": "02.1 - A Deeply Nested Thought",
                                    "node_id": "badebadebadebadebadebadebadebade",
                                    "content_id": "aad3620a82c253ea9e8190b2989c4921",
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
            "content_id": "aa480b60a7f4526f886e7df9f4e9b8cc",
            "description": "Recipes for various dishes.",
            "author": "Bradley Smoker",
            "kind": topic.pk,
            "license": license.license_name,
            "children": [
                {
                    "title": "Smoked Brisket Recipe",
                    "node_id": "beefbeefbeefbeefbeefbeefbeefbeef",
                    "content_id": "598fc2a55ea55f86bb7ce9008f34a9d0",
                    "author": "Bradley Smoker",
                    "files": [get_file_data(fileobj_audio)],
                    "license": license.license_name,
                    "kind": fileobj_audio['db_file'].preset.kind.pk,
                },
                {
                    "title": "Food Mob Bites 10: Garlic Bread",
                    "node_id": "cafecafecafecafecafecafecafecafe",
                    "content_id": "7fc278d7dd31577da822e525ec67ee02",
                    "author": "Revision 3",
                    "description": "Basic garlic bread recipe.",
                    "files": [get_file_data(fileobj_exercise)],
                    "license": license.license_name,
                    "kind": fileobj_exercise['db_file'].preset.kind.pk,
                }
            ]
        },
    ]

    def add_field_defaults_to_node(node):
        """
        Since we test using POST, all fields must be present, even if the field will just have the default
        value set. Rather than manually setting a bunch of default values on every node, we just assign it here.
        """
        node.update(
            {
                "license_description": None,
                "copyright_holder": "",
                "questions": [],
                "extra_fields": {}
            })
        if not "files" in node:
            node["files"] = []
        if not "description" in node:
            node["description"] = ""
        if "children" in node:
            for i in range(0, len(node["children"])):
                node["children"][i] = add_field_defaults_to_node(node["children"][i])
        return node

    for i in range(0, len(data)):
        data[i] = add_field_defaults_to_node(data[i])

    return data


@pytest.fixture
def url():
    return "http://127.0.0.1:8000"


@pytest.fixture
def api_file_upload_response(admin_client, url, fileobj_temp):
    response = upload_file(admin_client, url, fileobj_temp)
    return response


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    return client


@pytest.fixture
def api_create_channel_response(url, channel_metadata, admin_client):
    create_channel_url = url + str(reverse_lazy('api_create_channel'))
    payload = {
        'channel_data': channel_metadata,
    }
    response = admin_client.post(create_channel_url, data=json.dumps(payload), content_type='text/json')
    return response


@pytest.fixture
def api_add_nodes_response(url, api_create_channel_response, channel_metadata, topic_tree_data, admin_client):
    root_id = json.loads(api_create_channel_response.content)['root']

    def upload_nodes(root_id, nodes):
        add_nodes_url = url + str(reverse_lazy('api_add_nodes_to_tree'))
        payload = {
            'root_id': root_id,
            'content_data': nodes,
        }
        response = admin_client.post(add_nodes_url, data=json.dumps(payload), content_type='text/json')
        data = json.loads(response.content)
        for node in nodes:
            if "children" in node:
                upload_nodes(data["root_ids"][node["node_id"]], node["children"])

        return response
    return upload_nodes(root_id, topic_tree_data)



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
def test_api_file_upload_status(api_file_upload_response):
    assert api_file_upload_response.status_code == requests.codes.ok


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
    Tests that chef_tree is set after channel creation and before sushi chef starts.
    """
    assert chef_tree_root is not None


def test_channel_create_tree_created(api_add_nodes_response, topic_tree_data, staging_tree_root, channel_metadata):
    """
    Checks that the add_nodes API actually creates the nodes with the data passed to the function.
    """
    def check_tree_node(n, parent=None):
        node = models.ContentNode.objects.get(node_id=n['node_id'])
        assert node.title == n['title'] and node.description == n['description'] and node.author == n['author'] and node.kind.pk == n['kind']
        assert node.license.license_name == n['license'] if node.license else n['license'] is None
        parent_id = ''
        if parent:
            parent_id = parent['node_id']
        assert node.parent.node_id == parent_id or node.parent.node_id == channel_metadata['id']
        if 'children' in n:
            for child in n['children']:
                check_tree_node(child, n)

    for n in topic_tree_data:
        check_tree_node(n)


def test_channel_create_files_created(fileobj_document, fileobj_exercise, fileobj_audio, fileobj_video,  api_add_nodes_response, topic_tree_data):
    """
    Test that add_nodes adds the files specified to the database and associates them with the correct node.
    """
    def check_tree_files(n):
        if 'files' in n:
            node = models.ContentNode.objects.get(node_id=n['node_id'])
            assert len(n['files']) == node.files.all().count()
            for file_obj in node.files.all():
                for afile in n['files']:
                    assert str(file_obj.checksum + '.' + file_obj.file_format.extension) in afile['filename']

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
