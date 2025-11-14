# UUID Migration Guide - ChannelSet Pilot

This document tracks the progress of migrating ChannelSet from custom `UUIDField` (CHAR(32)) to PostgreSQL native UUID.

## Overview

**Goal:** Migrate from CHAR(32) hex storage to native UUID for:
- 1.8x faster queries
- 30% storage reduction
- 50% smaller indexes

**Strategy:** Shadow columns → Backfill → Column rename cutover → Cleanup

## Migration Status

### ✅ Completed Steps

#### Foundation
- [x] Created `contentcuration/fields.py` with helper functions and transition fields
- [x] Created tests in `contentcuration/tests/test_transition_fields.py`
- [x] Created `backfill_uuids` management command
- [x] Created `validate_uuid_migration` management command

#### STEP 1: Add Transition Field to ChannelSet
- [x] Updated `ChannelSet.id` to use `TransitionUUIDPrimaryKey`
- [x] Created migration `0158_channelset_add_uuid_shadow.py`
- **Result:** `id_uuid` shadow column added to `contentcuration_channelset`

#### STEP 2: Make M2M Through Model Explicit
- [x] Created explicit `ChannelSetEditors` through model
- [x] Updated `ChannelSet.editors` to use `through='ChannelSetEditors'`
- [x] Created migration `0159_channelset_explicit_through.py`
- **Result:** Django now uses explicit through model (no DB changes)

#### STEP 3: Add Transition FK to Through Model
- [x] Updated `ChannelSetEditors.channelset` to use `TransitionUUIDForeignKey`
- [x] Created migration `0160_channelseteditors_add_uuid_shadow.py`
- **Result:** `channelset_id_uuid` shadow column added to through table

### 📋 Remaining Steps

#### STEP 4: Backfill Data

After applying migrations 0158-0160, run these commands:

```bash
# DRY RUN - See what would be done
./manage.py backfill_uuids --model contentcuration.ChannelSet --all --dry-run
./manage.py backfill_uuids --model contentcuration.ChannelSetEditors --all --dry-run

# ACTUAL BACKFILL
./manage.py backfill_uuids --model contentcuration.ChannelSet --all
./manage.py backfill_uuids --model contentcuration.ChannelSetEditors --all

# VALIDATE
./manage.py validate_uuid_migration --model contentcuration.ChannelSet
./manage.py validate_uuid_migration --model contentcuration.ChannelSetEditors
```

**Expected Results:**
- All `id_uuid` values populated in `contentcuration_channelset`
- All `channelset_id_uuid` values populated in `contentcuration_channelset_editors`
- Zero data integrity issues

#### STEP 5: Create Cutover Migration

Create migration `0161_channelset_cutover.py`:

```python
from django.db import migrations

def cutover_forward(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # ChannelSet: Rename columns atomically
        cursor.execute("ALTER TABLE contentcuration_channelset RENAME COLUMN id TO id_old")
        cursor.execute("ALTER TABLE contentcuration_channelset RENAME COLUMN id_uuid TO id")

        # Through table: Rename columns
        cursor.execute("ALTER TABLE contentcuration_channelset_editors RENAME COLUMN channelset_id TO channelset_id_old")
        cursor.execute("ALTER TABLE contentcuration_channelset_editors RENAME COLUMN channelset_id_uuid TO channelset_id")

        # Drop old FK constraint
        cursor.execute("ALTER TABLE contentcuration_channelset_editors DROP CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey")

        # Add new FK constraint (NOT VALID for performance)
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            ADD CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
            FOREIGN KEY (channelset_id) REFERENCES contentcuration_channelset(id) NOT VALID
        """)

        # Validate the constraint (can be done later if needed)
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            VALIDATE CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
        """)

def cutover_reverse(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # Reverse the renaming
        cursor.execute("ALTER TABLE contentcuration_channelset RENAME COLUMN id TO id_uuid")
        cursor.execute("ALTER TABLE contentcuration_channelset RENAME COLUMN id_old TO id")

        cursor.execute("ALTER TABLE contentcuration_channelset_editors RENAME COLUMN channelset_id TO channelset_id_uuid")
        cursor.execute("ALTER TABLE contentcuration_channelset_editors RENAME COLUMN channelset_id_old TO channelset_id")

        # Restore old FK
        cursor.execute("ALTER TABLE contentcuration_channelset_editors DROP CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey")
        cursor.execute("""
            ALTER TABLE contentcuration_channelset_editors
            ADD CONSTRAINT contentcuration_channelset_editors_channelset_id_fkey
            FOREIGN KEY (channelset_id) REFERENCES contentcuration_channelset(id)
        """)

class Migration(migrations.Migration):
    dependencies = [
        ("contentcuration", "0160_channelseteditors_add_uuid_shadow"),
    ]

    operations = [
        migrations.RunPython(cutover_forward, cutover_reverse)
    ]
```

