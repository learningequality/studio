from django.test import TestCase

from contentcuration.utils.cloud_storage import CloudStorage


class CloudStorageTestCase(TestCase):
    def test_backend_initialization(self):
        cloud_storage_instance = CloudStorage()
        self.assertIsNotNone(cloud_storage_instance)
        self.assertIsInstance(cloud_storage_instance, CloudStorage)
