from gzip import decompress
from io import BytesIO
from uuid import uuid4

import mock
import requests
from django.core.exceptions import ImproperlyConfigured
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import override_settings
from django.test import SimpleTestCase
from google.auth.credentials import AnonymousCredentials
from google.cloud.storage import Bucket
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from mixer.main import mixer
from urllib3.response import HTTPResponse

from contentcuration.utils.files import hex_to_base64
from contentcuration.utils.gcs_storage import CompositeGCS
from contentcuration.utils.gcs_storage import GoogleCloudStorage


class GoogleCloudStorageSaveTestCase(SimpleTestCase):
    """
    Tests for GoogleCloudStorage.save().
    """

    def setUp(self):
        self.blob_class = mock.create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = mock.create_autospec(Client)
        self.storage = GoogleCloudStorage(
            client=self.mock_client(), bucket_name="bucket"
        )
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
        self.blob_obj.upload_from_file.assert_called_once_with(
            self.content, content_type="image/jpeg"
        )

    def test_empty_write_to_existing_object(self):
        name = "myfile.txt"
        saved = b""

        def store(data):
            nonlocal saved
            saved = data

        self.blob_obj.upload_from_file.side_effect = lambda stream, **kwargs: store(
            stream.read()
        )
        self.blob_obj.upload_from_string.side_effect = lambda data, **kwargs: store(
            data
        )
        self.blob_obj.download_to_file.side_effect = lambda stream: stream.write(saved)

        for emulator, expected in ((None, b"original"), ("http://emulator:4443", b"")):
            with self.subTest(emulator=emulator), override_settings(
                GCS_EMULATOR_HOST=emulator
            ):
                self.storage.save(name, BytesIO(b"original"), blob_object=self.blob_obj)
                self.storage.save(name, BytesIO(), blob_object=self.blob_obj)
                with self.storage.open(name, blob_object=self.blob_obj) as result:
                    self.assertEqual(result.read(), expected)

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

    def test_gzip_if_content_database(self):
        self.blob_obj.upload_from_file.side_effect = (
            lambda stream, **kwargs: self.assertEqual(
                decompress(stream.read()), b"content"
            )
        )
        self.storage.save(
            "content/databases/myfile.sqlite3", self.content, blob_object=self.blob_obj
        )
        self.blob_obj.upload_from_file.assert_called_once()
        self.assertEqual(self.blob_obj.content_encoding, "gzip")


class GoogleCloudStorageOpenTestCase(SimpleTestCase):
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
        self.storage = GoogleCloudStorage(
            client=self.mock_client(), bucket_name="bucket"
        )
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


