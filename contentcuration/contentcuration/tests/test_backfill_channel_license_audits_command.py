from unittest import mock

from django.core.management import call_command

from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


class BackfillChannelLicenseAuditsCommandTestCase(StudioTestCase):
    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()
        self.channel.version = 1
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.save()

        Channel.objects.filter(pk=self.channel.pk).update(version_info=None)

    def test_dry_run_does_not_update_version_info(self):
        with mock.patch(
            "contentcuration.management.commands.backfill_channel_license_audits.audit_channel_version"
        ) as mock_audit:
            call_command("backfill_channel_license_audits", dry_run=True)

        self.channel.refresh_from_db()
        self.assertIsNone(self.channel.version_info)
        self.assertTrue(
            ChannelVersion.objects.filter(
                channel=self.channel, version=self.channel.version
            ).exists()
        )
        mock_audit.assert_not_called()

    def test_backfill_updates_version_info_and_runs_audit(self):
        with mock.patch(
            "contentcuration.management.commands.backfill_channel_license_audits.audit_channel_version"
        ) as mock_audit:
            call_command("backfill_channel_license_audits")

        self.channel.refresh_from_db()
        self.assertIsNotNone(self.channel.version_info)
        self.assertEqual(self.channel.version_info.version, self.channel.version)
        mock_audit.assert_called_once()
