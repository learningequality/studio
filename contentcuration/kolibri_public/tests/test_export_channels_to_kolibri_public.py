import os.path
import shutil
import tempfile
import threading
import time
from unittest import mock

from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.db import transaction
from django.test import TestCase
from django.test import TransactionTestCase
from django.urls import reverse
from kolibri_content import models as kolibri_content_models
from kolibri_content.apps import KolibriContentConfig
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.models import ChannelMetadata as PublicChannelMetadata
from kolibri_public.models import ContentNode as PublicContentNode
from kolibri_public.tests.base import ChannelBuilder
from kolibri_public.utils.export_channel_to_kolibri_public import (
    export_channel_to_kolibri_public,
)
from kolibri_public.utils.export_channel_to_kolibri_public import (
    lock_kolibri_public_channel,
)
from kolibri_public.utils.export_channel_to_kolibri_public import (
    sync_channel_to_kolibri_public,
)
from kombu.exceptions import OperationalError as KombuOperationalError

from contentcuration.models import Channel
from contentcuration.models import Country
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.helpers import EagerTasksTestMixin
from contentcuration.tests.helpers import record_published_tasks
from contentcuration.tests.utils.restricted_filesystemstorage import (
    RestrictedFileSystemStorage,
)


class ExportFixtureMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls._temp_directory_ctx = tempfile.TemporaryDirectory()
        cls.test_db_root_dir = cls._temp_directory_ctx.__enter__()
        os.makedirs(os.path.join(cls.test_db_root_dir, settings.DB_ROOT), exist_ok=True)

        build_db_path = os.path.join(cls.test_db_root_dir, "build.sqlite3")
        open(build_db_path, "w").close()
        with using_content_database(build_db_path):
            call_command(
                "migrate",
                app_label=KolibriContentConfig.label,
                database=get_active_content_database(),
            )
            builder = ChannelBuilder(
                levels=1, num_children=1, models=kolibri_content_models
            )
            builder.insert_into_default_db()
            cls.exported_channel_metadata = (
                kolibri_content_models.ChannelMetadata.objects.get(
                    id=builder.channel["id"]
                )
            )

        cls.channel_id = builder.channel["id"]
        db_dir = os.path.join(cls.test_db_root_dir, settings.DB_ROOT)
        for name in (
            f"{cls.channel_id}-{builder.channel['version']}",
            cls.channel_id,
        ):
            shutil.copyfile(build_db_path, os.path.join(db_dir, f"{name}.sqlite3"))

    @classmethod
    def tearDownClass(cls):
        cls._temp_directory_ctx.__exit__(None, None, None)
        super().tearDownClass()

    def setUp(self):
        super().setUp()

        self.storage = RestrictedFileSystemStorage(location=self.test_db_root_dir)
        storage_patch = mock.patch(
            "kolibri_public.utils.export_channel_to_kolibri_public.storage",
            new=self.storage,
        )
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

    def _create_studio_channel(self, public=True, published=True):
        channel = Channel.objects.create(
            actor_id=self.admin_user.id,
            id=self.channel_id,
            name="sync channel",
            public=public,
        )
        channel.main_tree.published = published
        channel.main_tree.save()
        return channel

    def _admin_patch(self, data):
        self.client.force_authenticate(self.admin_user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse("admin-channels-detail", kwargs={"pk": self.channel_id}),
                data,
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.content)

    def _assert_exported(self, public=True):
        self.assertTrue(
            PublicChannelMetadata.objects.filter(
                id=self.channel_id, public=public
            ).exists()
        )
        self.assertTrue(
            PublicContentNode.objects.filter(channel_id=self.channel_id).exists()
        )

    def _assert_not_exported(self):
        self.assertFalse(
            PublicChannelMetadata.objects.filter(id=self.channel_id).exists()
        )
        self.assertFalse(
            PublicContentNode.objects.filter(channel_id=self.channel_id).exists()
        )


