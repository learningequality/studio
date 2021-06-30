from __future__ import absolute_import

import types

from .base import StudioTestCase
from contentcuration.models import FormatPreset


class GetPresetTestCase(StudioTestCase):

    @staticmethod
    def test_accepts_string():
        """
        Check that if we pass in a string, we won't error out.
        """
        FormatPreset.get_preset("a")

    @staticmethod
    def test_returns_model_if_correct_preset_name():
        """
        Check that we get a Django model if we pass a correct preset name, like PDF.
        """
        preset = "document"
        model = FormatPreset.get_preset(preset)
        assert isinstance(model, FormatPreset)

    @staticmethod
    def test_returns_none_if_called_with_nonexistent_preset():
        """
        Make sure we return None when we pass in a formatpreset that doesn't exist.
        """

        preset = "hats"
        model = FormatPreset.get_preset(preset)
        assert isinstance(model, type(None))


class GuessFormatPresetTestCase(StudioTestCase):

    @staticmethod
    def test_accepts_string():
        """
        Make sure we don't raise an error if we pass a string.
        """
        FormatPreset.guess_format_preset("a")

    @staticmethod
    def test_returns_model_if_correct_preset_name():
        """
        Check that we return a FormatPreset model instance.
        """
        filename = "blah.pdf"
        model = FormatPreset.guess_format_preset(filename)
        assert isinstance(model, FormatPreset)

    @staticmethod
    def test_returns_none_if_unknown_extension():
        """
        Check that we return a None for an unknown format.
        """
        filename = "blah.hat"
        model = FormatPreset.guess_format_preset(filename)
        assert isinstance(model, type(None))
