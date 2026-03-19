from uuid import UUID

from kolibri_public.models import ChannelMetadata
from kolibri_public.tests.utils.mixer import KolibriPublicMixer
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.models import Country
from contentcuration.models import Language
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


class ChannelMetadataSearchFilterTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        mixer = KolibriPublicMixer()
        self.user = testdata.user("search@user.com")

        self.channel_alpha = mixer.blend(
            ChannelMetadata,
            name="Alpha Mathematics Course",
            description="A course about algebra and calculus",
            tagline="",
            public=False,
        )
        self.channel_beta = mixer.blend(
            ChannelMetadata,
            name="Beta Science Module",
            description="Covers physics and chemistry",
            tagline="Learn science today",
            public=False,
        )
        self.channel_gamma = mixer.blend(
            ChannelMetadata,
            name="Gamma History",
            description="World history overview",
            tagline="",
            public=False,
        )

    def _list(self, query):
        self.client.force_authenticate(self.user)
        return self.client.get(reverse_with_query("publicchannel-list", query=query))

    def test_search_by_name(self):
        response = self._list({"search": "Mathematics", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        self.assertIn(UUID(self.channel_alpha.id), ids)
        self.assertNotIn(UUID(self.channel_beta.id), ids)
        self.assertNotIn(UUID(self.channel_gamma.id), ids)

    def test_search_case_insensitive(self):
        response = self._list({"search": "mathematics", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        self.assertIn(UUID(self.channel_alpha.id), ids)

    def test_search_no_results(self):
        response = self._list({"search": "zzznomatch999", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 0)

    def test_search_combined_with_countries(self):
        country, _ = Country.objects.get_or_create(
            code="MX", defaults={"name": "Mexico"}
        )
        self.channel_alpha.countries.add(country)

        response = self._list(
            {"search": "Mathematics", "countries": "MX", "public": "false"}
        )
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        self.assertIn(UUID(self.channel_alpha.id), ids)
        self.assertNotIn(UUID(self.channel_gamma.id), ids)


class ChannelMetadataLanguageFilterTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        mixer = KolibriPublicMixer()
        self.user = testdata.user("lang@user.com")

        self.lang_en = Language.objects.get_or_create(
            id="en", defaults={"lang_code": "en", "readable_name": "English"}
        )[0]
        self.lang_fr = Language.objects.get_or_create(
            id="fr", defaults={"lang_code": "fr", "readable_name": "French"}
        )[0]
        self.lang_ar = Language.objects.get_or_create(
            id="ar", defaults={"lang_code": "ar", "readable_name": "Arabic"}
        )[0]

        # channel_en: primary language English
        self.channel_en = mixer.blend(ChannelMetadata, public=False)
        self.channel_en.root.lang = self.lang_en
        self.channel_en.root.save()
        self.channel_en.included_languages.add(self.lang_en)

        # channel_fr: primary language French, also includes Arabic
        self.channel_fr = mixer.blend(ChannelMetadata, public=False)
        self.channel_fr.root.lang = self.lang_fr
        self.channel_fr.root.save()
        self.channel_fr.included_languages.add(self.lang_ar, self.lang_fr)

        # channel_multi: no primary language, but includes English and French
        self.channel_multi = mixer.blend(ChannelMetadata, public=False)
        self.channel_multi.included_languages.add(self.lang_en, self.lang_fr)

    def _list(self, query):
        self.client.force_authenticate(self.user)
        return self.client.get(reverse_with_query("publicchannel-list", query=query))

    def test_filter_by_included_language(self):
        response = self._list({"languages": "ar", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        self.assertIn(UUID(self.channel_fr.id), ids)
        self.assertNotIn(UUID(self.channel_en.id), ids)
        self.assertNotIn(UUID(self.channel_multi.id), ids)

    def test_filter_by_multiple_languages(self):
        response = self._list({"languages": "en,fr", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        print("ids", ids)
        self.assertIn(UUID(self.channel_en.id), ids)
        self.assertIn(UUID(self.channel_fr.id), ids)
        self.assertIn(UUID(self.channel_multi.id), ids)

    def test_filter_languages_combined_with_search(self):
        self.channel_en.name = "English Math Channel"
        self.channel_en.save()
        self.channel_multi.name = "English Science Channel"
        self.channel_multi.save()

        response = self._list({"languages": "en", "search": "Math", "public": "false"})
        self.assertEqual(response.status_code, 200, response.content)
        ids = [UUID(item["id"]) for item in response.data]
        self.assertIn(UUID(self.channel_en.id), ids)
        self.assertNotIn(UUID(self.channel_multi.id), ids)
