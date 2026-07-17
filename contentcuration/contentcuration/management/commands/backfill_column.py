from django.apps import apps
from django.core.exceptions import FieldDoesNotExist
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from django.db.models import F


class Command(BaseCommand):
    help = (
        "Idempotent, resumable online backfill of one column into another, in batches."
    )

    def add_arguments(self, parser):
        parser.add_argument("--model", required=True, help="app_label.ModelName")
        parser.add_argument("--source-field", required=True)
        parser.add_argument("--target-field", required=True)
        parser.add_argument("--batch-size", type=int, default=10000)
        parser.add_argument("--start-id", default=None, help="resume from this pk")
        parser.add_argument(
            "--progress-check",
            action="store_true",
            help="report unbackfilled rows, exit nonzero if any",
        )

    def _resolve_model_fields(self, model_label, source, target):
        try:
            model = apps.get_model(model_label)
        except (LookupError, ValueError) as e:
            raise CommandError("Bad --model {!r}: {}".format(model_label, e))
        try:
            model._meta.get_field(source)
            model._meta.get_field(target)
        except FieldDoesNotExist as e:
            raise CommandError(str(e))
        return model

    def _batch_end_pk(self, queryset, pk_name, start_pk, batch_size):
        """Last pk of the batch of `batch_size` rows starting at `start_pk`.

        Returns None when fewer than `batch_size` rows remain at/after
        `start_pk` — the final, short batch. Keyset paging by pk, so it works
        for any pk type (int or UUID).
        """
        return (
            queryset.filter(pk__gte=start_pk)
            .order_by(pk_name)
            .values_list("pk", flat=True)[batch_size - 1 : batch_size]
            .first()
        )

    def handle(self, *args, **options):
        if options["batch_size"] < 1:
            raise CommandError("--batch-size must be >= 1")
        source = options["source_field"]
        target = options["target_field"]
        model = self._resolve_model_fields(options["model"], source, target)

        pk_name = model._meta.pk.name
        batch_size = options["batch_size"]
        only_unfilled = {target + "__isnull": True, source + "__isnull": False}
        unfilled = model.objects.filter(**only_unfilled)
        unfilled_pks = unfilled.order_by(pk_name).values_list("pk", flat=True)

        if options["progress_check"]:
            # exists(), not count() — the target table can have millions of rows.
            if unfilled.exists():
                raise CommandError("backfill incomplete: rows still pending")
            self.stdout.write("Backfill complete: no rows pending.")
            return

        # Start at the first unfilled pk (>= --start-id if given); re-runs and
        # resumes skip straight past an already-filled prefix.
        batch_start = unfilled_pks
        if options["start_id"] is not None:
            batch_start = batch_start.filter(pk__gte=options["start_id"])
        batch_start = batch_start.first()

        total = 0
        while batch_start is not None:
            batch_end = self._batch_end_pk(
                model.objects, pk_name, batch_start, batch_size
            )
            if batch_end is None:
                window = {"pk__gte": batch_start}
            else:
                window = {"pk__gte": batch_start, "pk__lte": batch_end}
            with transaction.atomic():
                total += model.objects.filter(**window, **only_unfilled).update(
                    **{target: F(source)}
                )
            self.stdout.write(
                "backfilled through pk={} (updated {} so far)".format(
                    batch_start if batch_end is None else batch_end, total
                )
            )
            if batch_end is None:
                break
            batch_start = unfilled_pks.filter(pk__gt=batch_end).first()
        self.stdout.write("Done. {} rows updated.".format(total))
