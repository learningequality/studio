import logging
import mimetypes
import os.path

from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from django.conf import settings
from django.core.files.storage import Storage
from django.core.files import File


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

        assert isinstance(filename, str), "Expected filename to be string, passed in {}".format(filename)

        typ, _ =  mimetypes.guess_type(filename)

        if not typ:
            return "application/octet-stream"
        else:
            return typ

    def open(self, name, mode="rb"):
        # We don't have any logic for returning the file object in write
        # so just raise an error if we get any mode other than rb
        assert mode == "rb",\
            ("Sorry, we can't handle any open mode other than rb."
             " Please use Storage.save() instead.")

        blob = self.bucket.get_blob(name)

        # take advantage of the fact that we only
        # write a file once, and that GCS returns the MD5
        # hash as part of the metadata.

        # See if a file with a matching MD5 hash is already
        # present. If so, just return that.
        tmp_filename = os.path.join("/tmp", blob.md5_hash)

        # the md5 hash from gcloud storage encoded in base64, which may not be
        # compatible as a filesystem name. Change it to hex.
        tmp_filename = tmp_filename.decode("base64").encode("hex")

        is_new = True
        if os.path.exists(tmp_filename):
            f = open(tmp_filename)
            is_new = False

        # If there's no such file, then download that file
        # from GCS.
        else:
            with open(tmp_filename, "wb") as fobj:
                blob.download_to_file(fobj)

            # reopen the file we just wrote, this time in read mode
            f = open(tmp_filename)

        django_file = File(f)
        django_file.just_downloaded = is_new
        return django_file

    def exists(self, name):
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
        raise NotImplementedError
