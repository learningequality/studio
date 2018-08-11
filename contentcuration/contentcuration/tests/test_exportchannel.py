import md5
import os
import random
import string
import tempfile
from cStringIO import StringIO

import pytest
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings
from mixer.backend.django import mixer
from mock import patch

from base import StudioTestCase
from contentcuration import models as cc
from testdata import *
from contentcuration.management.commands.exportchannel import (MIN_SCHEMA_VERSION,
                                                               create_content_database)
from kolibri_content import models
from kolibri_content.router import using_content_database

pytestmark = pytest.mark.django_db

CONTENT_DATABASE_DIR_TEMP = tempfile.mkdtemp()

@override_settings(
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class ExportChannelTestCase(StudioTestCase):

    @classmethod
    def setUpClass(cls):
        super(ExportChannelTestCase, cls).setUpClass()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3",dir=CONTENT_DATABASE_DIR_TEMP)
        output_db = output_db
        output_db_alias = os.path.splitext(os.path.basename(output_db))[0]
        class testing_content_database(using_content_database):
            def __init__(self, alias):
                self.alias = output_db_alias

            def __exit__(self, exc_type, exc_value, traceback):
                return
        cls.patch_using = patch('contentcuration.management.commands.exportchannel.using_content_database.__new__', return_value=testing_content_database('alias'))
        cls.patch_using.start()
        cls.patch_copy_db = patch('contentcuration.management.commands.exportchannel.save_export_database')
        cls.patch_copy_db.start()

    def setUp(self):
        super(ExportChannelTestCase, self).setUp()
        content_channel = channel()
        create_content_database(content_channel.id, True, None, True)

    def test_channel_rootnode_data(self):
        channel = models.ChannelMetadata.objects.first()
        self.assertEqual(channel.root_pk, channel.root_id)

    def test_channel_version_data(self):
        channel = models.ChannelMetadata.objects.first()
        self.assertEqual(channel.min_schema_version, MIN_SCHEMA_VERSION)

    def test_contentnode_license_data(self):
        for node in models.ContentNode.objects.all():
            if node.license:
                self.assertEqual(node.license_name, node.license.license_name)
                self.assertEqual(node.license_description, node.license.license_description)

    def test_contentnode_channel_id_data(self):
        channel = models.ChannelMetadata.objects.first()
        for node in models.ContentNode.objects.all():
            self.assertEqual(node.channel_id, channel.id)

    def test_contentnode_file_checksum_data(self):
        for file in models.File.objects.all():
            self.assertEqual(file.checksum, file.local_file_id)

    def test_contentnode_file_extension_data(self):
        for file in models.File.objects.all().prefetch_related('local_file'):
            self.assertEqual(file.extension, file.local_file.extension)

    def test_contentnode_file_size_data(self):
        for file in models.File.objects.all().prefetch_related('local_file'):
            self.assertEqual(file.file_size, file.local_file.file_size)

    @classmethod
    def tearDownClass(cls):
        super(ExportChannelTestCase, cls).tearDownClass()
        cls.patch_using.stop()
        cls.patch_copy_db.stop()
