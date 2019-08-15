from django.db.models.sql.compiler import SQLCompiler


class SQLInsertFromCompiler(SQLCompiler):
    def __init__(self, *args, **kwargs):
        super(SQLInsertFromCompiler, self).__init__(*args, **kwargs)
        self.return_id = False

    def as_sql(self, *args, **kwargs):
        qn = self.connection.ops.quote_name
        opts = self.query.get_meta()
        from_query = self.query._from_query.clone()
        from_query.set_values(self.query._field_map.values())
        from_sql, from_params = from_query.sql_with_params()

        result = [
            'INSERT INTO {}'.format(qn(opts.db_table)),
            '({})'.format(', '.join(qn(f) for f in self.query._field_map.keys())),
            '({})'.format(from_sql)
        ]

        if self.return_id:
            result.append('RETURNING {}'.format(qn(opts.pk.column)))

        return ' '.join(result), from_params

    def execute_sql(self, return_id=True, *args, **kwargs):
        assert not (
            return_id and
            not self.connection.features.can_return_ids_from_bulk_insert
        )
        self.return_id = return_id

        with self.connection.cursor() as cursor:
            sql, params = self.as_sql()
            cursor.execute(sql, params)

            if not (return_id and cursor):
                return
            return self.connection.ops.fetch_returned_insert_ids(cursor)


class SQLUpdateFromCompiler(SQLCompiler):
    def __init__(self, *args, **kwargs):
        self._lazy = kwargs.pop('lazy', False)
        super(SQLUpdateFromCompiler, self).__init__(*args, **kwargs)

    def as_sql(self, *args, **kwargs):
        qn = self.connection.ops.quote_name
        meta = self.query.get_meta()

        set_sql = []
        all_params = []

        for expression in self.query._set_expressions:
            sql, params = self.compile(expression)
            set_sql.append(sql)
            all_params.extend(params or [])

        target_table = qn(meta.db_table)
        from_list, from_params = self.get_from_clause()
        from_tables = [table for table in from_list if table != target_table]

        result = [
            'UPDATE {}'.format(target_table),
            'SET {}'.format(', '.join(set_sql)),
            'FROM {}'.format(', '.join(from_tables)),
        ]
        all_params.extend(from_params or [])

        if self.query.where:
            where, where_params = self.compile(self.query.where)
            result.append('WHERE {}'.format(where))
            all_params.extend(where_params or [])

        if self._lazy:
            result.append('RETURNING')
            returning = []

            for col, (sql, params), _ in self.select:
                returning.append(sql)
                all_params.extend(params)

            result.append(', '.join(returning))

        return ' '.join(result), all_params

    def execute_sql(self, *args, **kwargs):
        assert not (
            self._lazy and
            not self.connection.features.can_return_ids_from_bulk_insert
        )

        if not self._lazy:
            with self.connection.cursor() as cursor:
                sql, params = self.as_sql()
                cursor.execute(sql, params)
                count = cursor.rowcount
            return count

        self.setup_query()

        if len(self.annotation_col_map):
            raise NotImplementedError('Annotations are not allowed in an UPDATE')

        return super(SQLUpdateFromCompiler, self).execute_sql(*args, **kwargs)
