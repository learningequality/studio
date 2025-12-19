"""
Test for migration 0161_fix_language_foreign_key_length.

This test verifies that the migration correctly fixes Language foreign key
columns that are varchar(7) instead of varchar(14).
"""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


# The columns that should be fixed by the migration
COLUMNS_TO_CHECK = [
    ("contentcuration_channel", "language_id"),
    ("contentcuration_channel_included_languages", "language_id"),
    ("contentcuration_contentnode", "language_id"),
    ("contentcuration_file", "language_id"),
]


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
    Test that migration 0155 fixes varchar(7) Language FK columns to varchar(14).

    This simulates the production database state where Language.id was changed
    from max_length=7 to max_length=14, but Django 1.9 didn't cascade the change
    to foreign key columns.
    """

    def test_migration_fixes_varchar7_columns(self):
        # First, shrink all columns back to varchar(7) to simulate bad state
        for table_name, column_name in COLUMNS_TO_CHECK:
            set_column_to_varchar7(table_name, column_name)
            # Verify the column is now varchar(7)
            self.assertEqual(
                get_column_max_length(table_name, column_name),
                7,
                f"{table_name}.{column_name} should be varchar(7) before migration",
            )

        # Run migration 0161 from 0160
        executor = MigrationExecutor(connection)
        executor.migrate([("contentcuration", "0154_alter_assessmentitem_type")])
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([("contentcuration", "0155_fix_language_foreign_key_length")])

        # Verify all columns are now varchar(14)
        for table_name, column_name in COLUMNS_TO_CHECK:
            self.assertEqual(
                get_column_max_length(table_name, column_name),
                14,
                f"{table_name}.{column_name} should be varchar(14) after migration",
            )
