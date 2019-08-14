from django.db import connection
from django.db.models.expressions import Col
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import Expression
from django.db.models.query import QuerySet
from django.db.models.sql.compiler import SQLCompiler
from django.db.models.sql.datastructures import BaseTable
from django.db.models.sql.datastructures import Join as DjangoJoin
from django.db.models.sql.query import Query
from django.db.models.sql.where import WhereNode
from django.test.testcases import SimpleTestCase
from mock import Mock
from mock import patch
from mock import PropertyMock

from ...base import TemporaryModelTestCase
from contentcuration.db.models.expressions import CompoundJoinExpression
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import JoinExpression
from contentcuration.db.models.expressions import JoinField
from contentcuration.db.models.expressions import JoinRef
from contentcuration.db.models.expressions import Not
from contentcuration.db.models.expressions import SetExpression
from contentcuration.db.models.expressions import SetRef
from contentcuration.db.models.sql.query import UpdateFromQuery


class NotTestCase(SimpleTestCase):
    def test_resolve_expression(self):
        e = Mock(spec_set=Expression())
        n = Not(e)

        e.resolve_expression.return_value = e
        clone = n.resolve_expression(is_test=True)
        self.assertNotEqual(n, clone)
        self.assertIs(e, clone._expression)
        e.resolve_expression.assert_called_once_with(is_test=True)

    def test_as_sql(self):
        e = Mock(spec_set=Expression())
        c = Mock(spec_set=SQLCompiler(None, None, None))
        n = Not(e)

        expected_params = ['a param']
        e.resolve_expression.return_value = e
        c.compile.return_value = 'is_test = FALSE', expected_params

        sql, params = n.as_sql(c, None)

        self.assertEqual('NOT (is_test = FALSE)', sql)
        self.assertEqual(expected_params, params)
        c.compile.assert_called_once_with(e)


class SetExpressionTestCase(SimpleTestCase):
    def test_as_sql(self):
        e = Mock(spec_set=Expression())
        c = Mock(spec_set=SQLCompiler(None, None, None))
        se = SetExpression('lhs_field_name', e)

        expected_params = [123]
        c.compile.side_effect = [
            ('"lhs_field_name"', []),
            ('%d', [123]),
        ]
        sql, params = se.as_sql(c, connection)

        self.assertEqual('"lhs_field_name" = %d', sql)
        self.assertEqual(expected_params, params)


