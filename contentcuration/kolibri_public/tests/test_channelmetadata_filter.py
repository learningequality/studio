from uuid import UUID

from django.urls import reverse
from kolibri_public.models import ChannelMetadata
from kolibri_public.tests.utils.mixer import KolibriPublicMixer
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query


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
