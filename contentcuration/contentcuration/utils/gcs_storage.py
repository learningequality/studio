import logging
import mimetypes
import tempfile

from django.core.files import File
from django.core.files.storage import Storage
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob


OLD_STUDIO_STORAGE_PREFIX = "/contentworkshop_content/"


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
        assert mode == "rb",\
            ("Sorry, we can't handle any open mode other than rb."
             " Please use Storage.save() instead.")

        if not blob_object:
            blob = self.bucket.get_blob(name)
        else:
            blob = blob_object

        fobj = tempfile.NamedTemporaryFile()
        blob.download_to_file(fobj)
        # flush it to disk
        fobj.flush()

        django_file = File(fobj)
        django_file.just_downloaded = True
        return django_file

    def exists(self, name):
        blob = self.bucket.get_blob(name)
        return blob

    def size(self, name):
        blob = self.bucket.get_blob(name)
        return blob.size

    def save(self, name, fobj, max_length=None, blob_object=None):
        if name.endswith(".perseus") and self.exists(name):
            logging.info("{} exists in Google Cloud Storage, so it's not saved again.".format(name))
            return name

        if not blob_object:
            blob = Blob(name, self.bucket)
        else:
            blob = blob_object

        # force the current file to be at file location 0, to
        # because that's what google wants

        # determine the current file's mimetype based on the name
        content_type = self._determine_content_type(name)

        fobj.seek(0)
        blob.upload_from_file(
            fobj,
            content_type=content_type,
        )
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
