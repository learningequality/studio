from django.core.files.storage import default_storage

from .files import determine_content_type


def get_presigned_upload_url(
    filepath,
    md5_hex,
    lifetime_sec,
    content_length,
    storage=default_storage,
):
    """
    :param md5_hex: hex-encoded MD5 of the file.
    :param lifetime_sec: lifetime of the signed URL, in seconds.
    :param content_length: file size in bytes.
    """
    return {
        "mimetype": determine_content_type(filepath),
        "uploadURL": storage.generate_upload_url(
            filepath, md5_hex, lifetime_sec, content_length
        ),
    }
