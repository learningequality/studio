import pgtrigger.migrations
from django.db import migrations
from django.db import models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0168_alter_assessmentitem_type"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                pgtrigger.migrations.RemoveTrigger(
                    model_name="file",
                    name="mirror_file_size_to_file_size_bigint",
                ),
                migrations.RemoveIndex(
                    model_name="file",
                    name="file_checksum_file_size_idx",
                ),
                migrations.RemoveIndex(
                    model_name="file",
                    name="file_checksum_fsizebig_idx",
                ),
                migrations.RemoveField(model_name="file", name="file_size_bigint"),
                migrations.AlterField(
                    model_name="file",
                    name="file_size",
                    field=models.BigIntegerField(blank=True, null=True),
                ),
                migrations.AddIndex(
                    model_name="file",
                    index=models.Index(
                        condition=Q(file_size__isnull=False),
                        fields=["checksum", "file_size"],
                        name="file_checksum_file_size_idx",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "DROP TRIGGER IF EXISTS"
                        " pgtrigger_mirror_file_size_to_file_size_bigint_54326"
                        " ON contentcuration_file;"
                        'ALTER TABLE contentcuration_file DROP COLUMN "file_size";'
                        "ALTER TABLE contentcuration_file"
                        ' RENAME COLUMN "file_size_bigint" TO "file_size";'
                        "ALTER INDEX file_checksum_fsizebig_idx"
                        " RENAME TO file_checksum_file_size_idx;"
                    ),
                    reverse_sql=(
                        "ALTER INDEX file_checksum_file_size_idx"
                        " RENAME TO file_checksum_fsizebig_idx;"
                        "ALTER TABLE contentcuration_file"
                        ' RENAME COLUMN "file_size" TO "file_size_bigint";'
                        "ALTER TABLE contentcuration_file"
                        ' ADD COLUMN "file_size" integer;'
                    ),
                ),
            ],
        ),
    ]
