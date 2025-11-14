# Generated manually for UUID migration - STEP 5
# CUTOVER: Atomically rename columns to switch from CHAR(32) to UUID
# This migration performs the actual cutover to native UUID columns

from django.db import migrations


def cutover_forward(apps, schema_editor):
    """
    Rename columns to cutover to UUID:
    - id (CHAR) -> id_old (temporary backup)
    - id_uuid (UUID) -> id (new primary key)
    - channelset_id (CHAR FK) -> channelset_id_old (temporary backup)
    - channelset_id_uuid (UUID) -> channelset_id (new FK)
    """
    with schema_editor.connection.cursor() as cursor:
        # CHANNELSET TABLE
        # Step 1: Rename old CHAR column to backup name
        cursor.execute("""
            ALTER TABLE contentcuration_channelset
            RENAME COLUMN id TO id_old
        """)

        # Step 2: Rename UUID shadow to be the new primary column
        cursor.execute("""
            ALTER TABLE contentcuration_channelset
            RENAME COLUMN id_uuid TO id
        """)

        # CHANNELSET_EDITORS THROUGH TABLE
        # Step 3: Drop existing FK constraint (references old CHAR column)
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            DROP CONSTRAINT IF EXISTS contentcuration_channelset_editors_channelset_id_fkey
        """)

        # Step 4: Rename old CHAR FK column to backup name
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            RENAME COLUMN channelset_id TO channelset_id_old
        """)

        # Step 5: Rename UUID shadow to be the new FK column
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            RENAME COLUMN channelset_id_uuid TO channelset_id
        """)

        # Step 6: Add new FK constraint (NOT VALID for speed)
        # This doesn't lock the table for validation
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            ADD CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
            FOREIGN KEY (channelset_id)
            REFERENCES contentcuration_channelset(id)
            NOT VALID
        """)

        # Step 7: Validate the constraint
        # This can be done separately if needed to avoid blocking
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            VALIDATE CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
        """)


def cutover_reverse(apps, schema_editor):
    """
    Reverse the cutover (rollback to CHAR(32)).
    Only safe if cleanup migration hasn't run yet.
    """
    with schema_editor.connection.cursor() as cursor:
        # CHANNELSET TABLE - Reverse renaming
        cursor.execute("""
            ALTER TABLE contentcuration_channelset
            RENAME COLUMN id TO id_uuid
        """)

        cursor.execute("""
            ALTER TABLE contentcuration_channelset
            RENAME COLUMN id_old TO id
        """)

        # CHANNELSET_EDITORS - Reverse renaming
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            DROP CONSTRAINT IF EXISTS contentcuration_channelset_editors_channelset_id_fkey
        """)

        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            RENAME COLUMN channelset_id TO channelset_id_uuid
        """)

        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            RENAME COLUMN channelset_id_old TO channelset_id
        """)

        # Restore original FK constraint
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            ADD CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
            FOREIGN KEY (channelset_id)
            REFERENCES contentcuration_channelset(id)
        """)


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0160_channelseteditors_add_uuid_shadow"),
    ]

    operations = [
        migrations.RunPython(
            cutover_forward,
            cutover_reverse,
            hints={"cutover_step": True}
        ),
    ]
