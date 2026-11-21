import logging
import tempfile
from datetime import timedelta
from gzip import GzipFile
from io import BytesIO

import backoff
import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files import File
from django.core.files.storage import Storage
from django.utils.functional import cached_property
from google.cloud.exceptions import InternalServerError
from google.cloud.exceptions import NotFound
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob

from .files import determine_content_type
from .files import emulator_download_url
from contentcuration.utils.files import base64_to_hex
from contentcuration.utils.files import hex_to_base64

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
    def __init__(self, client, bucket_name, *, retry_options=None):
        self.client = client
        self.bucket = self.client.get_bucket(bucket_name, **(retry_options or {}))

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

        if blob_object is None:
            # the old studio storage had a prefix if /contentworkshop_content/
            # before the path; remove that first before passing it in to GCS
            # TODO (aron): remove hack once we've migrated all File models to remove the prefix
            if name.startswith(OLD_STUDIO_STORAGE_PREFIX):
                name = name.split(OLD_STUDIO_STORAGE_PREFIX).pop()
            if settings.GCS_EMULATOR_HOST:
                blob = self.bucket.blob(name)
            else:
                metadata = self.bucket.get_blob(name)
                if metadata is None:
                    raise FileNotFoundError("{} not found".format(name))
                blob = self.bucket.blob(name, generation=metadata.generation)
        else:
            blob = blob_object

        fobj = tempfile.NamedTemporaryFile()
        try:
            blob.download_to_file(fobj)
        except NotFound:
            fobj.close()
            raise FileNotFoundError("{} not found".format(name))
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
            with GzipFile(fileobj=buffer, mode="w") as compressed:
                compressed.write(fobj.read())

            blob.content_encoding = "gzip"
            fobj = buffer

        content_type = determine_content_type(name)

        # force the current file to be at file location 0, to
        # because that's what google wants
        fobj.seek(0)
        try:
            if not settings.GCS_EMULATOR_HOST:
                if not fobj.read(1):
                    logging.warning("Stopping the upload of an empty file: %s", name)
                    return name
                fobj.seek(0)
            blob.upload_from_file(fobj, content_type=content_type)
        finally:
            if buffer is not None:
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

        if settings.GCS_EMULATOR_HOST:
            return emulator_download_url(
                settings.GCS_EMULATOR_HOST, self.bucket.name, name
            )
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
        if blob is not None:
            blob.delete()

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

    def create_resumable_upload_session(self, name, md5, size):
        blob = self.bucket.blob(name)
        md5_b64 = hex_to_base64(md5)
        blob.md5_hash = md5_b64.strip()
        blob.content_type = determine_content_type(name)
        blob.metadata = {"declared-size": str(size)}
        return blob.create_resumable_upload_session(client=self.client)

    def generate_upload_url(self, name, md5, lifetime_sec, size):
        """
        :param md5: hex-encoded md5 of the file; signed PUT requests send it
            base64-encoded as the Content-MD5 header.
        :param lifetime_sec: lifetime of the URL, in seconds.
        :param size: the size of the file, in bytes.
        """
        if settings.GCS_EMULATOR_HOST:
            return self.create_resumable_upload_session(name, md5, size)
        return self.bucket.blob(name).generate_signed_url(
            method="PUT",
            content_md5=hex_to_base64(md5).strip(),
            content_type=determine_content_type(name),
            expiration=timedelta(seconds=lifetime_sec),
        )

    def get_stored_object_md5(self, name):
        blob = self.bucket.get_blob(name)
        return (
            base64_to_hex(blob.md5_hash) if blob is not None and blob.md5_hash else None
        )


class CompositeGCS(Storage):
    @cached_property
    def backends(self):
        client = _create_default_client()
        if settings.GCS_EMULATOR_HOST:
            try:
                return [
                    GoogleCloudStorage(
                        client,
                        settings.GCS_BUCKET_NAME,
                        retry_options={"retry": None, "timeout": 5},
                    )
                ]
            except requests.exceptions.RequestException as e:
                raise ImproperlyConfigured(
                    "No GCS emulator reachable at STORAGE_EMULATOR_HOST={}".format(
                        settings.GCS_EMULATOR_HOST
                    )
                ) from e
        backends = [GoogleCloudStorage(client, settings.GCS_BUCKET_NAME)]
        # Only add the studio-content bucket (the production bucket) if we're not in production
        if settings.SITE_ID != settings.PRODUCTION_SITE_ID:
            backends.append(
                GoogleCloudStorage(Client.create_anonymous_client(), "studio-content")
            )

        return backends

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

    def create_resumable_upload_session(self, name, md5_b64, size):
        return self._get_writeable_backend().create_resumable_upload_session(
            name, md5_b64, size
        )

    def generate_upload_url(self, name, md5, lifetime_sec, size):
        return self._get_writeable_backend().generate_upload_url(
            name, md5, lifetime_sec, size
        )

    def get_stored_object_md5(self, name):
        return self._get_writeable_backend().get_stored_object_md5(name)
