import datetime

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from contentcuration.utils import minio_utils
from contentcuration.utils.policies import get_latest_policies
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
        raise Exception("Called?")
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


class StudioAPITestCase(APITestCase, BucketTestMixin):

    @classmethod
    def setUpClass(cls):
        super(StudioAPITestCase, cls).setUpClass()
        call_command('loadconstants')

    def setUp(self):
        if not self.persist_bucket:
            self.create_bucket()

    def tearDown(self):
        if not self.persist_bucket:
            self.delete_bucket()

class BaseTestCase(StudioTestCase):
    def setUp(self):
        super(BaseTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.main_tree.refresh_from_db()

    def sign_in(self, user=None):
        if not user:
            user = self.user
        # We agree to #allthethings, so let us in!
        for policy in get_latest_policies():
            user.policies = {policy: datetime.datetime.now().strftime("%d/%m/%y %H:%M")}
        user.save()
        self.client.force_login(user)

    def get(self, url, data=None, follow=False, secure=False):
        return self.client.get(url, data=data, follow=follow, secure=secure, HTTP_USER_AGENT=settings.SUPPORTED_BROWSERS[0])


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

    def post(self, url, data, format='json'):
        return self.client.post(url, data, headers=self.header, format=format)

    def create_post_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.post(url, headers=self.header, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request
