import logging
import tempfile
from gzip import GzipFile
from io import BytesIO

import backoff
from django.conf import settings
from django.core.files import File
from django.core.files.storage import Storage
from google.cloud.exceptions import InternalServerError
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob

OLD_STUDIO_STORAGE_PREFIX = "/contentworkshop_content/"

CONTENT_DATABASES_MAX_AGE = 5  # seconds

MAX_RETRY_TIME = 60  # seconds


def _create_default_client(
    service_account_credentials_path=settings.GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH,
):
    if service_account_credentials_path:
        return Client.from_service_account_json(service_account_credentials_path)
    return Client()


class GoogleCloudStorage(Storage):
    def __init__(self, client, bucket_name):
        self.client = client
        self.bucket = self.client.get_bucket(bucket_name)

    def get_client(self):
        return self.client

    @property
    def writeable(self):
        """
        See `Client.create_anonymous_client()`
        :return: True if the client has a project set, False otherwise.
        """
        return self.client.project is not None

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
        if mode != "rb":
            raise AssertionError(
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

        if blob is None:
            raise FileNotFoundError("{} not found".format(name))

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
        return blob is not None

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
        # import determine_content_type lazily in here, so we don't get into an infinite loop with circular dependencies
        from contentcuration.utils.storage_common import determine_content_type

        content_type = determine_content_type(name)

        # force the current file to be at file location 0, to
        # because that's what google wants
        fobj.seek(0)

        if self._is_file_empty(fobj):
            logging.warning("Stopping the upload of an empty file: {}".format(name))
            return name

        blob.upload_from_file(
            fobj,
            content_type=content_type,
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


class CompositeGCS(Storage):
    def __init__(self):
        self.backends = []
        self.backends.append(
            GoogleCloudStorage(_create_default_client(), settings.AWS_S3_BUCKET_NAME)
        )
        # Only add the studio-content bucket (the production bucket) if we're not in production
        if settings.SITE_ID != settings.PRODUCTION_SITE_ID:
            self.backends.append(
                GoogleCloudStorage(Client.create_anonymous_client(), "studio-content")
            )

    def _get_writeable_backend(self):
        """
        :rtype: GoogleCloudStorage
        """
        for backend in self.backends:
            if backend.writeable:
                return backend
        raise AssertionError("No writeable backend found")

    def _get_readable_backend(self, name):
        """
        :rtype: GoogleCloudStorage
        """
        for backend in self.backends:
            if backend.exists(name):
                return backend
        raise FileNotFoundError("{} not found".format(name))

    def get_client(self):
        return self._get_writeable_backend().get_client()

    def open(self, name, mode="rb"):
        return self._get_readable_backend(name).open(name, mode)

    def save(self, name, content, max_length=None):
        return self._get_writeable_backend().save(name, content, max_length=max_length)

    def delete(self, name):
        self._get_writeable_backend().delete(name)

    def exists(self, name):
        try:
            self._get_readable_backend(name)
            return True
        except FileNotFoundError:
            return False

    def listdir(self, path):
        # This method was not implemented on GoogleCloudStorage to begin with
        raise NotImplementedError("listdir is not implemented for CompositeGCS")

    def size(self, name):
        return self._get_readable_backend(name).size(name)

    def url(self, name):
        return self._get_readable_backend(name).url(name)

    def get_accessed_time(self, name):
        return self._get_readable_backend(name).get_accessed_time(name)

    def get_created_time(self, name):
        return self._get_readable_backend(name).get_created_time(name)

    def get_modified_time(self, name):
        return self._get_readable_backend(name).get_modified_time(name)
