from django.db import DEFAULT_DB_ALIAS
from django.db.models.sql.query import Query
from mock import Mock

from ....base import TemporaryModelTestCase
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import JoinRef
from contentcuration.db.models.expressions import SetExpression
from contentcuration.db.models.query import CustomQuerySet
from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.compiler import SQLUpdateFromCompiler
from contentcuration.db.models.sql.query import InsertFromQuery
from contentcuration.db.models.sql.query import UpdateFromQuery


class InsertFromQueryTestCase(TemporaryModelTestCase):
    def setUp(self):
        super(InsertFromQueryTestCase, self).setUp()
        self.query = InsertFromQuery(self.TempModel)

    def test_clone(self):
        from_query = Mock(spec_set=Query(self.TempModel))
        from_query.clone.return_value = 'clone_from_query'

        self.query._from_query = from_query
        self.query._field_map = {'insert_into_field': 'from_field'}

        clone = self.query.clone()
        self.assertIsNot(self.query, clone)
        self.assertEqual('clone_from_query', clone._from_query)
        self.assertEqual({'insert_into_field': 'from_field'}, clone._field_map)

    def test_get_compiler__needs(self):
        with self.assertRaises(ValueError):
            self.query.get_compiler()

    def test_get_compiler(self):
        compiler = self.query.get_compiler(using=DEFAULT_DB_ALIAS)
        self.assertIsInstance(compiler, SQLInsertFromCompiler)

    def test_insert_from(self):
        from_query = Mock(spec_set=Query(self.TempModel))
        self.query.insert_from(from_query, insert_into_field='from_field')

        self.assertIs(from_query, self.query._from_query)
        self.assertEqual({'insert_into_field': 'from_field'}, self.query._field_map)


class UpdateFromQueryTestCase(TemporaryModelTestCase):
    def setUp(self):
        super(UpdateFromQueryTestCase, self).setUp()
        self.query = UpdateFromQuery(self.TempModel)

    def test_clone(self):
        from_join = Mock(spec_set=Join(CustomQuerySet(self.TempModel)))
        from_join.copy.return_value = 'copy_from_join'

        set_expr_1 = Mock(spec_set=SetExpression('set_field_1', JoinRef('from_field_1')))
        set_expr_2 = Mock(spec_set=SetExpression('set_field_2', JoinRef('from_field_2')))
        set_expr_1.copy.return_value = 'set_expr_1'
        set_expr_2.copy.return_value = 'set_expr_2'

        self.query._from_join = from_join
        self.query._set_expressions = [set_expr_1, set_expr_2]
        self.query._return_fields = ['return_field_1', 'return_field_2']

        clone = self.query.clone()
        self.assertIsNot(self.query, clone)
        self.assertEqual('copy_from_join', clone._from_join)
        self.assertEqual(['set_expr_1', 'set_expr_2'], clone._set_expressions)
        self.assertEqual(['return_field_1', 'return_field_2'], clone._return_fields)

    def test_get_compiler__needs(self):
        with self.assertRaises(ValueError):
            self.query.get_compiler()

    def test_get_compiler(self):
        compiler = self.query.get_compiler(using=DEFAULT_DB_ALIAS)
        self.assertIsInstance(compiler, SQLUpdateFromCompiler)

    def test_update_from(self):
        from_join = Mock(spec_set=Join(CustomQuerySet(self.TempModel)))
        from_join.get_set_expression.return_value = 'other_set_expression'

        set_expr = SetExpression('set_field', JoinRef('from_field_1'))
        self.query.update_from(from_join, set_expr, update_field='from_field_2')

        self.assertIs(from_join, self.query._from_join)
        self.assertEqual([set_expr, 'other_set_expression'], self.query._set_expressions)
