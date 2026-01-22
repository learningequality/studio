"""
**Testing plan**

1. Create a channel, version 0, with no published_data entries
2. Create a channel, version 1, with 1 published_data entries
3. Create a channel, version 2, with 2 published_data entries
4. Confirm that the channel versions are created correctly
{
	"published_data": {
		"1": {
			"size": 2207,
			"kind_count": [
				{
					"count": 1,
					"kind_id": "exercise"
				}
			],
			"version_notes": "2123123",
			"date_published": "2026-01-19 22:03:21",
			"resource_count": 1,
			"included_licenses": [
				5
			],
			"included_languages": [],
			"included_categories": []
		},
		"2": {
			"size": 2207,
			"kind_count": [
				{
					"count": 1,
					"kind_id": "exercise"
				}
			],
			"version_notes": "223123123",
			"date_published": "2026-01-19 22:04:30",
			"resource_count": 1,
			"included_licenses": [
				5
			],
			"included_languages": [],
			"included_categories": []
		}
	}
}
"""
from django.core.management import call_command

from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase

def _bump(channel):
    channel.version += 1
    channel.published_data[str(channel.version)] = {
        "version": channel.version,
    }
    channel.save()


class TestCreateChannelVersions(StudioTestCase):
    """Tests for the create_channel_versions management command."""

    def setUp(self):
        super(TestCreateChannelVersions, self).setUp()

    def test_channel_with_no_published_data(self):
        """A channel with version 0 and no published_data should create no ChannelVersions."""
        channel = testdata.channel()
        channel.version = 0
        channel.published_data = {}
        channel.save()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        self.assertEqual(
            ChannelVersion.objects.filter(channel=channel).count(),
            0,
            "No ChannelVersion should be created for a channel with no published_data",
        )

    def test_single_channel_with_published_data(self):
        """A channel with version 1 and 1 published_data should create 1 ChannelVersion."""
        channel = testdata.channel()
        _bump(channel)
        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        self.assertEqual(
            ChannelVersion.objects.filter(channel=channel).count(),
            1,
            "A ChannelVersion should be created for a channel with published_data",
        )

        self.assertEqual(channel.version_info, ChannelVersion.objects.last())