class JoinTestCase(TemporaryModelTestCase):
    @patch('django.db.models.sql.Query')
    def setUp(self, _):
        self.queryset = QuerySet(model=self.TempModel)

    def test_resolve_expression__no_query(self):
        j = Join(self.queryset)
        self.assertIs(j, j.resolve_expression())

    def test_resolve_expression__subquery(self):
        queryset = QuerySet(model=self.TempModel).filter(name='Buster')
        j = Join(queryset)
        query = Query(self.queryset.model)

        with self.assertRaises(NotImplementedError):
            j.resolve_expression(query)

    def test_resolve_expression__update(self):
        e = Expression('is_test = TRUE')
        j = Join(self.queryset, e, name_left='name_right')
        query = Mock(spec_set=UpdateFromQuery(self.queryset.model))
        self.assertIsInstance(query, UpdateFromQuery)

        query.get_initial_alias.return_value = 'initial_alias'
        query.join.return_value = 'table_alias'
        j.resolve_expression(query)

        args, _ = query.join.call_args
        self.assertIsInstance(args[0], BaseTable)
        self.assertListEqual(['contentcuration_tempmodel'], args[1])

        args_list = query.where.add.call_args_list
        args, _ = args_list[0]
        self.assertIs(e, args[0])
        self.assertEqual('AND', args[1])

        args, _ = args_list[1]
        self.assertIsInstance(args[0], CombinedExpression)
        self.assertEqual('AND', args[1])
        self.assertEqual('=', args[0].connector)

        lhs = args[0].lhs
        rhs = args[0].rhs
        self.assertIsInstance(lhs, Col)
        self.assertIsInstance(rhs, Col)
        self.assertEqual('table_alias', lhs.alias)
        self.assertEqual('initial_alias', rhs.alias)
        self.assertIsInstance(lhs.target, JoinField)
        self.assertIsInstance(rhs.target, JoinField)
        self.assertEqual('name_left', lhs.target.column)
        self.assertEqual('name_right', rhs.target.column)

    def test_resolve_expression__select(self):
        e = Expression('is_test = TRUE')
        j = Join(self.queryset, e, name_left='name_right')
        query = Mock(spec_set=Query(self.queryset.model))
        ref = j.get_ref('test_field')

        type(self.queryset.query).order_by = PropertyMock(return_value=['order_field_id'])
        query.get_initial_alias.return_value = 'initial_alias'
        query.join.return_value = 'table_alias'
        j.resolve_expression(query)

        args, _ = query.join.call_args
        self.assertIsInstance(args[0], DjangoJoin)
        self.assertListEqual(['contentcuration_tempmodel'], args[1])
        self.assertEqual('contentcuration_tempmodel', args[0].table_name)
        self.assertEqual('initial_alias', args[0].parent_alias)
        self.assertEqual('INNER JOIN', args[0].join_type)
        self.assertFalse(args[0].nullable)
        self.assertEqual('table_alias', ref.table_alias)

        join_field = args[0].join_field
        self.assertIsInstance(join_field, CompoundJoinExpression)
        self.assertEqual(1, len(join_field.expressions))

        expr = join_field.expressions[0]
        self.assertIsInstance(expr, JoinExpression)
        self.assertEqual('name_left', expr.lhs)
        self.assertEqual('name_right', expr.rhs)

        self.assertIsInstance(join_field.extra, WhereNode)
        self.assertEqual(1, len(join_field.extra))
        self.assertIs(e, join_field.extra.children[0])

        args, _ = query.add_extra.call_args
        self.assertEqual(6, len(args))
        args = list(args)
        self.assertEqual(5, len([1 for x in args if x is None]))
        self.assertIsNotNone(args[5])
        self.assertEqual(1, len(args[5]))

        order_ref = args[5][0]
        self.assertIsInstance(order_ref, JoinRef)
        self.assertEqual('order_field_id', order_ref.field_name)

    def test_get_ref(self):
        j = Join(self.queryset, Expression('is_test = TRUE'), name_left='name_right')
        j.table_alias = 'test_table'
        ref = j.get_ref('test_field')
        self.assertIsInstance(ref, JoinRef)
        self.assertEqual('test_field', ref.field_name)
        self.assertEqual('test_table', ref.table_alias)
        self.assertEqual(1, len(j.refs))

    def test_get_set_expression__field(self):
        j = Join(self.queryset, Expression('is_test = TRUE'), name_left='name_right')
        j.table_alias = 'test_table'

        expr = j.get_set_expression('set_field', 'from_field')
        self.assertIsInstance(expr, SetExpression)
        self.assertIsInstance(expr.lhs, SetRef)
        self.assertEqual('set_field', expr.lhs.field_name)
        self.assertIsInstance(expr.rhs, JoinRef)
        self.assertEqual(1, len(j.refs))
        self.assertEqual('from_field', expr.rhs.field_name)
        self.assertEqual('test_table', expr.rhs.table_alias)

    def test_get_set_expression__expression(self):
        j = Join(self.queryset, Expression('is_test = TRUE'), name_left='name_right')
        j.table_alias = 'test_table'

        e = Expression('from_field')
        expr = j.get_set_expression('set_field', e)
        self.assertIsInstance(expr, SetExpression)
        self.assertIsInstance(expr.lhs, SetRef)
        self.assertEqual('set_field', expr.lhs.field_name)
        self.assertIs(e, expr.rhs)
        self.assertEqual(0, len(j.refs))
