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

    def test_get_draft_token_returns_token_when_draft_version_exists(self):
        """Test get_draft_token returns the secret_token of the version=None ChannelVersion."""
        draft_version = ChannelVersion.objects.create(
            channel=self.channel,
            version=None,
        )
        token = draft_version.new_token()

        result = self.channel.get_draft_token()
        self.assertEqual(result, token)
        self.assertIsInstance(result, SecretToken)
        self.assertFalse(result.is_primary)

    def test_get_draft_token_returns_none_when_no_draft_version(self):
        """Test get_draft_token returns None when no version=None ChannelVersion exists."""
        # Only create versioned ChannelVersions (not drafts)
        ChannelVersion.objects.create(
            channel=self.channel,
            version=1,
        )
        result = self.channel.get_draft_token()
        self.assertIsNone(result)

    def test_get_draft_token_returns_none_when_draft_has_no_token(self):
        """Test get_draft_token returns None when a draft version exists but has no token."""
        ChannelVersion.objects.create(
            channel=self.channel,
            version=None,
        )
        result = self.channel.get_draft_token()
        self.assertIsNone(result)
