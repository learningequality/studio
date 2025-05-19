import uuid

from django.db.models.query import QuerySet
from django.utils import timezone
from le_utils.constants import content_kinds
from mock import Mock
from rest_framework import serializers

from .base import BaseAPITestCase
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import RecommendationsEvent
from contentcuration.tests import testdata
from contentcuration.viewsets.channel import ChannelSerializer as BaseChannelSerializer
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.contentnode import ContentNodeSerializer
from contentcuration.viewsets.feedback import FlagFeedbackEventSerializer
from contentcuration.viewsets.feedback import RecommendationsEventSerializer
from contentcuration.viewsets.feedback import RecommendationsInteractionEventSerializer


def ensure_no_querysets_in_serializer(object):
    # values and values_list return list-like QuerySet objects, which can cause troubles if we aggregate the
    # output into a larger json dict. DRF apparently catches and fixes this under the hood.
    for field in object:
        # If it's not a base type, that means it is not being serialized properly.
        assert not isinstance(object[field], QuerySet), "{} is not serialized".format(
            field
        )


class ContentNodeSerializerTestCase(BaseAPITestCase):
    def setUp(self):
        super(ContentNodeSerializerTestCase, self).setUp()
        self.data = dict(
            extra_fields=dict(options=dict(modality="QUIZ")), complete=True
        )
        self.node = ContentNode(kind_id=content_kinds.VIDEO)

    @property
    def serializer(self):
        return ContentNodeSerializer(instance=self.node, data=self.data, partial=True)

    def test_no_completion_criteria(self):
        self.assertTrue(self.serializer.is_valid())

    def test_completion_criteria__valid(self):
        self.data["extra_fields"]["options"].update(
            completion_criteria={
                "model": "time",
                "threshold": 10,
                "learner_managed": True,
            }
        )
        serializer = self.serializer
        serializer.is_valid()
        try:
            serializer.update(self.node, serializer.validated_data)
        except serializers.ValidationError:
            self.fail("Completion criteria should be valid")

    def test_completion_criteria__invalid(self):
        self.data["extra_fields"]["options"].update(
            completion_criteria={"model": "time", "threshold": "test"}
        )
        serializer = self.serializer
        serializer.is_valid()
        with self.assertRaises(serializers.ValidationError):
            serializer.update(self.node, serializer.validated_data)

    def test_repr_doesnt_evaluate_querysets(self):
        node_ids = [
            "00000000000000000000000000000003",
            "00000000000000000000000000000004",
            "00000000000000000000000000000005",
        ]
        objects = ContentNodeSerializer(
            ContentNode.objects.filter(node_id__in=node_ids), many=True
        )

        object = ContentNodeSerializer(ContentNode.objects.get(node_id=node_ids[0]))

        # Ensure we don't evaluate querysets when repr is called on a Serializer. See docs for
        # no_field_eval_repr in contentcuration/serializers.py for more info.
        obj_string = repr(object)
        assert (
            "QuerySet" not in obj_string
        ), "object __repr__ contains queryset: {}".format(obj_string)

        objs_string = repr(objects)
        assert (
            "QuerySet" not in objs_string
        ), "objects __repr__ contains queryset: {}".format(objs_string)


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
        defaults = dict(
            author="Buster",
            aggregator="Aggregators R US",
            provider="USA",
        )
        s = ContentDefaultsSerializer(
            defaults,
            data=dict(
                author="Duster",
                provider="Canada",
            ),
        )
        self.assertTrue(s.is_valid())
        self.assertEqual(
            dict(
                author="Duster",
                aggregator="Aggregators R US",
                provider="Canada",
            ),
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
        request = Mock()
        request.user = self.user
        s = self.ChannelSerializer(
            data=dict(
                name="New test channel",
                description="This is the best test channel",
                content_defaults=dict(author="Buster"),
            ),
            context=dict(request=request),
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
        c.save(actor_id=self.user.id)

        s = self.ChannelSerializer(
            c, data=dict(content_defaults=dict(license="Special Permissions"))
        )

        self.assertTrue(s.is_valid())
        c = s.save()
        self.assertEqual(
            dict(author="Buster", license="Special Permissions"), c.content_defaults
        )


class FlagFeedbackSerializerTestCase(BaseAPITestCase):
    def setUp(self):
        super(FlagFeedbackSerializerTestCase, self).setUp()
        self.channel = testdata.channel("testchannel")
        self.flagged_node = testdata.node(
            {
                "kind_id": content_kinds.VIDEO,
                "title": "Suspicious Video content",
            },
        )

    def _create_base_feedback_data(self, context, contentnode_id, content_id):
        base_feedback_data = {
            "context": context,
            "contentnode_id": contentnode_id,
            "content_id": content_id,
        }
        return base_feedback_data

    def test_deserialization_and_validation(self):
        data = {
            "user": self.user.id,
            "target_channel_id": str(self.channel.id),
            "context": {"test_key": "test_value"},
            "contentnode_id": str(self.flagged_node.id),
            "content_id": str(self.flagged_node.content_id),
            "feedback_type": "FLAGGED",
            "feedback_reason": "Reason1.....",
        }
        serializer = FlagFeedbackEventSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.context, data["context"])
        self.assertEqual(instance.user.id, data["user"])
        self.assertEqual(instance.feedback_type, data["feedback_type"])
        self.assertEqual(instance.feedback_reason, data["feedback_reason"])

    def test_invalid_data(self):
        data = {"context": "invalid"}
        serializer = FlagFeedbackEventSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class RecommendationsInteractionEventSerializerTestCase(BaseAPITestCase):
    def setUp(self):
        super(RecommendationsInteractionEventSerializerTestCase, self).setUp()
        self.channel = testdata.channel("testchannel")
        self.interaction_node = testdata.node(
            {
                "kind_id": content_kinds.VIDEO,
                "title": "Recommended Video content",
            },
        )
        self.node_where_import_is_initiated = testdata.node(
            {
                "kind_id": content_kinds.TOPIC,
                "title": "Node where content is imported",
            },
        )
        self.recommendation_event = RecommendationsEvent.objects.create(
            user=self.user,
            target_channel_id=self.channel.id,
            content_id=self.node_where_import_is_initiated.content_id,
            contentnode_id=self.node_where_import_is_initiated.id,
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            time_hidden=timezone.now(),
            content=[
                {
                    "content_id": str(uuid.uuid4()),
                    "node_id": str(uuid.uuid4()),
                    "channel_id": str(uuid.uuid4()),
                    "score": 4,
                }
            ],
        )

    def test_deserialization_and_validation(self):
        data = {
            "context": {"test_key": "test_value"},
            "contentnode_id": str(self.interaction_node.id),
            "content_id": str(self.interaction_node.content_id),
            "feedback_type": "IGNORED",
            "feedback_reason": "----",
            "recommendation_event_id": str(self.recommendation_event.id),
        }
        serializer = RecommendationsInteractionEventSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.context, data["context"])
        self.assertEqual(instance.feedback_type, data["feedback_type"])
        self.assertEqual(
            str(instance.recommendation_event_id), data["recommendation_event_id"]
        )

    def test_invalid_data(self):
        data = {"context": "invalid"}
        serializer = RecommendationsInteractionEventSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        data = {
            "context": {"test_key": "test_value"},
            "contentnode_id": str(self.interaction_node.id),
            "content_id": str(self.interaction_node.content_id),
            "feedback_type": "INVALID_TYPE",
            "feedback_reason": "-----",
            "recommendation_event_id": "invalid-uuid",
        }
        serializer = RecommendationsInteractionEventSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class RecommendationsEventSerializerTestCase(BaseAPITestCase):
    def setUp(self):
        super(RecommendationsEventSerializerTestCase, self).setUp()
        self.channel = testdata.channel("testchannel")
        self.node_where_import_is_initiated = testdata.node(
            {
                "kind_id": content_kinds.TOPIC,
                "title": "Title of the topic",
            },
        )

    def test_deserialization_and_validation(self):
        data = {
            "user": self.user.id,
            "target_channel_id": str(self.channel.id),
            "context": {"model_version": 1, "breadcrumbs": "#Title#->Random"},
            "contentnode_id": str(self.node_where_import_is_initiated.id),
            "content_id": str(self.node_where_import_is_initiated.content_id),
            "time_hidden": timezone.now().isoformat(),
            "content": [
                {
                    "content_id": str(uuid.uuid4()),
                    "node_id": str(uuid.uuid4()),
                    "channel_id": str(uuid.uuid4()),
                    "score": 4,
                }
            ],
        }
        serializer = RecommendationsEventSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.context, data["context"])
        self.assertEqual(instance.user.id, data["user"])
        self.assertEqual(
            str(instance.contentnode_id).replace("-", ""),
            data["contentnode_id"].replace("-", ""),
        )
        self.assertEqual(instance.content, data["content"])

    def test_invalid_data(self):
        # Test with missing required fields
        data = {"context": "invalid"}
        serializer = RecommendationsEventSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        # Test with invalid contentnode_id
        data = {
            "user": self.user.id,
            "target_channel_id": str(self.channel.id),
            "context": {"model_version": 1, "breadcrumbs": "#Title#->Random"},
            "contentnode_id": "invalid-uuid",
            "content_id": str(self.node_where_import_is_initiated.content_id),
            "time_hidden": timezone.now().isoformat(),
            "content": [
                {
                    "content_id": str(uuid.uuid4()),
                    "node_id": str(uuid.uuid4()),
                    "channel_id": str(uuid.uuid4()),
                    "score": 4,
                }
            ],
        }
        serializer = RecommendationsEventSerializer(data=data)
        self.assertFalse(serializer.is_valid())
