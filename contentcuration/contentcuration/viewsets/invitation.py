from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import FilterSet
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.sync.constants import INVITATION
from contentcuration.viewsets.sync.utils import generate_update_event


class InvitationSerializer(BulkModelSerializer):
    # These fields are `read_only` by default, but get set to writable
    # in the `get_fields` method under appropriate conditions
    revoked = serializers.BooleanField(read_only=True)
    accepted = serializers.BooleanField(read_only=True)
    declined = serializers.BooleanField(read_only=True)

    channel = UserFilteredPrimaryKeyRelatedField(queryset=Channel.objects.all())

    class Meta:
        model = Invitation
        fields = (
            "id",
            "accepted",
            "declined",
            "revoked",
            "email",
            "channel",
            "share_mode",
            "first_name",
            "last_name",
        )
        list_serializer_class = BulkListSerializer

    def create(self, validated_data):
        # Need to remove default values for these non-model fields here
        if "request" in self.context:
            # If this has been newly created add the current user as the sender
            self.validated_data["sender"] = self.context["request"].user

        return super(InvitationSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        instance = super(InvitationSerializer, self).update(instance, validated_data)
        accepted = self.initial_data.get("accepted") or instance.accepted
        revoked = self.initial_data.get("revoked") or instance.revoked

        if accepted and not revoked:
            instance.accept()
            self.changes.append(
                generate_update_event(
                    instance.id,
                    INVITATION,
                    {
                        "accepted": True,
                    },
                    channel_id=instance.channel_id,
                )
            )

        return instance

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")

        # allow invitation state to be modified under the right conditions
        if request and request.user and self.instance:
            if self.instance.invited == request.user:
                fields["accepted"].read_only = self.instance.revoked
                fields["declined"].read_only = False
            if self.instance.sender == request.user:
                fields["revoked"].read_only = False

        return fields


class InvitationFilter(FilterSet):
    invited = CharFilter(method="filter_invited")
    channel = CharFilter(method="filter_channel")

    class Meta:
        model = Invitation
        fields = (
            "invited",
            "channel",
        )

    def filter_invited(self, queryset, name, value):
        return queryset.filter(email__iexact=self.request.user.email)

    def filter_channel(self, queryset, name, value):
        return queryset.filter(channel_id=value)


def get_sender_name(item):
    return "{} {}".format(item.get("sender__first_name"), item.get("sender__last_name"))


class InvitationViewSet(ValuesViewset):
    queryset = Invitation.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_class = InvitationFilter
    serializer_class = InvitationSerializer
    values = (
        "id",
        "invited",
        "email",
        "accepted",
        "declined",
        "revoked",
        "invited__first_name",
        "invited__last_name",
        "sender__first_name",
        "sender__last_name",
        "channel_id",
        "share_mode",
        "channel__name",
    )
    field_map = {
        "first_name": "invited__first_name",
        "last_name": "invited__last_name",
        "sender_name": get_sender_name,
        "channel_name": "channel__name",
        "channel": "channel_id",
    }

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.save()

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        invitation = self.get_object()
        invitation.accept()
        invitation.accepted = True
        invitation.save()
        Change.create_change(
            generate_update_event(
                invitation.id, INVITATION, {"accepted": True}, channel_id=invitation.channel_id
            ), applied=True, created_by_id=request.user.id
        )
        return Response({"status": "success"})

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        invitation = self.get_object()
        invitation.declined = True
        invitation.save()
        Change.create_change(
            generate_update_event(
                invitation.id, INVITATION, {"declined": True}, channel_id=invitation.channel_id
            ), applied=True, created_by_id=request.user.id
        )
        return Response({"status": "success"})
