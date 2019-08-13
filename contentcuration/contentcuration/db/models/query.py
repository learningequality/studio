from django.db import connections
from django.db import transaction
from django.db.models.expressions import Case
from django.db.models.expressions import Expression
from django.db.models.expressions import Value
from django.db.models.expressions import When
from django.db.models.functions import Cast
from django.db.models.query import QuerySet
from django.db.models.query_utils import Q
from mptt.querysets import TreeQuerySet

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

    def bulk_update(self, objs, fields, batch_size=None):  # noqa: C901
        """
        Backported method from a newer Django

        Update the given fields in each of the given objects in the database.
        """
        if batch_size is not None and batch_size < 0:
            raise ValueError('Batch size must be a positive integer.')
        if not fields:
            raise ValueError('Field names must be given to bulk_update().')
        objs = tuple(objs)
        if any(obj.pk is None for obj in objs):
            raise ValueError('All bulk_update() objects must have a primary key set.')
        fields = [self.model._meta.get_field(name) for name in fields]
        if any(not f.concrete or f.many_to_many for f in fields):
            raise ValueError('bulk_update() can only be used with concrete fields.')
        if any(f.primary_key for f in fields):
            raise ValueError('bulk_update() cannot be used with primary key fields.')
        if not objs:
            return
        # PK is used twice in the resulting update query, once in the filter
        # and once in the WHEN. Each field will also have one CAST.
        max_batch_size = connections[self.db].ops.bulk_batch_size(['pk', 'pk'] + fields, objs)
        batch_size = min(batch_size, max_batch_size) if batch_size else max_batch_size
        # requires_casting = connections[self.db].features.requires_casted_case_in_updates
        requires_casting = True
        batches = (objs[i:i + batch_size] for i in range(0, len(objs), batch_size))
        updates = []
        for batch_objs in batches:
            update_kwargs = {}
            for field in fields:
                when_statements = []
                for obj in batch_objs:
                    attr = getattr(obj, field.attname)
                    if not isinstance(attr, Expression):
                        attr = Value(attr, output_field=field)
                    when_statements.append(When(pk=obj.pk, then=attr))
                case_statement = Case(*when_statements, output_field=field)
                if requires_casting:
                    case_statement = Cast(case_statement, output_field=field)
                update_kwargs[field.attname] = case_statement
            updates.append(([obj.pk for obj in batch_objs], update_kwargs))
        with transaction.atomic(using=self.db, savepoint=False):
            for pks, update_kwargs in updates:
                self.filter(pk__in=pks).update(**update_kwargs)
    bulk_update.alters_data = True


class CustomTreeQuerySet(TreeQuerySet, CustomQuerySet):
    pass
