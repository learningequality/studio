from django.db import connections
from django.db.models.sql import Query

from contentcuration.db.models.sql.compiler import SQLInsertFromCompiler
from contentcuration.db.models.sql.compiler import SQLUpdateFromCompiler


class InsertFromQuery(Query):
    """
    You will likely never use this class directly. Look to
    `contentcuration.db.models.query.CustomQuerySet.insert_from()` for this functionality.

    A Django Query class representing a SQL query that will take the form of:

    INSERT INTO my_table1 (my_table1_field1, my_table1_field2)
        SELECT my_table2_field1, my_table2_field2 [, ...]
        FROM my_table2
        WHERE [...]
    ;

    Attributes:
        _from_query     The query for another table that serves as the SELECT query above
        _field_map      A dict mapping of insert table field names to field names in SELECT or
                        other Django SQL expressions
    """
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
        """
        As is the case with many more complex Django Query classes, this class requires a specific
        compiler to generate the appropriate SQL
        """
        if using is None and connection is None:
            raise ValueError("Need either using or connection")
        if using:
            connection = connections[using]
        return SQLInsertFromCompiler(self, connection, using)

    def insert_from(self, from_query, **kwargs):
        """
        :param from_query: The query used for the SELECT
        :type from_query: Query
        :param kwargs: Mapping of columns describing insert_field=from_field
        """
        self._from_query = from_query
        self._field_map = kwargs


class UpdateFromQuery(Query):
    """
    You will likely never use this class directly. Look to
    `contentcuration.db.models.query.CustomQuerySet.update_from()` for this functionality.

    A Django Query class representing a SQL query that will take the form of:

    UPDATE my_table1 SET
        my_table1_field1 = my_table2.my_table2_field1,
        my_table1_field2 = my_table2.my_table2_field2 [, ...]
    FROM my_table2
    WHERE my_table1.my_table1_field3 = my_table2.my_table2_field3 [...]
    ;

    Attributes:
        _from_join          The query for another table in form of `Join` expression
        _set_expressions    A list of `SetExpression`s that define how to set fields from the
                            FROM table to the UPDATE table
        _lazy               The update will be executed lazily, meaning the QuerySet will return
                            a ModelIterator of the objects updated
    """
    def __init__(self, *args, **kwargs):
        super(UpdateFromQuery, self).__init__(*args, **kwargs)
        self._from_join = None
        self._set_expressions = []
        self._lazy = False

    def set_lazy(self, lazy):
        self._lazy = lazy

    def clone(self, klass=None, memo=None, **kwargs):
        clone = super(UpdateFromQuery, self).clone(klass=klass, memo=memo, **kwargs)
        clone._from_join = self._from_join.copy()
        clone._set_expressions = [expression.copy() for expression in self._set_expressions]
        clone._lazy = self._lazy
        return clone

    def get_compiler(self, using=None, connection=None):
        """
        As is the case with many more complex Django Query classes, this class requires a specific
        compiler to generate the appropriate SQL
        """
        if using is None and connection is None:
            raise ValueError("Need either using or connection")
        if using:
            connection = connections[using]
        return SQLUpdateFromCompiler(self, connection, using, lazy=getattr(self, '_lazy', False))

    def update_from(self, join, *set_expressions, **kwargs):
        """
        :param join: A join expression representing the query we're updating FROM
        :type join: Join
        :param set_expressions: A list of `SetExpression` describing a custom mapping of columns
        :type set_expressions: SetExpression[]
        :param kwargs: A simple dict mapping of columns turned into `SetExpression`s internally
        """
        self._from_join = join
        set_expressions = list(set_expressions) or []
        set_expressions.extend([
            self._from_join.get_set_expression(left_field, right_field)
            for left_field, right_field in kwargs.items()
        ])
        self._set_expressions = set_expressions
