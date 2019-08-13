from contentcuration.db.models.manager import CustomManager
from contentcuration.db.models.manager import CustomTreeManager
from contentcuration.db.models.query import CustomQuerySet


def test_custom_manager():
    manager = CustomManager()
    assert hasattr(manager, 'joining'), 'Manager missing CustomQuerySet methods'
    assert isinstance(manager.get_queryset(), CustomQuerySet), \
        'Queryset is not instance of CustomQuerySet'


def test_custom_tree_manager():
    manager = CustomTreeManager()
    assert hasattr(manager, 'joining'), 'Manager missing CustomQuerySet methods'
    assert hasattr(manager, 'get_cached_trees'), 'Manager missing TreeQuerySet methods'
