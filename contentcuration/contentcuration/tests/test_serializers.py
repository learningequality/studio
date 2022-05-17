from __future__ import absolute_import

from django.db.models.query import QuerySet
from django.test.testcases import SimpleTestCase
from rest_framework import serializers

from .base import BaseAPITestCase
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.viewsets.channel import ChannelSerializer as BaseChannelSerializer
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.contentnode import ContentNodeSerializer
from contentcuration.viewsets.contentnode import ExtraFieldsOptionsSerializer


def ensure_no_querysets_in_serializer(object):
    # values and values_list return list-like QuerySet objects, which can cause troubles if we aggregate the
    # output into a larger json dict. DRF apparently catches and fixes this under the hood.
    for field in object:
        # If it's not a base type, that means it is not being serialized properly.
        assert not isinstance(object[field], QuerySet), "{} is not serialized".format(
            field
        )


class ExtraFieldsOptionsSerializerTestCase(SimpleTestCase):
    def setUp(self):
        super(ExtraFieldsOptionsSerializerTestCase, self).setUp()
        self.data = dict(modality="QUIZ")

    @property
    def serializer(self):
        return ExtraFieldsOptionsSerializer(data=self.data)

    def test_no_completion_criteria(self):
        self.assertTrue(self.serializer.is_valid())

    def test_completion_criteria__valid(self):
        self.data.update(completion_criteria={"model": "time", "threshold": 10, "learner_managed": True})
        serializer = self.serializer
        serializer.is_valid()
        try:
            serializer.update({}, serializer.validated_data)
        except serializers.ValidationError:
            self.fail("Completion criteria should be valid")

    def test_completion_criteria__invalid(self):
        self.data.update(completion_criteria={"model": "time", "threshold": "test"})
        serializer = self.serializer
        serializer.is_valid()
        with self.assertRaises(serializers.ValidationError):
            serializer.update({}, serializer.validated_data)


class ContentNodeSerializerTestCase(BaseAPITestCase):
    def test_repr_doesnt_evaluate_querysets(self):
        node_ids = [
            "00000000000000000000000000000003",
            "00000000000000000000000000000004",
            "00000000000000000000000000000005",
        ]
        objects = ContentNodeSerializer(
            ContentNode.objects.filter(node_id__in=node_ids), many=True
        )

        object = ContentNodeSerializer(
            ContentNode.objects.get(node_id=node_ids[0])
        )

        # Ensure we don't evaluate querysets when repr is called on a Serializer. See docs for
        # no_field_eval_repr in contentcuration/serializers.py for more info.
        obj_string = repr(object)
        assert "QuerySet" not in obj_string, "object __repr__ contains queryset: {}".format(obj_string)

        objs_string = repr(objects)
        assert "QuerySet" not in objs_string, "objects __repr__ contains queryset: {}".format(objs_string)


class ContentDefaultsSerializerTestCase(BaseAPITestCase):
    def test_create(self):
        s = ContentDefaultsSerializer(data={})
        self.assertTrue(s.is_valid())
        self.assertEqual(DEFAULT_CONTENT_DEFAULTS, s.save())

    def test_create__merge(self):
        defaults = dict(
            author="Buster",
            aggregator="Aggregators R US",
            provider="USA",
            copyright_holder="Learning Equality",
            license="Special Permissions",
            license_description="Things go here",
            auto_derive_video_thumbnail=False,
        )
        s = ContentDefaultsSerializer(data=defaults)
        self.assertTrue(s.is_valid())

        defaults.update(
            auto_derive_audio_thumbnail=True,
            auto_derive_document_thumbnail=True,
            auto_derive_html5_thumbnail=True,
            auto_derive_exercise_thumbnail=True,
            auto_randomize_questions=True,
            mastery_model="num_correct_in_a_row_5",
            m_value=5,
            n_value=5,
            language=None,
        )
        self.assertEqual(defaults, s.save())

    def test_update(self):
        defaults = dict(author="Buster")
        s = ContentDefaultsSerializer(defaults, data={})
        self.assertTrue(s.is_valid())
        self.assertEqual(defaults, s.save())

    def test_update__merge(self):
        defaults = dict(author="Buster", aggregator="Aggregators R US", provider="USA",)
        s = ContentDefaultsSerializer(
            defaults, data=dict(author="Duster", provider="Canada",)
        )
        self.assertTrue(s.is_valid())
        self.assertEqual(
            dict(author="Duster", aggregator="Aggregators R US", provider="Canada",),
            s.save(),
        )

    def test_validate_license(self):
        defaults = dict(license="")
        s = ContentDefaultsSerializer(
            defaults, data=dict(license="This license does not exist")
        )
        self.assertFalse(s.is_valid())


class ContentDefaultsSerializerUseTestCase(BaseAPITestCase):
    class ChannelSerializer(BaseChannelSerializer):
        content_defaults = ContentDefaultsSerializer(partial=True)

        class Meta:
            model = Channel
            fields = (
                "id",
                "content_defaults",
            )
            read_only_fields = ("id",)
            nested_writes = True

    def test_save__create(self):
        s = self.ChannelSerializer(
            data=dict(
                name="New test channel",
                description="This is the best test channel",
                content_defaults=dict(author="Buster"),
            )
        )

        self.assertTrue(s.is_valid())
        c = s.save()

        defaults = DEFAULT_CONTENT_DEFAULTS.copy()
        defaults.update(author="Buster")
        self.assertEqual(defaults, c.content_defaults)

    def test_save__update(self):
        c = Channel(
            name="New test channel",
            description="This is the best test channel",
            content_defaults=dict(author="Buster"),
        )
        c.save()

        s = self.ChannelSerializer(
            c, data=dict(content_defaults=dict(license="Special Permissions"))
        )

        self.assertTrue(s.is_valid())
        c = s.save()
        self.assertEqual(
            dict(author="Buster", license="Special Permissions"), c.content_defaults
        )
