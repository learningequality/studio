from django_s3_storage.storage import S3Storage
from google.cloud.storage import Client

from contentcuration.utils.storage.base import CompositeStorage as BaseCompositeStorage
from contentcuration.utils.storage.base import Storage as BaseStorage
from contentcuration.utils.storage.gcs import GoogleCloudStorage


class Storage(S3Storage, BaseStorage):
    def get_client(self):
        """
        :rtype: object
        """
        return self.s3_connection


class CompositeStorage(BaseCompositeStorage):
    def __init__(self):
        super(CompositeStorage, self).__init__()
        self.backends.append(Storage())
        self.backends.append(
            GoogleCloudStorage(Client.create_anonymous_client(), "studio-content")
        )
