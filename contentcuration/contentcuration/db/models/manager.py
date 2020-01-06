from django.db.models import Manager
from django_cte import CTEQuerySet

from contentcuration.db.models.query import CustomTreeQuerySet


class CustomManager(Manager.from_queryset(CTEQuerySet)):
    """
    The CTEManager improperly overrides `get_queryset`
    """
    pass


class CustomTreeManager(CustomManager.from_queryset(CustomTreeQuerySet)):
    pass
