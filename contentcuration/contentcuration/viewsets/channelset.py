from django.core.exceptions import PermissionDenied
from django.db.models import CharField
from django.db.models import Q
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import DistinctNotNullArrayAgg
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.utils import generate_update_event


class ChannelSetSerializer(BulkModelSerializer):
    channels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Channel.objects.all()
    )

    def validate_channels(self, value):
        """
        Check that the user has permission to view these channels
        """
        try:
            # Some users might not want to add channels right away
            if value:
                self.context["request"].user.can_view_channel_ids([v.pk for v in value])
        except (PermissionDenied, AttributeError, KeyError):
            raise serializers.ValidationError(
                "User does not have permission to view these channels"
            )
        return value

    def create(self, validated_data):
        channels = validated_data.pop("channels", [])
        if "request" in self.context:
            user_id = self.context["request"].user.id
            # This has been newly created so add the current user as an editor
            validated_data["editors"] = [user_id]

        instance = super(ChannelSetSerializer, self).create(validated_data)
        for channel in channels:
            instance.secret_token.channels.add(channel)
        instance.secret_token.save()
        self.changes.append(
            generate_update_event(
                instance.id, CHANNELSET, {"secret_token": instance.secret_token.token,},
            )
        )
        return instance

    def update(self, instance, validated_data):
        channels = validated_data.pop("channels", [])
        for channel in channels:
            instance.secret_token.channels.add(channel)
        instance.secret_token.save()
        return super(ChannelSetSerializer, self).update(instance, validated_data)

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
    permission_classes = [IsAuthenticated]
    values = ("id", "name", "description", "channels", "secret_token__token")

    field_map = {"secret_token": "secret_token__token", "channels": clean_channels}

    def get_queryset(self):
        queryset = ChannelSet.objects.prefetch_related("secret_token").filter(
            id__in=ChannelSet.objects.filter(editors=self.request.user)
            .distinct()
            .values_list("id", flat=True)
        )

        queryset = queryset.annotate(
            channels=DistinctNotNullArrayAgg(
                "secret_token__channels__id",
                filter=Q(main_tree__published=True, deleted=False),
                output_field=CharField(),
            )
        )
        return queryset

    def prefetch_queryset(self, queryset):
        queryset = queryset.select_related("secret_token")
        return queryset


class PublicChannelSetSerializer(BulkModelSerializer):
    count = serializers.SerializerMethodField()

    def get_count(self, value):
        return value.count

    class Meta:
        model = ChannelSet
        fields = ("id", "name", "description", "count")
        read_only_fields = ("id", "name", "description", "count")
