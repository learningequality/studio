import uuid
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management import CommandError
from django.db import connection
from django.db import models
from django.db.models import F
from django.test import SimpleTestCase
from django.test import TransactionTestCase
from django.test.utils import isolate_apps


def _make_probe_class():
    class Probe(models.Model):
        source = models.IntegerField(null=True)
        shadow = models.IntegerField(null=True)

        class Meta:
            app_label = "contentcuration"

    return Probe


def _make_uuid_probe_class():
    class UUIDProbe(models.Model):
        id = models.UUIDField(primary_key=True, default=uuid.uuid4)
        source = models.IntegerField(null=True)
        shadow = models.IntegerField(null=True)

        class Meta:
            app_label = "contentcuration"

    return UUIDProbe


@isolate_apps("contentcuration")
class BackfillColumnTestCase(TransactionTestCase):
    def _create_model(self, model):
        with connection.schema_editor(atomic=False) as editor:
            editor.create_model(model)
        self.addCleanup(self._delete_model, model)

    def _delete_model(self, model):
        with connection.schema_editor(atomic=False) as editor:
            editor.delete_model(model)

    def _run_backfill(self, model, **kwargs):
        out = StringIO()
        with patch(
            "contentcuration.management.commands.backfill_column.apps",
            model._meta.apps,
        ):
            call_command(
                "backfill_column",
                stdout=out,
                model="contentcuration.{}".format(model.__name__),
                source_field="source",
                target_field="shadow",
                **kwargs,
            )
        return out.getvalue()

    def _assert_all_synced(self, model):
        self.assertEqual(
            model.objects.count(), model.objects.filter(shadow=F("source")).count()
        )

    def _assert_synced_from(self, model, resume_pk):
        below = model.objects.filter(pk__lt=resume_pk)
        at_or_above = model.objects.filter(pk__gte=resume_pk)
        self.assertEqual(below.count(), below.filter(shadow__isnull=True).count())
        self.assertEqual(
            at_or_above.count(), at_or_above.filter(shadow=F("source")).count()
        )

    def test_backfills_all_rows(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        for i in range(1, 6):
            Probe.objects.create(source=i * 10, shadow=None)

        # batch_size=2 over 5 rows exercises the multi-batch loop.
        self._run_backfill(Probe, batch_size=2)

        self._assert_all_synced(Probe)

    def test_idempotent(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        for i in range(1, 4):
            Probe.objects.create(source=i * 10, shadow=None)

        self._run_backfill(Probe, batch_size=10)
        output = self._run_backfill(Probe, batch_size=10)

        self.assertIn("Done. 0 rows updated.", output)
        self._assert_all_synced(Probe)

    def test_resumable(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        objs = sorted(
            [Probe.objects.create(source=i * 10, shadow=None) for i in range(1, 6)],
            key=lambda o: o.pk,
        )
        resume_pk = objs[2].pk

        self._run_backfill(Probe, batch_size=10, start_id=resume_pk)

        self._assert_synced_from(Probe, resume_pk)

    def test_null_source_safe(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        Probe.objects.create(source=None, shadow=None)
        Probe.objects.create(source=42, shadow=None)

        output = self._run_backfill(Probe, batch_size=10)

        self.assertIn("Done.", output)
        self.assertIsNone(Probe.objects.get(source__isnull=True).shadow)
        self.assertEqual(Probe.objects.get(source=42).shadow, 42)

    def test_backfills_uuid_pk_across_batches(self):
        """Regression: paging must not assume an integer pk (File has a UUID pk)."""
        UUIDProbe = _make_uuid_probe_class()
        self._create_model(UUIDProbe)
        for i in range(1, 6):
            UUIDProbe.objects.create(source=i * 10, shadow=None)

        # batch_size=2 forces the lower-bound advance where integer arithmetic on a
        # UUID pk would blow up.
        self._run_backfill(UUIDProbe, batch_size=2)

        self._assert_all_synced(UUIDProbe)

    def test_resumable_uuid_pk(self):
        """--start-id must accept a UUID and resume from it."""
        UUIDProbe = _make_uuid_probe_class()
        self._create_model(UUIDProbe)
        objs = sorted(
            [UUIDProbe.objects.create(source=i * 10, shadow=None) for i in range(1, 6)],
            key=lambda o: o.pk,
        )
        resume_pk = objs[2].pk

        self._run_backfill(UUIDProbe, batch_size=10, start_id=str(resume_pk))

        self._assert_synced_from(UUIDProbe, resume_pk)

    def test_progress_check_passes_when_complete(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        Probe.objects.create(source=1, shadow=1)
        Probe.objects.create(source=None, shadow=None)  # null source doesn't count

        output = self._run_backfill(Probe, progress_check=True)

        self.assertIn("no rows pending", output)

    def test_progress_check_fails_and_writes_nothing_when_incomplete(self):
        Probe = _make_probe_class()
        self._create_model(Probe)
        Probe.objects.create(source=7, shadow=None)

        with self.assertRaisesRegex(
            CommandError, "backfill incomplete: rows still pending"
        ):
            self._run_backfill(Probe, progress_check=True)

        # --progress-check must not write
        self.assertIsNone(Probe.objects.get(source=7).shadow)


class BackfillColumnArgValidationTestCase(SimpleTestCase):
    def _call(self, **kwargs):
        call_command(
            "backfill_column",
            model="contentcuration.Channel",
            source_field="name",
            target_field="name",
            **kwargs,
        )

    def test_non_positive_batch_size_raises(self):
        for bad in (0, -1):
            with self.subTest(batch_size=bad):
                with self.assertRaisesRegex(CommandError, "--batch-size must be >= 1"):
                    self._call(batch_size=bad)
