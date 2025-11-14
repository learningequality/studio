"""
Management command to backfill UUID shadow columns.

Usage:
    # Dry run (no changes)
    python manage.py backfill_uuids --model contentcuration.ChannelSet --all --dry-run

    # Backfill specific model
    python manage.py backfill_uuids --model contentcuration.ChannelSet --all

    # Backfill with batch size
    python manage.py backfill_uuids --model contentcuration.ChannelSet --all --batch-size 1000

    # Backfill specific field
    python manage.py backfill_uuids --model contentcuration.ChannelSetEditors --field channelset_id

This command:
1. Finds all rows where shadow UUID column is NULL
2. Converts CHAR(32) hex value to UUID
3. Updates shadow column in batches
4. Reports progress and validates data integrity
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.apps import apps
import time


class Command(BaseCommand):
    help = "Backfill UUID shadow columns from CHAR(32) columns"

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            required=True,
            help='Model to backfill (e.g., contentcuration.ChannelSet)'
        )
        parser.add_argument(
            '--field',
            type=str,
            help='Specific field to backfill (e.g., id or channelset_id). If not specified, backfills all transition fields.'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Backfill all rows (required for safety)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of rows to update per batch (default: 1000)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        model_path = options['model']
        field_name = options['field']
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        if not options['all']:
            raise CommandError('Must specify --all flag for safety')

        # Parse model
        try:
            app_label, model_name = model_path.rsplit('.', 1)
            model = apps.get_model(app_label, model_name)
        except (ValueError, LookupError):
            raise CommandError(f'Invalid model: {model_path}')

        table_name = model._meta.db_table

        # Find transition fields
        transition_fields = self._find_transition_fields(model, field_name)

        if not transition_fields:
            self.stdout.write(self.style.WARNING(
                f'No transition fields found on {model_path}'
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f'Found {len(transition_fields)} transition field(s) to backfill:'
        ))
        for char_col, uuid_col in transition_fields:
            self.stdout.write(f'  {char_col} -> {uuid_col}')

        # Backfill each field
        total_updated = 0
        for char_col, uuid_col in transition_fields:
            updated = self._backfill_field(
                table_name,
                char_col,
                uuid_col,
                batch_size,
                dry_run
            )
            total_updated += updated

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\nDRY RUN: Would have updated {total_updated} rows'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nSuccessfully updated {total_updated} rows'
            ))

    def _find_transition_fields(self, model, field_name_filter=None):
        """
        Find all transition fields on a model.

        Returns list of tuples: [(char_column, uuid_column), ...]
        """
        from contentcuration.fields import TransitionUUIDPrimaryKey, TransitionUUIDForeignKey

        transition_fields = []

        for field in model._meta.get_fields():
            # Check if it's a transition field
            if isinstance(field, (TransitionUUIDPrimaryKey, TransitionUUIDForeignKey)):
                # Get the CHAR column name
                if isinstance(field, TransitionUUIDPrimaryKey):
                    char_col = field.column
                else:
                    # FK: use the _id column
                    char_col = field.column

                # Skip if filtering and this isn't the target field
                if field_name_filter and field.name != field_name_filter:
                    continue

                # Get shadow column name
                if isinstance(field, TransitionUUIDPrimaryKey):
                    shadow_name = f"{field.name}{field.uuid_shadow_suffix}"
                else:
                    shadow_name = f"{field.name}_id{field.uuid_shadow_suffix}"

                # Get shadow column
                uuid_col = model._meta.get_field(shadow_name).column

                transition_fields.append((char_col, uuid_col))

        return transition_fields

    def _backfill_field(self, table_name, char_col, uuid_col, batch_size, dry_run):
        """
        Backfill a single UUID shadow column.

        Returns number of rows updated.
        """
        self.stdout.write(f'\nBackfilling {table_name}.{uuid_col} from {char_col}...')

        with connection.cursor() as cursor:
            # Count rows to update
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table_name}
                WHERE {uuid_col} IS NULL AND {char_col} IS NOT NULL
            """)
            total_rows = cursor.fetchone()[0]

            if total_rows == 0:
                self.stdout.write(self.style.SUCCESS('  No rows to update'))
                return 0

            self.stdout.write(f'  Found {total_rows} rows to update')

            if dry_run:
                # Show sample of what would be updated
                cursor.execute(f"""
                    SELECT {char_col}
                    FROM {table_name}
                    WHERE {uuid_col} IS NULL AND {char_col} IS NOT NULL
                    LIMIT 5
                """)
                samples = cursor.fetchall()
                self.stdout.write('  Sample values that would be converted:')
                for (hex_val,) in samples:
                    self.stdout.write(f'    {hex_val}')
                return total_rows

            # Perform backfill in batches
            updated = 0
            start_time = time.time()

            while True:
                with transaction.atomic():
                    # Update one batch
                    cursor.execute(f"""
                        UPDATE {table_name}
                        SET {uuid_col} = (
                            {char_col}::text::uuid
                        )
                        WHERE {uuid_col} IS NULL
                        AND {char_col} IS NOT NULL
                        AND ctid IN (
                            SELECT ctid
                            FROM {table_name}
                            WHERE {uuid_col} IS NULL
                            AND {char_col} IS NOT NULL
                            LIMIT {batch_size}
                        )
                    """)

                    rows_updated = cursor.rowcount
                    updated += rows_updated

                    if rows_updated == 0:
                        break

                    # Progress report
                    elapsed = time.time() - start_time
                    rate = updated / elapsed if elapsed > 0 else 0
                    self.stdout.write(
                        f'  Updated {updated}/{total_rows} rows '
                        f'({updated * 100 / total_rows:.1f}%) '
                        f'- {rate:.0f} rows/sec',
                        ending='\r'
                    )
                    self.stdout.flush()

            self.stdout.write('')  # New line after progress

            # Validate
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table_name}
                WHERE {char_col} IS NOT NULL
                AND ({uuid_col} IS NULL OR {char_col}::text != {uuid_col}::text)
            """)
            mismatches = cursor.fetchone()[0]

            if mismatches > 0:
                raise CommandError(
                    f'Validation failed: {mismatches} rows have mismatched values'
                )

            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Updated {updated} rows successfully'
            ))

            return updated
