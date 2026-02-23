from uuid import UUID

from kolibri_public.models import ChannelMetadata
from kolibri_public.tests.utils.mixer import KolibriPublicMixer
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.models import ContentNode
from contentcuration.models import Country
from contentcuration.models import SecretToken
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query


class ChannelMetadataViewSetTestCase(StudioAPITestCase):
    def test_annotate_countries(self):
        mixer = KolibriPublicMixer()

        country1 = mixer.blend(Country, code="C1")
        country2 = mixer.blend(Country, code="C2")
        country3 = mixer.blend(Country, code="C3")

        channel = mixer.blend(
            ChannelMetadata, countries=[country1, country2, country3], public=False
        )

        user = testdata.user("any@user.com")
        self.client.force_authenticate(user)

        response = self.client.get(
            reverse_with_query(
                "publicchannel-detail",
                args=[channel.id],
                query={"public": "false"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(response.data["countries"], ["C1", "C2", "C3"])


class ChannelMetadataFilterTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        mixer = KolibriPublicMixer()

        self.categories = [
            SUBJECTSLIST[0],
            SUBJECTSLIST[1],
            SUBJECTSLIST[2],
            SUBJECTSLIST[3],
        ]
        self.category_bitmasks = [
            1,
            2,
            4,
            8,
        ]

        mixer.blend(Country, code="C1")
        mixer.blend(Country, code="C2")
        mixer.blend(Country, code="C3")

        self.user = testdata.user("any@user.com")

        # Manually set the bitmasks for testing
        self.metadata1 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[1]
                | self.category_bitmasks[3]
            ),
            countries=["C1", "C3"],
            public=False,
        )
        self.metadata2 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[2]
                | self.category_bitmasks[3]
            ),
            countries=["C1", "C2", "C3"],
            public=False,
        )
        self.metadata3 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[1]
                | self.category_bitmasks[2]
            ),
            countries=["C3"],
            public=False,
        )

    def test_filter_by_categories_bitmask__provided(self):
        self.client.force_authenticate(self.user)

        filter_query = {
            "categories": f"{self.categories[0]},{self.categories[1]}",
            "public": "false",
        }

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query=filter_query,
            ),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [UUID(item["id"]) for item in response.data],
            [UUID(self.metadata1.id), UUID(self.metadata3.id)],
        )

    def test_filter_by_categories_bitmask__not_provided(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"public": "false"},
            ),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [UUID(item["id"]) for item in response.data],
            [UUID(self.metadata1.id), UUID(self.metadata2.id), UUID(self.metadata3.id)],
        )

    def test_filter_by_countries(self):
        self.client.force_authenticate(self.user)

        filter_query = {"countries": "C1,C2", "public": "false"}

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query=filter_query,
            ),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [UUID(item["id"]) for item in response.data],
            [UUID(self.metadata1.id), UUID(self.metadata2.id)],
        )

        response1 = next(
            filter(
                lambda item: UUID(item["id"]) == UUID(self.metadata1.id), response.data
            )
        )
        response2 = next(
            filter(
                lambda item: UUID(item["id"]) == UUID(self.metadata2.id), response.data
            )
        )

        self.assertCountEqual(response1["countries"], ["C1", "C3"])
        self.assertCountEqual(response2["countries"], ["C1", "C2", "C3"])


