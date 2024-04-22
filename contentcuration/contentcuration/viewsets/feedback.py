from rest_framework import serializers

from contentcuration.models import BaseFeedback
from contentcuration.models import BaseFeedbackEvent
from contentcuration.models import BaseFeedbackInteractionEvent
from contentcuration.models import FlagFeedbackEvent


class BaseFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseFeedback
        fields = ['id', 'context', 'created_at', 'contentnode_id', 'content_id']


class BaseFeedbackEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseFeedbackEvent
        fields = ['user', 'target_channel_id']


class BaseFeedbackInteractionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseFeedbackInteractionEvent
        fields = ['feedback_type', 'feedback_reason']


class FlagFeedbackEventSerializer(BaseFeedbackSerializer, BaseFeedbackEventSerializer, BaseFeedbackInteractionEventSerializer):
    class Meta:
        model = FlagFeedbackEvent
        fields = BaseFeedbackSerializer.Meta.fields + BaseFeedbackEventSerializer.Meta.fields + BaseFeedbackInteractionEventSerializer.Meta.fields
