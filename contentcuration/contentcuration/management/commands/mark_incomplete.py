import logging as logmodule
import time

import progressbar
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
    def handle(self, *args, **options):
        start = time.time()

        # Mark invalid topics
        topicstart = time.time()
        logging.info('Searching for invalid topics...')
        invalid_nodes = ContentNode.objects.filter(kind_id=content_kinds.TOPIC, title='').values_list('id', flat=True)

        total = invalid_nodes.count()
        logging.info('Fixing {} topics...'.format(total))
        chunks = [invalid_nodes[i:i + CHUNKSIZE] for i in range(0, total, CHUNKSIZE)]
        bar = progressbar.ProgressBar(max_value=len(chunks))
        for i, chunk in enumerate(chunks):
            ContentNode.objects.filter(pk__in=chunk).update(complete=False)
            bar.update(i)

        logging.info('Marked invalid topics in {}'.format(time.time() - topicstart))

        # Mark invalid file resources
        resourcestart = time.time()
        logging.info('Searching for invalid file resources...')
        file_check_query = File.objects.filter(preset__supplementary=False, contentnode=OuterRef("id"))
        invalid_nodes = ContentNode.objects \
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

        total = invalid_nodes.count()
        logging.info('Fixing {} file resources...'.format(total))
        chunks = [invalid_nodes[i:i + CHUNKSIZE] for i in range(0, total, CHUNKSIZE)]
        bar = progressbar.ProgressBar(max_value=len(chunks))
        for i, chunk in enumerate(chunks):
            ContentNode.objects.filter(pk__in=chunk).update(complete=False)
            bar.update(i)

        logging.info('Marked invalid file resources in {}'.format(time.time() - resourcestart))

        # Mark invalid exercises
        exercisestart = time.time()
        logging.info('Searching for invalid exercises...')
        exercise_check_query = AssessmentItem.objects.filter(contentnode=OuterRef('id')) \
            .exclude(type=exercises.PERSEUS_QUESTION)\
            .filter(
                Q(question='') |
                Q(answers='[]') |
                (~Q(type=exercises.INPUT_QUESTION) & ~Q(answers__iregex=r'"correct":\s*true'))  # hack to check if no correct answers
            )
        invalid_nodes = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
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

        total = invalid_nodes.count()
        logging.info('Fixing {} exercises...'.format(total))
        chunks = [invalid_nodes[i:i + CHUNKSIZE] for i in range(0, total, CHUNKSIZE)]
        bar = progressbar.ProgressBar(max_value=len(chunks))
        for i, chunk in enumerate(chunks):
            ContentNode.objects.filter(pk__in=chunk).update(complete=False)
            bar.update(i)

        logging.info('Marked invalid exercises in {}'.format(time.time() - exercisestart))

        # Mark other nodes as complete
        completestart = time.time()
        logging.info('Gathering unmarked nodes...')
        complete_nodes = ContentNode.objects.filter(complete__isnull=True).values_list('id', flat=True)

        total = complete_nodes.count()
        logging.info('Marking {} valid nodes...'.format(total))
        chunks = [complete_nodes[i:i + CHUNKSIZE] for i in range(0, total, CHUNKSIZE)]
        bar = progressbar.ProgressBar(max_value=len(chunks))
        for i, chunk in enumerate(chunks):
            ContentNode.objects.filter(pk__in=chunk).update(complete=True)
            bar.update(i)

        logging.info('Marked complete nodes in {}'.format(time.time() - completestart))

        logging.info('Mark incomplete command completed in {}s'.format(time.time() - start))
