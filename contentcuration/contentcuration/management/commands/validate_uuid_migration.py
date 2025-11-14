"""
Management command to validate UUID migration data integrity.

Usage:
    # Validate specific model
    python manage.py validate_uuid_migration --model contentcuration.ChannelSet

    # Validate all models
    python manage.py validate_uuid_migration --all

This command checks:
1. Shadow columns are populated (no NULLs where CHAR column has value)
2. Values match (hex CHAR == UUID.hex)
3. No duplicates in shadow columns
4. FK relationships are valid (if applicable)
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.apps import apps


class Command(BaseCommand):
    help = "Validate UUID migration data integrity"

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            help='Model to validate (e.g., contentcuration.ChannelSet)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Validate all models with transition fields'
        )

    def handle(self, *args, **options):
        model_path = options.get('model')
        validate_all = options.get('all')

        if not model_path and not validate_all:
            raise CommandError('Must specify --model or --all')

        if model_path:
            models_to_validate = [self._get_model(model_path)]
        else:
            models_to_validate = self._find_all_transition_models()

        if not models_to_validate:
            self.stdout.write(self.style.WARNING('No models to validate'))
            return

        total_errors = 0

        for model in models_to_validate:
            self.stdout.write(f'\nValidating {model._meta.label}...')
            errors = self._validate_model(model)
            total_errors += errors

        self.stdout.write('')
        if total_errors == 0:
            self.stdout.write(self.style.SUCCESS('✓ All validations passed'))
        else:
            self.stdout.write(self.style.ERROR(
                f'✗ Found {total_errors} validation error(s)'
            ))
            raise CommandError('Validation failed')

    def _get_model(self, model_path):
        """Parse and return model class."""
        try:
            app_label, model_name = model_path.rsplit('.', 1)
            return apps.get_model(app_label, model_name)
        except (ValueError, LookupError):
            raise CommandError(f'Invalid model: {model_path}')

    def _find_all_transition_models(self):
        """Find all models using transition fields."""
        from contentcuration.fields import TransitionUUIDPrimaryKey, TransitionUUIDForeignKey

        models = []
        for model in apps.get_models():
            for field in model._meta.get_fields():
                if isinstance(field, (TransitionUUIDPrimaryKey, TransitionUUIDForeignKey)):
                    models.append(model)
                    break

        return models

    def _validate_model(self, model):
        """
        Validate a single model.

        Returns number of errors found.
        """
        from contentcuration.fields import TransitionUUIDPrimaryKey, TransitionUUIDForeignKey

        table_name = model._meta.db_table
        errors = 0

        # Find all transition fields
        for field in model._meta.get_fields():
            if not isinstance(field, (TransitionUUIDPrimaryKey, TransitionUUIDForeignKey)):
                continue

            # Get column names
            if isinstance(field, TransitionUUIDPrimaryKey):
                char_col = field.column
                shadow_name = f"{field.name}{field.uuid_shadow_suffix}"
            else:
                char_col = field.column
                shadow_name = f"{field.name}_id{field.uuid_shadow_suffix}"

            uuid_col = model._meta.get_field(shadow_name).column

            self.stdout.write(f'  Checking {char_col} -> {uuid_col}...')

            # Check 1: No NULLs in shadow where CHAR has value
            null_count = self._check_nulls(table_name, char_col, uuid_col)
            if null_count > 0:
                self.stdout.write(self.style.ERROR(
                    f'    ✗ {null_count} rows have NULL {uuid_col} but non-NULL {char_col}'
                ))
                errors += 1
            else:
                self.stdout.write(self.style.SUCCESS('    ✓ No missing shadow values'))

            # Check 2: Values match
            mismatch_count = self._check_mismatches(table_name, char_col, uuid_col)
            if mismatch_count > 0:
                self.stdout.write(self.style.ERROR(
                    f'    ✗ {mismatch_count} rows have mismatched values'
                ))
                errors += 1
            else:
                self.stdout.write(self.style.SUCCESS('    ✓ All values match'))

            # Check 3: No duplicates in shadow (if it should be unique)
            if isinstance(field, TransitionUUIDPrimaryKey):
                dup_count = self._check_duplicates(table_name, uuid_col)
                if dup_count > 0:
                    self.stdout.write(self.style.ERROR(
                        f'    ✗ {dup_count} duplicate values in {uuid_col}'
                    ))
                    errors += 1
                else:
                    self.stdout.write(self.style.SUCCESS('    ✓ No duplicates'))

            # Check 4: FK integrity (if it's a foreign key)
            if isinstance(field, TransitionUUIDForeignKey):
                # Get the related model and its table
                related_model = field.related_model
                related_table = related_model._meta.db_table

                # Find the related transition PK field
                related_pk = related_model._meta.pk
                if isinstance(related_pk, TransitionUUIDPrimaryKey):
                    related_shadow = f"{related_pk.name}{related_pk.uuid_shadow_suffix}"
                    related_uuid_col = related_model._meta.get_field(related_shadow).column

                    orphan_count = self._check_fk_integrity(
                        table_name,
                        uuid_col,
                        related_table,
                        related_uuid_col
                    )
                    if orphan_count > 0:
                        self.stdout.write(self.style.ERROR(
                            f'    ✗ {orphan_count} orphaned FK references'
                        ))
                        errors += 1
                    else:
                        self.stdout.write(self.style.SUCCESS('    ✓ FK integrity validated'))

        return errors

    def _check_nulls(self, table_name, char_col, uuid_col):
        """Check for NULL shadow values where CHAR has value."""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table_name}
                WHERE {char_col} IS NOT NULL AND {uuid_col} IS NULL
            """)
            return cursor.fetchone()[0]

    def _check_mismatches(self, table_name, char_col, uuid_col):
        """Check for mismatched values between CHAR and UUID columns."""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table_name}
                WHERE {char_col} IS NOT NULL
                AND {uuid_col} IS NOT NULL
                AND {char_col}::text != {uuid_col}::text
            """)
            return cursor.fetchone()[0]

    def _check_duplicates(self, table_name, uuid_col):
        """Check for duplicate values in shadow column."""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM (
                    SELECT {uuid_col}
                    FROM {table_name}
                    WHERE {uuid_col} IS NOT NULL
                    GROUP BY {uuid_col}
                    HAVING COUNT(*) > 1
                ) AS duplicates
            """)
            return cursor.fetchone()[0]

    def _check_fk_integrity(self, table_name, fk_col, parent_table, parent_col):
        """Check that all FK values reference existing parent rows."""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table_name} child
                WHERE child.{fk_col} IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM {parent_table} parent
                    WHERE parent.{parent_col} = child.{fk_col}
                )
            """)
            return cursor.fetchone()[0]
