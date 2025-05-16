import mimetypes
import os

from django.core.files.storage import default_storage

from .base import CompositeStorage
from .base import Storage


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
    filepath, md5sum_b64, lifetime_sec, storage=default_storage
):
    """
    Return a presigned URL that can modify the given filepath through a PUT
    request. Performing a PUT request on the returned URL changes the object's
    contents with the contents of your PUT request.

    :param: filepath: the file path inside the bucket, to the file.
    :param: md5sum_b64: the base64 encoded md5 hash of the file. The holder of the URL will
    have to set a Content-MD5 HTTP header matching this md5sum once it
    initiates the download.
    :param: lifetime_sec: the lifetime of the generated upload url, in seconds.

    :returns: a dictionary containing 2 keys:
        mimetype: the mimetype that will be required to send as part of the file upload's mimetype header
        uploadURL: the URL to upload the file to.

    :raises: :class:`UnknownStorageBackendError`: If the storage backend is not S3 or GCS.
    """
    mimetype = determine_content_type(filepath)

    if isinstance(storage, (Storage, CompositeStorage)):
        upload_url = storage.get_presigned_put_url(
            filepath, md5sum_b64, lifetime_sec, mimetype=mimetype
        )
    else:
        raise UnknownStorageBackendError(
            "Please ensure your storage backend is either Google Cloud Storage or S3 Storage!"
        )

    return {"mimetype": mimetype, "uploadURL": upload_url}
