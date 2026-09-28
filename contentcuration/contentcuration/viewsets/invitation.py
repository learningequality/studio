from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import FilterSet
from rest_framework import serializers
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.models import Organization
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

    channel = UserFilteredPrimaryKeyRelatedField(
        queryset=Channel.objects.all(), required=False
    )
    organization = UserFilteredPrimaryKeyRelatedField(
        queryset=Organization.objects.all(), required=False
    )

    class Meta:
        model = Invitation
        fields = (
            "id",
            "accepted",
            "declined",
            "revoked",
            "email",
            "channel",
            "organization",
            "share_mode",
            "first_name",
            "last_name",
        )
        list_serializer_class = BulkListSerializer

    def validate(self, data):
        channel = data.get("channel", getattr(self.instance, "channel_id", None))
        organization = data.get(
            "organization", getattr(self.instance, "organization_id", None)
        )
        if not channel and not organization:
            raise serializers.ValidationError(
                "Invitation must specify either a channel or an organization."
            )
        if channel and organization:
            raise serializers.ValidationError(
                "Invitation cannot specify both a channel and an organization."
            )
        return data

    def create(self, validated_data):
        # Need to remove default values for these non-model fields here
        if "request" in self.context:
            # If this has been newly created add the current user as the sender
            self.validated_data["sender"] = self.context["request"].user

        return super(InvitationSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        instance = super(InvitationSerializer, self).update(instance, validated_data)
        # validated_data, not initial_data, respects get_fields' read-only
        # flags; only trigger accept() on an actual incoming toggle.
        accepted = validated_data.get("accepted")
        revoked = validated_data.get("revoked") or instance.revoked

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
                    user_id=self.context["request"].user.id,
                )
            )

        return instance

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")

        # allow invitation state to be modified under the right conditions
        if request and request.user and self.instance:
            # Match on email, not the `invited` FK - `invited` is only set by
            # the channel email-invite flow, never for sync-created invitations.
            if (request.user.email or "").lower() == (
                self.instance.email or ""
            ).lower():
                fields["accepted"].read_only = self.instance.revoked
                fields["declined"].read_only = False

            is_org_admin = (
                self.instance.organization_id
                and Organization.filter_edit_queryset(
                    Organization.objects.filter(id=self.instance.organization_id),
                    request.user,
                ).exists()
            )
            if self.instance.sender == request.user or is_org_admin:
                fields["revoked"].read_only = False
            else:
                # Otherwise the invitee could raise their own access level
                # (e.g. to org admin) via share_mode before accepting.
                fields["share_mode"].read_only = True

        return fields


class InvitationFilter(FilterSet):
    invited = CharFilter(method="filter_invited")
    channel = CharFilter(method="filter_channel")
    organization = CharFilter(method="filter_organization")

    class Meta:
        model = Invitation
        fields = (
            "invited",
            "channel",
            "organization",
        )

    def filter_invited(self, queryset, name, value):
        return queryset.filter(email__iexact=self.request.user.email)

    def filter_channel(self, queryset, name, value):
        return queryset.filter(channel_id=value)

    def filter_organization(self, queryset, name, value):
        return queryset.filter(organization_id=value)


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
        "organization_id",
        "share_mode",
        "channel__name",
        "organization__name",
    )
    field_map = {
        "first_name": "invited__first_name",
        "last_name": "invited__last_name",
        "sender_name": get_sender_name,
        "channel_name": "channel__name",
        "organization_name": "organization__name",
        "channel": "channel_id",
        "organization": "organization_id",
    }

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.save()

    def _ensure_invitee(self, request, invitation):
        if request.user.is_admin:
            return
        if (request.user.email or "").lower() != (invitation.email or "").lower():
            raise PermissionDenied("Only the invited user may perform this action.")

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        invitation = self.get_edit_object()
        self._ensure_invitee(request, invitation)
        if invitation.revoked:
            return Response(
                "Invitation has been revoked",
                status=status.HTTP_400_BAD_REQUEST,
            )
        invitation.accept()
        invitation.accepted = True
        invitation.save()
        Change.create_change(
            generate_update_event(
                invitation.id,
                INVITATION,
                {"accepted": True},
                channel_id=invitation.channel_id,
                user_id=request.user.id,
            ),
            applied=True,
            created_by_id=request.user.id,
        )
        return Response({"status": "success"})

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        invitation = self.get_edit_object()
        self._ensure_invitee(request, invitation)
        invitation.declined = True
        invitation.save()
        Change.create_change(
            generate_update_event(
                invitation.id,
                INVITATION,
                {"declined": True},
                channel_id=invitation.channel_id,
                user_id=request.user.id,
            ),
            applied=True,
            created_by_id=request.user.id,
        )
        return Response({"status": "success"})

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        invitation = self.get_edit_object()
        is_org_admin = (
            invitation.organization_id
            and Organization.filter_edit_queryset(
                Organization.objects.filter(id=invitation.organization_id),
                request.user,
            ).exists()
        )
        if (
            invitation.sender_id != request.user.id
            and not is_org_admin
            and not request.user.is_admin
        ):
            raise PermissionDenied(
                "Only the sender or an organization admin may revoke this invitation."
            )
        invitation.revoked = True
        invitation.save()
        Change.create_change(
            generate_update_event(
                invitation.id,
                INVITATION,
                {"revoked": True},
                channel_id=invitation.channel_id,
                user_id=request.user.id,
            ),
            applied=True,
            created_by_id=request.user.id,
        )
        return Response({"status": "success"})
