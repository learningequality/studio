"""
This module contains utility functions used by API endpoints.
"""
from future import standard_library
standard_library.install_aliases()
import hashlib
import logging
import os
from io import BytesIO

from django.core.exceptions import SuspiciousOperation
from django.core.files.storage import default_storage

import contentcuration.models as models
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.constants import CHANNEL


def write_file_to_storage(fobj, check_valid=False, name=None):
    fobj.seek(0)  # Make sure reading file from beginning
    # Check that hash is valid
    checksum = hashlib.md5()
    for chunk in iter(lambda: fobj.read(4096), b""):
        checksum.update(chunk)
    name = name or fobj._name or ""
    filename, ext = os.path.splitext(name)
    hashed_filename = checksum.hexdigest()
    full_filename = "{}{}".format(hashed_filename, ext.lower())
    fobj.seek(0)

    if check_valid and hashed_filename != filename:
        raise SuspiciousOperation("Failed to upload file {0}: hash is invalid".format(name))

    # Get location of file
    file_path = models.generate_object_storage_name(hashed_filename, full_filename)

    # Write file
    storage = default_storage
    if storage.exists(file_path):
        logging.info("{} exists in Google Cloud Storage, so it's not saved again.".format(file_path))
    else:
        storage.save(file_path, fobj)
    return full_filename


def write_raw_content_to_storage(contents, ext=None):
    # Check that hash is valid
    checksum = hashlib.md5()
    checksum.update(contents)
    hashed_filename = checksum.hexdigest()
    full_filename = "{}.{}".format(hashed_filename, ext.lower())

    # Get location of file
    file_path = models.generate_object_storage_name(hashed_filename, full_filename)

    # Write file
    storage = default_storage
    if storage.exists(file_path):
        logging.info("{} exists in Google Cloud Storage, so it's not saved again.".format(file_path))
    else:
        storage.save(file_path, BytesIO(contents))

    return hashed_filename, full_filename, file_path


def get_hash(fobj):
    md5 = hashlib.md5()
    for chunk in fobj.chunks():
        md5.update(chunk)
    fobj.seek(0)
    return md5.hexdigest()


def activate_channel(channel, user):
    user.check_channel_space(channel)

    if channel.previous_tree and channel.previous_tree != channel.main_tree:
        # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
        with models.ContentNode.objects.disable_mptt_updates():
            garbage_node = get_deleted_chefs_root()
            channel.previous_tree.parent = garbage_node
            channel.previous_tree.title = "Previous tree for channel {}".format(channel.pk)
            channel.previous_tree.save()

    channel.previous_tree = channel.main_tree
    channel.main_tree = channel.staging_tree
    channel.staging_tree = None
    channel.save()

    user.staged_files.all().delete()

    change = generate_update_event(
        channel.id,
        CHANNEL,
        {
            "root_id": channel.main_tree.id,
            "staging_root_id": None
        },
    )
    return change
