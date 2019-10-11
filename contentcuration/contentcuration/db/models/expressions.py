import re

from django.core.exceptions import FieldDoesNotExist
from django.db.models import QuerySet
from django.db.models.expressions import BaseExpression
from django.db.models.expressions import Col
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import Exists as BaseExists
from django.db.models.expressions import Expression
from django.db.models.expressions import Q
from django.db.models.sql.datastructures import BaseTable
from django.db.models.sql.datastructures import INNER
from django.db.models.sql.datastructures import Join as DjangoJoin
from django.db.models.sql.where import AND
from django.db.models.sql.where import WhereNode


def get_output_field(model, field_name):
    """
    :param model: The model class
    :param field_name: The string name of the field
    :return: A field instance for use as `output_field` in Expressions
    """
    try:
        # try to get the output_field type so refs can be used for other queryset operations
        output_field = model._meta.get_field(field_name)
    except FieldDoesNotExist:
        if re.match('_id$', field_name):
            return get_output_field(model, field_name.replace('_id', ''))
        output_field = None

    return output_field


class Exists(BaseExists):
    def __init__(self, *args, **kwargs):
        """
        Override Django's `Exists` to modify the query so it's cleaner (and smaller) by changing
        the SELECT columns through `.only()`
        """
        processed_args = []
        for arg in args:
            if isinstance(arg, QuerySet):
                processed_args.append(arg.only(arg.model._meta.pk.name))
            else:
                processed_args.append(arg)
        super(Exists, self).__init__(*processed_args, **kwargs)


class Not(BaseExpression):
    """
    An expression to negate another expression, useful for negating expressions that do not
    support negation inherently
    """
    def __init__(self, expression, output_field=None):
        super(Not, self).__init__(output_field=output_field)
        self._expression = expression

    def resolve_expression(self, *args, **kwargs):
        clone = self.copy()
        clone._expression = self._expression.resolve_expression(*args, **kwargs)
        return clone

    def as_sql(self, compiler, connection):
        sql, params = compiler.compile(self._expression)
        return "NOT ({})".format(sql), params


class SetExpression(CombinedExpression):
    """
    An expression that represents the SQL for setting field values in an UPDATE clause
    """
    def __init__(self, lhs_field_name, rhs):
        lhs = SetRef(lhs_field_name)
        super(SetExpression, self).__init__(lhs, '=', rhs)

    def as_sql(self, compiler, connection):
        sql, params = super(SetExpression, self).as_sql(compiler, connection)
        return sql.strip('()'), params


class SetRef(Expression):
    """
    A helper expression for use in `SetExpression`
    """
    def __init__(self, field_name):
        super(SetRef, self).__init__()
        self.field_name = field_name

    def __repr__(self):
        return "{}({})".format(self.__class__.__name__, self.field_name)

    def relabeled_clone(self, relabels):
        return self

    def as_sql(self, compiler, connection):
        return '{}'.format(connection.ops.quote_name(self.field_name)), []

    def get_group_by_cols(self):
        return [self]


class Join(BaseExpression):
    """
    An expression that allows for a manual SQL JOIN on any queryset, regardless of defined relations
    within Django
    """
    def __init__(self, queryset, *args, **kwargs):
        super(Join, self).__init__(output_field=kwargs.pop('output_field', None))
        self.queryset = queryset
        self.field_map = kwargs
        self.extras = args or []
        self.table_alias = None
        self.refs = []

    def resolve_expression(self, query=None, *args, **kwargs):
        if not query:
            return self

        from contentcuration.db.models.sql.query import UpdateFromQuery
        is_update = isinstance(query, UpdateFromQuery)

        if not is_update and len(self.queryset.query.where):
            raise NotImplementedError('Joining on a subquery is not implemented')

        table_name = self.queryset.model._meta.db_table
        parent_alias = query.get_initial_alias()

        if is_update:
            expression = BaseTable(table_name, self.table_alias)
        else:
            # join conditions are handled a little differently
            join_field = CompoundJoinExpression([
                JoinExpression(lhs, rhs)
                for lhs, rhs in self.field_map.items()
            ], WhereNode(children=self.extras) if self.extras else None)

            if self.queryset.query.order_by:
                query.add_extra(None, None, None, None, None,
                                [self.get_ref(field) for field in self.queryset.query.order_by])

            expression = DjangoJoin(table_name, parent_alias, self.table_alias, INNER, join_field,
                                    False)

        self.table_alias = query.join(expression, [table_name])

        if is_update:
            for extra in self.extras:
                query.where.add(extra, AND)

            for left_field, right_field in self.field_map.items():
                lhs = Col(parent_alias, JoinField(left_field))
                rhs = Col(self.table_alias, JoinField(right_field))
                query.where.add(CombinedExpression(lhs, '=', rhs), AND)

        for ref in self.refs:
            ref.table_alias = self.table_alias

        return query

    def get_ref(self, field_name, output_field=None):
        output_field = output_field or get_output_field(self.queryset.model, field_name)
        ref = JoinRef(field_name, output_field=output_field)
        ref.table_alias = self.table_alias
        self.refs.append(ref)
        return ref

    def get_set_expression(self, field_name, ref_field):
        if not isinstance(ref_field, BaseExpression):
            ref_field = self.get_ref(ref_field)

        return SetExpression(field_name, ref_field)


class JoinField(BaseExpression):
    """
    A helper expression that is used for referencing a particular field from a JOIN'd table
    """
    contains_aggregate = False

    def __init__(self, field_name, primary_key=None, *args, **kwargs):
        super(JoinField, self).__init__(*args, **kwargs)
        self.column = field_name
        self.primary_key = primary_key


class JoinRef(BaseExpression):
    """
    An expression that represents the entire reference to a JOIN'd table's field
    """
    def __init__(self, field_name, *args, **kwargs):
        super(JoinRef, self).__init__(*args, **kwargs)
        self.field_name = field_name
        self.table_alias = None

    def resolve_expression(self, query=None, *args, **kwargs):
        if not self.table_alias:
            raise RuntimeError('JoinRef missing table alias')

        return Col(self.table_alias, JoinField(self.field_name), output_field=self.output_field)

    def as_sql(self, compiler, connection):
        return compiler.compile(self.resolve_expression())


class JoinExpression(object):
    """
    A conditional expression that defines how to JOIN
    """
    def __init__(self, lhs, rhs):
        self.lhs = lhs
        self.rhs = rhs

    def get_joining_columns(self):
        return self.lhs, self.rhs

    def get_extra_restriction(self, *args, **kwargs):
        return None


class CompoundJoinExpression(object):
    """
    An expression that represents all the conditions for joining two tables
    """
    def __init__(self, expressions, extra=None):
        self.expressions = expressions
        self.extra = extra

    def get_joining_columns(self):
        return [expression.get_joining_columns() for expression in self.expressions]

    def get_extra_restriction(self, *args, **kwargs):
        return self.extra


class WhenQ(Q):
    def resolve_expression(self, *args, **kwargs):
        return WhereNode([child.resolve_expression(*args, **kwargs) for child in self.children])
