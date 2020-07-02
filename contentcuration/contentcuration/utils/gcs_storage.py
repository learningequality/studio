import logging
import mimetypes
import tempfile
from io import BytesIO
from gzip import GzipFile

import backoff
from django.core.files import File
from django.core.files.storage import Storage
from google.cloud.exceptions import InternalServerError
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob

OLD_STUDIO_STORAGE_PREFIX = "/contentworkshop_content/"

CONTENT_DATABASES_MAX_AGE = 5  # seconds

MAX_RETRY_TIME = 60  # seconds


class GoogleCloudStorage(Storage):
    def __init__(self, client=None):
        from django.conf import settings

        self.client = client if client else Client()
        self.bucket = self.client.get_bucket(settings.AWS_S3_BUCKET_NAME)

    @classmethod
    def _determine_content_type(cls, filename):
        """
        Guesses the content type of a filename. Returns the mimetype of a file.

        Returns "application/octet-stream" if the type can't be guessed.
        Raises an AssertionError if filename is not a string.
        """

        typ, _ = mimetypes.guess_type(filename)

        if not typ:
            return "application/octet-stream"
        else:
            return typ

    def open(self, name, mode="rb", blob_object=None):
        """
        open returns a Django File object containing the bytes of name suitable for reading.

        You can pass in an optional 'mode' argument, but is only there for Django Storage class
        compatibility. It would error out if given any other argument than "rb".

        You can also pass in an object in the blob_object argument. This must have a method called
        `download_to_file` that accepts as writeable file object as an argument, and writes the
        bytes to it. (this is mainly used for mocking in tests.)
        """
        # We don't have any logic for returning the file object in write
        # so just raise an error if we get any mode other than rb
        assert mode == "rb", (
            "Sorry, we can't handle any open mode other than rb."
            " Please use Storage.save() instead."
        )

        if not blob_object:
            # the old studio storage had a prefix if /contentworkshop_content/
            # before the path; remove that first before passing it in to GCS
            # TODO (aron): remove hack once we've migrated all File models to remove the prefix
            if name.startswith(OLD_STUDIO_STORAGE_PREFIX):
                name = name.split(OLD_STUDIO_STORAGE_PREFIX).pop()
            blob = self.bucket.get_blob(name)
        else:
            blob = blob_object

        fobj = tempfile.NamedTemporaryFile()
        blob.download_to_file(fobj)
        # flush it to disk
        fobj.flush()
        fobj.seek(0)

        django_file = File(fobj)
        django_file.just_downloaded = True
        return django_file

    @backoff.on_exception(backoff.expo, InternalServerError, max_time=MAX_RETRY_TIME)
    def exists(self, name):
        """
        Check if a resource with the given name exists. Has a maximum backoff time of MAX_RETRY_TIME.
        :param name: the name of the resource to check
        :return: True if the resource with the name exists, or False otherwise.
        """
        blob = self.bucket.get_blob(name)
        return blob

    def size(self, name):
        blob = self.bucket.get_blob(name)
        return blob.size

    def save(self, name, fobj, max_length=None, blob_object=None):
        if not blob_object:
            blob = Blob(name, self.bucket)
        else:
            blob = blob_object

        buffer = None
        # set a max-age of 5 if we're uploading to content/databases
        if self.is_database_file(name):
            blob.cache_control = "private, max-age={}, no-transform".format(
                CONTENT_DATABASES_MAX_AGE
            )

            # Compress the database file so that users can save bandwith and download faster.
            buffer = BytesIO()
            compressed = GzipFile(fileobj=buffer, mode="w")
            compressed.write(fobj.read())
            compressed.close()

            blob.content_encoding = "gzip"
            fobj = buffer

        # determine the current file's mimetype based on the name
        content_type = self._determine_content_type(name)

        # force the current file to be at file location 0, to
        # because that's what google wants
        fobj.seek(0)

        if self._is_file_empty(fobj):
            logging.warning("Stopping the upload of an empty file: {}".format(name))
            return name

        blob.upload_from_file(
            fobj, content_type=content_type,
        )

        # Close StringIO object and discard memory buffer if created
        if buffer:
            buffer.close()

        return name

    def url(self, name):
        """
        Return a publicly accessible URL for the given object.
        """
        logging.debug("Getting public URL for {}".format(name))

        # the old studio storage had a prefix if /contentworkshop_content/
        # before the path; remove that first before passing it in to
        # GCS
        # TODO (aron): remove hack once we've migrated all File models to remove the prefix
        if name.startswith(OLD_STUDIO_STORAGE_PREFIX):
            name = name.split(OLD_STUDIO_STORAGE_PREFIX).pop()

        blob = self.bucket.get_blob(name)
        return blob.public_url

    def delete(self, name):
        # the old studio storage had a prefix if /contentworkshop_content/
        # before the path; remove that first before passing it in to
        # GCS
        # TODO (aron): remove hack once we've migrated all File models to remove the prefix
        if name.startswith(OLD_STUDIO_STORAGE_PREFIX):
            name = name.split(OLD_STUDIO_STORAGE_PREFIX).pop()

        blob = self.bucket.get_blob(name)
        return blob.delete()

    def get_accessed_time(self, name):
        raise NotImplementedError

    def get_created_time(self, name):
        blob = self.bucket.get_blob(name)
        return blob.time_created

    def get_modified_time(self, name):
        raise NotImplementedError

    def get_valid_name(self, name):
        return name

    def generate_filename(self, filename):
        # TODO(aron): can we move the generate_object_storage_name logic to here?
        return filename

    # Aron: note: move to a studio_storage object, since this is studio-specific logic
    @staticmethod
    def is_database_file(filename):
        return filename.endswith(".sqlite3")

    @staticmethod
    def _is_file_empty(fobj):
        """
        Return True if the file is empty, i.e. it has a length of 0. Raises an error
        if the file object does not have the seek() or peek() method.
        """

        # Check if our fobj has the peek method. If so, just use that to check
        # one byte ahead.
        try:
            byt = fobj.peek(1)
        except AttributeError:
            # emulate the peek method by saving our current location, reading
            # one byte, then returning to the saved location. It would've been
            # nice to use the os.SEEK_CUR argument to seek(), but that doesn't
            # work on StringIO objects.
            current_location = fobj.tell()
            byt = fobj.read(1)
            fobj.seek(current_location)
        return len(byt) == 0
