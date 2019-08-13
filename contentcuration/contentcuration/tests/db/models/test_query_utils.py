import copy

from django.db.models.query_utils import Q
from django.test.testcases import SimpleTestCase

from contentcuration.db.models import query_utils


class QAnyTestCase(SimpleTestCase):
    def test_single(self):
        q = Q(test=True)
        self.assertEqual(q, query_utils.q_any([q]))

    def test_multiple(self):
        q1 = Q(id=123)
        q2 = Q(name='Test')
        q3 = Q(is_passing=True)

        expected = q1 | q2 | q3
        actual = query_utils.q_any([copy.deepcopy(q1), copy.deepcopy(q2), copy.deepcopy(q3)])

        self.assertEqual(str(expected), str(actual))


class QAllTestCase(SimpleTestCase):
    def test_single(self):
        q = Q(test=True)
        self.assertEqual(q, query_utils.q_all([q]))

    def test_multiple(self):
        q1 = Q(id=123)
        q2 = Q(name='Test')
        q3 = Q(is_passing=True)

        expected = q1 & q2 & q3
        actual = query_utils.q_all([copy.deepcopy(q1), copy.deepcopy(q2), copy.deepcopy(q3)])

        self.assertEqual(str(expected), str(actual))
