import pytest
from mixer.backend.django import mixer
from contentcuration import models as cc
from kolibri.content import models as k
from django.core.management import call_command
from django.test.utils import override_settings


@pytest.fixture
def channel():
    ext = mixer.blend('contentcuration.FileFormat', extension='mp4', mimetype='application/video')

    topic = mixer.blend('contentcuration.ContentKind', kind='topic')
    video = mixer.blend('contentcuration.ContentKind', kind='video')

    videopreset = mixer.blend('contentcuration.FormatPreset', id='mp4', kind=video)

    with cc.ContentNode.objects.delay_mptt_updates():
        root = mixer.blend('contentcuration.ContentNode', title="root", parent=None, kind=topic)
        level1 = mixer.blend('contentcuration.ContentNode', parent=root, kind=topic)
        level2 = mixer.blend('contentcuration.ContentNode', parent=level1, kind=topic)
        leaf = mixer.blend('contentcuration.ContentNode', parent=level2, kind=video)

    fileobj = mixer.blend('contentcuration.File', contentnode=leaf, file_format=ext, preset=videopreset)

    channel = mixer.blend('contentcuration.Channel', main_tree=root, name='testchannel')

    return channel


@pytest.mark.django_db
def test_things_work(channel, settings):
    # TODO (aron): split different gets/asserts into their own tests
    call_command('exportchannel', channel.name)

    k.ChannelMetadata.objects.get(name=channel.name)

    cc_root = channel.main_tree

    for ccnode in cc_root.get_family():
        kolibrinode = k.ContentNode.objects.get(pk=ccnode.pk)

        assert ccnode.parent_id == kolibrinode.parent_id
