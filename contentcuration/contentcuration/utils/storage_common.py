from datetime import timedelta

from django.conf import settings
from django.core.files.storage import default_storage

from .files import determine_content_type
from .files import hex_to_base64
from .gcs_storage import CompositeGCS
from .gcs_storage import GoogleCloudStorage
from .gcs_storage import is_emulating


class UnknownStorageBackendError(Exception):
    pass


def get_presigned_upload_url(
    filepath,
    md5_hex,
    lifetime_sec,
    content_length,
    storage=default_storage,
    client=None,
):
    mimetype = determine_content_type(filepath)
    md5sum_b64 = hex_to_base64(md5_hex)
    if isinstance(storage, (GoogleCloudStorage, CompositeGCS)):
        if is_emulating():
            upload_url = storage.create_resumable_upload_session(
                filepath, md5_hex, content_length
            )
        else:
            client = client or storage.get_client()
            upload_url = _get_gcs_presigned_put_url(
                client,
                settings.AWS_S3_BUCKET_NAME,
                filepath,
                md5sum_b64,
                lifetime_sec,
                mimetype=mimetype,
            )
    else:
        raise UnknownStorageBackendError(
            "Please ensure your storage backend is Google Cloud Storage!"
        )

    return {"mimetype": mimetype, "uploadURL": upload_url}


def _get_gcs_presigned_put_url(
    gcs_client,
    bucket,
    filepath,
    md5sum,
    lifetime_sec,
    mimetype="application/octet-stream",
):
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
