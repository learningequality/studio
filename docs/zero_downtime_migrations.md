# Almost zero-downtime migrations — expand/contract runbook

On large tables (e.g. `File` has ~100 M rows) a single migration can cause downtime in two ways:
- by taking an `ACCESS EXCLUSIVE` lock / rewriting the table
- by shipping a schema the still-running old pods can't use (a dropped or renamed column).

The expand/contract procedure below avoids both. Its one residual cost is the brief metadata-only lock taken for the drop + rename migration, hence "almost."

## Linting (already configured)

- `django-migration-linter` - flags backward-incompatible schema (drops, renames, NOT NULL adds) old pods would break on.

## Procedure

Goal: change a column's type with no table rewrite and no backward-incompatible window. The field keeps its name throughout; only the storage underneath it swaps, from the old column to a pre-backfilled one of the new type. Because the name is preserved, old pods keep reading and writing it across the rollover.

`field`/`field_shadow` below stand in for the real names. Worked example: the `File.file_size` int → bigint widening, migrations `0167_file_size_bigint_expand` and `0169_file_size_bigint_swap`.

### Release 1 — expand

Add the shadow field and the dual-write trigger:

```python
from contentcuration.db.dual_write import mirror_field

@mirror_field("field", "field_shadow")
class Thing(models.Model):
    field = models.IntegerField(blank=True, null=True)
    field_shadow = models.BigIntegerField(blank=True, null=True)
```

`makemigrations` emits a nullable `AddField` and the `CreateTrigger` — both safe (no rewrite, no lock). New writes now land in both columns. The shadow has to be nullable: NULL is how the backfill knows which rows are left.

Backfill old rows in the same release: wire `backfill_column` as a `deploy-migrate` step in the Makefile, which runs after `migrate`, so the column and trigger already exist:

```bash
python contentcuration/manage.py backfill_column \
    --model app.Thing --source-field field --target-field field_shadow
```

Can also run the above command with `--progress-check` as a read only to see if any backfills are still required.

Every index on the old column needs a shadow too, declared partial on `field_shadow IS NOT NULL`. The shadow column is NULL in every row at this point, so the partial index is empty and builds instantly, then grows as the backfill fills rows. A non-partial index here would be a full build under a write-blocking `SHARE` lock.

The predicate is permanent — Postgres cannot drop it without rebuilding the index — so the queries that index serves have to be able to satisfy it. Where the excluded rows cannot change the result, adding the matching `isnull=False` filter to those queries costs nothing; aggregates that already ignore NULLs, like `Sum`, are the easy case. Otherwise the cutover has to rebuild the index with `CREATE INDEX CONCURRENTLY`, which belongs in `deploy-migrate` rather than the blocking `migrate` step.

### Release 2 — swap (cutover + rename)

Gate the release on the backfill actually being finished — the swap drops the old column, so any row still NULL in the shadow loses its value:

```bash
python contentcuration/manage.py backfill_column \
    --model app.Thing --source-field field --target-field field_shadow --progress-check
```

Then swap the storage in a single migration. Drop the shadow field and the decorator; the field takes the shadow's type, and its index takes the shadow index's predicate:

```python
class Thing(models.Model):
    field = models.BigIntegerField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["field"],
                name=THING_FIELD_INDEX_NAME,
                condition=Q(field__isnull=False),
            ),
        ]
```

The migration drops the trigger and the old column, renames the shadow column onto the old name, and renames the shadow index onto the name the dropped column's index just vacated:

```python
operations = [
    migrations.SeparateDatabaseAndState(
        state_operations=[
            # RemoveTrigger, RemoveIndex (both), RemoveField, AlterField, AddIndex
        ],
        database_operations=[
            migrations.RunSQL(
                sql=(
                    "DROP TRIGGER IF EXISTS <pgid> ON app_thing;"
                    'ALTER TABLE app_thing DROP COLUMN "field";'
                    'ALTER TABLE app_thing RENAME COLUMN "field_shadow" TO "field";'
                    "ALTER INDEX thing_field_shadow_idx RENAME TO thing_field_idx;"
                ),
                reverse_sql=(...),
            ),
        ],
    ),
]
```

`SeparateDatabaseAndState` allows us to let Django know what has been migrated, while doing specific raw SQL operations to get the exact data preserving sequence of events that we want. Copy the trigger `pgid` from release 1's `AddTrigger`.

Every statement is metadata-only, and the order matters: `DROP COLUMN` takes the old column's index with it, which is what frees that name for the shadow index. The index predicate follows the column rename.

Why the swap is transparent to old pods:

- Their queries reference the field by name; the swap preserves that name, so they keep working.
- The net app-visible change has to be backward-compatible on its own — a widening like `int → bigint` is, since the old pods' values still fit.
- The only disruption is the brief metadata-only lock while the DDL runs; `DROP COLUMN` / `RENAME COLUMN` don't rewrite the table.

The linter flags the drop and rename as backward-incompatible. Acknowledge that the sequencing makes them safe by naming the migration in `MIGRATION_LINTER_OPTIONS["ignore_name"]`, not with the linter's `IgnoreMigration()` operation — `django-migration-linter` is a dev-only dependency, and importing it from a migration breaks `migrate` in production.

**Don't cut over to the physical name first.** Aliasing the ORM field to the shadow column via `db_column` creates a pod generation that queries the shadow name. The later rename then breaks that generation for the whole rollover, and adds a release. Preserving the original name is what makes the rename free.

## Tooling

- **`@mirror_field(source, target)`** in `contentcuration/db/dual_write.py` — BEFORE INSERT/UPDATE trigger copying field `source` → `target`. Change-guarded: an unconditional copy corrupts data at swap.
- **`backfill_column`** — idempotent, resumable (`--start-id <pk>`), batched (`--batch-size`); one transaction per batch. `--progress-check` tests for remaining rows without writing and exits nonzero if any remain.
- **`lintmigrations`** — run locally before pushing:
  ```bash
  python contentcuration/manage.py lintmigrations --project-root-path . --git-commit-id <base-ref> --no-cache --warnings-as-errors
  ```
  `--git-commit-id` is a flag, not positional — a positional value is read as an app label and lints nothing. `--project-root-path .` is equally load-bearing: the linter runs `git diff --relative` from that directory and only recognises a changed file as a migration when its path contains `/migrations/`, so the default (the settings directory) truncates every path past that segment and lints nothing.
- **`MIGRATION_LINTER_OPTIONS["ignore_name"]`** — escape hatch for a migration whose backward-incompatibility is made safe by release sequencing.
