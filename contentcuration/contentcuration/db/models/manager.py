from django.db.models import Manager
from mptt.managers import TreeManager

from contentcuration.db.models.query import CustomQuerySet
from contentcuration.db.models.query import CustomTreeQuerySet


class CustomManager(Manager.from_queryset(CustomQuerySet)):
    pass


class CustomTreeManager(TreeManager.from_queryset(CustomTreeQuerySet)):
    pass
