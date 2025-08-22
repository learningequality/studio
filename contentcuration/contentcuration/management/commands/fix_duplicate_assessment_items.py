import logging as logmodule
import time
import uuid

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models import F

from contentcuration.models import ContentNode

logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()
        # Go through nodes that have assessment items with the same assessment_id
        logging.info("Looking for nodes with invalid assessments...")
        nodes = (
            ContentNode.objects.filter(kind_id="exercise")
            .annotate(
                num_ids=Count("assessment_items__pk"),
                num_assessment_ids=Count(
                    "assessment_items__assessment_id", distinct=True
                ),
            )
            .exclude(num_ids=F("num_assessment_ids"))
        )
        total = nodes.count()

        logging.info("Fixing {} nodes...".format(total))

        for i, node in enumerate(nodes):
            # Go through each node's assessment items
            for item in node.assessment_items.all():
                # Handle duplicate assessment ids
                other_duplicate_assessment_items = node.assessment_items.filter(
                    assessment_id=item.assessment_id
                ).exclude(pk=item.pk)

                if other_duplicate_assessment_items.exists():
                    # Remove duplicates
                    if other_duplicate_assessment_items.filter(
                        question=item.question,
                        answers=item.answers,
                        hints=item.hints,
                        raw_data=item.raw_data,
                    ).exists():
                        item.delete()

                    # Get new ids for non-duplicates
                    else:
                        new_id = uuid.uuid4().hex
                        while node.assessment_items.filter(
                            assessment_id=new_id
                        ).exists():
                            new_id = uuid.uuid4().hex
                        item.assessment_id = new_id
                        item.save()
            logging.info("Fixed assessment items for {} node(s)".format(i + 1))

        logging.info("Finished in {}".format(time.time() - start))
