from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import FlagFeedbackEvent
from contentcuration.models import RecommendationsEvent
from contentcuration.models import RecommendationsInteractionEvent


class IsAdminForListAndDestroy(permissions.BasePermission):
    def _check_admin_or_feature_flag(self, request, view):
        # only allow list and destroy of flagged content to admins
        if view.action in ["list", "destroy", "retrieve"]:
            try:
                return request.user and request.user.is_admin
            except AttributeError:
                return False
        if request.user.check_feature_flag("test_dev_feature"):
            return True
        return False

    def has_permission(self, request, view):
        return self._check_admin_or_feature_flag(request, view)

    def has_object_permission(self, request, view, obj):
        return self._check_admin_or_feature_flag(request, view)


class BaseFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "context", "contentnode_id", "content_id"]
        read_only_fields = ["id"]


class BaseFeedbackEventSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["user", "target_channel_id"]
        read_only_fields = ["user"]


class BaseFeedbackInteractionEventSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["feedback_type", "feedback_reason"]


class FlagFeedbackEventSerializer(
    BaseFeedbackSerializer,
    BaseFeedbackEventSerializer,
    BaseFeedbackInteractionEventSerializer,
):
    class Meta:
        model = FlagFeedbackEvent
        fields = (
            BaseFeedbackSerializer.Meta.fields
            + BaseFeedbackEventSerializer.Meta.fields
            + BaseFeedbackInteractionEventSerializer.Meta.fields
        )


class RecommendationsInteractionEventSerializer(
    BaseFeedbackSerializer, BaseFeedbackInteractionEventSerializer
):
    recommendation_event_id = serializers.UUIDField()

    class Meta:
        model = RecommendationsInteractionEvent
        fields = (
            BaseFeedbackSerializer.Meta.fields
            + BaseFeedbackInteractionEventSerializer.Meta.fields
            + ["recommendation_event_id"]
        )


class RecommendationsEventSerializer(
    BaseFeedbackSerializer, BaseFeedbackEventSerializer
):
    content = serializers.JSONField(default=list)
    time_hidden = serializers.DateTimeField(required=False, read_only=True)

    class Meta:
        model = RecommendationsEvent
        fields = (
            BaseFeedbackSerializer.Meta.fields
            + BaseFeedbackEventSerializer.Meta.fields
            + ["content", "time_hidden"]
        )

    def create(self, validated_data):
        validated_data.pop("time_hidden", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "time_hidden" in validated_data:
            validated_data["time_hidden"] = timezone.now()
        return super().update(instance, validated_data)


class BulkCreateModelMixin:
    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list):
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data, many=True)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return super().create(request, *args, **kwargs)


class RecommendationsInteractionEventViewSet(
    BulkCreateModelMixin, viewsets.ModelViewSet
):
    # TODO: decide export procedure
    queryset = RecommendationsInteractionEvent.objects.all()
    serializer_class = RecommendationsInteractionEventSerializer
    http_method_names = ["post", "put", "patch"]


class RecommendationsEventViewSet(viewsets.ModelViewSet):
    # TODO: decide export procedure
    queryset = RecommendationsEvent.objects.all()
    serializer_class = RecommendationsEventSerializer
    http_method_names = ["post", "put", "patch"]


class FlagFeedbackEventViewSet(viewsets.ModelViewSet):
    queryset = FlagFeedbackEvent.objects.all()
    serializer_class = FlagFeedbackEventSerializer
    permission_classes = [IsAuthenticated, IsAdminForListAndDestroy]
