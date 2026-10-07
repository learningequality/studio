from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
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
        # annotate_modality adds the options filter.
        unfilled = ContentNode.objects.filter(modality__isnull=True)
        unfilled_pks = (
            unfilled.filter(options__contains='"modality":')
            .order_by("pk")
            .values_list("pk", flat=True)
        )

        # Windows span table rows, not matching rows, so each statement's cost
        # is bounded by --batch-size. Rows with an unrecognised modality stay
        # NULL, so the next window starts past batch_end rather than re-query.
        batch_start = unfilled_pks.first()
        while batch_start is not None:
            window = unfilled.filter(pk__gte=batch_start)
            batch_end = (
                ContentNode.objects.filter(pk__gte=batch_start)
                .order_by("pk")
                .values_list("pk", flat=True)[batch_size - 1 : batch_size]
                .first()
            )
            if batch_end is not None:
                window = window.filter(pk__lte=batch_end)
            annotate_modality(window)
            if batch_end is None:
                break
            self.stdout.write("backfilled through pk={}".format(batch_end))
            batch_start = unfilled_pks.filter(pk__gt=batch_end).first()
        self.stdout.write("backfill complete")
