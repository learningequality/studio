from django.core.management import call_command
from django.test import TestCase
from kolibri_public import models
from kolibri_public.tests.base import uuid4_hex
from le_utils.constants import content_kinds
from le_utils.constants import modalities


class BackfillPublicContentNodeModalityTestCase(TestCase):
    def _create_node(self, options):
        return models.ContentNode.objects.create(
            pk=uuid4_hex(),
            channel_id=uuid4_hex(),
            content_id=uuid4_hex(),
            kind=content_kinds.TOPIC,
            title="node",
            options=options,
        )

    def test_backfills_across_batches_past_unrecognised_values(self):
        unknown = self._create_node({"modality": "NOT_A_MODALITY"})
        course = self._create_node({"modality": modalities.COURSE})
        plain = self._create_node({})
        quizzes = [self._create_node({"modality": modalities.QUIZ}) for _ in range(4)]

        call_command("backfill_public_contentnode_modality", batch_size=2)

        self.assertEqual(
            dict(models.ContentNode.objects.values_list("id", "modality")),
            {
                unknown.id: None,
                course.id: modalities.COURSE,
                plain.id: None,
                **{q.id: modalities.QUIZ for q in quizzes},
            },
        )
