from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase
from django.test import TransactionTestCase
from django.urls import reverse_lazy
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase
from rest_framework.test import force_authenticate

from . import testdata
from contentcuration.models import User


class StudioTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super(StudioTestCase, cls).setUpClass()
        call_command("loadconstants")
        cls.admin_user = User.objects.create_superuser(
            "big_shot", "bigshot@reallybigcompany.com", "password"
        )

    def setUpBase(self):
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.channel.main_tree.refresh_from_db()

    def admin_client(self):
        client = APIClient()
        client.force_authenticate(self.admin_user)
        return client

    def upload_temp_file(self, data, preset="document", ext="pdf"):
        """
        Uploads a file to the server using an authorized client.
        """
        fileobj_temp = testdata.create_studio_file(data, preset=preset, ext=ext)
        name = fileobj_temp["name"]

        f = SimpleUploadedFile(name, data)
        file_upload_url = str(reverse_lazy("api_file_upload"))
        return fileobj_temp, self.admin_client().post(file_upload_url, {"file": f})

    def sign_in(self, user=None):
        if not user:
            user = self.user
        user.save()
        self.client.force_login(user)

    def get(self, url, data=None, follow=False, secure=False):
        return self.client.get(
            url,
            data=data,
            follow=follow,
            secure=secure,
            HTTP_USER_AGENT=settings.SUPPORTED_BROWSERS[0],
        )


class StudioAPITestCase(APITestCase):
    @classmethod
    def setUpClass(cls):
        super(StudioAPITestCase, cls).setUpClass()
        call_command("loadconstants")
        cls.admin_user = User.objects.create_superuser(
            "big_shot", "bigshot@reallybigcompany.com", "password"
        )

    def sign_in(self, user=None):
        if not user:
            user = self.user
        user.save()
        self.client.force_login(user)

    def get(self, url, data=None, follow=False, secure=False):
        return self.client.get(
            url,
            data=data,
            follow=follow,
            secure=secure,
            HTTP_USER_AGENT=settings.SUPPORTED_BROWSERS[0],
        )


class BaseAPITestCase(StudioAPITestCase):
    def setUp(self):
        super(BaseAPITestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.token, _new = Token.objects.get_or_create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(
            self.user
        )  # This will skip all authentication checks
        self.channel.main_tree.refresh_from_db()

    def delete(self, url):
        return self.client.delete(url)

    def get(self, url):
        return self.client.get(url)

    def post(self, url, data, format="json"):
        return self.client.post(url, data, format=format)

    def put(self, url, data, format="json"):
        return self.client.put(url, data, format=format)

    def create_get_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.get(url, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request

    def create_post_request(self, url, *args, **kwargs):
        factory = APIRequestFactory()
        request = factory.post(url, *args, **kwargs)
        request.user = self.user
        force_authenticate(request, user=self.user)
        return request


# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/


class MigrationTestCase(TransactionTestCase):
    migrate_from = None
    migrate_to = None
    app = None

    def setUp(self):
        assert (
            self.migrate_from and self.migrate_to
        ), "TestCase '{}' must define migrate_from and migrate_to properties".format(
            type(self).__name__
        )

        migrate_from = [(self.app, self.migrate_from)]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(migrate_from).apps

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    @classmethod
    def tearDownClass(cls):
        """
        Ensures that the DB is reset and fully migrated due to this
        test class's selective migrations
        """
        call_command("migrate")
