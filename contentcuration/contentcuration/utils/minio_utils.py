from future import standard_library
standard_library.install_aliases()
import atexit
import logging
import multiprocessing
import subprocess
import time
from urllib.parse import urlparse

import minio
from django.conf import settings
from minio import policy
from minio.error import BucketAlreadyOwnedByYou
from minio.error import ResponseError

from contentcuration.utils.storage_common import is_gcs_backend

logger = logging.getLogger(__name__)


def start_minio():
    """
    Start a minio subprocess, controlled by another thread.

    Returns the daemonized thread controlling the minio subprocess.
    """
    minio_process = multiprocessing.Process(target=_start_minio)
    minio_process.start()
    atexit.register(lambda: stop_minio(minio_process))
    return minio_process


def _start_minio():
    logger.info("Starting minio")

    subprocess.Popen(
        ["run_minio.py"],
        stdin=subprocess.PIPE,
    )


def stop_minio(p):
    p.terminate()


def ensure_storage_bucket_public(bucket=None, will_sleep=True):
    # GCS' S3 compatibility is broken, especially in bucket operations;
    # skip bucket creation there and just bug Aron to create buckets with
    # public-read access for you
    if is_gcs_backend():
        logging.info("Skipping storage creation on googleapis")
        return

    # If true, sleep for 5 seconds to wait for minio to start
    if will_sleep:
        time.sleep(5)

    if not bucket:
        bucketname = settings.AWS_S3_BUCKET_NAME
    else:
        bucketname = bucket

    host = urlparse(settings.AWS_S3_ENDPOINT_URL).netloc
    c = minio.Minio(
        host,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False
    )

    if not c.bucket_exists(bucketname):
        try:
            c.make_bucket(bucketname)
        except BucketAlreadyOwnedByYou:
            pass

    try:
        c.set_bucket_policy(bucketname, "", policy.Policy.READ_ONLY)
        logger.debug("Successfully set the bucket policy to read only!")
    except ResponseError as e:
        logger.warning("Error setting bucket {} to readonly: {}".format(bucket, e))


def ensure_bucket_deleted(bucket=None):

    if not bucket:
        bucketname = settings.AWS_S3_BUCKET_NAME
    else:
        bucketname = bucket

    host = urlparse(settings.AWS_S3_ENDPOINT_URL).netloc

    # GCS' S3 compatibility is broken, especially in bucket operations;
    # skip bucket creation there and just bug Aron to create buckets with
    # public-read access for you
    if "storage.googleapis.com" in host:
        logging.info("Skipping storage deletion on googleapis; that sounds like a production bucket!")
        return

    minio_client = minio.Minio(
        host,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False
    )

    if minio_client.bucket_exists(bucketname):
        try:
            # We need to delete all objects first, before we can actually delete the bucket.
            objs = (o.object_name for o in minio_client.list_objects(bucketname, recursive=True))
            list(minio_client.remove_objects(bucketname, objs))  # evaluate the generator, or else remove_objects won't actually execute
            minio_client.remove_bucket(bucketname)
        except BucketAlreadyOwnedByYou:
            pass
