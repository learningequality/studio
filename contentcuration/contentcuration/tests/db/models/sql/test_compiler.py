from django.db import connection
from django.db import models
from django.db.backends.postgresql.base import DatabaseWrapper
from django.db.models.sql.query import Query
from mock import MagicMock
from mock import Mock
from mock import patch
from mock import PropertyMock

from ....base import TemporaryModelTestCase
from ....testdata import fileformat_mp4
from ....testdata import fileobj_video
from ....testdata import preset_video
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import SetExpression
from contentcuration.db.models.query import CustomQuerySet
from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.compiler import SQLUpdateFromCompiler
from contentcuration.db.models.sql.query import InsertFromQuery
from contentcuration.db.models.sql.query import UpdateFromQuery
from contentcuration.models import File


class AttributeDict(dict):
    __getattr__ = dict.__getitem__
    __setattr__ = dict.__setitem__


class SQLInsertFromCompilerTestCase(TemporaryModelTestCase):
    def setUp(self):
        super(SQLInsertFromCompilerTestCase, self).setUp()
        self.query = Mock(spec_set=InsertFromQuery(self.TempModel))
        self.connection = Mock(spec_set=DatabaseWrapper({}))
        type(self.connection.ops).quote_name = PropertyMock(return_value=connection.ops.quote_name)
        self.compiler = SQLInsertFromCompiler(self.query, self.connection, None)

    @classmethod
    def initTempModel(cls):
        # hidden inside this function because otherwise it will be created during test bootstrap
        class TempInsertModel(models.Model):
            id = models.AutoField(primary_key=True)
            file_id = models.IntegerField()
            file_size = models.IntegerField()
            name = models.CharField(max_length=32)

        return TempInsertModel

    def runTest(self):
        for return_id in [False, True]:
            # test `as_sql` method with `return_id` values
            self._test_as_sql(return_id)

    def _test_as_sql(self, return_id):
        self.query.get_meta.return_value = AttributeDict(
            db_table='destination_table_name', pk=AttributeDict(column='destination_pk_field'))

        from_query = Mock(spec_set=Query(self.TempModel))
        self.query._from_query.clone.return_value = from_query
        self.query._field_map.values.return_value = ['from_field_1', 'from_field_2']
        self.query._field_map.keys.return_value = ['destination_field_1', 'destination_field_2']

        select = 'SELECT from_field FROM from_table'
        from_query.sql_with_params.return_value = select, []

        sql, params = self.compiler.as_sql()

        expected_sql = 'INSERT INTO "destination_table_name" '\
            + '("destination_field_1", "destination_field_2") '\
            + '({})'.format(select)

        if return_id:
            expected_sql += ' RETURNING "destination_pk_field"'

        self.assertEqual(expected_sql, sql)
        from_query.set_values.assert_called_once_with(['from_field_1', 'from_field_2'])

    def test_execute_sql__cannot_return(self):
        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=False)

        with self.assertRaises(AssertionError):
            self.compiler.execute_sql(return_id=True)

    def test_execute_sql__no_return(self):
        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=True)
        cursor = MagicMock()
        self.connection.cursor.return_value = cursor
        cursor.__enter__.return_value = cursor

        with patch.object(self.compiler, 'as_sql') as mocked_as_sql:
            mocked_as_sql.return_value = 'THE SQL', ['THE PARAMS']
            result = self.compiler.execute_sql(return_id=False)
            cursor.execute.assert_called_once_with('THE SQL', ['THE PARAMS'])
            self.assertIsNone(result)

    def test_execute_sql(self):
        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=True)
        self.connection.ops.fetch_returned_insert_ids.return_value = 'list of ids'

        cursor = MagicMock()
        self.connection.cursor.return_value = cursor
        cursor.__enter__.return_value = cursor

        with patch.object(self.compiler, 'as_sql') as mocked_as_sql:
            mocked_as_sql.return_value = 'THE SQL', ['THE PARAMS']
            result = self.compiler.execute_sql(return_id=True)
            cursor.execute.assert_called_once_with('THE SQL', ['THE PARAMS'])
            self.connection.ops.fetch_returned_insert_ids\
                .assert_called_once_with(cursor)
            self.assertEqual('list of ids', result)


