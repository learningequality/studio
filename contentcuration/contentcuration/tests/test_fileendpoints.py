import tempfile

import pytest
from django.conf import settings
from mixer.backend.django import mixer

pytestmark = pytest.mark.django_db


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
def fileobj_video(preset_video, fileformat_mp4):
    randomfilebytes = "4"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        filename = f.name
        f.write(randomfilebytes)
        f.flush()
        db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp4, preset=preset_video, file_on_disk=filename)

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
def fileobj_audio(preset_audio, fileformat_mp3):
    randomfilebytes = "4"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        filename = f.name
        f.write(randomfilebytes)
        f.flush()
        db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp3, preset=preset_audio, file_on_disk=filename)

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
def fileobj_exercise(preset_exercise, fileformat_perseus):
    randomfilebytes = "4"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        filename = f.name
        f.write(randomfilebytes)
        f.flush()
        db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_perseus, preset=preset_exercise, file_on_disk=filename)

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
def fileobj_document(preset_document, fileformat_pdf):
    randomfilebytes = "4"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, mode='w+t', delete=False) as f:
        filename = f.name
        f.write(randomfilebytes)
        f.flush()
        db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_pdf, preset=preset_document, file_on_disk=filename)

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
        fileobj_video.__str__(),
        fileobj_audio.__str__(),
        fileobj_document.__str__(),
        fileobj_exercise.__str__(),
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
