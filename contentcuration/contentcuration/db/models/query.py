from django.db.models.query import QuerySet
from django.db.models.query_utils import Q

from contentcuration.db.models.expressions import Not
from contentcuration.db.models.sql.query import InsertFromQuery
from contentcuration.db.models.sql.query import UpdateFromQuery


class CustomQuerySet(QuerySet):
    def filter_by(self, *expressions):
        """
        Filters by explicit expression(s), not like Q objs. List is ANDed

        :param expressions: Any number of expressions
        :type expressions: list of django.db.models.expressions.Expression
        :return: A CustomQuerySet clone
        :rtype: CustomQuerySet
        """
        clone = self._clone()
        for expression in expressions:
            if hasattr(expression, 'resolve_expression'):
                clone.query.where.add(expression.resolve_expression(clone.query), Q.AND)
            else:
                clone.query.where.add(expression, Q.AND)
        return clone

    def exclude_by(self, *expressions):
        """
        Excludes by explicit expression(s), not like Q objs. List is ANDed

        :param expressions: Any number of expressions
        :type expressions: list of django.db.models.expressions.Expression
        :return: A CustomQuerySet clone
        :rtype: CustomQuerySet
        """
        negated = []
        for expr in expressions:
            # if expr has a `negated` attr defined, assume that the expr can handle negation
            if hasattr(expr, 'negated'):
                expr.negated = True
                negated.append(expr)
            else:
                negated.append(Not(expr))

        return self.filter_by(*negated)

    def joining(self, join):
        """
        Manually join against another queryset or expression, avoiding Django related handling

        :param join: A Join object
        :type join: contentcuration.db.models.expressions.Join
        :return: A CustomQuerySet clone
        :rtype: CustomQuerySet
        """
        clone = self._clone()
        join.resolve_expression(clone.query)
        return clone

    def create_from(self, queryset, return_id=True, using=None, **kwargs):
        """
        Creates new models by creating them from the passed in queryset

        :param queryset: The queryset representing the query to insert from
        :type queryset: QuerySet
        :param return_id: Whether or not to return the ID's of the created objs
        :param using: Database alias
        :param kwargs: Mapping of columns, insert table column A from select table column B (A: B)
        :return: None or list of ID's
        """
        self._for_write = True
        if using is None:
            using = self.db

        clone = self._clone()
        clone.query = clone.query.clone(InsertFromQuery)
        clone.query.insert_from(queryset.query, **kwargs)

        return clone.query.get_compiler(using=using).execute_sql(return_id)
    create_from.alters_data = True

    def update_from(self, join, return_fields=None, using=None, *args, **kwargs):
        """
        Updates models using a join from another table, accepting a mapping of columns to set

        :param join: A Join object
        :type join: contentcuration.db.models.expressions.Join
        :param return_fields: A list of string field names to return from the update
        :param using: Database alias
        :param args: A list of Set expressions
        :param kwargs: Mapping of columns, update table column A from join column B
        :return: None or list of tuple
        """
        self._for_write = True
        if using is None:
            using = self.db

        clone = self._clone()
        clone.query = clone.query.clone(UpdateFromQuery)
        clone.query.update_from(join, *args, **kwargs)
        join.resolve_expression(clone.query)

        if return_fields:
            clone.query.set_return_fields(return_fields)
            self.only(*return_fields)
            return iter(self)

        return clone.query.get_compiler(using=using).execute_sql()
    update_from.alters_data = True
