from django.db import connections
from django.db.models.expressions import Col
from django.db.models.sql.compiler import SQLCompiler
from django.db.models.sql.constants import INNER
from django.db.models.sql.query import Query
from django_cte import CTEQuerySet
from django_cte import With as CTEWith
from mptt.querysets import TreeQuerySet


RIGHT_JOIN = "RIGHT JOIN"


class CustomTreeQuerySet(TreeQuerySet, CTEQuerySet):
    pass


class With(CTEWith):
    """
    Custom CTE class which allows more join types than just INNER and LOUTER (LEFT)
    """

    def join(self, model_or_queryset, *filter_q, **filter_kw):
        """
        Slight hack to allow more join types
        """
        join_type = filter_kw.get("_join_type", INNER)
        queryset = super(With, self).join(model_or_queryset, *filter_q, **filter_kw)

        # the underlying Django code forces the join type into INNER or a LEFT OUTER join
        alias, _ = queryset.query.table_alias(self.name)
        join = queryset.query.alias_map[alias]
        if join.join_type != join_type:
            join.join_type = join_type
        return queryset


class WithValues(With):
    """
    Allows the creation of a CTE that holds a VALUES list

    @see https://www.postgresql.org/docs/9.6/queries-values.html
    """

    def __init__(self, fields, values_list, name="cte"):
        super(WithValues, self).__init__(None, name=name)
        self.query = WithValuesQuery(self)
        self.fields = fields
        self.values_list = values_list

    def _resolve_ref(self, name):
        """
        Gets called when a column reference is accessed via the CTE instance `.col.name`
        """
        if name not in self.fields:
            raise RuntimeError("No field with name `{}`".format(name))

        field = self.fields.get(name)
        field.set_attributes_from_name(name)
        return Col(self.name, field, output_field=field)


class WithValuesSQLCompiler(SQLCompiler):
    TEMPLATE = (
        "SELECT * FROM (VALUES {values_statement}) AS {cte_name}({fields_statement})"
    )

    def as_sql(self, with_limits=True, with_col_aliases=False):
        """
        Ideally this would return something like:
            WITH t_cte(fieldA, fieldB) AS (VALUES (), ...)
        But django_cte doesn't give us a way to do that, so we do this instead:
            WITH t_cte AS (SELECT * FROM (VALUES (), ...) AS _t_cte(fieldA, fieldB)))

        :return: A tuple of SQL and parameters
        """
        value_parameters = ", ".join(["%s"] * len(self.cte.fields))
        values_statement = ", ".join(
            ["({})".format(value_parameters)] * len(self.cte.values_list)
        )
        fields_statement = ", ".join(
            [self.connection.ops.quote_name(field) for field in list(self.cte.fields)]
        )
        sql = self.TEMPLATE.format(
            values_statement=values_statement,
            cte_name="_{}".format(self.cte.name),
            fields_statement=fields_statement,
        )
        return sql, list(sum(self.cte.values_list, ()))

    @property
    def cte(self):
        """
        :rtype: WithValues
        """
        return self.query.cte


class WithValuesQuery(Query):
    """
    Dedicated query class for creating a CTE

    Note: this does inherit from Query, which we're not passing a Model instance so not all Query
    functionality is intended to work
    """

    def __init__(self, cte):
        super(WithValuesQuery, self).__init__(None)
        self.cte = cte

    def get_compiler(self, using=None, connection=None):
        """
        This code is modeled after Query.get_compiler()
        """
        if using is None and connection is None:
            raise ValueError("Need either using or connection")
        if using:
            connection = connections[using]
        return WithValuesSQLCompiler(self, connection, using)
