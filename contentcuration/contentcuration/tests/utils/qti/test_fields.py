import unittest

from contentcuration.utils.assessment.qti.fields import validate_data_uri
from contentcuration.utils.assessment.qti.fields import validate_local_href_path
from contentcuration.utils.assessment.qti.fields import validate_local_src_path
from contentcuration.utils.assessment.qti.fields import validate_local_srcset


class TestValidateDataUri(unittest.TestCase):
    def test_valid_data_uris(self):
        valid_uris = [
            "data:text/plain;base64,SGVsbG8=",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "data:text/plain,Hello%20World",
            "data:,Hello",
            "data:text/html,<h1>Hello</h1>",
            'data:application/json,{"key":"value"}',
            "data:text/css,body{color:red}",
            "data:image/svg+xml,<svg></svg>",
            "data:text/plain;charset=utf-8,Hello",
            "data:text/plain;charset=utf-8;base64,SGVsbG8=",
        ]

        for uri in valid_uris:
            with self.subTest(uri=uri):
                result = validate_data_uri(uri)
                self.assertEqual(result, uri, f"Should return the same URI: {uri}")

    def test_invalid_data_uris(self):
        """Test invalid data URI formats"""
        invalid_uris = [
            "not-a-data-uri",
            "data:",
            "data",
            "http://example.com",
            "https://example.com/image.png",
            "ftp://example.com/file.txt",
            "file:///path/to/file",
            "",
            "data:text/plain",
            "ata:text/plain,Hello",
        ]

        for uri in invalid_uris:
            with self.subTest(uri=uri):
                with self.assertRaises(ValueError) as cm:
                    validate_data_uri(uri)
                self.assertIn("Invalid data URI format", str(cm.exception))


class TestValidateLocalHrefPath(unittest.TestCase):
    def test_valid_relative_paths(self):
        """Test valid relative paths"""
        valid_paths = [
            "relative/path.jpg",
            "../path.jpg",
            "./file.png",
            "file.txt",
            "images/photo.jpg",
            "docs/readme.md",
            "assets/style.css",
            "#fragment",
            "?query=value",
            "#fragment?query=value",
            "path/to/file.html#section",
            "subdir/../file.txt",
        ]

        for path in valid_paths:
            with self.subTest(path=path):
                result = validate_local_href_path(path)
                self.assertEqual(result, path, f"Should return the same path: {path}")

    def test_valid_data_uris_in_href(self):
        data_uris = [
            "data:text/plain,Hello",
            "data:image/png;base64,iVBORw0KGgo=",
        ]

        for uri in data_uris:
            with self.subTest(uri=uri):
                result = validate_local_href_path(uri)
                self.assertEqual(result, uri)

    def test_invalid_absolute_urls(self):
        absolute_urls = [
            "http://example.com",
            "https://example.com/path",
            "ftp://example.com/file",
            "mailto:test@example.com",
            "tel:+1234567890",
            "//example.com/path",
            "/absolute/path",
            "/",
        ]

        for url in absolute_urls:
            with self.subTest(url=url):
                with self.assertRaises(ValueError) as cm:
                    validate_local_href_path(url)
                self.assertIn("Absolute URLs not allowed", str(cm.exception))

    def test_invalid_data_uris_in_href(self):
        """Test that invalid data URIs are rejected"""
        with self.assertRaises(ValueError) as cm:
            validate_local_href_path("data:invalid")
        self.assertIn("Invalid data URI format", str(cm.exception))


class TestValidateLocalSrcPath(unittest.TestCase):
    def test_valid_src_paths(self):
        """Test valid src paths (must have actual file paths)"""
        valid_paths = [
            "relative/path.jpg",
            "../path.jpg",
            "./file.png",
            "file.txt",
            "images/photo.jpg",
            "subdir/../file.txt",
        ]

        for path in valid_paths:
            with self.subTest(path=path):
                result = validate_local_src_path(path)
                self.assertEqual(result, path)

    def test_valid_data_uris_in_src(self):
        data_uris = [
            "data:text/plain,Hello",
            "data:image/png;base64,iVBORw0KGgo=",
        ]

        for uri in data_uris:
            with self.subTest(uri=uri):
                result = validate_local_src_path(uri)
                self.assertEqual(result, uri)

    def test_invalid_empty_paths(self):
        """Test rejection of empty paths and fragment-only"""
        invalid_paths = ["#fragment", "?query=value", "#fragment?query=value"]

        for path in invalid_paths:
            with self.subTest(path=path):
                with self.assertRaises(ValueError) as cm:
                    validate_local_src_path(path)
                self.assertIn("Invalid local src path", str(cm.exception))

    def test_absolute_urls_rejected(self):
        """Test that absolute URLs are still rejected"""
        with self.assertRaises(ValueError) as cm:
            validate_local_src_path("http://example.com/image.jpg")
        self.assertIn("Absolute URLs not allowed", str(cm.exception))


