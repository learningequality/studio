from django.db.models import Manager
from django_cte import CTEQuerySet
from mptt.managers import TreeManager

from contentcuration.db.models.query import CustomTreeQuerySet


class CustomManager(Manager.from_queryset(CTEQuerySet)):
    """
    The CTEManager improperly overrides `get_queryset`
    """
    pass


class CustomTreeManager(TreeManager.from_queryset(CustomTreeQuerySet)):
    pass
