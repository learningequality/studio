import atexit
import logging
import multiprocessing
import subprocess
import time
from urlparse import urlparse

import boto3
import botocore
from django.conf import settings
from minio import policy
from minio.error import BucketAlreadyOwnedByYou, ResponseError

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

    MINIO_PROCESS = subprocess.Popen(
        ["run_minio.py"],
        stdin=subprocess.PIPE,
    )


def stop_minio(p):
    p.terminate()


def ensure_storage_bucket_public(bucket=None, will_sleep=True):

    # If true, sleep for 5 seconds to wait for minio to start
    if will_sleep:
        time.sleep(5)

    if not bucket:
        bucketname = settings.AWS_STORAGE_BUCKET_NAME

    c = boto3.session.Session().client(
        service_name="s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
    )

    try:
        c.head_bucket(Bucket=bucketname)
    except botocore.exceptions.ClientError as e:
        error_code = int(e.response["Error"]["Code"])
        if error_code == 404:
            c.create_bucket(Bucket=bucketname)

    c.put_bucket_acl(Bucket=bucketname, ACL="public-read")
    logger.debug("Successfully set the bucket policy to read only!")
