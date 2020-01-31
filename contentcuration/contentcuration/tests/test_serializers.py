from __future__ import absolute_import

from .base import BaseAPITestCase
from django.db.models.query import QuerySet

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.channel import ChannelSerializer as BaseChannelSerializer
from contentcuration.serializers import ContentNodeSerializer
from contentcuration.serializers import DEFAULT_CONTENT_DEFAULTS


def ensure_no_querysets_in_serializer(object):
    # values and values_list return list-like QuerySet objects, which can cause troubles if we aggregate the
    # output into a larger json dict. DRF apparently catches and fixes this under the hood.
    for field in object:
        # If it's not a base type, that means it is not being serialized properly.
        assert not isinstance(object[field], QuerySet), '{} is not serialized'.format(field)


class ContentNodeSErializerTestCase(BaseAPITestCase):
    def test_fields_are_json_serializable(self):
        """
        The serializer should return data that is ready for serialization, and not in 'object' form.
        """

        node_ids = ['00000000000000000000000000000003', '00000000000000000000000000000004', '00000000000000000000000000000005']
        objects = ContentNodeSerializer(ContentNode.objects.filter(node_id__in=node_ids), many=True).data
        for object in objects:
            ensure_no_querysets_in_serializer(object)


class ContentDefaultsSerializerTestCase(BaseAPITestCase):
    def test_create(self):
        s = ContentDefaultsSerializer(data={})
        self.assertTrue(s.is_valid())
        self.assertEqual(DEFAULT_CONTENT_DEFAULTS, s.save())

    def test_create__merge(self):
        defaults = dict(
            author='Buster',
            aggregator='Aggregators R US',
            provider='USA',
            copyright_holder='Learning Equality',
            license='Special Permissions',
            license_description='Things go here',
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
            mastery_model='num_correct_in_a_row_5',
            m_value=5,
            n_value=5,
            language=None,
        )
        self.assertEqual(defaults, s.save())

    def test_update(self):
        defaults = dict(author='Buster')
        s = ContentDefaultsSerializer(defaults, data={})
        self.assertTrue(s.is_valid())
        self.assertEqual(defaults, s.save())

    def test_update__merge(self):
        defaults = dict(
            author='Buster',
            aggregator='Aggregators R US',
            provider='USA',
        )
        s = ContentDefaultsSerializer(defaults, data=dict(
            author='Duster',
            provider='Canada',
        ))
        self.assertTrue(s.is_valid())
        self.assertEqual(dict(
            author='Duster',
            aggregator='Aggregators R US',
            provider='Canada',
        ), s.save())

    def test_validate_license(self):
        defaults = dict(
            license=''
        )
        s = ContentDefaultsSerializer(defaults, data=dict(
            license='This license does not exist'
        ))
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
        s = self.ChannelSerializer(data=dict(
            name='New test channel',
            description='This is the best test channel',
            content_defaults=dict(author='Buster')
        ))

        self.assertTrue(s.is_valid())
        c, _ = s.save()

        defaults = DEFAULT_CONTENT_DEFAULTS.copy()
        defaults.update(author='Buster')
        self.assertEqual(defaults, c.content_defaults)

    def test_save__update(self):
        c = Channel(
            name='New test channel',
            description='This is the best test channel',
            content_defaults=dict(author='Buster')
        )
        c.save()

        s = self.ChannelSerializer(c, data=dict(
            content_defaults=dict(license='Special Permissions')
        ))

        self.assertTrue(s.is_valid())
        c, _ = s.save()
        self.assertEqual(dict(
            author='Buster',
            license='Special Permissions'
        ), c.content_defaults)
