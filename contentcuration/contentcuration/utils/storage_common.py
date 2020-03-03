import pathlib
from urllib.parse import urlencode

from django.conf import settings
from django.core.files.storage import default_storage
from django_s3_storage.storage import S3Storage

from .gcs_storage import GoogleCloudStorage


class UnknownStorageBackendError(Exception):
    pass


def get_presigned_upload_url(
    filepath, md5sum_b64, lifetime_sec, storage=default_storage, client=None
):
    """Return a presigned URL that can modify the given filepath through a PUT
    request. Performing a PUT request on the returned URL changes the object's
    contents with the contents of your PUT request.

    :param: filepath: the file path inside the bucket, to the file.
    :param: md5sum_b64: the base64 encoded md5 hash of the file. The holder of the URL will
    have to set a Content-MD5 HTTP header matching this md5sum once it
    initiates the download.
    :param: lifetime_sec: the lifetime of the generated upload url, in seconds.
    :param: client: the storage client that will be used to gennerate the presigned URL.
    This must have an API that's similar to either the GCS client or the boto3 client.

    :returns: the signed PUT upload URL, as a string.

    :raises: :class:`UnknownStorageBackendError`: If the storage backend is not S3 or GCS.
    """
    if isinstance(storage, GoogleCloudStorage):
        client = client or storage.client
    elif isinstance(storage, S3Storage):
        bucket = settings.AWS_S3_BUCKET_NAME
        client = client or storage.s3_connection
        return _get_s3_presigned_put_url(client, bucket, filepath, md5sum_b64, lifetime_sec)
    else:
        raise UnknownStorageBackendError(
            "Please ensure your storage backend is either Google Cloud Storage or S3 Storage!"
        )


def _get_gcs_presigned_put_url(gcs_client, filepath, md5sum, lifetime_sec):
    pass


def _get_s3_presigned_put_url(s3_client, bucket, filepath, md5sum, lifetime_sec):
    """
    Creates a pre-signed URL for S3-like backends, e.g. Minio.

    Note that since our production object storage backend is GCS, we do not enforce or require
    any Content-MD5 value.

    :param: s3_client: an initialized S3 client. We will use this to create the presigned PUT url.
    :param: bucket: the bucket where the user can PUT their object.
    :param: filepath: the file path inside the bucket that the user can PUT their object.
    :param: md5sum: the base64-encoded MD5sum of the object the user is planning to PUT.
        This is ignored for this function and added solely to maintain API compatibility with other
        private presigned URL functions.
    :param: lifetime_sec: how long before the presigned URL expires, in seconds.
    """
    # S3's PUT Object parameters:
    # https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
    method = "put_object"
    fields = {
        "Bucket": bucket,
        "Key": filepath,
    }

    response = s3_client.generate_presigned_url(
        ClientMethod=method,
        Params=fields,
        ExpiresIn=lifetime_sec,
    )

    return response
