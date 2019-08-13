from django.db import DEFAULT_DB_ALIAS
from django.db.models.expressions import Expression
from django.db.models.query_utils import Q
from mock import create_autospec
from mock import Mock
from mock import patch

from ...base import TemporaryModelTestCase
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import Not
from contentcuration.db.models.query import CustomQuerySet
from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.query import InsertFromQuery
from contentcuration.db.models.sql.query import UpdateFromQuery


class CustomQuerySetTestCase(TemporaryModelTestCase):
    @patch('django.db.models.sql.Query')
    def setUp(self, _):
        super(CustomQuerySetTestCase, self).setUp()
        self.queryset = CustomQuerySet(model=self.TempModel, using=DEFAULT_DB_ALIAS)

    @patch('django.db.models.sql.Query')
    def test_filter_by_single(self, _):
        clone = self.queryset.filter_by('test')
        self.assertIsInstance(clone, CustomQuerySet)

        self.queryset.query.where.add.assert_not_called()
        clone.query.where.add.assert_called_once_with('test', Q.AND)

    @patch('django.db.models.sql.Query')
    def test_filter_by_multiple(self, _):
        clone = self.queryset.filter_by('test', 'test2', 'test3')
        self.assertIsInstance(clone, CustomQuerySet)

        self.queryset.query.where.add.assert_not_called()
        clone.query.where.add.assert_any_call('test', Q.AND)
        clone.query.where.add.assert_any_call('test2', Q.AND)
        clone.query.where.add.assert_any_call('test3', Q.AND)

    @patch('django.db.models.sql.Query')
    @patch('django.db.models.expressions.Expression')
    def test_filter_by_expression(self, _, Expression):
        e = Expression()
        e.resolve_expression.return_value = 'test'
        clone = self.queryset.filter_by(e)
        self.assertIsInstance(clone, CustomQuerySet)

        self.queryset.query.where.add.assert_not_called()
        e.resolve_expression.assert_called_once_with(clone.query)
        clone.query.where.add.assert_called_once_with('test', Q.AND)

    @patch('django.db.models.sql.Query')
    def test_exclude_by_single(self, _):
        e = create_autospec(spec=Expression, spec_set=False)()
        e.resolve_expression.return_value = 'test'

        clone = self.queryset.exclude_by(e)
        self.assertIsInstance(clone, CustomQuerySet)

        self.queryset.query.where.add.assert_not_called()
        clone.query.where.add.assert_called_once()
        args, _ = clone.query.where.add.call_args

        self.assertEqual(2, len(args))
        self.assertIsInstance(args[0], Not)
        self.assertEqual('test', args[0]._expression)
        self.assertEqual(args[1], Q.AND)

    @patch('django.db.models.sql.Query')
    def test_exclude_by_multiple(self, _):
        e1 = create_autospec(spec=Expression, spec_set=False)()
        e1.resolve_expression.return_value = 'test1'
        e2 = create_autospec(spec=Expression, spec_set=False)()
        e2.resolve_expression.return_value = 'test2'

        clone = self.queryset.exclude_by(e1, e2)
        self.assertIsInstance(clone, CustomQuerySet)

        self.queryset.query.where.add.assert_not_called()
        all_calls = clone.query.where.add.call_args_list
        self.assertEqual(2, len(all_calls))

        e1_args, _ = all_calls[0]
        e2_args, _ = all_calls[1]

        self.assertEqual(2, len(e1_args))
        self.assertIsInstance(e1_args[0], Not)
        self.assertEqual('test1', e1_args[0]._expression)
        self.assertEqual(e1_args[1], Q.AND)

        self.assertEqual(2, len(e2_args))
        self.assertIsInstance(e2_args[0], Not)
        self.assertEqual('test2', e2_args[0]._expression)
        self.assertEqual(e2_args[1], Q.AND)

    @patch('django.db.models.sql.Query')
    def test_joining(self, _):
        j = create_autospec(spec=Join, spec_set=False)(None)
        clone = self.queryset.joining(j)
        self.assertIsInstance(clone, CustomQuerySet)

        j.resolve_expression.assert_called_once_with(clone.query)

    # @mark.skip('Failing: TypeError: super() argument 1 must be type, not MagicMock')
    @patch('django.db.models.sql.Query')
    def test_create_from(self, _):
        Queryset = Mock(spec=CustomQuerySet, spec_set=False)
        Compiler = create_autospec(spec=SQLInsertFromCompiler, spec_set=False)

        from_queryset = Queryset(model=self.TempModel, using=DEFAULT_DB_ALIAS)
        clone_queryset = Queryset(model=self.TempModel, using=DEFAULT_DB_ALIAS)
        compiler = Compiler(from_queryset.query, None, None)

        with patch.object(self.queryset, '_clone') as mocked_clone:
            mocked_clone.return_value = clone_queryset

            clone_queryset.query.clone.return_value = clone_queryset.query
            clone_queryset.query.get_compiler.return_value = compiler

            compiler.execute_sql.return_value = 'created'
            actual = self.queryset.create_from(from_queryset, is_test=True, name='abc')
            self.assertEqual('created', actual)

            clone_queryset.query.clone.assert_called_once_with(InsertFromQuery)
            clone_queryset.query.insert_from.assert_called_once_with(from_queryset.query,
                                                                     is_test=True, name='abc')

            clone_queryset.query.get_compiler.assert_called_once_with(using=DEFAULT_DB_ALIAS)
            compiler.execute_sql.assert_called_once_with(True)

    @patch('django.db.models.sql.Query')
    def test_update_from(self, _):
        Queryset = Mock(spec=CustomQuerySet, spec_set=False)
        Compiler = create_autospec(spec=SQLInsertFromCompiler, spec_set=False)

        j = create_autospec(spec=Join, spec_set=False)(None)
        clone_queryset = Queryset(model=self.TempModel, using=DEFAULT_DB_ALIAS)
        compiler = Compiler(clone_queryset.query, None, None)

        with patch.object(self.queryset, '_clone') as mocked_clone:
            mocked_clone.return_value = clone_queryset

            clone_queryset.query.clone.return_value = clone_queryset.query
            clone_queryset.query.get_compiler.return_value = compiler

            compiler.execute_sql.return_value = 'updated'
            actual = self.queryset.update_from(j, is_test=True, name='abc')
            self.assertEqual('updated', actual)

            clone_queryset.query.clone.assert_called_once_with(UpdateFromQuery)
            clone_queryset.query.update_from.assert_called_once_with(j, is_test=True, name='abc')
            j.resolve_expression.assert_called_once_with(clone_queryset.query)

            clone_queryset.query.get_compiler.assert_called_once_with(using=DEFAULT_DB_ALIAS)
            compiler.execute_sql.assert_called_once()
