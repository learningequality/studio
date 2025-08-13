import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration.models import ContentNode
from contentcuration.models import License

logging = logmodule.getLogger("command")

CHUNKSIZE = 10000


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()
        reset_time = time.time()

        mastery_model_exercise_count = (
            ContentNode.objects.filter(kind_id=content_kinds.EXERCISE)
            .filter(Q(extra_fields__has_key="mastery_model"))
            .order_by()
            .count()
        )

        i = 0

        while i < mastery_model_exercise_count:
            chunk_time = time.time()
            update_ids = (
                ContentNode.objects.filter(kind_id=content_kinds.EXERCISE)
                .filter(Q(extra_fields__has_key="mastery_model"))
                .order_by("id")
                .values_list("id", flat=True)[i : i + CHUNKSIZE]
            )
            ContentNode.objects.filter(pk__in=update_ids).update(complete=True)
            logging.info(
                "Marked {} nodes as complete=True in {} seconds".format(
                    CHUNKSIZE, time.time() - chunk_time
                )
            )
            i += CHUNKSIZE

        mastery_model_exercise_count = (
            ContentNode.objects.filter(kind_id=content_kinds.EXERCISE)
            .filter(Q(extra_fields__has_key="option.completion_criteria.mastery_model"))
            .order_by()
            .count()
        )

        while i < mastery_model_exercise_count:
            chunk_time = time.time()
            update_ids = (
                ContentNode.objects.filter(kind_id=content_kinds.EXERCISE)
                .filter(
                    Q(extra_fields__has_key="option.completion_criteria.mastery_model")
                )
                .order_by("id")
                .values_list("id", flat=True)[i : i + CHUNKSIZE]
            )
            ContentNode.objects.filter(pk__in=update_ids).update(complete=True)
            logging.info(
                "Marked {} nodes as complete=True in {} seconds".format(
                    CHUNKSIZE, time.time() - chunk_time
                )
            )
            i += CHUNKSIZE

        logging.info(
            "Marked all mastery_modeled exercises as complete=True (finished in {})".format(
                time.time() - reset_time
            )
        )

        # Mark invalid titles
        titlestart = time.time()
        logging.info("Marking blank titles...")
        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(kind_id=content_kinds.EXERCISE, title="")
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} invalid titles (finished in {})".format(
                count, time.time() - titlestart
            )
        )

        # Mark invalid licenses
        licensestart = time.time()
        logging.info("Marking blank licenses...")
        invalid_license_count = (
            ContentNode.objects.filter(
                kind_id=content_kinds.EXERCISE, license__isnull=True
            )
            .order_by()
            .count()
        )
        while i < invalid_license_count:
            chunk_time = time.time()
            update_ids = (
                ContentNode.objects.filter(
                    kind_id=content_kinds.EXERCISE, license__isnull=True
                )
                .order_by("id")
                .values_list("id", flat=True)[i : i + CHUNKSIZE]
            )
            count = ContentNode.objects.filter(pk__in=update_ids).update(complete=False)
            logging.info(
                "Marked {} nodes as complete=False in {} seconds".format(
                    count, time.time() - chunk_time
                )
            )
            i += CHUNKSIZE
        logging.info(
            "Marked {} invalid licenses (finished in {})".format(
                invalid_license_count, time.time() - licensestart
            )
        )

        licensestart = time.time()
        logging.info("Marking blank license descriptions...")
        custom_licenses = list(
            License.objects.filter(is_custom=True).values_list("pk", flat=True)
        )
        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(kind_id=content_kinds.EXERCISE, license_id__in=custom_licenses)
            .filter(Q(license_description__isnull=True) | Q(license_description=""))
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} invalid license descriptions (finished in {})".format(
                count, time.time() - licensestart
            )
        )

        licensestart = time.time()
        logging.info("Marking blank copyright holders...")
        copyright_licenses = list(
            License.objects.filter(copyright_holder_required=True).values_list(
                "pk", flat=True
            )
        )
        blank_copyright_holder_count = (
            ContentNode.objects.filter(
                kind_id=content_kinds.EXERCISE, license_id__in=copyright_licenses
            )
            .filter(Q(copyright_holder__isnull=True) | Q(copyright_holder=""))
            .order_by()
            .count()
        )
        while i < blank_copyright_holder_count:
            chunk_time = time.time()
            update_ids = (
                ContentNode.objects.filter(
                    kind_id=content_kinds.EXERCISE, license_id__in=copyright_licenses
                )
                .filter(Q(copyright_holder__isnull=True) | Q(copyright_holder=""))
                .order_by("id")
                .values_list("id", flat=True)[i : i + CHUNKSIZE]
            )
            count = ContentNode.objects.filter(pk__in=update_ids).update(complete=False)
            logging.info(
                "Marked {} nodes as complete=False in {} seconds".format(
                    count, time.time() - chunk_time
                )
            )
            i += CHUNKSIZE
        logging.info(
            "Marked {} invalid copyright holders (finished in {})".format(
                blank_copyright_holder_count, time.time() - licensestart
            )
        )

        # Mark invalid exercises
        exercisestart = time.time()
        logging.info("Marking mastery_model less exercises...")
        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(kind_id=content_kinds.EXERCISE)
            .filter(~Q(extra_fields__has_key="mastery_model"))
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} mastery_model less exercises(finished in {})".format(
                count, time.time() - exercisestart
            )
        )

        exercisestart = time.time()
        logging.info("Marking bad mastery model exercises...")
        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(kind_id=content_kinds.EXERCISE)
            .filter(
                Q(extra_fields__mastery_model=exercises.M_OF_N)
                & (~Q(extra_fields__has_key="m") | ~Q(extra_fields__has_key="n"))
            )
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} bad mastery model exercises (finished in {})".format(
                count, time.time() - exercisestart
            )
        )

        logging.info(
            "Mark incomplete command completed in {}s".format(time.time() - start)
        )
