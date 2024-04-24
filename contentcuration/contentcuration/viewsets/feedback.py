from rest_framework import permissions
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import BaseFeedback
from contentcuration.models import BaseFeedbackEvent
from contentcuration.models import BaseFeedbackInteractionEvent
from contentcuration.models import FlagFeedbackEvent


class IsAdminForListAndDestroy(permissions.BasePermission):
    def has_permission(self, request, view):
        # only allow list and destroy of flagged content to admins
        if view.action in ['list', 'destroy']:
            try:
                return request.user and request.user.is_admin
            except AttributeError:
                return False
        if request.user.check_feature_flag('test_dev_feature'):
            return True
        return False


class BaseFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseFeedback
        fields = ['id', 'context', 'created_at', 'contentnode_id', 'content_id']
        read_only_fields = ['id', 'created_at']


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


class FlagFeedbackEventViewSet(viewsets.ModelViewSet):
    queryset = FlagFeedbackEvent.objects.all()
    serializer_class = FlagFeedbackEventSerializer
    permission_classes = [IsAuthenticated, IsAdminForListAndDestroy]
