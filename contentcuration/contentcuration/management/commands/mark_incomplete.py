import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models.sql.constants import LOUTER
from django_cte import With
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import License

logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger('command')


class Command(BaseCommand):

    def handle(self, *args, **options):
        start = time.time()

        # Mark invalid titles
        titlestart = time.time()
        logging.info('Marking blank titles...')
        count = ContentNode.objects.exclude(complete=False).filter(title='').order_by().update(complete=False)
        logging.info('Marked {} invalid titles (finished in {})'.format(count, time.time() - titlestart))

        # Mark invalid licenses
        licensestart = time.time()
        logging.info('Marking blank licenses...')
        count = ContentNode.objects.exclude(complete=False, kind_id=content_kinds.TOPIC).filter(license__isnull=True).order_by().update(complete=False)
        logging.info('Marked {} invalid licenses (finished in {})'.format(count, time.time() - licensestart))

        licensestart = time.time()
        logging.info('Marking blank license descriptions...')
        custom_licenses = list(License.objects.filter(is_custom=True).values_list("pk", flat=True))
        count = ContentNode.objects.exclude(complete=False, kind_id=content_kinds.TOPIC)\
            .filter(license_id__in=custom_licenses).filter(Q(license_description__isnull=True) | Q(license_description=''))\
            .order_by().update(complete=False)
        logging.info('Marked {} invalid license descriptions (finished in {})'.format(count, time.time() - licensestart))

        licensestart = time.time()
        logging.info('Marking blank copyright holders...')
        copyright_licenses = list(License.objects.filter(copyright_holder_required=True).values_list("pk", flat=True))
        count = ContentNode.objects.exclude(complete=False, kind_id=content_kinds.TOPIC)\
            .filter(license_id__in=copyright_licenses).filter(Q(copyright_holder__isnull=True) | Q(copyright_holder=''))\
            .order_by().update(complete=False)
        logging.info('Marked {} invalid copyright holders (finished in {})'.format(count, time.time() - licensestart))

        # Mark invalid file resources
        resourcestart = time.time()
        logging.info('Marking file resources...')
        file_check_query = With(File.objects.filter(preset__supplementary=False).values("contentnode_id").order_by(), name="t_file")

        query = file_check_query.join(ContentNode, id=file_check_query.col.contentnode_id, _join_type=LOUTER)\
            .with_cte(file_check_query) \
            .annotate(t_contentnode_id=file_check_query.col.contentnode_id) \
            .exclude(kind_id=content_kinds.TOPIC) \
            .exclude(kind_id=content_kinds.EXERCISE) \
            .exclude(complete=False) \
            .filter(t_contentnode_id__isnull=True)\
            .order_by()
        count = ContentNode.objects.filter(id__in=query.order_by().values_list('id', flat=True)).update(complete=False)
        logging.info('Marked {} invalid file resources (finished in {})'.format(count, time.time() - resourcestart))

        # Mark invalid exercises
        exercisestart = time.time()
        logging.info('Marking exercises...')
        exercise_check_query = AssessmentItem.objects.filter(contentnode=OuterRef('id')) \
            .exclude(type=exercises.PERSEUS_QUESTION)\
            .filter(
                Q(question='') |
                Q(answers='[]') |
                (~Q(type=exercises.INPUT_QUESTION) & ~Q(answers__iregex=r'"correct":\s*true'))  # hack to check if no correct answers
            ).order_by()
        query = ContentNode.objects \
            .filter(kind_id=content_kinds.EXERCISE) \
            .exclude(complete=False) \
            .order_by()
        exercisestart = time.time()
        nodes = query \
            .annotate(
                has_questions=Exists(AssessmentItem.objects.filter(contentnode=OuterRef("id"))),
            ).filter(has_questions=False).order_by()
        count = nodes.update(complete=False)

        logging.info('Marked {} questionless exercises (finished in {})'.format(count, time.time() - exercisestart))

        exercisestart = time.time()
        nodes = query \
            .annotate(
                invalid_exercise=Exists(exercise_check_query)
            ).filter(
                Q(invalid_exercise=True) |
                ~Q(extra_fields__has_key='type') |
                Q(extra_fields__type=exercises.M_OF_N) & (
                    ~Q(extra_fields__has_key='m') | ~Q(extra_fields__has_key='n')
                )
            ).order_by()
        count = nodes.update(complete=False)

        logging.info('Marked {} invalid exercises (finished in {})'.format(count, time.time() - exercisestart))

        logging.info('Mark incomplete command completed in {}s'.format(time.time() - start))
