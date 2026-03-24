import datetime
import os
import tempfile
from unittest import mock

import pytz
from django.core.management import call_command
from django.test import TestCase
from kolibri_content import models as kolibri_content_models
from kolibri_content.router import cleanup_content_database_connection
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public import models as kolibri_public_models
from kolibri_public.tests.base import ChannelBuilder
from kolibri_public.tests.base import OKAY_TAG
from kolibri_public.utils.mapper import ChannelMapper
from le_utils.constants import content_kinds
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.models import Channel
from contentcuration.models import Country
from contentcuration.tests.testdata import user


class ChannelMapperTest(TestCase):
    @property
    def overrides(self):
        return {
            kolibri_public_models.ContentNode: {
                "available": True,
                "tree_id": self.mapper.tree_id,
            },
            kolibri_public_models.LocalFile: {
                "available": True,
            },
            kolibri_public_models.ChannelMetadata: {
                "last_updated": self.dummy_date,
            },
        }

    def setUp(self):
        super().setUp()
        call_command("loadconstants")
        _, self.tempdb = tempfile.mkstemp(suffix=".sqlite3")
        admin_user = user()

        self.dummy_date = datetime.datetime(2020, 1, 1, 0, 0, 0, tzinfo=pytz.utc)
        self._date_patcher = mock.patch(
            "kolibri_public.utils.annotation.timezone.now", return_value=self.dummy_date
        )
        self._date_patcher.start()

        with using_content_database(self.tempdb):
            call_command(
                "migrate",
                "content",
                database=get_active_content_database(),
                no_input=True,
            )
            builder = ChannelBuilder(
                models=kolibri_content_models,
                options={
                    "problematic_tags": True,
                    "problematic_nodes": True,
                },
            )
            builder.insert_into_default_db()
            self.source_root = kolibri_content_models.ContentNode.objects.get(
                id=builder.root_node["id"]
            )
            self.channel = kolibri_content_models.ChannelMetadata.objects.get(
                id=builder.channel["id"]
            )
            contentcuration_channel = Channel.objects.create(
                actor_id=admin_user.id,
                id=self.channel.id,
                name=self.channel.name,
                public=True,
            )
            contentcuration_channel.main_tree.published = True
            contentcuration_channel.main_tree.save()

    def _assert_model(self, source, mapped, Model):
        for field in Model._meta.fields:
            column = field.column
            if hasattr(source, column):
                if Model in self.overrides and column in self.overrides[Model]:
                    self.assertEqual(
                        self.overrides[Model][column], getattr(mapped, column)
                    )
                else:
                    self.assertEqual(
                        getattr(source, column),
                        getattr(mapped, column),
                        f"Mismatch in model {Model.__name__}, column {column}",
                    )

    def _assert_node(self, source, mapped):
        """
        :param source: kolibri_content_models.ContentNode
        :param mapped: kolibri_public_models.ContentNode
        """
        self._assert_model(source, mapped, kolibri_public_models.ContentNode)

        for src, mpd in zip(
            source.assessmentmetadata.all(), mapped.assessmentmetadata.all()
        ):
            self._assert_model(src, mpd, kolibri_public_models.AssessmentMetaData)

        for src, mpd in zip(source.files.all(), mapped.files.all()):
            self._assert_model(src, mpd, kolibri_public_models.File)
            self._assert_model(
                src.local_file, mpd.local_file, kolibri_public_models.LocalFile
            )

        # should only map OKAY_TAG and not BAD_TAG
        for mapped_tag in mapped.tags.all():
            self.assertEqual(OKAY_TAG, mapped_tag.tag_name)

        self.assertEqual(
            mapped.ancestors,
            [
                {"id": ancestor.id, "title": ancestor.title}
                for ancestor in source.get_ancestors()
            ],
        )

    def _recurse_and_assert(self, sources, mappeds, recursion_depth=0):
        recursion_depths = []
        for source, mapped in zip(sources, mappeds):
            self._assert_node(source, mapped)
            source_children = source.children.all()
            mapped_children = mapped.children.all()
            if mapped.kind == content_kinds.TOPIC:
                self.assertEqual(len(source_children), len(mapped_children))
            else:
                self.assertEqual(0, len(mapped_children))

            recursion_depths.append(
                self._recurse_and_assert(
                    source_children,
                    mapped_children,
                    recursion_depth=recursion_depth + 1,
                )
            )
        return recursion_depth if not recursion_depths else max(recursion_depths)

    def test_map(self):
        with using_content_database(self.tempdb):
            self.mapper = ChannelMapper(self.channel)
            self.mapper.run()
            self.mapped_root = self.mapper.mapped_root

            self._recurse_and_assert([self.source_root], [self.mapped_root])
            self._assert_model(
                self.channel,
                self.mapper.mapped_channel,
                kolibri_public_models.ChannelMetadata,
            )

    def test_map_replace(self):
        with using_content_database(self.tempdb):
            self.mapper = ChannelMapper(self.channel)
            self.mapper.run()
            self.mapped_root = self.mapper.mapped_root

            mapper = ChannelMapper(self.channel)
            mapper.run()
            self._recurse_and_assert([self.source_root], [mapper.mapped_root])
            self._assert_model(
                self.channel,
                self.mapper.mapped_channel,
                kolibri_public_models.ChannelMetadata,
            )

    def test_categories__none_provided(self):
        with using_content_database(self.tempdb):
            kolibri_content_models.ContentNode.objects.filter(
                channel_id=self.channel.id,
            ).update(categories=None)

            mapper = ChannelMapper(self.channel)
            mapper.run()

            self.assertEqual(mapper.mapped_channel.categories, [])

    def test_categories__only_provided(self):
        with using_content_database(self.tempdb):
            kolibri_content_models.ContentNode.objects.filter(
                channel_id=self.channel.id,
            ).update(categories=None)

            categories = ["Category1", "Category2"]
            mapper = ChannelMapper(self.channel, categories=categories)
            mapper.run()

            self.assertEqual(mapper.mapped_channel.categories, categories)

    def test_categories__only_on_content_nodes(self):
        with using_content_database(self.tempdb):
            source_contentnodes_queryset = (
                kolibri_content_models.ContentNode.objects.filter(
                    channel_id=self.channel.id,
                )
            )
            contentnode1 = source_contentnodes_queryset[0]
            contentnode2 = source_contentnodes_queryset[1]

            source_contentnodes_queryset.update(categories=None)
            contentnode1.categories = "Category1,Category2"
            contentnode2.categories = "Category3"
            contentnode1.save()
            contentnode2.save()

            mapper = ChannelMapper(self.channel)
            mapper.run()

            self.assertEqual(
                mapper.mapped_channel.categories,
                ["Category1", "Category2", "Category3"],
            )

    def test_categories__both_provided_and_on_content_nodes(self):
        with using_content_database(self.tempdb):
            source_contentnodes_queryset = (
                kolibri_content_models.ContentNode.objects.filter(
                    channel_id=self.channel.id,
                )
            )
            contentnode1 = source_contentnodes_queryset[0]
            contentnode2 = source_contentnodes_queryset[1]

            source_contentnodes_queryset.update(categories=None)
            contentnode1.categories = "Category1,Category2"
            contentnode2.categories = "Category3"
            contentnode1.save()
            contentnode2.save()

            categories = ["Category3", "Category4"]
            mapper = ChannelMapper(self.channel, categories=categories)
            mapper.run()

            self.assertEqual(
                mapper.mapped_channel.categories,
                ["Category1", "Category2", "Category3", "Category4"],
            )

    def test_countries__none_provided(self):
        with using_content_database(self.tempdb):
            mapper = ChannelMapper(self.channel)
            mapper.run()

            self.assertEqual(mapper.mapped_channel.countries.count(), 0)

    def test_countries__provided(self):
        with using_content_database(self.tempdb):
            country1 = Country.objects.create(code="C1", name="Country 1")
            country2 = Country.objects.create(code="C2", name="Country 2")

            countries = [country1, country2]
            mapper = ChannelMapper(self.channel, countries=countries)
            mapper.run()

            self.assertCountEqual(mapper.mapped_channel.countries.all(), countries)

    def test_categories_bitmask_annotation(self):
        with using_content_database(self.tempdb):
            categories = [
                SUBJECTSLIST[0],  # 1
                SUBJECTSLIST[2],  # 4
                SUBJECTSLIST[4],  # 16
            ]

            # Delete all categories in the tree, so that only explicitly provided categories
            # are used
            kolibri_content_models.ContentNode.objects.filter(
                channel_id=self.channel.id,
            ).update(categories=None)

            mapper = ChannelMapper(
                channel=self.channel,
                public=False,
                categories=categories,
            )
            mapper.run()

            self.assertTrue(
                hasattr(mapper.mapped_channel, "categories_bitmask_0"),
                "ChannelMetadata should have categories_bitmask_0 field",
            )
            self.assertEqual(mapper.mapped_channel.categories_bitmask_0, 1 | 4 | 16)

    def tearDown(self):
        # Clean up datbase connection after the test
        self._date_patcher.stop()
        cleanup_content_database_connection(self.tempdb)
        super().tearDown()
        if os.path.exists(self.tempdb):
            os.remove(self.tempdb)
