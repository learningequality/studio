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

logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger('command')


CHUNKSIZE = 1000


class Command(BaseCommand):

    def mark_complete_field(self, query, complete=False):
        i = 0
        count = 0
        node_ids = query[i:i + CHUNKSIZE]
        while node_ids:
            ContentNode.objects.filter(pk__in=node_ids).update(complete=complete)
            i += CHUNKSIZE
            count += len(node_ids)
            node_ids = query[i:i + CHUNKSIZE]
        return count

    def handle(self, *args, **options):
        start = time.time()

        # Mark invalid topics
        topicstart = time.time()
        logging.info('Marking topics...')
        query = ContentNode.objects.filter(kind_id=content_kinds.TOPIC, title='').values_list('id', flat=True)
        count = self.mark_complete_field(query)
        logging.info('Marked {} invalid topics (finished in {})'.format(count, time.time() - topicstart))

        # Mark invalid file resources
        resourcestart = time.time()
        logging.info('Marking file resources...')
        file_check_query = File.objects.filter(preset__supplementary=False, contentnode=OuterRef("id"))
        query = ContentNode.objects \
            .exclude(kind_id=content_kinds.TOPIC) \
            .exclude(kind_id=content_kinds.EXERCISE) \
            .annotate(has_files=Exists(file_check_query)) \
            .filter(
                Q(title='') |
                Q(has_files=False) |
                Q(license=None) |
                (Q(license__is_custom=True) & (Q(license_description=None) | Q(license_description=''))) |
                (Q(license__copyright_holder_required=True) & (Q(copyright_holder=None) | Q(copyright_holder='')))
            ).values_list('id', flat=True)

        count = self.mark_complete_field(query)
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
            )
        query = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
            .annotate(
                has_questions=Exists(AssessmentItem.objects.filter(contentnode=OuterRef("id"))),
                invalid_exercise=Exists(exercise_check_query)
            ).filter(
                Q(title='') |
                Q(license=None) |
                (Q(license__is_custom=True) & (Q(license_description=None) | Q(license_description=''))) |
                (Q(license__copyright_holder_required=True) & (Q(copyright_holder=None) | Q(copyright_holder=''))) |
                Q(has_questions=False) |
                Q(invalid_exercise=True) |
                ~Q(extra_fields__has_key='type') |
                Q(extra_fields__type=exercises.M_OF_N) & (
                    ~Q(extra_fields__has_key='m') | ~Q(extra_fields__has_key='n')
                )
            ).values_list('id', flat=True)

        count = self.mark_complete_field(query)
        logging.info('Marked {} invalid exercises (finished in {})'.format(count, time.time() - exercisestart))

        # Mark other nodes as complete
        completestart = time.time()
        logging.info('Gathering unmarked nodes...')
        query = ContentNode.objects.filter(complete__isnull=True).values_list('id', flat=True)

        count = self.mark_complete_field(query, complete=True)
        logging.info('Marked {} unmarked nodes (finished in {})'.format(count, time.time() - completestart))

        logging.info('Mark incomplete command completed in {}s'.format(time.time() - start))
