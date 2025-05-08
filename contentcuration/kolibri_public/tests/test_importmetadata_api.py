import datetime
from calendar import timegm

from django.db import connection
from django.db.models import Q
from django.urls import reverse
from django.utils.http import http_date
from kolibri_content import base_models
from kolibri_content import models as content
from kolibri_content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri_public import models as public
from kolibri_public.tests.test_content_app import ChannelBuilder
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase


class ImportMetadataTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.builder = ChannelBuilder()
        cls.builder.insert_into_default_db()
        public.ContentNode.objects.all().update(available=True)
        cls.root = public.ContentNode.objects.get(id=cls.builder.root_node["id"])
        cls.node = cls.root.get_descendants().exclude(kind=content_kinds.TOPIC).first()
        cls.all_nodes = cls.node.get_ancestors(include_self=True)
        cls.files = public.File.objects.filter(contentnode__in=cls.all_nodes)
        cls.assessmentmetadata = public.AssessmentMetaData.objects.filter(
            contentnode__in=cls.all_nodes
        )
        cls.localfiles = public.LocalFile.objects.filter(files__in=cls.files).distinct()
        cls.languages = public.Language.objects.filter(
            Q(id__in=cls.files.values_list("lang_id", flat=True))
            | Q(id__in=cls.all_nodes.values_list("lang_id", flat=True))
        )
        cls.through_tags = public.ContentNode.tags.through.objects.filter(
            contentnode__in=cls.all_nodes
        )
        cls.tags = public.ContentTag.objects.filter(
            id__in=cls.through_tags.values_list("contenttag_id", flat=True)
        ).distinct()

    def _assert_data(self, Model, ContentModel, queryset):
        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
        )
        fields = Model._meta.fields
        BaseModel = getattr(base_models, Model.__name__, Model)
        field_names = {field.column for field in BaseModel._meta.fields}
        if hasattr(BaseModel, "_mptt_meta"):
            field_names.add(BaseModel._mptt_meta.parent_attr)
            field_names.add(BaseModel._mptt_meta.tree_id_attr)
            field_names.add(BaseModel._mptt_meta.left_attr)
            field_names.add(BaseModel._mptt_meta.right_attr)
            field_names.add(BaseModel._mptt_meta.level_attr)
        for response_data, obj in zip(
            response.data[ContentModel._meta.db_table], queryset
        ):
            # Ensure that we are not returning any empty objects
            self.assertNotEqual(response_data, {})
            for field in fields:
                if field.column in field_names:
                    value = response_data[field.column]
                    if hasattr(field, "from_db_value"):
                        value = field.from_db_value(value, None, connection)
                    self.assertEqual(value, getattr(obj, field.column))

    def test_import_metadata_nodes(self):
        self._assert_data(public.ContentNode, content.ContentNode, self.all_nodes)

    def test_import_metadata_files(self):
        self._assert_data(public.File, content.File, self.files)

    def test_import_metadata_assessmentmetadata(self):
        self._assert_data(
            public.AssessmentMetaData,
            content.AssessmentMetaData,
            self.assessmentmetadata,
        )

    def test_import_metadata_localfiles(self):
        self._assert_data(public.LocalFile, content.LocalFile, self.localfiles)

    def test_import_metadata_languages(self):
        self._assert_data(public.Language, content.Language, self.languages)

    def test_import_metadata_through_tags(self):
        self._assert_data(
            public.ContentNode.tags.through,
            content.ContentNode.tags.through,
            self.through_tags,
        )

    def test_import_metadata_tags(self):
        self._assert_data(public.ContentTag, content.ContentTag, self.tags)

    def test_import_metadata_invalid_uuid(self):
        invalid_uuid = "8f0a5b9d89795"

        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": invalid_uuid})
        )

        self.assertEqual(response.status_code, 400)

        self.assertEqual(response.data["error"], "Invalid UUID format.")

    def test_schema_version_too_low(self):
        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version=1"
        )
        self.assertEqual(response.status_code, 400)

    def test_schema_version_too_high(self):
        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version={}".format(int(CONTENT_SCHEMA_VERSION) + 1)
        )
        self.assertEqual(response.status_code, 400)

    def test_schema_version_just_right(self):
        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version={}".format(CONTENT_SCHEMA_VERSION)
        )
        self.assertEqual(response.status_code, 200)

    def test_headers(self):
        channel = public.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self.client.get(
            reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
        )
        self.assertEqual(response.headers["Vary"], "Accept")
        self.assertEqual(
            response.headers["Cache-Control"],
            "max-age=300, public, stale-while-revalidate=100",
        )
        self.assertEqual(
            response.headers["Last-Modified"],
            http_date(timegm(channel.last_updated.utctimetuple())),
        )