**Execution:**
```bash
./manage.py migrate contentcuration 0161
```

**Expected downtime:** < 3 minutes (column renames are instant in PostgreSQL)

#### STEP 6: Update Models to Native UUID

Update `models.py`:

```python
import uuid
from django.db import models

class ChannelSet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    editors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='ChannelSetEditors',
        related_name="channel_sets",
        verbose_name="editors",
        help_text="Users with edit rights",
        blank=True,
    )
    # ... other fields

class ChannelSetEditors(models.Model):
    channelset = models.ForeignKey(
        ChannelSet,
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
    )

    class Meta:
        db_table = 'contentcuration_channelset_editors'
        unique_together = ['channelset', 'user']
```

Create migration `0162_channelset_native_uuid.py`:

```bash
./manage.py makemigrations contentcuration
./manage.py migrate contentcuration 0162
```

This should be a no-op migration since the DB already has UUID columns.

#### STEP 7: Cleanup Old Columns

Create migration `0163_channelset_cleanup.py`:

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("contentcuration", "0162_channelset_native_uuid"),
    ]

    operations = [
        migrations.RunSQL("""
            ALTER TABLE contentcuration_channelset DROP COLUMN IF EXISTS id_old;
            ALTER TABLE contentcuration_channelset_editors DROP COLUMN IF EXISTS channelset_id_old;
        """)
    ]
```

**Execution:**
```bash
./manage.py migrate contentcuration 0163
```

## Validation Checklist

After each step:

- [ ] Migrations applied successfully
- [ ] No errors in application logs
- [ ] ChannelSet CRUD operations work
- [ ] M2M relationship (editors) works correctly
- [ ] Tests pass: `pytest contentcuration/tests/test_transition_fields.py`

After backfill:
- [ ] All shadow columns filled: `./manage.py validate_uuid_migration --all`
- [ ] Zero data mismatches
- [ ] Sample queries return correct data

After cutover:
- [ ] Application starts successfully
- [ ] All ChannelSet operations functional
- [ ] Performance improved (verify query times)
- [ ] Rollback procedure tested in staging

After cleanup:
- [ ] Old columns dropped
- [ ] No references to old columns in code
- [ ] Storage reclaimed (VACUUM FULL if needed)

## Rollback Procedures

### Before Cutover (Steps 1-4)
Simply don't proceed to cutover. Shadow columns are benign.

### During Cutover (Step 5)
```bash
./manage.py migrate contentcuration 0160  # Roll back to before cutover
```

### After Cutover (Step 6)
Column renames are reversible via the reverse migration.

### After Cleanup (Step 7)
**No rollback possible** - old columns are deleted. Test thoroughly before cleanup!

## Performance Monitoring

Track these metrics:

**Before migration:**
```sql
-- Query time
EXPLAIN ANALYZE SELECT * FROM contentcuration_channelset WHERE id = 'abc123...';

-- Storage size
SELECT pg_size_pretty(pg_total_relation_size('contentcuration_channelset'));
SELECT pg_size_pretty(pg_total_relation_size('contentcuration_channelset_editors'));
```

**After migration:**
```sql
-- Same queries - expect 1.8x improvement
-- Storage should be ~30% smaller
```

## Next Models to Migrate

After ChannelSet pilot succeeds:

1. ContentTag (simple, ~thousands of rows)
2. Invitation (simple, ~thousands of rows)
3. Channel (complex, ~tens of thousands of rows)
4. ContentNode (complex, ~millions of rows)
5. File (complex, ~millions of rows)

Each follows the same 7-step procedure.

## Contact

For questions or issues:
- Review this document
- Check migration files in `contentcuration/migrations/`
- Run validation: `./manage.py validate_uuid_migration --all`
