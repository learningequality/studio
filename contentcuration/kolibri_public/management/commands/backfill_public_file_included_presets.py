from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from django.db.models import Case
from django.db.models import Value
from django.db.models import When
from kolibri_public.models import File
from le_utils.constants.format_presets import RENDERABLE_PRESETS_ORDER


class Command(BaseCommand):
    help = "Set included_presets on eligible kolibri_public files, in batches."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=10000)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be >= 1")

        unfilled = File.objects.filter(
            included_presets__isnull=True,
            supplementary=False,
            preset__in=RENDERABLE_PRESETS_ORDER,
        )
        unfilled_pks = unfilled.order_by("pk").values_list("pk", flat=True)
        when_statements = [
            When(preset=preset, then=Value(2 ** index))
            for index, preset in enumerate(RENDERABLE_PRESETS_ORDER)
        ]
        included_presets = Case(*when_statements)

        batch_start = unfilled_pks.first()
        while batch_start is not None:
            with transaction.atomic():
                batch_pks = list(
                    File.objects.filter(pk__gte=batch_start)
                    .order_by("pk")
                    .values_list("pk", flat=True)[:batch_size]
                )
                unfilled.filter(pk__in=batch_pks).update(
                    included_presets=included_presets
                )

            if len(batch_pks) == batch_size:
                self.stdout.write("backfilled through pk={}".format(batch_pks[-1]))
            batch_start = (
                unfilled_pks.filter(pk__gt=batch_pks[-1]).first() if batch_pks else None
            )
            if batch_start is None:
                batch_start = unfilled_pks.first()

        self.stdout.write("backfill complete")
