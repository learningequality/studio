from contentcuration.models import ContentNode
from le_utils.constants import content_kinds
import time
import logging as logmodule
from django.db.models import Q

logging = logmodule.getLogger('command')
CHUNKSIZE = 10000


def handling_mastery_competition_criteria():
    mastery_model_exercise_count = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
        .filter(Q(extra_fields__has_key='mastery_model')).order_by().count()

    i = 0

    while i < mastery_model_exercise_count:
        chunk_time = time.time()
        update_ids = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
                         .filter(Q(extra_fields__has_key='mastery_model')).order_by("id").values_list("id", flat=True)[i: i + CHUNKSIZE]
        ContentNode.objects.filter(pk__in=update_ids).update(complete=True)
        logging.info('Marked {} nodes as complete=True in {} seconds'.format(CHUNKSIZE, time.time() - chunk_time))
        i += CHUNKSIZE

    mastery_model_exercise_count = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
        .filter(Q(extra_fields__has_key='option.completion_criteria.mastery_model')).order_by().count()

    while i < mastery_model_exercise_count:
        chunk_time = time.time()
        update_ids = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE) \
                         .filter(Q(extra_fields__has_key='option.completion_criteria.mastery_model')).order_by("id").values_list("id", flat=True)[i: i + CHUNKSIZE]
        ContentNode.objects.filter(pk__in=update_ids).update(complete=True)
        logging.info('Marked {} nodes as complete=True in {} seconds'.format(CHUNKSIZE, time.time() - chunk_time))
        i += CHUNKSIZE

    return i
