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

logmodule.basicConfig()
logging = logmodule.getLogger('command')


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()
        exercise_check_query = AssessmentItem.objects.filter(contentnode=OuterRef('id')) \
            .exclude(type=exercises.PERSEUS_QUESTION)\
            .filter(
                Q(question='') |
                Q(answers='[]') |
                (~Q(type=exercises.INPUT_QUESTION) & ~Q(answers__iregex=r'"correct":\s*true'))  # hack to check if no correct answers
            )
        file_check_query = File.objects.filter(preset__supplementary=False, contentnode=OuterRef("id"))

        invalid_nodes = ContentNode.objects.filter(complete__isnull=True).annotate(
            has_files=Exists(file_check_query),
            has_questions=Exists(AssessmentItem.objects.filter(contentnode=OuterRef("id"))),
            invalid_exercise=Exists(exercise_check_query)
        ).filter(
            Q(title='') |
            ~Q(kind_id=content_kinds.TOPIC) & (
                (~Q(kind_id=content_kinds.EXERCISE) & Q(has_files=False)) |
                Q(license=None) |
                (Q(license__is_custom=True) & (Q(license_description=None) | Q(license_description=''))) |
                (Q(license__copyright_holder_required=True) & (Q(copyright_holder=None) | Q(copyright_holder='')))
            ) |
            Q(kind_id=content_kinds.EXERCISE) & (
                Q(has_questions=False) |
                Q(invalid_exercise=True) |
                ~Q(extra_fields__has_key='type') |
                Q(extra_fields__type=exercises.M_OF_N) & (
                    ~Q(extra_fields__has_key='m') | ~Q(extra_fields__has_key='n')
                )
            )
        ).values_list('id', flat=True)

        # Getting an error on bulk update with the annotations, so query again
        ContentNode.objects.filter(pk__in=invalid_nodes).update(complete=False)
        logging.info('mark_incomplete command completed in {}s'.format(time.time() - start))
