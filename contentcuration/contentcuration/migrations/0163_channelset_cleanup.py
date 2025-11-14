# Generated manually for UUID migration - STEP 7
# CLEANUP: Drop old CHAR(32) columns
# WARNING: This is IRREVERSIBLE - no rollback possible after this point!

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0162_channelset_native_uuid"),
    ]

    operations = [
        migrations.RunSQL(
            # Forward: Drop old columns
            sql=[
                """
                -- Drop old CHAR(32) primary key column from ChannelSet
                ALTER TABLE contentcuration_channelset
                DROP COLUMN IF EXISTS id_old;
                """,
                """
                -- Drop old CHAR(32) foreign key column from ChannelSetEditors
                ALTER TABLE contentcuration_channelset_editors
                DROP COLUMN IF EXISTS channelset_id_old;
                """,
            ],
            # Reverse: Not possible - columns are gone!
            reverse_sql=[
                """
                -- Cannot restore deleted columns
                -- Manual data recovery required if rollback is needed
                SELECT 'WARNING: Cleanup migration is irreversible'::text;
                """,
            ],
        ),
    ]
