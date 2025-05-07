from django.conf import settings
from django_s3_storage.storage import S3Storage
from google.cloud.storage import Client

from contentcuration.utils.storage.base import CompositeStorage as BaseCompositeStorage
from contentcuration.utils.storage.base import Storage as BaseStorage
from contentcuration.utils.storage.gcs import GoogleCloudStorage


class Storage(S3Storage, BaseStorage):
    def get_client(self):
        """
        :rtype: botocore.client.BaseClient
        """
        return self.s3_connection

    def get_presigned_put_url(self, filepath, md5sum, lifetime_sec, mimetype=None):
        """
        Creates a pre-signed URL for development storage backends

        Note that since our production object storage backend is GCS, we do not enforce or require
        any Content-MD5 value.

        :param: filepath: the file path inside the bucket that the user can PUT their object.
        :param: md5sum: the base64-encoded MD5sum of the object the user is planning to PUT.
            This is ignored for this function and added solely to maintain API compatibility with other
            private presigned URL functions.
        :param: lifetime_sec: how long before the presigned URL expires, in seconds.
        :param: mimetype: the content type of the file to be uploaded
        :return: A pre-signed URL for uploading the file
        """
        # S3's PUT Object parameters:
        # https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
        method = "put_object"
        fields = {
            "Bucket": settings.AWS_S3_BUCKET_NAME,
            "Key": filepath,
        }

        return self.get_client().generate_presigned_url(
            ClientMethod=method,
            Params=fields,
            ExpiresIn=lifetime_sec,
        )


class CompositeStorage(BaseCompositeStorage):
    def __init__(self):
        super(CompositeStorage, self).__init__()
        self.backends.append(Storage())
        self.backends.append(
            GoogleCloudStorage(Client.create_anonymous_client(), "studio-content")
        )
