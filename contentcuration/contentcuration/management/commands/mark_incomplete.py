import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.db.models.sql.constants import LOUTER
from django_cte import With
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import License

logging = logmodule.getLogger("command")


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()

        # Mark invalid titles
        titlestart = time.time()
        logging.info("Marking blank titles...")
        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(title="", parent__isnull=False)
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
        count = (
            ContentNode.objects.exclude(kind_id=content_kinds.TOPIC)
            .exclude(complete=False)
            .filter(license__isnull=True)
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} invalid licenses (finished in {})".format(
                count, time.time() - licensestart
            )
        )

        licensestart = time.time()
        logging.info("Marking blank license descriptions...")
        custom_licenses = list(
            License.objects.filter(is_custom=True).values_list("pk", flat=True)
        )
        count = (
            ContentNode.objects.exclude(kind_id=content_kinds.TOPIC)
            .exclude(complete=False)
            .filter(license_id__in=custom_licenses)
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
        count = (
            ContentNode.objects.exclude(kind_id=content_kinds.TOPIC)
            .exclude(complete=False)
            .filter(license_id__in=copyright_licenses)
            .filter(Q(copyright_holder__isnull=True) | Q(copyright_holder=""))
            .order_by()
            .update(complete=False)
        )
        logging.info(
            "Marked {} invalid copyright holders (finished in {})".format(
                count, time.time() - licensestart
            )
        )

        # Mark invalid file resources
        resourcestart = time.time()
        logging.info("Marking file resources...")
        file_check_query = With(
            File.objects.filter(preset__supplementary=False)
            .values("contentnode_id")
            .order_by(),
            name="t_file",
        )

        query = (
            file_check_query.join(
                ContentNode, id=file_check_query.col.contentnode_id, _join_type=LOUTER
            )
            .with_cte(file_check_query)
            .annotate(t_contentnode_id=file_check_query.col.contentnode_id)
            .exclude(kind_id=content_kinds.TOPIC)
            .exclude(kind_id=content_kinds.EXERCISE)
            .exclude(complete=False)
            .filter(t_contentnode_id__isnull=True)
            .order_by()
        )
        count = ContentNode.objects.filter(
            id__in=query.order_by().values_list("id", flat=True)
        ).update(complete=False)
        logging.info(
            "Marked {} invalid file resources (finished in {})".format(
                count, time.time() - resourcestart
            )
        )

        # Mark invalid exercises
        exercisestart = time.time()
        logging.info("Marking exercises...")

        has_questions_query = With(
            AssessmentItem.objects.all().values("contentnode_id").order_by(),
            name="t_assessmentitem",
        )

        query = (
            has_questions_query.join(
                ContentNode,
                id=has_questions_query.col.contentnode_id,
                _join_type=LOUTER,
            )
            .with_cte(has_questions_query)
            .annotate(t_contentnode_id=has_questions_query.col.contentnode_id)
            .filter(kind_id=content_kinds.EXERCISE)
            .exclude(complete=False)
            .filter(t_contentnode_id__isnull=True)
            .order_by()
        )
        exercisestart = time.time()
        count = ContentNode.objects.filter(
            id__in=query.order_by().values_list("id", flat=True)
        ).update(complete=False)

        logging.info(
            "Marked {} questionless exercises (finished in {})".format(
                count, time.time() - exercisestart
            )
        )

        exercisestart = time.time()

        exercise_check_query = With(
            AssessmentItem.objects.exclude(type=exercises.PERSEUS_QUESTION)
            .filter(
                Q(question="")
                | Q(answers="[]")
                # hack to check if no correct answers
                | (
                    ~Q(type=exercises.INPUT_QUESTION)
                    & ~Q(answers__iregex=r'"correct":\s*true')
                )
            )
            .order_by(),
            name="t_assessmentitem",
        )

        query = (
            exercise_check_query.join(
                ContentNode, id=has_questions_query.col.contentnode_id
            )
            .with_cte(exercise_check_query)
            .annotate(t_contentnode_id=exercise_check_query.col.contentnode_id)
            .filter(kind_id=content_kinds.EXERCISE)
            .exclude(complete=False)
            .order_by()
        )

        count = ContentNode.objects.filter(
            id__in=query.order_by().values_list("id", flat=True)
        ).update(complete=False)

        logging.info(
            "Marked {} invalid exercises (finished in {})".format(
                count, time.time() - exercisestart
            )
        )

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

        count = (
            ContentNode.objects.exclude(complete=False)
            .filter(kind_id=content_kinds.EXERCISE)
            .filter(
                ~Q(extra_fields__has_key="mastery_model")
                & ~Q(extra_fields__has_key="option.completion_criteria.mastery_model")
            )
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
