from future import standard_library

standard_library.install_aliases()

import logging
import time
import json
from urllib.parse import urlparse

import minio
from django.conf import settings

from contentcuration.utils.storage_common import is_gcs_backend


logger = logging.getLogger(__name__)


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
        secure=False,
    )

    READ_ONLY_POLICY = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": "*"},
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": "arn:aws:s3:::{bucketname}".format(bucketname=bucketname),
            },
            {
                "Effect": "Allow",
                "Principal": {"AWS": "*"},
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::{bucketname}/*".format(bucketname=bucketname),
            },
        ],
    }

    if not c.bucket_exists(bucketname):
        c.make_bucket(bucketname)

        c.set_bucket_policy(
            bucketname,
            json.dumps(READ_ONLY_POLICY),
        )


def ensure_bucket_deleted(bucket=None):

    if not bucket:
        bucketname = settings.AWS_S3_BUCKET_NAME
    else:
        bucketname = bucket

    host = urlparse(settings.AWS_S3_ENDPOINT_URL).netloc

    # GCS' S3 compatibility is broken, especially in bucket operations;
    # skip bucket creation there and just bug Aron to create buckets with
    # public-read access for you
    if is_gcs_backend():
        logging.info(
            "Skipping storage deletion on googleapis; that sounds like a production bucket!"
        )
        return

    minio_client = minio.Minio(
        host,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False,
    )

    if minio_client.bucket_exists(bucketname):
        # We need to delete all objects first, before we can actually delete the bucket.
        objs_name = (
            o.object_name for o in minio_client.list_objects(bucketname, recursive=True)
        )

        for o in objs_name:
            minio_client.remove_object(bucketname, o)

        minio_client.remove_bucket(bucketname)
