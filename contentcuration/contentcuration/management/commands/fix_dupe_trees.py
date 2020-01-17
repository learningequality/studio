from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models import Max

from contentcuration.models import ContentNode


def update_tree_id_recursive(node, new_tree_id):
    """
    Make sure all the nodes in the tree have the correct new tree id,
    to ensure that MPTT doesn't jumble this with another tree during
    operations.

    :param node:
    :param new_tree_id:
    :return:
    """
    node.tree_id = new_tree_id
    node.save()

    for child in node.children:
        update_tree_id_recursive(child, new_tree_id)


def fix_dupe_tree_id(dupe_root):
    new_id = ContentNode.objects.filter(parent=None).aggregate(max_sort=Max('tree_id'))['max_id'] + 1
    # It may not be safe to rely on MPTT methods when updating the tree ID, so to be safe,
    # use the parent/child db relationships instead, which do not rely on MPTT indexes.
    update_tree_id_recursive(dupe_root, new_id)
    # This may take a while...
    ContentNode.objects.partial_rebuild(dupe_root.tree_id)


class Command(BaseCommand):
    def handle(self, *args, **options):
        dupe_roots = ContentNode.objects.filter(parent=None).annotate(count=Count('tree_id')).order_by().filter(count__gt=1)

        for dupe_root in dupe_roots:
            fix_dupe_tree_id(dupe_root)