class SQLUpdateFromCompilerTestCase(TemporaryModelTestCase):
    def setUp(self):
        super(SQLUpdateFromCompilerTestCase, self).setUp()
        self.query = Mock(spec_set=UpdateFromQuery(self.TempModel))
        self.connection = Mock(spec_set=DatabaseWrapper({}))
        type(self.connection.ops).quote_name = PropertyMock(return_value=connection.ops.quote_name)
        self.compiler = SQLUpdateFromCompiler(self.query, self.connection, None)

    @classmethod
    def initTempModel(cls):
        # hidden inside this function because otherwise it will be created during test bootstrap
        class TempUpdateModel(models.Model):
            id = models.AutoField(primary_key=True)
            file_id = models.CharField(max_length=32)
            file_size = models.IntegerField()
            name = models.CharField(max_length=32)

        return TempUpdateModel

    def runTest(self):
        for lazy in [False, True]:
            # test `as_sql` method with different `lazy` values
            self._test_as_sql(lazy)

    def _test_as_sql(self, lazy):
        self.compiler._lazy = lazy
        self.query.get_meta.return_value = AttributeDict(db_table='destination_table_name')

        expr_1 = Mock(spec_set=SetExpression('', ''))
        expr_2 = Mock(spec_set=SetExpression('', ''))
        type(self.query)._set_expressions = PropertyMock(return_value=[expr_1, expr_2])

        with patch.object(self.compiler, 'compile') as mock_compile,\
                patch.object(self.compiler, 'get_from_clause') as mock_get_from_clause,\
                patch.object(self.compiler, 'get_select') as mock_get_select:
            mock_get_select.return_value = [
                (None, ('"destination_table_name"."return_field_1"', []), None),
                (None, ('"destination_table_name"."return_field_2"', []), None),
            ]
            mock_compile.side_effect = [
                ('set_field_1 = from_field_1', ['expr_1_params']),
                ('set_field_2 = from_field_2', ['expr_2_params']),
                ('destination_pk_field = from_pk_field', ['where_params']),
            ]
            mock_get_from_clause.return_value = (
                ['"destination_table_name"', '"from_table"'],
                ['from_params']
            )

            type(self.query).where = PropertyMock(return_value='query.where')

            expected_sql = 'UPDATE "destination_table_name" '\
                + 'SET set_field_1 = from_field_1, set_field_2 = from_field_2 '\
                + 'FROM "from_table" '\
                + 'WHERE destination_pk_field = from_pk_field'

            if lazy:
                expected_sql += ' RETURNING "destination_table_name"."return_field_1", '\
                    + '"destination_table_name"."return_field_2"'

            expected_params = [
                'expr_1_params',
                'expr_2_params',
                'from_params',
                'where_params',
            ]

            actual_sql, actual_params = self.compiler.as_sql()
            self.assertEqual(expected_sql.strip(), actual_sql)
            self.assertEqual(expected_params, actual_params)

            args, _ = mock_compile.call_args_list[0]
            self.assertEqual(1, len(args))
            self.assertIs(expr_1, args[0])

            args, _ = mock_compile.call_args_list[1]
            self.assertEqual(1, len(args))
            self.assertIs(expr_2, args[0])

            args, _ = mock_compile.call_args_list[2]
            self.assertEqual(1, len(args))
            self.assertEqual('query.where', args[0])

    def test_execute_sql__cannot_return(self):
        self.compiler._lazy = True
        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=False)

        with self.assertRaises(AssertionError):
            self.compiler.execute_sql(return_id=True)

    def test_execute_sql__no_return(self):
        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=True)
        cursor = MagicMock()
        self.connection.cursor.return_value = cursor
        cursor.__enter__.return_value = cursor
        type(cursor).rowcount = PropertyMock(return_value=3)

        with patch.object(self.compiler, 'as_sql') as mocked_as_sql:
            mocked_as_sql.return_value = 'THE SQL', ['THE PARAMS']
            result = self.compiler.execute_sql(return_id=False)
            cursor.execute.assert_called_once_with('THE SQL', ['THE PARAMS'])
            self.assertEqual(3, result)

    @patch('django.db.models.sql.compiler.SQLCompiler.execute_sql')
    def test_execute_sql(self, mock_super_execute_sql):
        self.compiler._lazy = True
        self.compiler.annotation_col_map = []

        type(self.connection.features).can_return_ids_from_bulk_insert \
            = PropertyMock(return_value=True)

        with patch.object(self.compiler, 'setup_query') as mock_setup_query:
            mock_super_execute_sql.return_value = 'model iterator'
            result = self.compiler.execute_sql('some_arg', some_keyword='arg')
            self.assertEqual('model iterator', result)
            mock_setup_query.assert_called_once()
            mock_super_execute_sql.assert_called_once_with('some_arg', some_keyword='arg')

    def test_integration(self):
        with self.temporary_model():
            preset_video()
            fileformat_mp4()
            file_1 = fileobj_video()
            file_2 = fileobj_video()
            file_3 = fileobj_video()

            temp_1 = self.TempModel(file_id=file_1.pk, file_size=123, name='File 1 update')
            temp_2 = self.TempModel(file_id=file_2.pk, file_size=456, name='File 2 update')
            temp_3 = self.TempModel(file_id=-1, file_size=-1, name='No file update')

            self.assertNotEqual(file_1.file_size, temp_1.file_size)
            self.assertNotEqual(file_2.file_size, temp_2.file_size)

            self.TempModel.objects.bulk_create([temp_1, temp_2, temp_3])

            join = Join(self.TempModel.objects.all(), file_id='id')

            queryset = CustomQuerySet(File)
            result = queryset.update_from(join, file_size='file_size')
            self.assertEqual(2, result)

            actual_file_1 = File.objects.get(pk=file_1.pk)
            actual_file_2 = File.objects.get(pk=file_2.pk)
            actual_file_3 = File.objects.get(pk=file_3.pk)

            self.assertEqual(temp_1.file_size, actual_file_1.file_size)
            self.assertEqual(temp_2.file_size, actual_file_2.file_size)
            self.assertEqual(file_3.file_size, actual_file_3.file_size)

    def test_integration__lazy_models(self):
        with self.temporary_model():
            preset_video()
            fileformat_mp4()
            file_1 = fileobj_video()
            file_2 = fileobj_video()

            temp_1 = self.TempModel(file_id=file_1.pk, file_size=123, name='File 1 update')
            temp_2 = self.TempModel(file_id=file_2.pk, file_size=456, name='File 2 update')

            self.assertNotEqual(file_1.file_size, temp_1.file_size)
            self.assertNotEqual(file_2.file_size, temp_2.file_size)

            self.TempModel.objects.bulk_create([temp_1, temp_2])

            join = Join(self.TempModel.objects.all(), file_id='id')

            queryset = CustomQuerySet(File)
            results = queryset.update_from(join, file_size='file_size', lazy=True)

            for file_obj in results:
                if file_obj.pk == file_1.pk:
                    self.assertEqual(temp_1.file_size, file_obj.file_size)
                elif file_obj.pk == file_2.pk:
                    self.assertEqual(temp_2.file_size, file_obj.file_size)
                else:
                    raise AssertionError('Unexpected file returned')

    def test_integration__values_list(self):
        with self.temporary_model():
            preset_video()
            fileformat_mp4()
            file_1 = fileobj_video()
            file_2 = fileobj_video()

            temp_1 = self.TempModel(file_id=file_1.pk, file_size=123, name='File 1 update')
            temp_2 = self.TempModel(file_id=file_2.pk, file_size=456, name='File 2 update')

            self.assertNotEqual(file_1.file_size, temp_1.file_size)
            self.assertNotEqual(file_2.file_size, temp_2.file_size)

            self.TempModel.objects.bulk_create([temp_1, temp_2])

            join = Join(self.TempModel.objects.all(), file_id='id')

            queryset = CustomQuerySet(File)
            results = queryset.update_from(join, file_size='file_size', lazy=True)\
                .values_list('id', 'file_size')

            for id, file_size in results:
                if id == file_1.pk:
                    self.assertEqual(temp_1.file_size, file_size)
                elif id == file_2.pk:
                    self.assertEqual(temp_2.file_size, file_size)
                else:
                    raise AssertionError('Unexpected file returned')
