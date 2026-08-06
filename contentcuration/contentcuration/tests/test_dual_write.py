from django.db import connection
from django.db import models
from django.test import TransactionTestCase
from django.test.utils import isolate_apps

from contentcuration.db.dual_write import mirror_field


@isolate_apps("contentcuration")
class MirrorFieldTestCase(TransactionTestCase):
    def _delete_model(self, model):
        with connection.schema_editor(atomic=False) as editor:
            editor.delete_model(model)

    def test_long_field_names_truncate_trigger_name(self):
        """Trigger name from long field names is truncated, not raised."""

        @mirror_field("a_very_long_source_field_name", "a_very_long_target_field_name")
        class LongNameProbe(models.Model):
            a_very_long_source_field_name = models.IntegerField()
            a_very_long_target_field_name = models.IntegerField(null=True)

            class Meta:
                app_label = "contentcuration"

        self.assertEqual(len(LongNameProbe._meta.triggers), 1)
        self.assertLessEqual(len(LongNameProbe._meta.triggers[0].name), 43)

    def test_syncs_shadow_column_in_db(self):
        @mirror_field("source", "shadow")
        class Probe(models.Model):
            source = models.IntegerField()
            shadow = models.IntegerField(null=True)

            class Meta:
                app_label = "contentcuration"

        with connection.schema_editor(atomic=False) as editor:
            editor.create_model(Probe)
        self.addCleanup(self._delete_model, Probe)
        for trigger in Probe._meta.triggers:
            trigger.install(Probe)

        obj = Probe.objects.create(source=5)
        obj.refresh_from_db()
        self.assertEqual(obj.shadow, 5)

        obj.source = 9
        obj.save()
        obj.refresh_from_db()
        self.assertEqual(obj.shadow, 9)
