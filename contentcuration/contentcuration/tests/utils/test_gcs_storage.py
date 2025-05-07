from io import BytesIO

import mock
from django.core.files import File
from django.test import TestCase
from google.cloud.storage import Bucket
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from mixer.main import mixer

from contentcuration.utils.storage.gcs import CompositeGCS
from contentcuration.utils.storage.gcs import GoogleCloudStorage


class GoogleCloudStorageSaveTestCase(TestCase):
    """
    Tests for GoogleCloudStorage.save().
    """

    def setUp(self):
        self.blob_class = mock.create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = mock.create_autospec(Client)
        self.storage = GoogleCloudStorage(client=self.mock_client(), bucket_name="bucket")
        self.content = BytesIO(b"content")

    def test_calls_upload_from_file(self):
        """
        Check if upload_from_file is called when we call GoogleCloudStorage.save().
        """
        self.storage.save("myfile.jpg", self.content, blob_object=self.blob_obj)

        # Check that blob.upload_from_file() has been called inside storage.save()
        self.blob_obj.upload_from_file.assert_called()

    def test_calls_upload_from_file_with_a_file_object_and_content_type(self):
        """
        Check that we call upload_from_file with a file object and content type when
        we call GoogleCloudStorage.save().
        """
        self.storage.save("myfile.jpg", self.content, blob_object=self.blob_obj)

        # Check that we pass self.content file_object to upload_from_file
        self.blob_obj.upload_from_file.assert_called_once_with(self.content, content_type="image/jpeg")

    def test_checks_does_not_upload_file_if_empty(self):
        """
        Check that it doesn't call upload_from_file if the file is empty.
        """
        content = BytesIO()
        self.storage.save("myfile.jpg", content, blob_object=self.blob_obj)

        # check that upload_from_file is never called
        self.blob_obj.upload_from_file.assert_not_called()

    def test_uploads_max_age_of_5_if_content_database(self):
        """
        Check that we set a max-age of 5 if we're uploading a content database
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert "max-age=5" in self.blob_obj.cache_control

    def test_uploads_cache_control_private_if_content_database(self):
        """
        Check that set set a cache-control of private if we're uploading a content database.
        This ensures that no proxy will cache this file.
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert "private" in self.blob_obj.cache_control

    @mock.patch("contentcuration.utils.storage.gcs.BytesIO")
    @mock.patch("contentcuration.utils.storage.gcs.GoogleCloudStorage._is_file_empty", return_value=False)
    def test_gzip_if_content_database(self, bytesio_mock, file_empty_mock):
        """
        Check that if we're uploading a gzipped content database and
        if the BytesIO object has been closed.
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert self.blob_obj.content_encoding == "gzip"
        assert bytesio_mock.called


class GoogleCloudStorageOpenTestCase(TestCase):
    """
    Tests for GoogleCloudStorage.open().
    """

    class RandomFileSchema:
        """
        A schema for a file we're about to upload.
        """
        contents = str
        filename = str

    def setUp(self):
        self.blob_class = mock.create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = mock.create_autospec(Client)
        self.storage = GoogleCloudStorage(client=self.mock_client(), bucket_name="bucket")
        self.local_file = mixer.blend(self.RandomFileSchema)

    def test_raises_error_if_mode_is_not_rb(self):
        """
        open() should raise an assertion error if passed in a mode flag that's not "rb".
        """
        with self.assertRaises(AssertionError):
            self.storage.open("randfile", mode="wb")

    def test_calls_blob_download_to_file(self):
        """
        Check that open() eventually calls blob.download_to_file().
        """
        self.storage.open(self.local_file.filename, blob_object=self.blob_obj)

        # assert that we called download_from_file
        self.blob_obj.download_to_file.assert_called()

    def test_returns_django_file(self):
        """
        Test that we return a Django File instance.
        """
        f = self.storage.open(self.local_file.filename, blob_object=self.blob_obj)

        assert isinstance(f, File)
        # This checks that an actual temp file was written on disk for the file.git
        assert f.name


class CompositeGCSTestCase(TestCase):
    """
    Tests for the GoogleCloudStorage class.
    """

    def setUp(self):
        mock_client_cls = mock.MagicMock(spec_set=Client)
        bucket_cls = mock.MagicMock(spec_set=Bucket)
        self.blob_cls = mock.MagicMock(spec_set=Blob)

        self.mock_default_client = mock_client_cls(project="project")
        self.mock_anon_client = mock_client_cls(project=None)

        self.mock_default_bucket = bucket_cls(self.mock_default_client, "bucket")
        self.mock_default_client.get_bucket.return_value = self.mock_default_bucket
        self.mock_anon_bucket = bucket_cls(self.mock_anon_client, "bucket")
        self.mock_anon_client.get_bucket.return_value = self.mock_anon_bucket

        with mock.patch("contentcuration.utils.storage.gcs._create_default_client", return_value=self.mock_default_client), \
             mock.patch("contentcuration.utils.storage.gcs.Client.create_anonymous_client", return_value=self.mock_anon_client):
            self.storage = CompositeGCS()

    def test_get_writeable_backend(self):
        backend = self.storage._get_writeable_backend()
        self.assertEqual(backend.client, self.mock_default_client)

    def test_get_writeable_backend__raises_error_if_none(self):
        self.mock_default_client.project = None
        with self.assertRaises(AssertionError):
            self.storage._get_writeable_backend()

    def test_get_readonly_backend(self):
        self.mock_anon_bucket.get_blob.return_value = self.blob_cls("blob", "blob")
        backend = self.storage._get_readable_backend("blob")
        self.assertEqual(backend.client, self.mock_anon_client)

    def test_get_readonly_backend__raises_error_if_not_found(self):
        self.mock_default_bucket.get_blob.return_value = None
        self.mock_anon_bucket.get_blob.return_value = None
        with self.assertRaises(FileNotFoundError):
            self.storage._get_readable_backend("blob")

    def test_open(self):
        self.mock_default_bucket.get_blob.return_value = self.blob_cls("blob", "blob")
        f = self.storage.open("blob")
        self.assertIsInstance(f, File)
        self.mock_default_bucket.get_blob.assert_called_with("blob")

    @mock.patch("contentcuration.utils.storage.gcs.Blob")
    def test_save(self, mock_blob):
        self.storage.save("blob", BytesIO(b"content"))
        blob = mock_blob.return_value
        blob.upload_from_file.assert_called()

    def test_delete(self):
        mock_blob = self.blob_cls("blob", "blob")
        self.mock_default_bucket.get_blob.return_value = mock_blob
        self.storage.delete("blob")
        mock_blob.delete.assert_called()

    def test_exists(self):
        self.mock_default_bucket.get_blob.return_value = self.blob_cls("blob", "blob")
        self.assertTrue(self.storage.exists("blob"))

    def test_exists__returns_false_if_not_found(self):
        self.mock_default_bucket.get_blob.return_value = None
        self.assertFalse(self.storage.exists("blob"))

    def test_size(self):
        mock_blob = self.blob_cls("blob", "blob")
        self.mock_default_bucket.get_blob.return_value = mock_blob
        mock_blob.size = 4
        self.assertEqual(self.storage.size("blob"), 4)

    def test_url(self):
        mock_blob = self.blob_cls("blob", "blob")
        self.mock_default_bucket.get_blob.return_value = mock_blob
        mock_blob.public_url = "https://storage.googleapis.com/bucket/blob"
        self.assertEqual(self.storage.url("blob"), "https://storage.googleapis.com/bucket/blob")

    def test_get_created_time(self):
        self.mock_default_bucket.get_blob.return_value = self.blob_cls("blob", "blob")
        self.assertEqual(self.storage.get_created_time("blob"), self.blob_cls.return_value.time_created)
