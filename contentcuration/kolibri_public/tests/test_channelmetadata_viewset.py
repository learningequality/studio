from uuid import UUID

from django.urls import reverse
from kolibri_public.models import ChannelMetadata
from kolibri_public.tests.utils.mixer import KolibriPublicMixer
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.models import Country
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query


class ChannelMetadataViewSetTestCase(StudioAPITestCase):
    def test_annotate_countries(self):
        mixer = KolibriPublicMixer()

        country1 = mixer.blend(Country, code="C1")
        country2 = mixer.blend(Country, code="C2")
        country3 = mixer.blend(Country, code="C3")

        channel = mixer.blend(ChannelMetadata, countries=[country1, country2, country3])

        user = testdata.user("any@user.com")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("publicchannel-detail", args=[channel.id]))

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

        self.user = testdata.user("any@user.com")

        # Manually set the bitmasks for testing
        self.metadata1 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[1]
                | self.category_bitmasks[3]
            ),
        )
        self.metadata2 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[2]
                | self.category_bitmasks[3]
            ),
        )
        self.metadata3 = mixer.blend(
            ChannelMetadata,
            categories_bitmask_0=(
                self.category_bitmasks[0]
                | self.category_bitmasks[1]
                | self.category_bitmasks[2]
            ),
        )

    def test_filter_by_categories_bitmask__provided(self):
        self.client.force_authenticate(self.user)

        filter_query = {"categories": f"{self.categories[0]},{self.categories[1]}"}

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
            reverse("publicchannel-list"),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [UUID(item["id"]) for item in response.data],
            [UUID(self.metadata1.id), UUID(self.metadata2.id), UUID(self.metadata3.id)],
        )
