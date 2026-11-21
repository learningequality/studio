from django.core.files.storage import default_storage

from .files import determine_content_type


def get_presigned_upload_url(
    filepath,
    md5_hex,
    lifetime_sec,
    content_length,
    storage=default_storage,
):
    """Return a URL that can modify the given filepath through a PUT
    request. Performing a PUT request on the returned URL changes the object's
    contents with the contents of your PUT request.

    :param: filepath: the file path inside the bucket, to the file.
    :param: md5_hex: the hex-encoded md5 hash of the file. The base64 encoding
    that GCS requires for the Content-MD5 header is handled internally; the
    holder of the URL must set a Content-MD5 HTTP header matching that
    base64-encoded value once it initiates the upload.
    :param: lifetime_sec: the lifetime of the generated upload url, in seconds.
    :param: content_length: the size of the content, in bytes.
    :param: storage: a `GoogleCloudStorage` or `CompositeGCS`.

    :returns: a dictionary containing 2 keys:
        mimetype: the mimetype that will be required to send as part of the file upload's mimetype header
        uploadURL: the URL to upload the file to.
    """
    return {
        "mimetype": determine_content_type(filepath),
        "uploadURL": storage.generate_upload_url(
            filepath, md5_hex, lifetime_sec, content_length
        ),
    }