class TestValidateLocalSrcset(unittest.TestCase):
    def test_empty_srcset(self):
        empty_values = ["", "  ", "\t", "\n"]

        for value in empty_values:
            with self.subTest(value=repr(value)):
                result = validate_local_srcset(value)
                self.assertEqual(result, value)

    def test_single_image_srcset(self):
        valid_srcsets = [
            "image.jpg 2x",
            "image.jpg 1.5x",
            "image.jpg 100w",
            "image.jpg 50h",
            "image.jpg 0.5x",
            "path/to/image.png 2x",
            "../images/photo.jpg 1x",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg== 2x",
        ]

        for srcset in valid_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_data_uri_in_srcset(self):
        valid_data_srcsets = [
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg== 1x",
            "data:text/plain,Hello%20World 2x",
            "data:image/svg+xml,<svg><circle r='10'/></svg> 1.5x",
            'data:application/json,{"key":"value"} 100w',
        ]

        for srcset in valid_data_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_multiple_images_srcset(self):
        valid_srcsets = [
            "small.jpg 1x, large.jpg 2x",
            "img-320.jpg 320w, img-640.jpg 640w, img-1280.jpg 1280w",
            "portrait.jpg 480h, landscape.jpg 960h",
            "image1.jpg 1x, image2.jpg 1.5x, image3.jpg 2x",
            "a.jpg 1x,b.jpg 2x",  # minimal spacing
        ]

        for srcset in valid_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_mixed_data_uri_and_regular_paths(self):
        valid_mixed_srcsets = [
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg== 1x, large.jpg 2x",
            "small.jpg 1x, data:image/svg+xml,<svg><rect width='100' height='100'/></svg> 2x",
            "icon.png 1x, data:text/plain,fallback 2x, large.png 3x",
        ]

        for srcset in valid_mixed_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_multiple_data_uris_in_srcset(self):
        valid_multi_data_srcsets = [
            "data:image/png;base64,ABC123 1x, data:image/png;base64,DEF456 2x",
            "data:text/plain,Small,Image 1x, data:text/plain,Large,Image 2x",
            "data:image/svg+xml,<svg><circle r='5'/></svg> 1x, data:image/svg+xml,<svg><circle r='10'/></svg> 2x, data:image/svg+xml,<svg><circle r='15'/></svg> 3x",  # noqa: E501
            'data:application/json,{"size":"small"} 100w, data:application/json,{"size":"large"} 200w',
        ]

        for srcset in valid_multi_data_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_complex_mixed_srcsets(self):
        complex_srcsets = [
            "thumb.jpg 1x, data:image/png;base64,MID123 1.5x, data:image/svg+xml,<svg><rect/></svg> 2x, large.jpg 3x",
            "data:text/plain,Icon,1 50w, regular-100.jpg 100w, data:text/plain,Icon,2 150w, regular-200.jpg 200w",
        ]

        for srcset in complex_srcsets:
            with self.subTest(srcset=srcset):
                result = validate_local_srcset(srcset)
                self.assertEqual(result, srcset)

    def test_invalid_descriptors(self):
        """Test rejection of invalid descriptors"""
        invalid_srcsets = [
            "image.jpg 2",  # missing unit
            "image.jpg x",  # missing number
            "image.jpg 2z",  # invalid unit
            "image.jpg 2.x",  # malformed number
            "image.jpg .x",  # malformed number
            "image.jpg 2xx",  # double unit
            "image.jpg -2x",  # negative number
            "image.jpg 2 x",  # space in descriptor
        ]

        for srcset in invalid_srcsets:
            with self.subTest(srcset=srcset):
                with self.assertRaises(ValueError):
                    validate_local_srcset(srcset)

    def test_invalid_urls_in_srcset(self):
        invalid_srcsets = [
            "http://example.com/image.jpg 2x",
            "https://cdn.example.com/img.png 1x, local.jpg 2x",
            "/absolute/path.jpg 1x",
        ]

        for srcset in invalid_srcsets:
            with self.subTest(srcset=srcset):
                with self.assertRaises(ValueError):
                    validate_local_srcset(srcset)

    def test_empty_srcset_entries(self):
        invalid_srcsets = [
            "image.jpg 2x, ,other.jpg 1x",
            ", image.jpg 2x",
            "image.jpg 2x,",
        ]

        for srcset in invalid_srcsets:
            with self.subTest(srcset=srcset):
                with self.assertRaises(ValueError):
                    validate_local_srcset(srcset)

    def test_missing_path_in_srcset(self):
        invalid_srcsets = [
            "#fragment 2x",
            "?query=value 1x",
        ]

        for srcset in invalid_srcsets:
            with self.subTest(srcset=srcset):
                with self.assertRaises(ValueError):
                    validate_local_srcset(srcset)


class TestEdgeCases(unittest.TestCase):
    def test_unicode_paths_href(self):
        unicode_paths = ["café/ñ.jpg", "文件/图片.png", "файл.txt"]

        for path in unicode_paths:
            with self.subTest(path=path):
                result = validate_local_href_path(path)
                self.assertEqual(result, path)

    def test_unicode_paths_src(self):
        unicode_paths = ["café/ñ.jpg", "文件/图片.png", "файл.txt"]

        for path in unicode_paths:
            with self.subTest(path=path):
                result = validate_local_src_path(path)
                self.assertEqual(result, path)

    def test_very_long_paths(self):
        long_path = "a/" * 1000 + "file.txt"

        # Should handle long paths gracefully
        result = validate_local_href_path(long_path)
        self.assertEqual(result, long_path)

    def test_special_characters_in_data_uri(self):
        special_data_uris = [
            "data:text/plain,Hello%20World%21",
            "data:text/plain,<>&\"'",
            'data:application/json,{"key":"value"}',
        ]

        for uri in special_data_uris:
            with self.subTest(uri=uri):
                result = validate_data_uri(uri)
                self.assertEqual(result, uri)
