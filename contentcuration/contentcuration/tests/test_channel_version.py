from django.core.exceptions import ValidationError

from contentcuration.models import ChannelVersion
from contentcuration.models import SecretToken
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


class ChannelVersionTestCase(StudioTestCase):
    def setUp(self):
        super(ChannelVersionTestCase, self).setUp()
        self.channel = testdata.channel()
        self.channel.version = 10
        self.channel.save()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_channel_version(self):
        """Test creating a ChannelVersion."""
        cv = ChannelVersion.objects.create(
            channel=self.channel,
            version=1,
        )
        self.assertEqual(cv.channel, self.channel)
        self.assertEqual(cv.version, 1)
        self.assertIsNone(cv.secret_token)

    def test_new_token_creates_token(self):
        """Test new_token creates a token."""
        cv = ChannelVersion.objects.create(
            channel=self.channel,
            version=1,
        )
        token = cv.new_token()
        self.assertIsInstance(token, SecretToken)
        self.assertFalse(token.is_primary)
        self.assertEqual(cv.secret_token, token)

    def test_new_token_is_idempotent(self):
        """Test new_token returns existing token if present."""
        cv = ChannelVersion.objects.create(
            channel=self.channel,
            version=1,
        )
        token1 = cv.new_token()
        token2 = cv.new_token()
        self.assertEqual(token1, token2)
        self.assertEqual(cv.secret_token, token1)

    def test_unique_constraint(self):
        """Test unique constraint on channel and version."""
        ChannelVersion.objects.create(
            channel=self.channel,
            version=1,
        )

        with self.assertRaises(ValidationError):
            ChannelVersion.objects.create(
                channel=self.channel,
                version=1,
            )

    def test_version_cannot_exceed_channel_version(self):
        """Test that we can't create versions greater than channel.version."""
        from django.core.exceptions import ValidationError

        cv = ChannelVersion(
            channel=self.channel,
            version=11,
        )
        with self.assertRaises(ValidationError):
            cv.save()
