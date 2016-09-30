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
