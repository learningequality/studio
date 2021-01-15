import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import License

logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger('command')


CHUNKSIZE = 10000


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("--chunksize", dest="chunksize", default=CHUNKSIZE)

    def handle(self, *args, **options):
        chunksize = options["chunksize"]

        start = time.time()

        # Mark invalid titles
        titlestart = time.time()
        logging.info('Marking blank titles...')
        count = ContentNode.objects.filter(title='').order_by().update(complete=False)
        logging.info('Marked {} invalid titles (finished in {})'.format(count, time.time() - titlestart))

        # Mark invalid licenses
        licensestart = time.time()
        logging.info('Marking blank licenses...')
        count = ContentNode.objects.exclude(kind_id=content_kinds.TOPIC).filter(license__isnull=True).order_by().update(complete=False)
        logging.info('Marked {} invalid licenses (finished in {})'.format(count, time.time() - licensestart))

        licensestart = time.time()
        logging.info('Marking blank license descriptions...')
        custom_licenses = list(License.objects.filter(is_custom=True).values_list("pk", flat=True))
        count = ContentNode.objects.exclude(kind_id=content_kinds.TOPIC)\
            .filter(license_id__in=custom_licenses).filter(Q(license_description__isnull=True) | Q(license_description=''))\
            .order_by().update(complete=False)
        logging.info('Marked {} invalid license descriptions (finished in {})'.format(count, time.time() - licensestart))

        # Mark invalid file resources
        resourcestart = time.time()
        logging.info('Marking file resources...')
        i = 0
        count = 0
        file_check_query = File.objects.filter(preset__supplementary=False, contentnode=OuterRef("id")).order_by()
        query = ContentNode.objects \
            .exclude(kind_id=content_kinds.TOPIC) \
            .exclude(kind_id=content_kinds.EXERCISE) \
            .order_by()
        total = query.count()
        node_ids = query[i:i + chunksize]
        while i < total + chunksize:
            nodes = ContentNode.objects.filter(pk__in=node_ids) \
                .annotate(has_files=Exists(file_check_query)) \
                .filter(has_files=False).order_by().values_list('id', flat=True)
            count += ContentNode.objects.filter(pk__in=nodes).update(complete=False)
            i += chunksize
            node_ids = query[i:i + chunksize]
        logging.info('Marked {} invalid file resources (finished in {})'.format(count, time.time() - resourcestart))

        # Mark invalid exercises
        exercisestart = time.time()
        logging.info('Marking exercises...')
        i = 0
        count = 0
        exercise_check_query = AssessmentItem.objects.filter(contentnode=OuterRef('id')) \
            .exclude(type=exercises.PERSEUS_QUESTION)\
            .filter(
                Q(question='') |
                Q(answers='[]') |
                (~Q(type=exercises.INPUT_QUESTION) & ~Q(answers__iregex=r'"correct":\s*true'))  # hack to check if no correct answers
            ).order_by()
        query = ContentNode.objects \
            .filter(kind_id=content_kinds.EXERCISE) \
            .order_by()
        total = query.count()
        node_ids = query[i:i + chunksize]
        while node_ids:
            nodes = ContentNode.objects.filter(pk__in=node_ids) \
                .annotate(
                    has_questions=Exists(AssessmentItem.objects.filter(contentnode=OuterRef("id"))),
                    invalid_exercise=Exists(exercise_check_query)
                ).filter(
                    Q(has_questions=False) |
                    Q(invalid_exercise=True) |
                    ~Q(extra_fields__has_key='type') |
                    Q(extra_fields__type=exercises.M_OF_N) & (
                        ~Q(extra_fields__has_key='m') | ~Q(extra_fields__has_key='n')
                    )
                ).order_by().values_list('id', flat=True)
            count += ContentNode.objects.filter(pk__in=nodes).update(complete=False)
            i += chunksize
            node_ids = query[i:i + chunksize]

        logging.info('Marked {} invalid exercises (finished in {})'.format(count, time.time() - exercisestart))

        logging.info('Mark incomplete command completed in {}s'.format(time.time() - start))
