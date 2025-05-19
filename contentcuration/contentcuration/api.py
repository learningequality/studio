"""
This module contains utility functions used by API endpoints.
"""
import hashlib
import logging
import os
from io import BytesIO

from django.core.exceptions import SuspiciousOperation
from django.core.files.storage import default_storage

import contentcuration.models as models


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
        raise SuspiciousOperation(
            "Failed to upload file {0}: hash is invalid".format(name)
        )

    # Get location of file
    file_path = models.generate_object_storage_name(hashed_filename, full_filename)

    # Write file
    storage = default_storage
    if storage.exists(file_path):
        logging.info(
            "{} exists in Google Cloud Storage, so it's not saved again.".format(
                file_path
            )
        )
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
        logging.info(
            "{} exists in Google Cloud Storage, so it's not saved again.".format(
                file_path
            )
        )
    else:
        storage.save(file_path, BytesIO(contents))

    return hashed_filename, full_filename, file_path


def get_hash(fobj):
    md5 = hashlib.md5()
    for chunk in fobj.chunks():
        md5.update(chunk)
    fobj.seek(0)
    return md5.hexdigest()
