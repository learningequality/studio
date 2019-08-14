from django.db import DEFAULT_DB_ALIAS
from django.db.models.expressions import Expression
from django.db.models.query_utils import Q
from mock import Mock
from mock import patch

from ...base import TemporaryModelTestCase
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import Not
from contentcuration.db.models.query import CustomQuerySet
from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.query import InsertFromQuery
from contentcuration.db.models.sql.query import UpdateFromQuery
from contentcuration.db.utils import temporary_model


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
        e = Mock(spec_set=Expression())
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
        e1 = Mock(spec_set=Expression())
        e1.resolve_expression.return_value = 'test1'
        e2 = Mock(spec_set=Expression())
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
        j = Mock(spec_set=Join(None))
        clone = self.queryset.joining(j)
        self.assertIsInstance(clone, CustomQuerySet)

        j.resolve_expression.assert_called_once_with(clone.query)

    @patch('django.db.models.sql.Query')
    def test_create_from(self, _):
        from_queryset = Mock(spec_set=CustomQuerySet(model=self.TempModel, using=DEFAULT_DB_ALIAS))
        clone_queryset = Mock(spec_set=CustomQuerySet(model=self.TempModel, using=DEFAULT_DB_ALIAS))
        compiler = Mock(spec_set=SQLInsertFromCompiler(from_queryset.query, None, None))

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
        clone_queryset = Mock(spec_set=CustomQuerySet(model=self.TempModel, using=DEFAULT_DB_ALIAS))
        compiler = Mock(spec_set=SQLInsertFromCompiler(clone_queryset.query, None, None))

        j = Mock(spec_set=Join(None))

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

    def test_bulk_update(self):
        with temporary_model(self.TempModel):
            objs = [
                self.TempModel(name='Buster'),
                self.TempModel(name='Crash'),
                self.TempModel(name='Dude'),
            ]

            self.TempModel.objects.bulk_create(objs)
            updated_objs = objs[:-1]

            for obj in updated_objs:
                obj.name += 'ed'

            queryset = CustomQuerySet(model=self.TempModel)
            queryset.bulk_update(objs, ['name'])

            saved_objs = self.TempModel.objects.filter(pk__in=[obj.pk for obj in updated_objs])\
                .order_by('id')
            for saved_obj in saved_objs:
                updated_obj = updated_objs.pop(0)
                self.assertEqual(updated_obj.pk, saved_obj.pk)
                self.assertEqual(updated_obj.name, saved_obj.name)
