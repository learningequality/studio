#!/usr/bin/env python
"""
Studio garbage collection utilities. Clean up all these old, unused records!
"""
import datetime

from celery import states
from django.conf import settings
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import F
from django.db.models.expressions import Value
from le_utils.constants import content_kinds

from contentcuration.constants import feature_flags
from contentcuration.db.models.functions import JSONObjectKeys
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import Task
from contentcuration.models import User


def get_deleted_chefs_root():
    deleted_chefs_node, _new = ContentNode.objects.get_or_create(pk=settings.DELETED_CHEFS_ROOT_ID, kind_id=content_kinds.TOPIC)
    return deleted_chefs_node


def clean_up_deleted_chefs():
    """
    Clean up all deleted chefs attached to the deleted chefs tree, including all
    child nodes in that tree.

    """
    deleted_chefs_node = get_deleted_chefs_root()
    # we cannot use MPTT methods like get_descendants() or use tree_id because for performance reasons
    # we are avoiding MPTT entirely.
    nodes_to_clean_up = ContentNode.objects.filter(parent=deleted_chefs_node)

    # don't delete files until we can ensure files are not referenced anywhere.
    # disable mptt updates as they are disabled when we insert nodes into this tree
    with ContentNode.objects.disable_mptt_updates():
        for node in nodes_to_clean_up:
            node.delete()

    if ContentNode.objects.filter(parent=deleted_chefs_node).exists():
        raise AssertionError


def clean_up_contentnodes(delete_older_than=settings.ORPHAN_DATE_CLEAN_UP_THRESHOLD):
    """
    Clean up all contentnodes associated with the orphan tree with a `created`
    time older than `delete_older_than`, as well as all files (and their file
    objects on storage) linked to those contentnodes.

    delete_older_than=The age of the contentnode from the current time, before
    it's deleted. Default is two weeks from datetime.now().

    """
    nodes_to_clean_up = ContentNode.objects.filter(
        modified__lt=delete_older_than, parent_id=settings.ORPHANAGE_ROOT_ID
    )

    # delete all files first
    clean_up_files(nodes_to_clean_up)

    # Use _raw_delete for fast bulk deletions
    nodes_to_clean_up.delete()


def clean_up_files(contentnode_ids):
    """
    Clean up the files (both in the DB and in object storage)
    associated with the contentnode_ids given in the `contentnode_ids`
    iterable.
    """

    # get all file objects associated with these contentnodes
    files = File.objects.filter(contentnode__in=contentnode_ids)
    # get all their associated real files in object storage
    files_on_storage = files.values_list("file_on_disk")
    for f in files_on_storage:
        # values_list returns each set of items in a tuple, even
        # if there's only one item in there. Extract the file_on_disk
        # string value from inside that singleton tuple
        f[0]
        # NOTE (aron):call the storage's delete method on each file, one by one
        # disabled for now until we implement logic to not delete files
        # that are referenced by non-orphan nodes
        # storage.delete(file_path)

    # finally, remove the entries from object storage
    # use _raw_delete for much fast file deletions
    files._raw_delete(files.db)


def clean_up_feature_flags():
    """
    Removes lingering feature flag settings in User records that aren't currently present in the
    feature_flag.json
    """
    current_flag_keys = feature_flags.SCHEMA.get("properties", {}).keys()
    existing_flag_keys = (
        User.objects
        .annotate(key=JSONObjectKeys("feature_flags"))
        .values_list("key", flat=True)
        .distinct()
    )

    for remove_flag in (set(existing_flag_keys) - set(current_flag_keys)):
        User.objects.filter(feature_flags__has_key=remove_flag) \
            .update(feature_flags=CombinedExpression(F("feature_flags"), "-", Value(remove_flag)))


def clean_up_tasks():
    """
    Removes completed tasks that are older than a week
    """
    Task.objects.filter(created__lt=datetime.datetime.now() - datetime.timedelta(days=7), status=states.SUCCESS).delete()
