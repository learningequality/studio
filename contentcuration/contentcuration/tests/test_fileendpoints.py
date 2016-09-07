import os
import pytest
import zipfile
import requests
import tempfile
import sys
import json
from django.test import Client
from mixer.backend.django import mixer
from contentcuration import models
from django.contrib.sites.shortcuts import get_current_site
from django.conf import settings
from contentcuration.api import get_file_diff, api_file_create
from django.core.urlresolvers import reverse_lazy
from django.core.files.uploadedfile import SimpleUploadedFile

pytestmark = pytest.mark.django_db

@pytest.yield_fixture
def fileobj_temp():
    randomfilebytes = ":)"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        f.write(randomfilebytes)
        f.flush()
        yield f

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
def url():
    return "http://127.0.0.1:8000" + str(reverse_lazy('api_file_upload'))

@pytest.fixture
def api_file_upload_response(url, fileobj_temp, fileformat_mp4):
    name = fileobj_temp.name + "." + fileformat_mp4.extension
    contenttype = fileformat_mp4.mimetype
    return Client().post(url, {'file': SimpleUploadedFile(name, fileobj_temp.read(), content_type=contenttype)})


def test_api_file_upload_status(api_file_upload_response):
    assert api_file_upload_response.status_code == requests.codes.ok

def test_api_file_upload_data(api_file_upload_response):
    response = json.loads(api_file_upload_response.content)['new_file']
    assert models.File.objects.filter(pk=response['file_id'], checksum=response['file_id']).exists()

def test_file_diff(file_list, file_diff):
    returned_list = get_file_diff(file_list)
    assert set(returned_list) == set(file_diff) and len(returned_list) == len(file_diff)