class CompositeGCSTestCase(SimpleTestCase):
    """
    Tests for the GoogleCloudStorage class.
    """

    def setUp(self):
        emulator = override_settings(GCS_EMULATOR_HOST=None)
        emulator.enable()
        self.addCleanup(emulator.disable)
        self.blob_cls = mock.MagicMock(spec_set=Blob)

        self.mock_default_client = mock.MagicMock(spec=Client, project="project")
        self.mock_anon_client = mock.MagicMock(spec=Client, project=None)
        self.mock_default_bucket = mock.MagicMock(spec_set=Bucket)
        self.mock_anon_bucket = mock.MagicMock(spec_set=Bucket)
        self.mock_default_bucket.get_blob.return_value = None
        self.mock_anon_bucket.get_blob.return_value = None
        self.mock_default_client.get_bucket.return_value = self.mock_default_bucket
        self.mock_anon_client.get_bucket.return_value = self.mock_anon_bucket

        with mock.patch(
            "contentcuration.utils.gcs_storage.Client",
            return_value=self.mock_default_client,
        ), mock.patch(
            "contentcuration.utils.gcs_storage.Client.create_anonymous_client",
            return_value=self.mock_anon_client,
        ):
            self.storage = CompositeGCS()
            self.storage.backends

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

    @mock.patch("contentcuration.utils.gcs_storage.Blob")
    def test_save(self, mock_blob):
        self.storage.save("blob", BytesIO(b"content"))
        blob = mock_blob.return_value
        blob.upload_from_file.assert_called()

    def test_delete(self):
        mock_blob = self.blob_cls("blob", "blob")
        self.mock_default_bucket.get_blob.return_value = mock_blob
        self.storage.delete("blob")
        mock_blob.delete.assert_called()

    def test_generate_upload_url_signs_with_writeable_backend(self):
        blob = self.mock_default_bucket.blob.return_value
        blob.generate_signed_url.return_value = "https://signed/upload"
        url = self.storage.generate_upload_url(
            "file.jpg", "d41d8cd98f00b204e9800998ecf8427e", 60, 12
        )
        self.assertEqual(url, "https://signed/upload")
        self.mock_default_bucket.blob.assert_called_once_with("file.jpg")

    def test_delete__missing_object_is_a_no_op(self):
        self.mock_default_bucket.get_blob.return_value = None
        self.storage.delete("blob")

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
        self.assertEqual(
            self.storage.url("blob"), "https://storage.googleapis.com/bucket/blob"
        )

    def test_get_created_time(self):
        self.mock_default_bucket.get_blob.return_value = self.blob_cls("blob", "blob")
        self.assertEqual(
            self.storage.get_created_time("blob"),
            self.blob_cls.return_value.time_created,
        )

    def test_get_stored_object_md5(self):
        mock_blob = self.blob_cls("blob", "blob")
        mock_blob.md5_hash = hex_to_base64("d41d8cd98f00b204e9800998ecf8427e")
        self.mock_default_bucket.get_blob.return_value = mock_blob
        self.assertEqual(
            self.storage.get_stored_object_md5("blob"),
            "d41d8cd98f00b204e9800998ecf8427e",
        )

    def test_get_stored_object_md5__returns_none_if_not_found(self):
        self.mock_default_bucket.get_blob.return_value = None
        self.assertIsNone(self.storage.get_stored_object_md5("blob"))

    def test_get_stored_object_md5_ignores_read_through_bucket(self):
        self.mock_default_bucket.get_blob.return_value = None
        blob = self.blob_cls("blob", "blob")
        blob.md5_hash = hex_to_base64("d41d8cd98f00b204e9800998ecf8427e")
        self.mock_anon_bucket.get_blob.return_value = blob
        self.assertIsNone(self.storage.get_stored_object_md5("blob"))
        self.mock_anon_bucket.get_blob.assert_not_called()