class ExportTestCase(ExportFixtureMixin, TestCase):
    @mock.patch("kolibri_public.utils.export_channel_to_kolibri_public.ChannelMapper")
    def test_export_channel_to_kolibri_public__existing_version(
        self, mock_channel_mapper
    ):
        categories = ["Category1", "Category2"]
        country1 = Country.objects.create(code="C1", name="Country 1")
        country2 = Country.objects.create(code="C2", name="Country 2")
        countries = [country1, country2]

        export_channel_to_kolibri_public(
            channel_id=self.channel_id,
            channel_version=1,
            public=True,
            categories=categories,
            countries=countries,
        )

        mock_channel_mapper.assert_called_once_with(
            channel=self.exported_channel_metadata,
            public=True,
            categories=categories,
            countries=countries,
        )
        mock_channel_mapper.return_value.run.assert_called_once_with()

    @mock.patch("kolibri_public.utils.export_channel_to_kolibri_public.ChannelMapper")
    def test_export_channel_to_kolibri_public__without_version(
        self, mock_channel_mapper
    ):
        export_channel_to_kolibri_public(
            channel_id=self.channel_id,
        )

        mock_channel_mapper.assert_called_once_with(
            channel=self.exported_channel_metadata,
            public=True,
            categories=None,
            countries=None,
        )
        mock_channel_mapper.return_value.run.assert_called_once_with()

    def test_export_channel_to_kolibri_public__bad_channel(self):
        with self.assertRaises(FileNotFoundError):
            export_channel_to_kolibri_public(
                channel_id="dummy_id",
                channel_version=1,
            )

    def test_export_channel_to_kolibri_public__bad_version(self):
        with self.assertRaises(FileNotFoundError):
            export_channel_to_kolibri_public(
                channel_id=self.channel_id,
                channel_version=2,
            )


class SyncChannelToKolibriPublicTestCase(ExportFixtureMixin, StudioTestCase):
    def test_does_not_export_unpublished_public_channel(self):
        self._create_studio_channel(published=False)

        sync_channel_to_kolibri_public(self.channel_id)

        self._assert_not_exported()

    def test_removes_soft_deleted_channel(self):
        export_channel_to_kolibri_public(self.channel_id)
        self._create_studio_channel()
        Channel.objects.filter(id=self.channel_id).update(deleted=True)

        sync_channel_to_kolibri_public(self.channel_id)

        self._assert_not_exported()

    def test_keeps_community_library_row_of_private_channel(self):
        export_channel_to_kolibri_public(self.channel_id, public=False)
        self._create_studio_channel(public=False)

        sync_channel_to_kolibri_public(self.channel_id)

        self._assert_exported(public=False)

    def test_command_exports_channel_by_id(self):
        self._create_studio_channel()

        call_command("export_channels_to_kolibri_public", channel_id=self.channel_id)

        self._assert_exported()

    def test_command_does_not_export_private_channel_by_id(self):
        self._create_studio_channel(public=False)

        call_command("export_channels_to_kolibri_public", channel_id=self.channel_id)

        self._assert_not_exported()


