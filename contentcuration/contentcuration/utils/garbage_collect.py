#!/usr/bin/env python
"""
Studio garbage collection utilities. Clean up all these old, unused records!
"""
from django.conf import settings
from django.core.files.storage import default_storage as storage

from contentcuration.models import ContentNode, File


def clean_up_contentnodes(delete_older_than=settings.ORPHAN_DATE_CLEAN_UP_THRESHOLD):
    """
    Clean up all contentnodes associated with the orphan tree with a `created`
    time older than `delete_older_than`, as well as all files (and their file
    objects on storage) linked to those contentnodes.

    delete_older_than=The age of the contentnode from the current time, before
    it's deleted. Default is two weeks from datetime.now().

    """
    garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
    nodes_to_clean_up = garbage_node.get_descendants().filter(
        modified__lt=delete_older_than,
    )
    tree_id = garbage_node.tree_id

    # delete all files first
    clean_up_files(nodes_to_clean_up)

    # Use _raw_delete for fast bulk deletions
    nodes_to_clean_up._raw_delete(nodes_to_clean_up.db)
    # tell MPTT to rebuild our tree values, so descendant counts
    # will be right again.
    ContentNode._tree_manager.partial_rebuild(tree_id)


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
        file_path = f[0]
        # call the storage's delete method on each file, one by one
        storage.delete(file_path)

    # finally, remove the entries from object storage
    # use _raw_delete for much fast file deletions
    files._raw_delete(files.db)
