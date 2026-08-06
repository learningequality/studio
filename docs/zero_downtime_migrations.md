# Almost zero-downtime migrations — expand/contract runbook

On large tables (e.g. `File` has ~100 M rows) a single migration can cause downtime in two ways:
- by taking an `ACCESS EXCLUSIVE` lock / rewriting the table
- by shipping a schema the still-running old pods can't use (a dropped or renamed column).

The expand/contract procedure below avoids both. Its one residual cost is the brief metadata-only lock taken for the drop + rename migration, hence "almost."

## Linting (already configured)

- `django-migration-linter` - flags backward-incompatible schema (drops, renames, NOT NULL adds) old pods would break on.

## Procedure

Goal: widen `File.file_size` from int to bigint with no table rewrite and no backward-incompatible window. The app-visible column stays named `file_size` throughout. Only its underlying storage swaps — from the int column to a pre-backfilled bigint column. Because the name is preserved, old pods keep writing to `file_size` (now bigint) without error.

### Release 1 — expand

Add the shadow field and the dual-write trigger:

```python
from contentcuration.db.dual_write import mirror_field

@mirror_field("file_size", "file_size_bigint")
class File(models.Model):
    file_size = models.IntegerField(blank=True, null=True)
    file_size_bigint = models.BigIntegerField(blank=True, null=True)
```

`makemigrations` emits a nullable `AddField` and the `CreateTrigger` — both safe (no rewrite, no lock). New writes now land in both columns.

Backfill old rows in the same release: wire `backfill_column` as a `deploy-migrate` step in the Makefile, which runs after `migrate`, so the column and trigger already exist:

```bash
python contentcuration/manage.py backfill_column \
    --model contentcuration.File --source-field file_size --target-field file_size_bigint
```

Can also run the above command with `--progress-check` as a read only to see if any backfills are still required.

### Release 2 — swap (cutover + rename)

After backfill completes, swap the storage in a single migration. Drop the shadow field and decorator; `file_size` is now bigint:

```python
class File(models.Model):
    file_size = models.BigIntegerField(blank=True, null=True)
```

The migration drops the trigger and the int column, then renames the bigint column onto `file_size`:

```python
operations = [
    IgnoreMigration(),  # safe: net change is an int->bigint widening; see note below
    migrations.SeparateDatabaseAndState(
        state_operations=[
            migrations.RemoveField("file", "file_size_bigint"),
            migrations.AlterField(
                "file", "file_size", models.BigIntegerField(blank=True, null=True)
            ),
            pgtrigger.migrations.RemoveTrigger(
                "file", "mirror_file_size_to_file_size_bigint"
            ),
        ],
        database_operations=[
            migrations.RunSQL(
                sql=(
                    "DROP TRIGGER IF EXISTS pgtrigger_mirror_file_size_to_file_size_bigint_54326"
                    " ON contentcuration_file;"
                    'ALTER TABLE contentcuration_file DROP COLUMN "file_size";'
                    'ALTER TABLE contentcuration_file RENAME COLUMN "file_size_bigint" TO "file_size";'
                ),
                reverse_sql=(
                    'ALTER TABLE contentcuration_file RENAME COLUMN "file_size" TO "file_size_bigint";'
                    'ALTER TABLE contentcuration_file ADD COLUMN "file_size" integer;'
                ),
            ),
        ],
    ),
]
```

`SeparateDatabaseAndState` allows us to let Django know what has been migrated, while doing specific raw SQL operations to get the exact data preserving sequence of events that we want. Copy the trigger `pgid` from release 1's `AddTrigger`.

Why the swap is transparent to old pods:

- Their queries reference `file_size` by name; the swap preserves that name, so they keep working — their int writes fit the bigint column.
- The net app-visible change is an `int → bigint` widening, which is backward-compatible.
- The only disruption is the brief metadata-only lock while the DDL runs; `DROP COLUMN` / `RENAME COLUMN` don't rewrite the table.

The linter flags the drop and rename as backward-incompatible; `IgnoreMigration()` acknowledges the sequencing makes them safe.

**Don't cut over to the physical name first.** Aliasing the ORM field to `file_size_bigint` via `db_column` creates a pod generation that queries `file_size_bigint` by name. The later rename then breaks that generation for the whole rollover, and adds a release. Preserving `file_size` is what makes the rename free.

## Tooling

- **`@mirror_field(source, target)`** in `contentcuration/db/dual_write.py` — BEFORE INSERT/UPDATE trigger copying field `source` → `target`. Change-guarded: an unconditional copy corrupts data at swap.
- **`backfill_column`** — idempotent, resumable (`--start-id <pk>`), batched (`--batch-size`); one transaction per batch. `--progress-check` tests for remaining rows without writing and exits nonzero if any remain.
- **`lintmigrations`** — run locally before pushing:
  ```bash
  python contentcuration/manage.py lintmigrations --git-commit-id <base-ref> --no-cache --warnings-as-errors
  ```
  `--git-commit-id` is a flag, not positional — a positional value is read as an app label and lints nothing.
- **`IgnoreMigration()`** — escape hatch for a migration whose backward-incompatibility is made safe by release sequencing.
