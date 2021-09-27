import logging
import os
from random import randint
from random import shuffle
from time import time

import pytest

from .base import BaseTestCase
from contentcuration.constants.le_labels import ACCESIBILITY
from contentcuration.constants.le_labels import CALCULUS
from contentcuration.constants.le_labels import CATEGORY
from contentcuration.constants.le_labels import GRADE_LEVEL
from contentcuration.constants.le_labels import LEARNING_ACTIVITY
from contentcuration.constants.le_labels import MATH
from contentcuration.constants.le_labels import RESOURCE_TYPE
from contentcuration.constants.le_labels import VIDEO
from contentcuration.models import ContentNode
from contentcuration.utils.db_tools import TreeBuilder

# from faker import Faker
# from .testdata import topic

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _random_labels(labels, length_labels):
    amount = randint(0, length_labels + 1)
    if amount:
        shuffle(labels)
        return labels[:amount]
    return []


def assign_labels():
    nodes = ContentNode.objects.all()
    grades, length_grades = list(GRADE_LEVEL), len(GRADE_LEVEL)
    resources, length_resources = list(RESOURCE_TYPE), len(RESOURCE_TYPE)
    activities, length_activities = list(LEARNING_ACTIVITY), len(LEARNING_ACTIVITY)
    accesibility, length_accessibility = list(ACCESIBILITY), len(ACCESIBILITY)
    categories, length_categories = list(CATEGORY), len(CATEGORY)
    for node in nodes:
        grade = _random_labels(grades, length_grades)
        res = _random_labels(resources, length_resources)
        acts = _random_labels(activities, length_activities)
        accs = _random_labels(accesibility, length_accessibility)
        cats = _random_labels(categories, length_categories)
        node.grade_level_labels = ",".join(grade)
        node.resource_type_labels = ",".join(res)
        node.learning_activity_labels = ",".join(acts)
        node.accessibility_labels = ",".join(accs)
        node.category_labels = ",".join(cats)
        node.save()


class NodesLabelsTestCase(BaseTestCase):
    def setUp(self):
        # creates node hierarchy according to
        # contentcuration/contentcuration/tests/fixtures/tree.json
        super(NodesLabelsTestCase, self).setUp()
        assign_labels()
        self.node_query = ContentNode.objects.filter(title__icontains="Topic")

    def test_nodes_of_a_label(self):
        """
        Get all ContentNodes with a label or one of its descendant labels
        """
        maths = ContentNode.objects.filter(resource_type_labels__contains=VIDEO)
        calculus = ContentNode.objects.filter(resource_type_labels__contains=CALCULUS)
        assert len(maths) >= len(calculus)


@pytest.fixture(scope="class")
def create_many_nodes():
    print("Creating nodes")
    TreeBuilder(levels=3, num_children=10)


@pytest.mark.skipif(
    os.environ.get("LABELS_MASSIVE", "false") != "true",
    reason="Env variable to run massive test is not set",
)
@pytest.mark.usefixtures("create_many_nodes")
class LabelsMassiveTestCase(BaseTestCase):
    """
    To run this class tests, pytest must be launched with
    LABELS_MASSIVE=true pytest -s contentcuration/contentcuration/tests/test_labels.py::LabelsMassiveTestCase
    """

    def setUp(self):
        self.elapsed = 0
        self.nodes = ContentNode.objects.all()
        self.records = len(self.nodes)
        print("{} nodes created".format(self.records))

    def test_massive_str(self):
        init_time = time()
        grades, length_grades = list(GRADE_LEVEL), len(GRADE_LEVEL)
        resources, length_resources = list(RESOURCE_TYPE), len(RESOURCE_TYPE)
        activities, length_activities = list(LEARNING_ACTIVITY), len(LEARNING_ACTIVITY)
        accesibility, length_accessibility = list(ACCESIBILITY), len(ACCESIBILITY)
        categories, length_categories = list(CATEGORY), len(CATEGORY)
        for node in self.nodes:
            grade = _random_labels(grades, length_grades)
            res = _random_labels(resources, length_resources)
            acts = _random_labels(activities, length_activities)
            accs = _random_labels(accesibility, length_accessibility)
            cats = _random_labels(categories, length_categories)
            node.grade_level_labels = ",".join(grade)
            node.resource_type_labels = ",".join(res)
            node.learning_activity_labels = ",".join(acts)
            node.accessibility_labels = ",".join(accs)
            node.category_labels = ",".join(cats)
            node.save()
        self.elapsed = time() - init_time
        print(
            "USING STRING: Assigning random labels to {} nodes took {} seconds".format(
                self.records, self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(resource_type_labels__contains=VIDEO))
        self.elapsed = time() - init_time
        print(
            "USING STRING: Finding for resource label in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(category_labels__contains=MATH))
        self.elapsed = time() - init_time
        print(
            "USING STRING: Finding for maths and descendants label in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )
