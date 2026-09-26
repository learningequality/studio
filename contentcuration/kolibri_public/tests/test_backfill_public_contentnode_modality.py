import uuid

from django.core.management import call_command
from django.test import TestCase
from kolibri_public import models
from le_utils.constants import content_kinds
from le_utils.constants import modalities


class BackfillPublicContentNodeModalityTestCase(TestCase):
    def _create_node(self, options):
        return models.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            title="node",
            options=options,
        )

    def test_sets_modality_from_options(self):
        quiz = self._create_node({"modality": modalities.QUIZ})
        course = self._create_node({"modality": modalities.COURSE})
        plain = self._create_node({})

        call_command("backfill_public_contentnode_modality")

        self.assertEqual(
            dict(models.ContentNode.objects.values_list("id", "modality")),
            {quiz.id: modalities.QUIZ, course.id: modalities.COURSE, plain.id: None},
        )

    def test_backfills_across_batches_past_unrecognised_values(self):
        unknown = self._create_node({"modality": "NOT_A_MODALITY"})
        quizzes = [self._create_node({"modality": modalities.QUIZ}) for _ in range(4)]

        call_command("backfill_public_contentnode_modality", batch_size=2)

        self.assertEqual(
            dict(models.ContentNode.objects.values_list("id", "modality")),
            {unknown.id: None, **{q.id: modalities.QUIZ for q in quizzes}},
        )
