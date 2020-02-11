from django.contrib.postgres.aggregates import ArrayAgg
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from rest_framework import serializers

from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkListSerializer


class ChannelSetSerializer(BulkModelSerializer):
    channels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Channel.objects.all()
    )

    def validate_channels(self, value):
        """
        Check that the user has permission to view these channels
        """
        try:
            self.context["request"].user.can_view_channel_ids(
                value
            )
        except (PermissionDenied, AttributeError, KeyError):
            raise serializers.ValidationError("User does not have permission to view these channels")
        return value

    def create(self, validated_data):
        if "request" in self.context:
            user_id = self.context["request"].user.id
            # This has been newly created so add the current user as an editor
            validated_data["editors"] = [user_id]
        return super(ChannelSetSerializer, self).create(validated_data)

    class Meta:
        model = ChannelSet
        fields = ("id", "name", "description", "channels")
        read_only_fields = ("id",)
        list_serializer_class = BulkListSerializer


def clean_channels(item):
    return filter(lambda x: x is not None, item["channels"])


class ChannelSetViewSet(ValuesViewset):
    queryset = ChannelSet.objects.all()
    serializer_class = ChannelSetSerializer
    values = ("id", "name", "description", "channels", "secret_token__token")

    field_map = {"secret_token": "secret_token__token", "channels": clean_channels}

    def get_queryset(self):
        return ChannelSet.objects.filter(
            id__in=ChannelSet.objects.filter(
                Q(editors=self.request.user) | Q(public=True)
            )
            .distinct()
            .values_list("id", flat=True)
        )

    def prefetch_queryset(self, queryset):
        queryset = queryset.select_related("secret_token")
        return queryset

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(channels=ArrayAgg("secret_token__channels"))
        return queryset