class LazyCompositeGCSTestCase(SimpleTestCase):
    def test_clients_are_created_once_on_first_use(self):
        with override_settings(GCS_EMULATOR_HOST="http://localhost:4443"), mock.patch(
            "contentcuration.utils.gcs_storage.Client"
        ) as client, mock.patch(
            "contentcuration.utils.gcs_storage.Client.create_anonymous_client"
        ):
            storage = CompositeGCS()
            client.assert_not_called()
            storage.exists("first")
            storage.exists("second")
            client.assert_called_once()
            client.create_anonymous_client.assert_not_called()

    @override_settings(GCS_EMULATOR_HOST="http://emulator:4443")
    @mock.patch.dict("os.environ", {"STORAGE_EMULATOR_HOST": "http://emulator:4443"})
    @mock.patch("requests.adapters.HTTPAdapter.send", autospec=True)
    def test_stalled_emulator_bucket_lookup_is_bounded(self, send):
        send.side_effect = requests.exceptions.ReadTimeout
        with self.assertRaisesMessage(ImproperlyConfigured, "http://emulator:4443"):
            CompositeGCS().exists("first")
        send.assert_called_once()
        self.assertEqual(send.call_args.kwargs["timeout"], 5)
        self.assertEqual(
            send.call_args.args[1].path_url.partition("?")[0], "/storage/v1/b/content"
        )

    @override_settings(GCS_EMULATOR_HOST="http://emulator:4443")
    @mock.patch.dict("os.environ", {"STORAGE_EMULATOR_HOST": "http://emulator:4443"})
    @mock.patch("requests.adapters.HTTPAdapter.send", autospec=True)
    def test_emulator_reuses_fetched_bucket(self, send):
        response = requests.Response()
        response.status_code = 200
        response._content = b'{"name": "content"}'
        send.return_value = response

        storage = CompositeGCS()
        self.assertTrue(storage.exists("first"))
        self.assertTrue(storage.exists("second"))
        self.assertEqual(
            [call.args[1].path_url.partition("?")[0] for call in send.call_args_list],
            [
                "/storage/v1/b/content",
                "/storage/v1/b/content/o/first",
                "/storage/v1/b/content/o/second",
            ],
        )

    def _emulator_storage(self, *responses):
        bucket = requests.Response()
        bucket.status_code = 200
        bucket._content = b'{"name": "bucket"}'
        transport = mock.Mock(spec=requests.Session)
        transport.request.side_effect = [bucket, *responses]
        client = Client(
            project="test",
            credentials=AnonymousCredentials(),
            _http=transport,
            client_options={"api_endpoint": "http://emulator:4443"},
        )
        return transport, GoogleCloudStorage(client, "bucket")

    def _assert_download(self, expected):
        metadata = requests.Response()
        metadata.status_code = 200
        metadata._content = (
            b'{"generation": "42", "mediaLink": "http://wrong-host/file"}'
        )
        transport, storage = self._emulator_storage()

        def request(method, url, **kwargs):
            if not kwargs.get("stream"):
                return metadata
            prefix = "http://emulator:4443/download/storage/v1/b/bucket/o/"
            self.assertTrue(url.startswith(prefix), url)
            key = url.removeprefix(prefix).replace("?alt=media&", "?")
            key = key.removesuffix("?alt=media").removesuffix("&alt=media")
            content = {
                "file": b"latest",
                "file?generation=42": b"original",
                "file.bak": b"backup",
            }[key]
            response = requests.Response()
            response.status_code = 200
            response.headers["content-length"] = str(len(content))
            response.raw = HTTPResponse(body=BytesIO(content), preload_content=False)
            return response

        transport.request.side_effect = request
        with storage.open("file") as downloaded:
            self.assertEqual(downloaded.read(), expected)

    @override_settings(GCS_EMULATOR_HOST=None)
    def test_download_preserves_generation(self):
        self._assert_download(b"original")

    @override_settings(GCS_EMULATOR_HOST="http://emulator:4443")
    def test_emulator_download_reads_current_generation(self):
        self._assert_download(b"latest")

    def test_object_without_md5_returns_none(self):
        metadata = requests.Response()
        metadata.status_code = 200
        metadata._content = b'{"name": "clip.mp3"}'
        _, storage = self._emulator_storage(metadata)
        self.assertIsNone(storage.get_stored_object_md5("clip.mp3"))

    def test_open_missing_object_raises_file_not_found(self):
        missing = requests.Response()
        missing.status_code = 404
        missing.raw = HTTPResponse(body=BytesIO(b"Not Found"), preload_content=False)
        missing.request = requests.Request("GET", "http://emulator:4443/").prepare()
        _, storage = self._emulator_storage(missing)
        with self.assertRaises(FileNotFoundError):
            storage.open("file")


class EmulatorDownloadURLTestCase(SimpleTestCase):
    def test_download_through_alias(self):
        name = f"{uuid4().hex}/file #1.txt"
        self.addCleanup(default_storage.delete, name)
        content = b"download through alias"
        default_storage.save(name, ContentFile(content))

        response = requests.get(
            default_storage.url(name), headers={"Host": "storage-alias"}, timeout=5
        )
        response.raise_for_status()
        self.assertEqual(response.content, content)
