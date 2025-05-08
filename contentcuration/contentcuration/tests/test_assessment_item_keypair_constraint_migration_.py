import pytest

from .base import StudioTestCase
from .testdata import exercise
from contentcuration import models as cc


class TestForwardAssessmentItemKeypairConstraint(StudioTestCase):
    def test_prevent_two_identical_keypairs(self):
        contentnode = cc.ContentNode.objects.create(kind_id=exercise(), extra_fields={})
        contentnode.save()
        item1 = cc.AssessmentItem.objects.create(assessment_id="abc")
        item1.contentnode = contentnode
        item1.save()
        item2 = cc.AssessmentItem.objects.create(assessment_id="abc")
        item2.contentnode = contentnode
        with pytest.raises(Exception) as execinfo:
            item2.save()

        assert "duplicate key value violates unique constraint" in str(execinfo.value)
