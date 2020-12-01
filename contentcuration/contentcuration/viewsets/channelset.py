from django.db.models import CharField
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import FilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import NotNullMapArrayAgg
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.sync.constants import CHANNELSET
from contentcuration.viewsets.sync.utils import generate_update_event


class ChannelSetSerializer(BulkModelSerializer):
    channels = UserFilteredPrimaryKeyRelatedField(
        many=True, queryset=Channel.objects.all(), edit=False, required=False,
    )

    def create(self, validated_data):
        channels = validated_data.pop("channels", [])
        instance = super(ChannelSetSerializer, self).create(validated_data)
        for channel in channels:
            instance.secret_token.channels.add(channel)
        if "request" in self.context:
            user = self.context["request"].user
            # This has been newly created so add the current user as an editor
            instance.editors.add(user)
        self.changes.append(
            generate_update_event(
                instance.id, CHANNELSET, {"secret_token": instance.secret_token.token},
            )
        )
        return instance

    def update(self, instance, validated_data):
        channels = validated_data.pop("channels", {})
        for channel, value in channels.items():
            if value:
                instance.secret_token.channels.add(channel)
            else:
                instance.secret_token.channels.remove(channel)
        return super(ChannelSetSerializer, self).update(instance, validated_data)

    class Meta:
        model = ChannelSet
        fields = ("id", "name", "description", "channels")
        list_serializer_class = BulkListSerializer


class ChannelSetFilter(FilterSet):

    class Meta:
        model = ChannelSet
        fields = (
            "editors",
        )


class ChannelSetViewSet(ValuesViewset):
    queryset = ChannelSet.objects.all()
    serializer_class = ChannelSetSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelSetFilter
    permission_classes = [IsAuthenticated]
    values = ("id", "name", "description", "channels", "secret_token__token", "editors")

    field_map = {"secret_token": "secret_token__token"}

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            channels=NotNullMapArrayAgg(
                "secret_token__channels__id",
                filter=Q(main_tree__published=True, deleted=False),
                output_field=CharField(),
            )
        )


class PublicChannelSetSerializer(BulkModelSerializer):
    count = serializers.SerializerMethodField()
    token = serializers.SerializerMethodField()

    def get_count(self, value):
        return value.count

    def get_token(self, value):
        return value.secret_token.token

    class Meta:
        model = ChannelSet
        fields = ("id", "name", "description", "count", "token")
        read_only_fields = ("id", "name", "description", "count", "token")
