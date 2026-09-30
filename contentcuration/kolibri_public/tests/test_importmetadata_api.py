import datetime
from calendar import timegm

from django.db import connection
from django.db.models import Q
from django.urls import reverse
from django.utils.http import http_date
from kolibri_content import base_models
from kolibri_content import models as content
from kolibri_content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri_content.constants.schema_versions import EXPORT_SCHEMA_VERSIONS
from kolibri_content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION
from kolibri_content.constants.schema_versions import VERSION_5
from kolibri_content.contentschema.columns import for_version
from kolibri_public import models as public
from kolibri_public.tests.test_content_app import ChannelBuilder
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from contentcuration.models import Language
from contentcuration.tests.helpers import reverse_with_query


class ImportMetadataTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.builder = ChannelBuilder()
        cls.builder.insert_into_default_db()
        public.ContentNode.objects.all().update(available=True)
        cls.root = public.ContentNode.objects.get(id=cls.builder.root_node["id"])
        cls.node = cls.root.get_descendants().exclude(kind=content_kinds.TOPIC).first()
        cls.language = Language.objects.get_or_create(
            id="fr",
            defaults={
                "lang_code": "fr",
                "readable_name": "French",
                "native_name": "Français",
            },
        )[0]
        public.ContentNode.objects.filter(id=cls.node.id).update(lang=cls.language)
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
        cls.topic = cls.node.parent
        cls.ancestor_ids = list(
            cls.topic.get_ancestors(include_self=True).values_list("id", flat=True)
        )
        cls.family_ids = list(cls.topic.get_family().values_list("id", flat=True))

    def _assert_data(self, Model, ContentModel, queryset):
        response = self._get()
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

    def _node_ids(self, data):
        return [row["id"] for row in data[content.ContentNode._meta.db_table]]

    def _get_topic(self, query):
        return self.client.get(
            reverse_with_query(
                "publicimportmetadata-detail",
                kwargs={"pk": self.topic.id},
                query=query,
            )
        )

    def _get_paged_node_ids(self, query):
        page_size = int(query["max_results"])
        node_ids = []
        for _ in self.family_ids:
            response = self._get_topic(query)
            self.assertEqual(set(response.data), {"more", "results"})
            page = response.data["results"]
            page_node_ids = self._node_ids(page)
            self.assertLessEqual(len(page_node_ids), page_size)
            self.assertEqual(
                {f["contentnode_id"] for f in page[content.File._meta.db_table]},
                set(page_node_ids),
            )
            node_ids.extend(page_node_ids)
            query = response.data["more"]
            if query is None:
                return node_ids
        self.fail("more never became None")

    def test_import_metadata_unpaginated(self):
        for query, expected in (
            ({}, self.ancestor_ids),
            ({"max_results": "0"}, self.ancestor_ids),
            ({"max_results": "abc"}, self.ancestor_ids),
            ({"descendants": "true"}, self.family_ids),
        ):
            with self.subTest(query=query):
                response = self._get_topic(query)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(self._node_ids(response.data), expected)

    def test_import_metadata_paginated(self):
        self.assertEqual(
            self._get_paged_node_ids({"max_results": 3}), self.ancestor_ids
        )

    def test_import_metadata_paginated_descendants(self):
        self.assertEqual(
            self._get_paged_node_ids({"max_results": 2, "descendants": "true"}),
            self.family_ids,
        )

    def _get(self, schema_version=None):
        url = reverse("publicimportmetadata-detail", kwargs={"pk": self.node.id})
        if schema_version is not None:
            url += "?schema_version={}".format(schema_version)
        return self.client.get(url)

    def _get_metadata(self, schema_version=None):
        response = self._get(schema_version)
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_no_schema_version_serves_every_supported_column(self):
        data = self._get_metadata()
        self.assertEqual(data["schema_version"], CONTENT_SCHEMA_VERSION)
        for table in for_version(CONTENT_SCHEMA_VERSION):
            rows = data[table]
            if not rows:
                continue
            with self.subTest(table=table):
                self.assertEqual(
                    set(rows[0]),
                    set().union(
                        *(for_version(v)[table] for v in EXPORT_SCHEMA_VERSIONS)
                    ),
                )

    def test_language_lang_name_is_native_name(self):
        for schema_version in [None] + EXPORT_SCHEMA_VERSIONS:
            with self.subTest(schema_version=schema_version):
                languages = self._get_metadata(schema_version)[
                    content.Language._meta.db_table
                ]
                self.assertEqual(
                    [row["lang_name"] for row in languages],
                    [self.language.native_name],
                )

    def test_import_metadata_columns_match_frozen_map(self):
        for version in EXPORT_SCHEMA_VERSIONS:
            data = self._get_metadata(version)
            self.assertEqual(data["schema_version"], version)
            # Iterate the frozen map rather than the response, as the response
            # also carries a non-table `schema_version` key.
            for table, columns in for_version(version).items():
                self.assertIn(table, data)
                rows = data[table]
                if not rows:
                    continue
                with self.subTest(version=version, table=table):
                    self.assertEqual(sorted(rows[0].keys()), sorted(columns))

    def test_schema_version_is_normalised(self):
        self.assertEqual(self._get_metadata("05"), self._get_metadata(VERSION_5))

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

    def _assert_schema_error(self, schema_version, message):
        response = self._get(schema_version)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json(), [message])

    def test_schema_version_too_low(self):
        self._assert_schema_error(
            "1",
            "Schema version is too low, exports only suported for versions {} to {}".format(
                MIN_CONTENT_SCHEMA_VERSION, CONTENT_SCHEMA_VERSION
            ),
        )

    def test_schema_version_too_high(self):
        self._assert_schema_error(
            int(CONTENT_SCHEMA_VERSION) + 1,
            "Schema version is too high, exports only suported for versions {} to {}".format(
                MIN_CONTENT_SCHEMA_VERSION, CONTENT_SCHEMA_VERSION
            ),
        )

    def test_schema_version_unparseable(self):
        for schema_version in ("abc", ""):
            with self.subTest(schema_version=schema_version):
                self._assert_schema_error(
                    schema_version,
                    "Schema version is not parseable by this version of Kolibri",
                )

    def test_headers(self):
        channel = public.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self._get()
        self.assertEqual(response.headers["Vary"], "Accept")
        self.assertEqual(
            response.headers["Cache-Control"],
            "max-age=300, public, stale-while-revalidate=100",
        )
        self.assertEqual(
            response.headers["Last-Modified"],
            http_date(timegm(channel.last_updated.utctimetuple())),
        )
