from django_cte import CTEQuerySet
from mptt.querysets import TreeQuerySet


class CustomTreeQuerySet(TreeQuerySet, CTEQuerySet):
    pass
