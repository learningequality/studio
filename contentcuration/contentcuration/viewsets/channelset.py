from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q
from django.db import transaction
from rest_framework import serializers

from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import WriteOnlySerializer


class ChannelSetSerializer(WriteOnlySerializer):
    channels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Channel.objects.all()
    )

    def save(self, **kwargs):
        # Use an atomic transaction for this, as the permissions check after initial
        # model save might necessitate a rollback (if we raise permission denied, none
        # of the save should take effect).
        with transaction.atomic():
            channel_ids = self.validated_data.pop("channels", None)
            created = self.instance is None
            instance = super(ChannelSetSerializer, self).save(**kwargs)
            if "request" in self.context:
                if created:
                    # If this has been newly created add the current user as an editor
                    instance.editors.add(self.context["request"].user)
                if channel_ids and self.context["request"].user.can_view_channel_ids(
                    channel_ids
                ):
                    instance.secret_token.channels.set(channel_ids)
        return instance

    class Meta:
        model = ChannelSet
        fields = ("id", "name", "description", "channels")
        read_only_fields = ("id",)


class ChannelSetViewSet(ValuesViewset):
    queryset = ChannelSet.objects.all()
    serializer_class = ChannelSetSerializer
    values = ("id", "name", "description", "channels", "secret_token__token")

    field_map = {"secret_token": "secret_token__token"}

    def get_queryset(self):
        return ChannelSet.objects.filter(
            Q(editors=self.request.user) | Q(public=True)
        ).distinct()

    def prefetch_queryset(self, queryset):
        queryset = queryset.select_related("secret_token")
        return queryset

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(channels=ArrayAgg("secret_token__channels"))
        return queryset
