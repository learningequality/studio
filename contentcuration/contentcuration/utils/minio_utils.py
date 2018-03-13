import atexit
import logging
import multiprocessing
import subprocess
import time
from urlparse import urlparse

import minio
from django.conf import settings
from minio import policy

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
        bucket = settings.S3_BUCKET_NAME

    host = urlparse(settings.AWS_S3_ENDPOINT_URL).netloc

    c = minio.Minio(
        host,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False
    )

    c.set_bucket_policy(bucket, "/", policy.Policy.READ_ONLY)
