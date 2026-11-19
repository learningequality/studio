from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import connection
from django.db import IntegrityError
from django.db import transaction
from django.test import TransactionTestCase
from django.utils import timezone
from kolibri_public import models
from kolibri_public.tests.base import uuid4_hex
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants.format_presets import RENDERABLE_PRESETS_ORDER


class BackfillPublicFileIncludedPresetsTestCase(TransactionTestCase):
    def setUp(self):
        self.contentnode = models.ContentNode.objects.create(
            pk=uuid4_hex(),
            channel_id=uuid4_hex(),
            content_id=uuid4_hex(),
            kind=content_kinds.TOPIC,
            title="node",
            options={},
        )
        self.local_file = models.LocalFile.objects.create(pk=uuid4_hex())

    def _create_file(self, pk_number, preset, **kwargs):
        return models.File.objects.create(
            pk="{:032x}".format(pk_number),
            local_file=self.local_file,
            contentnode=self.contentnode,
            preset=preset,
            **kwargs,
        )

    def test_backfills_eligible_files_across_batches_and_is_idempotent(self):
        first_audio = self._create_file(1, format_presets.AUDIO)
        first_document = self._create_file(2, format_presets.DOCUMENT)
        unknown = self._create_file(3, "unknown_preset")
        supplementary = self._create_file(4, format_presets.AUDIO, supplementary=True)
        document_bit = 2 ** RENDERABLE_PRESETS_ORDER.index(format_presets.DOCUMENT)
        already_set = self._create_file(
            5, format_presets.AUDIO, included_presets=document_bit
        )
        second_audio = self._create_file(6, format_presets.AUDIO)
        second_document = self._create_file(7, format_presets.DOCUMENT)
        last_audio = self._create_file(8, format_presets.AUDIO)

        expected = {
            file.pk: 2 ** RENDERABLE_PRESETS_ORDER.index(file.preset)
            for file in (
                first_audio,
                first_document,
                second_audio,
                second_document,
                last_audio,
            )
        }
        expected.update(
            {
                unknown.pk: None,
                supplementary.pk: None,
                already_set.pk: document_bit,
            }
        )

        call_command("backfill_public_file_included_presets", batch_size=2)
        self.assertEqual(
            dict(models.File.objects.values_list("id", "included_presets")), expected
        )
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE FUNCTION reject_backfill_write() RETURNS trigger
                    LANGUAGE plpgsql AS $$
                    BEGIN
                        RAISE EXCEPTION 'Unexpected write to %', TG_TABLE_NAME;
                    END;
                    $$;
                    CREATE TRIGGER reject_backfill_write
                    BEFORE INSERT OR UPDATE OR DELETE ON kolibri_public_file
                    FOR EACH ROW EXECUTE FUNCTION reject_backfill_write();
                    """
                )
            call_command("backfill_public_file_included_presets", batch_size=2)
            transaction.set_rollback(True)

    def test_backfills_legacy_file_remapped_behind_cursor(self):
        first_file = self._create_file(10, format_presets.AUDIO)
        second_file = self._create_file(20, format_presets.AUDIO)
        output = StringIO()
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE FUNCTION remap_legacy_file() RETURNS trigger
                    LANGUAGE plpgsql AS $$
                    DECLARE
                        remapped_file kolibri_public_file%%ROWTYPE;
                    BEGIN
                        DELETE FROM kolibri_public_file WHERE id = TG_ARGV[0]::uuid
                        RETURNING * INTO remapped_file;
                        remapped_file.included_presets := NULL;
                        INSERT INTO kolibri_public_file VALUES (remapped_file.*);
                        RETURN NULL;
                    END;
                    $$;
                    CREATE TRIGGER remap_legacy_file
                    AFTER UPDATE OF included_presets ON kolibri_public_file
                    FOR EACH ROW WHEN (NEW.id = %s AND NEW.included_presets IS NOT NULL)
                    EXECUTE FUNCTION remap_legacy_file(%s);
                    """,
                    [second_file.pk, first_file.pk],
                )
            call_command(
                "backfill_public_file_included_presets", batch_size=1, stdout=output
            )

            first_file.refresh_from_db()
            self.assertEqual(
                first_file.included_presets,
                2 ** RENDERABLE_PRESETS_ORDER.index(first_file.preset),
            )
            first_batch = f"backfilled through pk={first_file.pk}"
            self.assertEqual(output.getvalue().splitlines().count(first_batch), 2)
            transaction.set_rollback(True)

    def test_tail_batch_remains_bounded_when_files_are_inserted(self):
        self._create_file(1, format_presets.AUDIO)
        inserted = False

        def insert_after_batch_read(execute, sql, params, many, context):
            nonlocal inserted
            result = execute(sql, params, many, context)
            if not inserted and connection.in_atomic_block:
                inserted = True
                for pk_number in range(2, 5):
                    self._create_file(pk_number, format_presets.AUDIO)
            return result

        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE FUNCTION check_backfill_batch_size() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    IF (SELECT count(*) FROM updated_files) > 2 THEN
                        RAISE EXCEPTION 'Backfill batch exceeds two rows';
                    END IF;
                    RETURN NULL;
                END;
                $$;
                CREATE TRIGGER check_backfill_batch_size
                AFTER UPDATE ON kolibri_public_file
                REFERENCING NEW TABLE AS updated_files
                FOR EACH STATEMENT EXECUTE FUNCTION check_backfill_batch_size();
                """
            )
        try:
            with connection.execute_wrapper(insert_after_batch_read):
                call_command("backfill_public_file_included_presets", batch_size=2)
        finally:
            with connection.cursor() as cursor:
                cursor.execute(
                    "DROP TRIGGER check_backfill_batch_size ON kolibri_public_file; "
                    "DROP FUNCTION check_backfill_batch_size();"
                )

        audio_bit = 2 ** RENDERABLE_PRESETS_ORDER.index(format_presets.AUDIO)
        self.assertEqual(
            dict(models.File.objects.values_list("id", "included_presets")),
            {"{:032x}".format(pk_number): audio_bit for pk_number in range(1, 5)},
        )

    def test_can_resume_after_a_later_batch_fails(self):
        first_file = self._create_file(1, format_presets.AUDIO)
        second_file = self._create_file(2, format_presets.DOCUMENT)
        with connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE kolibri_public_file ADD CONSTRAINT backfill_failure "
                "CHECK (id != %s OR included_presets IS NULL)",
                [second_file.pk],
            )
        try:
            with self.assertRaisesMessage(IntegrityError, "backfill_failure"):
                call_command("backfill_public_file_included_presets", batch_size=1)
        finally:
            with connection.cursor() as cursor:
                cursor.execute(
                    "ALTER TABLE kolibri_public_file DROP CONSTRAINT backfill_failure"
                )

        first_file.refresh_from_db()
        second_file.refresh_from_db()
        self.assertEqual(
            first_file.included_presets,
            2 ** RENDERABLE_PRESETS_ORDER.index(first_file.preset),
        )
        self.assertIsNone(second_file.included_presets)

        call_command("backfill_public_file_included_presets", batch_size=1)

        second_file.refresh_from_db()
        self.assertEqual(
            second_file.included_presets,
            2 ** RENDERABLE_PRESETS_ORDER.index(second_file.preset),
        )

    def test_backfill_preserves_channel_publish_timestamp(self):
        self._create_file(1, format_presets.AUDIO)
        published_at = timezone.now() - timedelta(days=1)
        channel = models.ChannelMetadata.objects.create(
            pk=self.contentnode.channel_id,
            root=self.contentnode,
            public=True,
            last_updated=published_at,
        )

        call_command("backfill_public_file_included_presets", batch_size=1)

        channel.refresh_from_db()
        self.assertEqual(channel.last_updated, published_at)
