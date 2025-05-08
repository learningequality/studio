from django.db.models import BooleanField
from django.db.models import F
from django.db.models import Q
from django.db.models import Value
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import Func
from django.db.models.sql.where import WhereNode


class WhenQ(Q):
    """
    Class that allows for defining conditions with expressions and using them in WHEN expressions
    that accept a Q object

    Example:
        queryset.annotate(some_thing=Case(When(condition=QExpression(BoolExpr(...)), then=...)))
    """

    def resolve_expression(self, *args, **kwargs):
        return WhereNode(
            [child.resolve_expression(*args, **kwargs) for child in self.children]
        )


class BooleanComparison(CombinedExpression):
    """
    An expression that results in a Boolean value, useful for when the column comparing against must
    me defined as an expression

    Example:
        BooleanExpression(F('x'), '<=', Value(123))
    """

    output_field = BooleanField()


class IsNull(BooleanComparison):
    """
    An expression that results in a Boolean value, useful for annotating
    if a column IS or IS NOT NULL

    Example:
        IsNull('my_field_name') -> my_field_name IS NULL
        IsNull('my_field_name', negate=True) -> my_field_name IS NOT NULL
    """

    def __init__(self, field_name, negate=False):
        operator = "IS NOT" if negate else "IS"
        super(IsNull, self).__init__(F(field_name), operator, Value(None))


class Array(Func):
    """
    Create an array datatype within Postgres.
    Note, this is defined as a function for simplicity. Attempting to annotate with this may not work as expected.

    Example:
        Array(
            F("some_table__field"),
            F("other_table__field")
        )
    """

    function = "ARRAY"
    template = "%(function)s[%(expressions)s]"
    arg_joiner = ", "
    arity = None
