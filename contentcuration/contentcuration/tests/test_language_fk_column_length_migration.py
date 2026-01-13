"""
Test for migration 0155_fix_language_foreign_key_length.

This test verifies that the migration correctly fixes the Language foreign key
column in the included_languages M2M junction table from varchar(7) to varchar(14).
"""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


# The M2M junction table column that should be fixed by the migration
TABLE_NAME = "contentcuration_channel_included_languages"
COLUMN_NAME = "language_id"


def get_column_max_length(table_name, column_name):
    """Get the character_maximum_length for a varchar column."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = %s
            AND column_name = %s
            """,
            [table_name, column_name],
        )
        row = cursor.fetchone()
        return row[0] if row else None


def set_column_to_varchar7(table_name, column_name):
    """Shrink a varchar column to varchar(7) to simulate bad production state."""
    with connection.cursor() as cursor:
        cursor.execute(
            f"ALTER TABLE {table_name} ALTER COLUMN {column_name} TYPE varchar(7)"
        )


class TestLanguageForeignKeyLengthMigration(TransactionTestCase):
    """
    Test that migration 0155 fixes varchar(7) Language FK column to varchar(14).

    This simulates the production database state where Language.id was changed
    from max_length=7 to max_length=14, but Django 1.9 didn't cascade the change
    to the M2M junction table column.
    """

    def test_migration_fixes_varchar7_column(self):
        # First, shrink column back to varchar(7) to simulate bad state
        set_column_to_varchar7(TABLE_NAME, COLUMN_NAME)
        # Verify the column is now varchar(7)
        self.assertEqual(
            get_column_max_length(TABLE_NAME, COLUMN_NAME),
            7,
            f"{TABLE_NAME}.{COLUMN_NAME} should be varchar(7) before migration",
        )

        # Run migration 0155
        executor = MigrationExecutor(connection)
        executor.migrate([("contentcuration", "0154_alter_assessmentitem_type")])
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([("contentcuration", "0155_fix_language_foreign_key_length")])

        # Verify column is now varchar(14)
        self.assertEqual(
            get_column_max_length(TABLE_NAME, COLUMN_NAME),
            14,
            f"{TABLE_NAME}.{COLUMN_NAME} should be varchar(14) after migration",
        )
