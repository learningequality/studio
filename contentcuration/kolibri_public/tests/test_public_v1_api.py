from django.conf import settings
from django.core.cache import cache
from django.urls import reverse

from contentcuration.constants import community_library_submission as cls_constants
from contentcuration.models import ChannelVersion
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.testdata import generated_base64encoding


class PublicAPITestCase(BaseAPITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    def setUp(self):
        super(PublicAPITestCase, self).setUp()
        self.channel_list_url = reverse(
            "get_public_channel_list", kwargs={"version": "v1"}
        )
        cache.clear()

    def test_info_endpoint(self):
        """
        Test that the public info endpoint returns the correct identifying information
        about Studio.
        """
        response = self.client.get(reverse("info"))
        self.assertEqual(response.data["application"], "studio")
        self.assertEqual(response.data["device_name"], "Kolibri Studio")
        self.assertEqual(
            response.data["instance_id"], "ef896e7b7bbf5a359371e6f7afd28742"
        )

    def test_empty_public_channels(self):
        """
        Ensure that we get a valid, but empty, JSON response when there are no
        public channels.
        """
        response = self.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        self.assertEqual(
            response["Cache-Control"],
            "max-age={}".format(settings.PUBLIC_CHANNELS_CACHE_DURATION),
        )
        # we can't test the Vary header, because it will not match what we set it to
        # see info in contentcuration.decorators.cache_no_user_data notes.

    def test_public_channels_endpoint(self):
        """
        Test that the public channels endpoint returns information about
        public channels and that this information is correct.
        """

        # call with an empty list first to make sure we get a cached version
        response = self.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        self.channel.public = True
        self.channel.thumbnail_encoding = {"base64": generated_base64encoding()}
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        # this will clear the channel cache, so the next call should return the updated version
        self.channel.save()

        response = self.client.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)

        assert len(response.data) == 1
        first_channel = response.data[0]
        self.assertEqual(first_channel["name"], self.channel.name)
        self.assertEqual(first_channel["id"], self.channel.id)
        self.assertEqual(first_channel["icon_encoding"], generated_base64encoding())

    def test_public_channel_lookup_with_channel_version_token_uses_channel_version(
        self,
    ):
        """
        A channel version token should resolve to the matched ChannelVersion,
        not the channel's current published version.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()

        self.channel.version = 7
        self.channel.published_data = {
            "2": {"version_notes": "v2 notes"},
            "4": {"version_notes": "v4 notes"},
            "7": {"version_notes": "v7 notes"},
        }
        self.channel.save()

        channel_version, _created = ChannelVersion.objects.get_or_create(
            channel=self.channel,
            version=4,
            defaults={
                "kind_count": [],
                "included_languages": [],
                "resource_count": 0,
                "size": 0,
            },
        )
        version_token = channel_version.new_token().token

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url + "?channel_versions=true")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["version"], 4)
        self.assertNotEqual(response.data[0]["version"], self.channel.version)
        self.assertEqual(
            response.data[0]["version_notes"], {2: "v2 notes", 4: "v4 notes"}
        )

    def test_public_channel_lookup_channel_version_and_channel_tokens_have_same_keys(
        self,
    ):
        """
        Lookup responses from channel-version-token and channel-token endpoints
        should expose the same top-level keys, even if values differ.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()

        self.channel.version = 9
        self.channel.published_data = {
            "3": {"version_notes": "v3 notes"},
            "9": {"version_notes": "v9 notes"},
        }
        self.channel.save()

        latest_channel_version, _created = ChannelVersion.objects.get_or_create(
            channel=self.channel,
            version=9,
            defaults={
                "kind_count": [],
                "included_languages": [],
                "resource_count": 0,
                "size": 0,
            },
        )
        latest_version_token = latest_channel_version.new_token().token
        channel_token = self.channel.make_token().token

        channel_version_response = self.client.get(
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": latest_version_token},
            )
            + "?channel_versions=true"
        )
        channel_response = self.client.get(
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": channel_token},
            )
        )

        self.assertEqual(channel_version_response.status_code, 200)
        self.assertEqual(channel_response.status_code, 200)
        self.assertEqual(len(channel_version_response.data), 1)
        self.assertEqual(len(channel_response.data), 1)

        self.assertSetEqual(
            set(channel_version_response.data[0].keys()),
            set(channel_response.data[0].keys()),
        )

    def test_channel_version_token_returns_snapshot_info_not_current_channel_info(self):
        """
        When a channel version token is used, the returned name, description, and
        thumbnail should come from the ChannelVersion snapshot captured at publish time,
        not from the channel's current (possibly updated) values.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()

        # Set the channel info BEFORE the ChannelVersion is created so that the
        # snapshot captures these values.
        self.channel.name = "Original Published Name"
        self.channel.description = "Original published description"
        self.channel.thumbnail_encoding = {"base64": generated_base64encoding()}
        self.channel.version = 3
        self.channel.published_data = {"3": {"version_notes": "v3 notes"}}
        self.channel.save()

        # The ChannelVersion for version == channel.version is auto-created by
        # Channel.on_update(); re-fetch it to get the snapshot that was captured.
        channel_version = ChannelVersion.objects.get(channel=self.channel, version=3)
        version_token = channel_version.new_token().token

        # Now mutate the channel's info AFTER the snapshot was taken.
        self.channel.name = "Updated Name — should NOT appear in response"
        self.channel.description = "Updated description — should NOT appear in response"
        self.channel.thumbnail_encoding = {"base64": "UPDATED_ENCODING"}
        self.channel.save()

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url + "?channel_versions=true")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        result = response.data[0]

        # Values must match the snapshot, not the current channel state.
        self.assertEqual(result["name"], "Original Published Name")
        self.assertEqual(result["description"], "Original published description")
        self.assertEqual(result["icon_encoding"], generated_base64encoding())

        # Sanity-check: confirm the channel itself now has the updated values.
        self.channel.refresh_from_db()
        self.assertNotEqual(result["name"], self.channel.name)
        self.assertNotEqual(result["description"], self.channel.description)

    def test_channel_version_token_lookup_requires_channel_versions_param(self):
        """
        Without channel_versions=true, a channel-version token must return 404.
        With channel_versions=true it must return 200 with the correct version.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 4
        self.channel.published_data = {"4": {"version_notes": "v4 notes"}}
        self.channel.save()
        # Channel.on_update() auto-creates ChannelVersion(version=4) when channel.save() is called.
        # The get_or_create below finds that existing record; defaults are not applied.
        # new_token() creates the secret token if it doesn't already exist.
        channel_version, _created = ChannelVersion.objects.get_or_create(
            channel=self.channel,
            version=4,
            defaults={
                "kind_count": [],
                "included_languages": [],
                "resource_count": 0,
                "size": 0,
            },
        )
        version_token = channel_version.new_token().token

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )

        # Without the param: must 404
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 404)

        # With channel_versions=true: must 200 with the correct version
        response = self.client.get(lookup_url + "?channel_versions=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["version"], 4)

    def test_channel_version_token_without_param_returns_404(self):
        """
        A channel-version token used without ?channel_versions=true returns 404.
        The gate must be active by default so older Kolibri clients never
        accidentally receive data they cannot parse correctly.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 11
        self.channel.published_data = {"11": {"version_notes": "v11 notes"}}
        self.channel.save()

        channel_version, _created = ChannelVersion.objects.get_or_create(
            channel=self.channel,
            version=11,
            defaults={
                "kind_count": [],
                "included_languages": [],
                "resource_count": 0,
                "size": 0,
            },
        )
        version_token = channel_version.new_token().token

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )

        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 404)

    def test_channel_version_token_with_approved_submission_returns_library_community(
        self,
    ):
        """
        A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
        with APPROVED status returns library: "COMMUNITY".
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 5
        self.channel.published_data = {"5": {"version_notes": "v5 notes"}}
        self.channel.save()

        # CommunityLibrarySubmission.save() calls ChannelVersion.objects.get_or_create(version=5)
        # (finding the one already created by Channel.on_update()) and then calls new_token()
        # to create the secret token. self.user is already an editor of self.channel (from setUp).
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=5,
            author=self.user,
            status=cls_constants.STATUS_APPROVED,
        )

        channel_version = ChannelVersion.objects.get(channel=self.channel, version=5)
        version_token = channel_version.secret_token.token

        lookup_url = (
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": version_token},
            )
            + "?channel_versions=true"
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["library"], "COMMUNITY")

    def test_channel_version_token_with_live_submission_returns_library_community(self):
        """
        A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
        with LIVE status returns library: "COMMUNITY".
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 7
        self.channel.published_data = {"7": {"version_notes": "v7 notes"}}
        self.channel.save()

        # CommunityLibrarySubmission.save() validates that self.channel.public is False
        # (it is False by default) and that self.user is a channel editor (added in setUp).
        # It also calls ChannelVersion.objects.get_or_create(version=7) and new_token().
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=7,
            author=self.user,
            status=cls_constants.STATUS_LIVE,
        )

        channel_version = ChannelVersion.objects.get(channel=self.channel, version=7)
        version_token = channel_version.secret_token.token

        lookup_url = (
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": version_token},
            )
            + "?channel_versions=true"
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["library"], "COMMUNITY")

    def test_channel_version_token_with_pending_submission_returns_library_null(self):
        """
        A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
        with PENDING status (not approved or live) returns library: null.
        This validates that the status filter in _get_channel_version_library is correct.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 8
        self.channel.published_data = {"8": {"version_notes": "v8 notes"}}
        self.channel.save()

        # CommunityLibrarySubmission with PENDING status should NOT qualify.
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=8,
            author=self.user,
            status=cls_constants.STATUS_PENDING,
        )

        channel_version = ChannelVersion.objects.get(channel=self.channel, version=8)
        version_token = channel_version.secret_token.token

        lookup_url = (
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": version_token},
            )
            + "?channel_versions=true"
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data[0]["library"])

    def test_channel_version_token_without_submission_returns_library_null(self):
        """
        A channel-version token with no associated CommunityLibrarySubmission
        returns library: null.
        """
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 6
        self.channel.published_data = {"6": {"version_notes": "v6 notes"}}
        self.channel.save()

        # Channel.on_update() creates ChannelVersion(version=6); get_or_create finds it.
        # No CommunityLibrarySubmission is created, so no token is auto-generated.
        # new_token() creates the secret token here.
        channel_version, _created = ChannelVersion.objects.get_or_create(
            channel=self.channel,
            version=6,
            defaults={
                "kind_count": [],
                "included_languages": [],
                "resource_count": 0,
                "size": 0,
            },
        )
        version_token = channel_version.new_token().token

        lookup_url = (
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": version_token},
            )
            + "?channel_versions=true"
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data[0]["library"])

    def test_public_channel_token_returns_library_kolibri(self):
        """
        A regular channel token for a public channel returns library: "KOLIBRI".
        """
        self.channel.public = True
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.save()

        channel_token = self.channel.make_token().token

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": channel_token},
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["library"], "KOLIBRI")

    def test_non_public_channel_token_returns_library_null(self):
        """
        A regular channel token for a non-public channel returns library: null.
        """
        self.channel.public = False
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.save()

        channel_token = self.channel.make_token().token

        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": channel_token},
        )
        response = self.client.get(lookup_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data[0]["library"])
