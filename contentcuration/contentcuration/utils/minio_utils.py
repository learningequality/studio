"""
Miscellaneous object storage utility functions
"""
import logging
from urlparse import urlparse
from minio import policy
from minio.error import ResponseError

import minio
from django.conf import settings


def ensure_bucket_exists(bucketname=None):
    """
    Ensure the bucket given by bucketname or settings.AWS_S3_BUCKET_NAME
    exists.
    """

    bucket = bucketname if bucketname else settings.AWS_S3_BUCKET_NAME
    print "bucket is {}".format(bucket)
    host = urlparse(settings.AWS_S3_ENDPOINT_URL).netloc
    minio_client = minio.Minio(
        host,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False,
    )

    if not minio_client.bucket_exists(bucket):
        minio_client.make_bucket(bucket)

    logging.info("Bucket %s created!", bucket)

    try:
        minio_client.set_bucket_policy(bucket, "", policy.Policy.READ_ONLY)
        logging.debug("Successfully set the bucket policy to read only!")
    except ResponseError as e:
        logging.warning("Error setting bucket {} to readonly: {}".format(bucket, e))
