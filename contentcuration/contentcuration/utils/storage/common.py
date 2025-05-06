import mimetypes
import os
from datetime import timedelta

from django.conf import settings
from django.core.files.storage import default_storage
from django_s3_storage.storage import S3Storage

from .base import CompositeStorage
from .base import Storage
from .gcs import CompositeGCS
from .gcs import GoogleCloudStorage


# Do this to ensure that we infer mimetypes for files properly, specifically
# zip file and epub files.
# to add additional files add them to the mime.types file
mimetypes.init([os.path.join(os.path.dirname(__file__), "mime.types")])


class UnknownStorageBackendError(Exception):
    pass


def determine_content_type(filename):
    """
    Guesses the content type of a filename. Returns the mimetype of a file.

    Returns "application/octet-stream" if the type can't be guessed.
    Raises an AssertionError if filename is not a string.
    """

    typ, _ = mimetypes.guess_type(filename)

    if not typ:
        return "application/octet-stream"
    return typ


def get_presigned_upload_url(
    filepath, md5sum_b64, lifetime_sec, content_length, storage=default_storage, client=None
):
    """Return a presigned URL that can modify the given filepath through a PUT
    request. Performing a PUT request on the returned URL changes the object's
    contents with the contents of your PUT request.

    :param: filepath: the file path inside the bucket, to the file.
    :param: md5sum_b64: the base64 encoded md5 hash of the file. The holder of the URL will
    have to set a Content-MD5 HTTP header matching this md5sum once it
    initiates the download.
    :param: lifetime_sec: the lifetime of the generated upload url, in seconds.
    :param: content_length: the size of the content, in bytes.
    :param: client: the storage client that will be used to gennerate the presigned URL.
    This must have an API that's similar to either the GCS client or the boto3 client.

    :returns: a dictionary containing 2 keys:
        mimetype: the mimetype that will be required to send as part of the file upload's mimetype header
        uploadURL: the URL to upload the file to.

    :raises: :class:`UnknownStorageBackendError`: If the storage backend is not S3 or GCS.
    """

    # Aron: note that content_length is not used right now because
    # both storage types are having difficulties enforcing it.

    mimetype = determine_content_type(filepath)
    bucket = settings.AWS_S3_BUCKET_NAME

    if isinstance(storage, Storage):
        client = client or storage.get_client()

    if isinstance(storage, (GoogleCloudStorage, CompositeGCS)):
        upload_url = _get_gcs_presigned_put_url(client, bucket, filepath, md5sum_b64, lifetime_sec, mimetype=mimetype)
    elif isinstance(storage, (S3Storage, CompositeStorage)):
        upload_url = _get_s3_presigned_put_url(client, bucket, filepath, md5sum_b64, lifetime_sec)
    else:
        raise UnknownStorageBackendError(
            "Please ensure your storage backend is either Google Cloud Storage or S3 Storage!"
        )

    return {
        "mimetype": mimetype,
        "uploadURL": upload_url
    }


def _get_gcs_presigned_put_url(gcs_client, bucket, filepath, md5sum, lifetime_sec, mimetype="application/octet-stream"):
    bucket_obj = gcs_client.get_bucket(bucket)
    blob_obj = bucket_obj.blob(filepath)

    # ensure the md5sum doesn't have any whitespace, including newlines.
    # We should do the same whitespace stripping as well on any client that actually
    # uses the returned presigned url.
    md5sum_stripped = md5sum.strip()

    # convert the lifetime to a timedelta, so gcloud library will interpret the lifetime
    # as the seconds from right now. If we use an absolute integer, it's the number of seconds
    # from unix time
    lifetime_timedelta = timedelta(seconds=lifetime_sec)

    url = blob_obj.generate_signed_url(
        method="PUT",
        content_md5=md5sum_stripped,
        content_type=mimetype,
        expiration=lifetime_timedelta,
    )

    return url


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
