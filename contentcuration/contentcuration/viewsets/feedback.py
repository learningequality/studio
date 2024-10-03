from rest_framework import permissions
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import FlagFeedbackEvent


class IsAdminForListAndDestroy(permissions.BasePermission):
    def _check_admin_or_feature_flag(self, request, view):
        # only allow list and destroy of flagged content to admins
        if view.action in ['list', 'destroy', 'retrieve']:
            try:
                return request.user and request.user.is_admin
            except AttributeError:
                return False
        if request.user.check_feature_flag('test_dev_feature'):
            return True
        return False

    def has_permission(self, request, view):
        return self._check_admin_or_feature_flag(request, view)

    def has_object_permission(self, request, view, obj):
        return self._check_admin_or_feature_flag(request, view)


class BaseFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'context', 'contentnode_id', 'content_id']
        read_only_fields = ['id']


class BaseFeedbackEventSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['user', 'target_channel_id']
        read_only_fields = ['user']


class BaseFeedbackInteractionEventSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['feedback_type', 'feedback_reason']


class FlagFeedbackEventSerializer(BaseFeedbackSerializer, BaseFeedbackEventSerializer, BaseFeedbackInteractionEventSerializer):
    class Meta:
        model = FlagFeedbackEvent
        fields = BaseFeedbackSerializer.Meta.fields + BaseFeedbackEventSerializer.Meta.fields + BaseFeedbackInteractionEventSerializer.Meta.fields


class FlagFeedbackEventViewSet(viewsets.ModelViewSet):
    queryset = FlagFeedbackEvent.objects.all()
    serializer_class = FlagFeedbackEventSerializer
    permission_classes = [IsAuthenticated, IsAdminForListAndDestroy]
