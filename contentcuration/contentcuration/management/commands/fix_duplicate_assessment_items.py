import logging as logmodule
import time
import uuid

import progressbar
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models import F

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode

logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()
        # Go through nodes that have assessment items with the same assessment_id
        nodes = ContentNode.objects.filter(kind_id='exercise') \
            .annotate(
                num_ids=Count('assessment_items__pk'),
                num_assessment_ids=Count('assessment_items__assessment_id', distinct=True)
            ).exclude(num_ids=F('num_assessment_ids'))

        items_to_delete = []
        bar = progressbar.ProgressBar(max_value=nodes.count())
        for i, node in enumerate(nodes):
            # Go through each node's assessment items
            for item in node.assessment_items.all():
                # Handle duplicate assessment ids
                exclude_ids = [i.pk for i in items_to_delete] + [item.pk]
                other_duplicate_assessment_items = node.assessment_items.filter(assessment_id=item.assessment_id).exclude(pk__in=exclude_ids)

                if other_duplicate_assessment_items.exists():
                    # Remove duplicates
                    if other_duplicate_assessment_items.filter(
                        question=item.question,
                        answers=item.answers,
                        hints=item.hints,
                        raw_data=item.raw_data
                    ).exists():
                        items_to_delete.append(item)

                    # Get new ids for non-duplicates
                    else:
                        new_id = uuid.uuid4().hex
                        while node.assessment_items.filter(assessment_id=new_id).exists():
                            new_id = uuid.uuid4().hex
                        item.assessment_id = new_id
                        item.save()
            bar.update(i)

        logging.info("Deduping identical assessments...")
        for item in items_to_delete:
            if AssessmentItem.objects.filter(assessment_id=item.assessment_id, contentnode_id=item.contentnode_id).exclude(pk=item.pk).exists():
                item.delete()

        logging.info("Finished in {}".format(time.time() - start))
