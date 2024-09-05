import uuid

from django.urls import reverse
from search.models import SavedSearch

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import SAVEDSEARCH


class SavedSearchViewsetTestCase(SyncTestMixin, StudioAPITestCase):

    @property
    def savedsearch_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "name": "test",
            "params": {"lang": "en", "keyword": "test"},
        }

    @property
    def savedsearch_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "name": "test",
            "params": {"lang": "en", "keyword": "test"},
            "saved_by": self.user,
        }

    def setUp(self):
        super(SavedSearchViewsetTestCase, self).setUp()
        self.user = testdata.user()
        self.client.force_authenticate(user=self.user)

    def test_create_savedsearch(self):
        savedsearch = self.savedsearch_metadata
        response = self.sync_changes(
            [generate_create_event(savedsearch["id"], SAVEDSEARCH, savedsearch, user_id=self.user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch["id"]))
        except SavedSearch.DoesNotExist:
            self.fail("SavedSearch was not created")

    def test_create_savedsearchs(self):
        savedsearch1 = self.savedsearch_metadata
        savedsearch2 = self.savedsearch_metadata
        response = self.sync_changes(
            [
                generate_create_event(savedsearch1["id"], SAVEDSEARCH, savedsearch1, user_id=self.user.id),
                generate_create_event(savedsearch2["id"], SAVEDSEARCH, savedsearch2, user_id=self.user.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch1["id"]))
        except SavedSearch.DoesNotExist:
            self.fail("SavedSearch 1 was not created")

        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch2["id"]))
        except SavedSearch.DoesNotExist:
            self.fail("SavedSearch 2 was not created")

    def test_delete_savedsearch(self):

        savedsearch = SavedSearch.objects.create(**self.savedsearch_db_metadata)

        response = self.sync_changes(
            [generate_delete_event(savedsearch.id, SAVEDSEARCH, user_id=self.user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch.id))
            self.fail("SavedSearch was not deleted")
        except SavedSearch.DoesNotExist:
            pass

    def test_delete_savedsearchs(self):
        savedsearch1 = SavedSearch.objects.create(**self.savedsearch_db_metadata)

        savedsearch2 = SavedSearch.objects.create(**self.savedsearch_db_metadata)

        response = self.sync_changes(
            [
                generate_delete_event(savedsearch1.id, SAVEDSEARCH, user_id=self.user.id),
                generate_delete_event(savedsearch2.id, SAVEDSEARCH, user_id=self.user.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch1.id))
            self.fail("SavedSearch 1 was not deleted")
        except SavedSearch.DoesNotExist:
            pass

        try:
            SavedSearch.objects.get(id=uuid.UUID(savedsearch2.id))
            self.fail("SavedSearch 2 was not deleted")
        except SavedSearch.DoesNotExist:
            pass

    def test_retrieve_savedsearch(self):
        savedsearch = SavedSearch.objects.create(**self.savedsearch_db_metadata)

        response = self.client.get(reverse("savedsearch-detail", kwargs={"pk": savedsearch.id}))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], savedsearch.id)

    def test_list_savedsearch(self):
        savedsearch1 = SavedSearch.objects.create(**self.savedsearch_db_metadata)
        savedsearch2 = SavedSearch.objects.create(**self.savedsearch_db_metadata)

        response = self.client.get(reverse("savedsearch-list"))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 2)
        sorted_response_data = sorted(response.data, key=lambda x: x["id"])
        sorted_expected_data = sorted([savedsearch1, savedsearch2], key=lambda x: x.id)
        self.assertEqual(sorted_response_data[0]["id"], sorted_expected_data[0].id)
        self.assertEqual(sorted_response_data[1]["id"], sorted_expected_data[1].id)