class ChannelSchedulesSyncTestCase(
    ExportFixtureMixin, EagerTasksTestMixin, StudioAPITestCase
):
    def _exported_channel(self):
        self._create_studio_channel()
        export_channel_to_kolibri_public(self.channel_id)
        return Channel.objects.get(id=self.channel_id)

    def _get_public_channel(self):
        return self.client.get(reverse("publicchannel-detail", args=[self.channel_id]))

    def test_make_public_exports_channel(self):
        channel = self._create_studio_channel(public=False)

        with self.captureOnCommitCallbacks(execute=True):
            channel.make_public()

        self._assert_exported()

    def test_make_public_bypassing_signals_exports_channel(self):
        channel = self._create_studio_channel(public=False)

        with self.captureOnCommitCallbacks(execute=True):
            channel.make_public(bypass_signals=True)

        self._assert_exported()

    def test_save_public_exports_channel(self):
        channel = self._create_studio_channel(public=False)

        with self.captureOnCommitCallbacks(execute=True):
            channel.public = True
            channel.save()

        self._assert_exported()

    def test_admin_making_channel_public_serves_it(self):
        self._create_studio_channel(public=False)

        self._admin_patch({"public": True})

        self.assertEqual(self._get_public_channel().status_code, 200)

    def test_admin_making_channel_private_stops_serving_it(self):
        self._exported_channel()

        self._admin_patch({"public": False})

        self.assertEqual(self._get_public_channel().status_code, 404)
        self._assert_not_exported()

    def test_soft_delete_removes_channel(self):
        channel = self._exported_channel()

        with self.captureOnCommitCallbacks(execute=True):
            channel.deleted = True
            channel.save(actor_id=self.admin_user.id)

        self._assert_not_exported()

    def test_instance_delete_removes_channel(self):
        channel = self._exported_channel()

        with self.captureOnCommitCallbacks(execute=True):
            channel.delete()

        self._assert_not_exported()

    def test_queryset_delete_removes_channel(self):
        self._exported_channel()

        with self.captureOnCommitCallbacks(execute=True):
            Channel.objects.filter(id=self.channel_id).delete()

        self._assert_not_exported()

    def test_removal_invalidates_list_etag(self):
        channel = self._exported_channel()
        url = reverse("publicchannel-list")
        before = self.client.get(url)
        self.assertIn(self.channel_id, before.content.decode())

        with self.captureOnCommitCallbacks(execute=True):
            channel.public = False
            channel.save()

        response = self.client.get(url, HTTP_IF_NONE_MATCH=before["ETag"])
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(self.channel_id, response.content.decode())


class ChannelSyncPublishTestCase(ExportFixtureMixin, StudioAPITestCase):
    def test_admin_request_publishes_task_without_exporting(self):
        self._create_studio_channel(public=False)
        published = record_published_tasks(self)

        self._admin_patch({"public": True})

        self.assertEqual(
            published,
            [("sync_channel_to_kolibri_public_task", {"channel_id": self.channel_id})],
        )
        self._assert_not_exported()

    @mock.patch("contentcuration.models.report_exception")
    @mock.patch(
        "contentcuration.tasks.sync_channel_to_kolibri_public_task.apply_async",
        side_effect=KombuOperationalError,
    )
    def test_admin_request_succeeds_when_broker_unreachable(
        self, apply_async, report_exception
    ):
        self._create_studio_channel(public=False)

        self._admin_patch({"public": True})

        apply_async.assert_called_once()
        report_exception.assert_called_once()


class ChannelSyncAfterCommitTestCase(
    ExportFixtureMixin, EagerTasksTestMixin, TransactionTestCase
):
    def setUp(self):
        super().setUp()
        call_command("loadconstants")
        self.admin_user = testdata.user()

    def test_save_outside_transaction_exports_channel(self):
        channel = self._create_studio_channel(public=False)

        channel.public = True
        channel.save()

        self._assert_exported()

    def test_sync_reads_channel_under_lock(self):
        self._create_studio_channel()
        errors = []

        def sync():
            try:
                sync_channel_to_kolibri_public(self.channel_id)
            except Exception as e:
                errors.append(e)
            finally:
                connection.close()

        thread = threading.Thread(target=sync)
        with transaction.atomic():
            lock_kolibri_public_channel(self.channel_id)
            thread.start()
            self._wait_for_lock_waiter()
            Channel.objects.filter(id=self.channel_id).update(public=False)
        thread.join(timeout=60)

        self.assertEqual(errors, [])
        self._assert_not_exported()

    def _wait_for_lock_waiter(self):
        deadline = time.monotonic() + 30
        with connection.cursor() as cursor:
            while time.monotonic() < deadline:
                cursor.execute(
                    "SELECT EXISTS (SELECT 1 FROM pg_locks"
                    " WHERE locktype = 'advisory' AND NOT granted)"
                )
                if cursor.fetchone()[0]:
                    return
                time.sleep(0.05)
        self.fail("sync never waited on the channel lock")
