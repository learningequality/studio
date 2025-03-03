from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import languages
from le_utils.constants import licenses

from .base import StudioTestCase
from contentcuration.models import ContentKind
from contentcuration.models import File
from contentcuration.models import FileFormat
from contentcuration.models import FormatPreset
from contentcuration.models import generate_object_storage_name
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.utils.files import get_file_diff


class TestTheTestsTestCase(StudioTestCase):
    def test_we_are_testing(self):
        """
        This test checks that the Django settings for the test suite are properly set.
        """
        assert settings.RUNNING_TESTS


class GetFileDiffTestCase(StudioTestCase):
    """
    Tests for contentcuration.utils.get_file_diff.
    """

    def setUp(self):
        super(GetFileDiffTestCase, self).setUp()
        storage = default_storage
        # Upload some pieces of content, as our test data

        self.existing_content = "dowereallyexist.jpg"
        self.existing_content_path = generate_object_storage_name("dowereallyexist", self.existing_content)
        storage.save(self.existing_content_path, BytesIO(b"maybe"))

    def test_returns_empty_if_content_already_exists(self):
        """Test if get_file_diff returns an empty list if all the files we pass in are
        already present in our storage system.

        We should only have one piece of content in our storage system, so we
        pass a singleton list containing that. get_file_diff should then return an empty list.
        """

        files = [self.existing_content]
        assert get_file_diff(files) == []

    def test_returns_file_not_uploaded_yet(self):
        """

        Test if a list with a nonexistent file passed in to get_file_diff
        would return that file.
        """
        files = [
            self.existing_content,
            "rando"
        ]
        assert get_file_diff(files) == ["rando"]


class FileFormatsTestCase(StudioTestCase):
    """
    Ensure that unsupported files aren't saved.
    """

    def test_unsupported_files_raise_error(self):
        unsupported_file = File.objects.create(
            file_on_disk=ContentFile(b"test"),
            checksum='aaa'
        )

        with self.assertRaises(Exception):
            unsupported_file.file_on_disk.save("aaa.wtf", ContentFile("aaa"))

    def test_guess_format_from_extension(self):
        """
        Make sure that we can guess file types listed in le_utils.file_formats.choices.
        Note: if this test fails, it's likely because le_utils file formats aren't synced.
        """
        known_extensions = list(dict(file_formats.choices).keys())

        for ext in known_extensions:
            file_with_ext = File.objects.create(
                file_on_disk=ContentFile(b"test"),
                checksum="aaa"
            )

            try:
                file_with_ext.file_on_disk.save("aaa.{}".format(ext), ContentFile("aaa"))
            except Exception as e:
                raise type(e)(e.message + " ... (hint: make sure that the version of le-utils you're using has its file formats synced).")


class LEUtilsListsTestCase(TestCase):
    """
    Ensure that le-utils has the necessay lists to populate the Studio models.
    """

    def test_le_utils_has_all_consstants_lists(self):
        assert licenses.LICENSELIST, 'licenses.LICENSELIST missing from LE-UTILS!'
        assert content_kinds.KINDLIST, 'content_kinds.KINDLIST missing from LE-UTILS!'
        assert languages.LANGUAGELIST, 'languages.LANGUAGELIST missing from LE-UTILS!'
        assert file_formats.FORMATLIST, 'file_formats.FORMATLIST missing from LE-UTILS!'
        assert format_presets.PRESETLIST, 'format_presets.PRESETLIST missing from LE-UTILS!'

    def test_le_utils_has_all_choices(self):
        """Used for django model choices fields to provide validation."""
        assert content_kinds.choices, 'content_kinds.choices missing from LE-UTILS!'
        assert format_presets.choices, 'format_presets.choices missing from LE-UTILS!'
        assert file_formats.choices, 'file_formats.choices missing from LE-UTILS!'


class LoadConstantsManagementCommandTestCase(TestCase):
    """
    Check `loadconstants` works.
    """
    models = [
        ContentKind,
        FileFormat,
        FormatPreset,
        Language,
        License
    ]

    def test_starting_from_empty_db(self):
        for model in self.models:
            qset = model.objects.all()
            assert len(list(qset)) == 0, 'Constants of type {} already exist.'.format(str(model))

    def test_models_exist_after_loadconstants(self):
        call_command("loadconstants")
        for model in self.models:
            qset = model.objects.all()
            assert len(list(qset)) > 3, 'Only {} constants of type {} created.'.format(len(list(qset)), str(model))
