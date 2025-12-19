# Generated manually to fix Language foreign key column lengths
# See https://github.com/learningequality/studio/issues/5618
#
# When Language.id was changed from max_length=7 to max_length=14 in migration
# 0081, Django 1.9 did not cascade the primary key column size change to
# foreign key and many-to-many junction table columns. This migration fixes
# those columns for databases that were created before the migration squash.
#
# This migration is idempotent - it only alters columns that are still varchar(7).
from django.db import migrations


# SQL to fix each column, checking if it needs to be altered first
FORWARD_SQL = """
DO $$
BEGIN
    -- Fix contentcuration_channel.language_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contentcuration_channel'
        AND column_name = 'language_id'
        AND character_maximum_length = 7
    ) THEN
        ALTER TABLE contentcuration_channel
            ALTER COLUMN language_id TYPE varchar(14);
    END IF;

    -- Fix contentcuration_channel_included_languages.language_id (M2M junction table)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contentcuration_channel_included_languages'
        AND column_name = 'language_id'
        AND character_maximum_length = 7
    ) THEN
        ALTER TABLE contentcuration_channel_included_languages
            ALTER COLUMN language_id TYPE varchar(14);
    END IF;

    -- Fix contentcuration_contentnode.language_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contentcuration_contentnode'
        AND column_name = 'language_id'
        AND character_maximum_length = 7
    ) THEN
        ALTER TABLE contentcuration_contentnode
            ALTER COLUMN language_id TYPE varchar(14);
    END IF;

    -- Fix contentcuration_file.language_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contentcuration_file'
        AND column_name = 'language_id'
        AND character_maximum_length = 7
    ) THEN
        ALTER TABLE contentcuration_file
            ALTER COLUMN language_id TYPE varchar(14);
    END IF;
END $$;
"""

# Reverse SQL is a no-op since we don't want to shrink the columns back
# (that could cause data loss if longer language codes have been inserted)
REVERSE_SQL = """
-- No-op: Cannot safely reverse this migration as it may cause data loss
SELECT 1;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0154_alter_assessmentitem_type"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
