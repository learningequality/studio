from django.db import connections
from django.db.models.sql import Query

from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.compiler import SQLUpdateFromCompiler


class InsertFromQuery(Query):
    def __init__(self, *args, **kwargs):
        super(InsertFromQuery, self).__init__(*args, **kwargs)
        self._from_query = None
        self._field_map = {}

    def clone(self, klass=None, memo=None, **kwargs):
        clone = super(InsertFromQuery, self).clone(klass=klass, memo=memo, **kwargs)
        clone._from_query = self._from_query.clone()
        clone._field_map = self._field_map.copy()
        return clone

    def get_compiler(self, using=None, connection=None):
        if using is None and connection is None:
            raise ValueError("Need either using or connection")
        if using:
            connection = connections[using]
        return SQLInsertFromCompiler(self, connection, using)

    def insert_from(self, from_query, **kwargs):
        self._from_query = from_query
        self._field_map = kwargs


class UpdateFromQuery(Query):
    def __init__(self, *args, **kwargs):
        super(UpdateFromQuery, self).__init__(*args, **kwargs)
        self._from_join = None
        self._return_fields = []
        self._set_expressions = []

    def set_return_fields(self, return_fields):
        self._return_fields = return_fields
        return self

    def clone(self, klass=None, memo=None, **kwargs):
        clone = super(UpdateFromQuery, self).clone(klass=klass, memo=memo, **kwargs)
        clone._from_join = self._from_join.copy()
        clone._set_expressions = [expression.copy() for expression in self._set_expressions]
        clone._return_fields = self._return_fields
        return clone

    def get_compiler(self, using=None, connection=None):
        if using is None and connection is None:
            raise ValueError("Need either using or connection")
        if using:
            connection = connections[using]
        return SQLUpdateFromCompiler(self, connection, using, return_fields=self._return_fields)

    def update_from(self, join, *set_expressions, **kwargs):
        self._from_join = join
        set_expressions = list(set_expressions) or []
        set_expressions.extend([
            self._from_join.get_set_expression(left_field, right_field)
            for left_field, right_field in kwargs.items()
        ])
        self._set_expressions = set_expressions
