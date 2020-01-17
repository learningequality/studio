import pytest

from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import object_storage_name


@pytest.fixture
def object_storage_name_tests():
    return [
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.vtt"  # expected
        ),
        (
            "no_extension",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4"  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "vtt",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt"  # expected
        ),
        (
            "has_extension.txt",  # filename
            "8818ed27d0a84b016eb7907b5b4766c4",  # checksum
            "",  # file_format_id
            "storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.txt"  # expected
        ),
    ]


def test_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        test_file = File(checksum=checksum, file_format_id=file_format_id)

        actual_name = object_storage_name(test_file, filename)

        assert actual_name == expected_name, \
            "Storage names don't match: Expected: '{}' Actual '{}'".format(expected_name,
                                                                           actual_name)


def test_generate_object_storage_name(object_storage_name_tests):
    for filename, checksum, file_format_id, expected_name in object_storage_name_tests:
        default_ext = ''
        if file_format_id:
            default_ext = '.{}'.format(file_format_id)

        actual_name = generate_object_storage_name(checksum, filename, default_ext)

        assert actual_name == expected_name, \
            "Storage names don't match: Expected: '{}' Actual '{}'".format(expected_name,
                                                                           actual_name)
