# Assert methods can be found here: https://docs.python.org/3/library/unittest.html#assert-methods

from django.core.management import call_command
from django.test import TestCase

from contentcuration.tests.testdata import *
from contentcuration.utils import minio_utils
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APIRequestFactory, APITestCase, force_authenticate

import testdata


class BucketTestMixin:
    """
    Handles bucket setup and tear down for test classes. If you want your entire TestCase to share the same bucket,
    call create_bucket in setUpClass and then set persist_bucket to True, then make sure you call self.delete_bucket()
    in tearDownClass.
    """
    persist_bucket = False

    def create_bucket(self):
        minio_utils.ensure_storage_bucket_public()

    def delete_bucket(self):
        minio_utils.ensure_bucket_deleted()

    def setUp(self):
        if not self.persist_bucket:
            self.create_bucket()

    def tearDown(self):
        if not self.persist_bucket:
            self.delete_bucket()


class StudioTestCase(TestCase, BucketTestMixin):

    @classmethod
    def setUpClass(cls):
        super(StudioTestCase, cls).setUpClass()
        call_command('loadconstants')

    def setUp(self):
        if not self.persist_bucket:
            self.create_bucket()

    def tearDown(self):
        if not self.persist_bucket:
            self.delete_bucket()

class BaseTestCase(StudioTestCase, BucketTestMixin):
    @classmethod
    def setUpClass(self):
        super(BaseTestCase, self).setUpClass()
        self.channel = channel()
        self.user = user()
        self.channel.main_tree.refresh_from_db()

class BaseAPITestCase(StudioTestCase):
    @classmethod
    def setUpClass(self):
        super(BaseAPITestCase, self).setUpClass()
        minio_utils.ensure_storage_bucket_public()
        self.channel = channel()
        self.user = user()
        token, _new = Token.objects.get_or_create(user=self.user)
        self.header = {"Authorization": "Token {0}".format(token)}
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.channel.main_tree.refresh_from_db()

    @classmethod
    def tearDownClass(self):
        minio_utils.ensure_bucket_deleted()

    def create_get_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.get(url, headers=self.header, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request

    def create_post_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.post(url, headers=self.header, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request
