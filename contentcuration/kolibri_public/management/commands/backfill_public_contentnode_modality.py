from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from kolibri_public.models import ContentNode
from kolibri_public.search import annotate_modality


class Command(BaseCommand):
    help = "Set kolibri_public ContentNode.modality from options.modality, in batches."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=10000)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be >= 1")

        # Only unfilled rows, so re-runs resume past what is already done.
        unfilled = ContentNode.objects.filter(
            modality__isnull=True, options__contains='"modality":'
        )
        unfilled_pks = unfilled.order_by("pk").values_list("pk", flat=True)

        # Keyset paging by pk: rows whose modality value is unrecognised stay
        # NULL, so the window must advance past them rather than re-query.
        batch_start = unfilled_pks.first()
        while batch_start is not None:
            batch_end = unfilled_pks.filter(pk__gte=batch_start)[
                batch_size - 1 : batch_size
            ].first()
            window = unfilled.filter(pk__gte=batch_start)
            if batch_end is not None:
                window = window.filter(pk__lte=batch_end)
            with transaction.atomic():
                annotate_modality(window)
            self.stdout.write(
                "backfilled through pk={}".format(
                    batch_start if batch_end is None else batch_end
                )
            )
            if batch_end is None:
                break
            batch_start = unfilled_pks.filter(pk__gt=batch_end).first()
