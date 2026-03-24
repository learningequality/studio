import tempfile

from django.core.files.base import ContentFile
from django.test import TestCase

from contentcuration.tests.utils.restricted_filesystemstorage import (
    RestrictedFileSystemStorage,
)


class RestrictedFileSystemStorageTestCase(TestCase):
    # Sanity-checks that the RestrictedFileSystemStorage wrapper used in tests
    # works as expected, not actually testing application code

    def setUp(self):
        super().setUp()

        self._temp_directory_ctx = tempfile.TemporaryDirectory()
        self.temp_dir = self._temp_directory_ctx.__enter__()

        self.storage = RestrictedFileSystemStorage(location=self.temp_dir)

    def tearDown(self):
        self._temp_directory_ctx.__exit__(None, None, None)
        super().tearDown()

    def test_opening_for_read_works(self):
        test_content = "test content"

        self.storage.save("filename", ContentFile(test_content))
        with self.storage.open("filename", "r") as f:
            content = f.read()
            self.assertEqual(content, test_content)

    def test_opening_for_write_does_not_work(self):
        test_content = "test content"

        with self.assertRaises(ValueError):
            with self.storage.open("filename", "w") as f:
                f.write(test_content)

    def test_path_does_not_work(self):
        with self.assertRaises(NotImplementedError):
            self.storage.path("filename")