class ChannelMetadataTokenFilterTestCase(StudioAPITestCase):
    """
    Test cases for token-based filtering in ChannelMetadataViewSet.
    """

    def setUp(self):
        super().setUp()
        self.user = testdata.user("any@user.com")
        self.client.force_authenticate(self.user)
        self.categories = [
            SUBJECTSLIST[0],
            SUBJECTSLIST[1],
        ]

    def _create_channel_with_main_tree(self, mixer):
        """
        Helper method to create a Channel with a published main_tree.
        """
        root_node = ContentNode.objects.create(published=True)
        channel = Channel.objects.create(
            actor_id=self.user.id,
            deleted=False,
            public=False,
            main_tree=root_node,
        )
        public_root_node = mixer.blend("kolibri_public.ContentNode")
        return channel, public_root_node

    def test_filter_by_channel_token(self):
        """
        Test that filtering by a channel's secret_token returns the correct channel.
        """
        mixer = KolibriPublicMixer()

        channel, public_root_node = self._create_channel_with_main_tree(mixer)
        token = SecretToken.objects.create(token="testchanneltokenabc", is_primary=True)
        channel.secret_tokens.add(token)

        metadata = mixer.blend(
            ChannelMetadata, id=channel.id, root=public_root_node, public=False
        )

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"token": "testchanneltokenabc"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(UUID(response.data[0]["id"]), UUID(metadata.id))
        self.assertEqual(response.data[0]["countries"], [])

    def test_filter_by_channel_version_token(self):
        """
        Test that filtering by a ChannelVersion's secret_token returns the correct channel
        with version-specific data.
        """
        mixer = KolibriPublicMixer()

        channel, public_root_node = self._create_channel_with_main_tree(mixer)
        channel.version = 5
        channel.save()

        token = SecretToken.objects.create(
            token="testversiontokenxyz", is_primary=False
        )
        ChannelVersion.objects.create(
            channel=channel,
            version=3,
            secret_token=token,
            size=123456789,
            resource_count=100,
            included_languages=["en", "es"],
            included_categories=self.categories,
        )

        metadata = mixer.blend(
            ChannelMetadata,
            id=channel.id,
            root=public_root_node,
            published_size=999999999,
            total_resource_count=200,
            public=False,
        )

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"token": "testversiontokenxyz"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(UUID(response.data[0]["id"]), UUID(metadata.id))
        self.assertEqual(response.data[0]["published_size"], 123456789)
        self.assertEqual(response.data[0]["total_resource_count"], 100)
        self.assertCountEqual(response.data[0]["included_languages"], ["en", "es"])
        self.assertCountEqual(response.data[0]["categories"], self.categories)
        self.assertEqual(response.data[0]["countries"], [])

    def test_token_filter_disabled_when_token_not_provided(self):
        """
        Test that regular filters still work when no token is provided.
        """
        mixer = KolibriPublicMixer()

        metadata1 = mixer.blend(ChannelMetadata, public=True)
        mixer.blend(ChannelMetadata, public=False)

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"public": "true"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(UUID(response.data[0]["id"])), str(metadata1.id))

    def test_token_filter_disables_other_filters(self):
        """
        Test that when a token is provided, other query parameters are ignored.
        """
        mixer = KolibriPublicMixer()

        channel, public_root_node = self._create_channel_with_main_tree(mixer)
        token = SecretToken.objects.create(
            token="testignorefilterstoken", is_primary=True
        )
        channel.secret_tokens.add(token)

        metadata = mixer.blend(
            ChannelMetadata, id=channel.id, root=public_root_node, public=False
        )

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"token": "testignorefilterstoken", "public": "true"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(UUID(response.data[0]["id"]), UUID(metadata.id))

    def test_token_normalization_removes_dashes(self):
        """
        Test that tokens are normalized by removing dashes.
        """
        mixer = KolibriPublicMixer()

        channel, public_root_node = self._create_channel_with_main_tree(mixer)
        token = SecretToken.objects.create(token="abcd1234efgh5678", is_primary=True)
        channel.secret_tokens.add(token)

        metadata = mixer.blend(
            ChannelMetadata, id=channel.id, root=public_root_node, public=False
        )

        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"token": "abcd-1234-efgh-5678"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(UUID(response.data[0]["id"]), UUID(metadata.id))

    def test_nonexistent_token_returns_empty_list(self):
        """
        Test that a non-existent token returns an empty list.
        """
        response = self.client.get(
            reverse_with_query(
                "publicchannel-list",
                query={"token": "nonexistent-token-12345"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 0)
