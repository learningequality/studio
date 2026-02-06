#!/usr/bin/env python
"""
Set the Google Cloud Storage metadata for each content file that already exists.

Sets the following attributes:
- Content-Type: sets it to a mimetype depending on its file extension.
- Cache-Control: We set this according to the following rules:
    - if the file ends in .sqlite3, then we tell GCS to cache this for 60 seconds, as this might be updated frequently by the user.
    - if it ends in any other file extension, then we cache the file for a month.
"""
import concurrent.futures
import os

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from contentcuration.utils.storage.common import determine_content_type


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        blobs = self._list_all_files()

        futures = []
        with concurrent.futures.ThreadPoolExecutor() as e:
            print("Scheduling all metadata update jobs...")  # noqa: T201
            for blob in blobs:
                future = e.submit(self._update_metadata, blob)
                futures.append(future)

            print("Waiting for all jobs to finish...")  # noqa: T201

    def _determine_cache_control(self, name):
        _, ext = os.path.splitext(name)

        if "sqlite3" in ext:
            cache_control = "public, max-age=60"
        else:
            age = 3600 * 24 * 31  # one month
            cache_control = "public, max-age={}".format(age)

        return cache_control

    def _list_all_files(self):
        return default_storage.bucket.list_blobs()

    def _update_metadata(self, blob):
        name = str(blob.name)

        content_type = determine_content_type(name)
        cache_control = self._determine_cache_control(name)
        blob_update = {
            "Content-Type": content_type,
            "Cache-Control": cache_control,
        }
        blob.metadata = blob_update
        blob.patch()
