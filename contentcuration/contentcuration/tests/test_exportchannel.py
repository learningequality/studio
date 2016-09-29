import os
import pytest
import zipfile
import tempfile
from mixer.backend.django import mixer
from contentcuration import models as cc
from kolibri.content import models as k
from django.core.management import call_command
from django.conf import settings


pytestmark = pytest.mark.django_db


@pytest.fixture
def video():
    return mixer.blend('contentcuration.ContentKind', kind='video')


@pytest.fixture
def preset_video(video):
    return mixer.blend('contentcuration.FormatPreset', id='mp4', kind=video)


@pytest.fixture
def topic():
    return mixer.blend('contentcuration.ContentKind', kind='topic')

@pytest.fixture
def exercise():
    return mixer.blend('contentcuration.ContentKind', kind='exercise')

@pytest.fixture
def preset_exercise(exercise):
    return mixer.blend('contentcuration.FormatPreset', id='exercise', kind=exercise)

@pytest.fixture
def fileformat_perseus():
    return mixer.blend('contentcuration.FileFormat', extension='perseus', mimetype='application/exercise')

@pytest.fixture
def fileformat_mp4():
    return mixer.blend('contentcuration.FileFormat', extension='mp4', mimetype='application/video')


@pytest.fixture
def license_wtfpl():
    return mixer.blend('contentcuration.License', license_name="WTF License")

@pytest.yield_fixture
def fileobj_video(preset_video, fileformat_mp4):
    randomfilebytes = "4"

    with tempfile.NamedTemporaryFile(dir=settings.STORAGE_ROOT, delete=False) as f:
        filename = f.name
        f.write(randomfilebytes)
        f.flush()
        db_file_obj = mixer.blend('contentcuration.File', file_format=fileformat_mp4, preset=preset_video, file_on_disk=filename)

        yield db_file_obj

@pytest.fixture
def assessment_item():
    answers = "[{\"correct\": false, \"answer\": \"White Rice\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Brown Rice\", \"help_text\": \"\"}, {\"correct\": false, \"answer\": \"Rice Krispies\", \"help_text\": \"\"}]"
    return mixer.blend('contentcuration.AssessmentItem', question='Which rice is the healthiest?', type='single_selection', answers=answers)

@pytest.fixture
def assessment_item2():
    answers = "[{\"correct\": true, \"answer\": \"Eggs\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Tofu\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Meat\", \"help_text\": \"\"}, {\"correct\": true, \"answer\": \"Beans\", \"help_text\": \"\"}, {\"correct\": false, \"answer\": \"Rice\", \"help_text\": \"\"}]"
    return mixer.blend('contentcuration.AssessmentItem', question='Which of the following are proteins?', type='multiple_selection', answers=answers)

@pytest.fixture
def assessment_item3():
    answers = "[]"
    return mixer.blend('contentcuration.AssessmentItem', question='Why a rice cooker?', type='free_response', answers=answers)

@pytest.fixture
def assessment_item4():
    answers = "[{\"correct\": true, \"answer\": 20, \"help_text\": \"\"}]"
    return mixer.blend('contentcuration.AssessmentItem', question='How many minutes does it take to cook rice?', type='input_question', answers=answers)

@pytest.fixture
def channel(topic, video, exercise, preset_video, license_wtfpl, fileobj_video, assessment_item, assessment_item2, assessment_item3, assessment_item4):
    with cc.ContentNode.objects.delay_mptt_updates():
        root = mixer.blend('contentcuration.ContentNode', title="root", parent=None, kind=topic)
        level1 = mixer.blend('contentcuration.ContentNode', parent=root, kind=topic)
        level2 = mixer.blend('contentcuration.ContentNode', parent=level1, kind=topic)
        leaf = mixer.blend('contentcuration.ContentNode', parent=level2, kind=video)
        leaf2 = mixer.blend('contentcuration.ContentNode', parent=level2, kind=exercise, title='EXERCISE 1', extra_fields="{\"mastery_model\":\"do_all\",\"randomize\":true}")

        fileobj_video.contentnode = leaf
        fileobj_video.save()

        assessment_item.contentnode = leaf2
        assessment_item.save()

        assessment_item2.contentnode = leaf2
        assessment_item2.save()

        assessment_item3.contentnode = leaf2
        assessment_item3.save()

        assessment_item4.contentnode = leaf2
        assessment_item4.save()

    channel = mixer.blend('contentcuration.Channel', main_tree=root, name='testchannel', thumbnail="")

    return channel


# def test_things_work(channel, license_wtfpl):
#     # TODO (aron): split different gets/asserts into their own tests
#     call_command('exportchannel', channel.pk)

#     k.ChannelMetadata.objects.get(name=channel.name)

#     cc_root = channel.main_tree

#     for ccnode in cc_root.get_family():
#         kolibrinode = k.ContentNode.objects.get(pk=ccnode.pk)

#         assert ccnode.parent_id == kolibrinode.parent_id


# def test_assigns_channel_root_pk(channel, license_wtfpl):
#     call_command('exportchannel', channel.pk)

#     kolibrichannel = k.ChannelMetadata.objects.get(pk=channel.pk)

#     assert kolibrichannel.root_pk == channel.main_tree_id


# def test_assigns_license(channel, license_wtfpl):
#     call_command('exportchannel', channel.pk)

#     kolibrichannel = k.ChannelMetadata.objects.get(pk=channel.pk)
#     root_kolibrinode = k.ContentNode.objects.get(pk=kolibrichannel.root_pk)

#     for n in root_kolibrinode.get_family():
#         assert n.license.license_name == cc.ContentNode.objects.get(pk=n.pk).license.license_name


# def test_increments_version(channel, license_wtfpl):
#     old_version = channel.version
#     call_command('exportchannel', channel.pk)
#     channel.refresh_from_db()
#     assert channel.version > old_version


# def test_hack_hack_hack_returns_zip_containing_actual_files(channel):
#     call_command('exportchannel', channel.pk)

#     assert os.path.exists(settings.HACK_HACK_HACK_UNICEF_CONTENT_ZIP_PATH)

#     with zipfile.ZipFile(settings.HACK_HACK_HACK_UNICEF_CONTENT_ZIP_PATH) as zf:
#         # Get all File objects, and their corresponding contents
#         kolibri_file_objects = [str(f) for f in k.File.objects.all()]
#         for fileinzip in zf.infolist():
#             # compare all filenames inside the zip and in our db, and their contents
#             assert any([i for i in kolibri_file_objects if fileinzip.filename in i])

def test_perseus_exercise_creation(channel, preset_exercise, fileformat_perseus):
    call_command('exportchannel', channel.pk)
    assert False
