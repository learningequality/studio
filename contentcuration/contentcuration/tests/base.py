from django.core.management import call_command
from django.test import TestCase

from contentcuration.utils import minio_utils
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APIRequestFactory, APITestCase, force_authenticate

import testdata


class StudioTestCase(TestCase):

    @classmethod
    def setUpClass(cls):
        super(StudioTestCase, cls).setUpClass()
        call_command('loadconstants')

    def setUp(self):
        minio_utils.ensure_storage_bucket_public()

    def tearDown(self):
        minio_utils.ensure_bucket_deleted()


class StudioAPITestCase(APITestCase):

    @classmethod
    def setUpClass(cls):
        super(StudioAPITestCase, cls).setUpClass()
        call_command('loadconstants')

    def setUp(self):
        minio_utils.ensure_storage_bucket_public()

    def tearDown(self):
        minio_utils.ensure_bucket_deleted()


class BaseTestCase(StudioTestCase):
    def setUp(self):
        super(BaseTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.main_tree.refresh_from_db()


class BaseAPITestCase(StudioAPITestCase):
    def setUp(self):
        super(BaseAPITestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        token, _new = Token.objects.get_or_create(user=self.user)
        self.header = {"Authorization": "Token {0}".format(token)}
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.channel.main_tree.refresh_from_db()

    def get(self, url):
        return self.client.get(url, headers=self.header)

    def create_post_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.post(url, headers=self.header, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request
