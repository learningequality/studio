from contentcuration.models import FormatPreset
from base import StudioTestCase

class GetPresetTestCase(StudioTestCase):

    def test_accepts_string(self):
        """
        Check that if we pass in a string, we won't error out.
        """
        FormatPreset.get_preset("a")

    def test_returns_model_if_correct_preset_name(self):
        """
        Check that we get a Django model if we pass a correct preset name, like PDF.
        """
        preset = "document"
        model = FormatPreset.get_preset(preset)
        assert isinstance(model, FormatPreset)

    def test_returns_none_if_called_with_nonexistent_preset(self):
        """
        Make sure we return None when we pass in a formatpreset that doesn't exist.
        """

        preset = "hats"
        model = FormatPreset.get_preset(preset)
        assert isinstance(model, types.NoneType)

