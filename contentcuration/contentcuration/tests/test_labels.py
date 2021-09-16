import logging
import os
from random import randint
from random import shuffle
from time import time

import pytest
from faker import Faker

from .base import BaseTestCase
from .testdata import topic
from contentcuration.constants.le_labels import ACCESIBILITY
from contentcuration.constants.le_labels import CATEGORY
from contentcuration.constants.le_labels import GRADE_LEVEL
from contentcuration.constants.le_labels import LEARNING_ACTIVITY
from contentcuration.constants.le_labels import MATH
from contentcuration.constants.le_labels import RESOURCE_TYPE
from contentcuration.constants.le_labels import VIDEO
from contentcuration.models import ContentNode


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
        node.gradeLevelStr = ",".join(grade)
        node.gradeLevelArray = grade
        node.resourceTypeStr = ",".join(res)
        node.resourceTypeArray = res
        node.learningActivityStr = ",".join(acts)
        node.learningActivityArray = acts
        node.accessibilityStr = ",".join(accs)
        node.accessibilityArray = accs
        node.categoryStr = ",".join(cats)
        node.categoryArray = cats
        node.labelsJson = {
            "grades": grade,
            "resources": res,
            "activities": acts,
            "accesibility": accs,
            "categories": cats,
        }
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
        strings = ContentNode.objects.filter(resourceTypeStr__contains=VIDEO)
        arrays = ContentNode.objects.filter(resourceTypeArray__contains=[VIDEO])
        jsons = ContentNode.objects.filter(labelsJson__resources__contains=[VIDEO])
        assert len(strings) == len(arrays) == len(jsons)

        strings = ContentNode.objects.filter(categoryStr__contains=MATH)
        arrays = ContentNode.objects.filter(categoryArray__icontains=MATH)
        jsons = ContentNode.objects.filter(labelsJson__categories__icontains=MATH)
        assert len(strings) == len(arrays) == len(jsons)


@pytest.fixture(scope="class")
def create_many_nodes():
    records = 100000
    print("Creating {} nodes".format(records))
    kind_topic = topic()
    f = Faker()
    for i in range(records):
        ContentNode(parent=None, kind=kind_topic, title=f.text()).save()


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
            node.gradeLevelStr = ",".join(grade)
            node.resourceTypeStr = ",".join(res)
            node.learningActivityStr = ",".join(acts)
            node.accessibilityStr = ",".join(accs)
            node.categoryStr = ",".join(cats)
            node.save()
        self.elapsed = time() - init_time
        print(
            "USING STRING: Assigning random labels to {} nodes took {} seconds".format(
                len(self.nodes), self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(resourceTypeStr__contains=VIDEO))
        self.elapsed = time() - init_time
        print(
            "USING STRING: Finding for resource label in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(categoryStr__contains=MATH))
        self.elapsed = time() - init_time
        print(
            "USING STRING: Finding for maths and descendants labell in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

    def test_massive_array(self):
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

            node.gradeLevelArray = grade
            node.resourceTypeArray = res
            node.learningActivityArray = acts
            node.accessibilityArray = accs
            node.categoryArray = cats
            node.save()
        self.elapsed = time() - init_time
        print(
            "USING ARRAY: Assigning random labels to {} nodes took {} seconds".format(
                len(self.nodes), self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(resourceTypeArray__contains=[VIDEO]))
        self.elapsed = time() - init_time
        print(
            "USING ARRAY: Finding for resource label in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

        init_time = time()
        strings = len(ContentNode.objects.filter(categoryArray__icontains=MATH))
        self.elapsed = time() - init_time
        print(
            "USING ARRAY: Finding for maths and descendants labell in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

    def test_massive_json(self):
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

            node.labelsJson = {
                "grades": grade,
                "resources": res,
                "activities": acts,
                "accesibility": accs,
                "categories": cats,
            }
            node.save()
        self.elapsed = time() - init_time
        print(
            "USING JSONB: Assigning random labels to {} nodes took {} seconds".format(
                len(self.nodes), self.elapsed
            )
        )

        init_time = time()
        strings = len(
            ContentNode.objects.filter(labelsJson__resources__contains=[VIDEO])
        )
        self.elapsed = time() - init_time
        print(
            "USING JSONB: Finding for resource label in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )

        init_time = time()
        strings = len(
            ContentNode.objects.filter(labelsJson__categories__icontains=MATH)
        )
        self.elapsed = time() - init_time
        print(
            "USING JSONB: Finding for maths and descendants labell in {} nodes took {} seconds".format(
                strings, self.elapsed
            )
        )
