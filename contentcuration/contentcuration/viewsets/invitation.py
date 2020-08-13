from django.db.models import Q
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers

from contentcuration.models import Invitation
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.sync.constants import INVITATION
from contentcuration.viewsets.sync.utils import add_event_for_user
from contentcuration.viewsets.sync.utils import generate_update_event


class InvitationSerializer(BulkModelSerializer):
    accepted = serializers.BooleanField(default=False)
    declined = serializers.BooleanField(default=False)

    class Meta:
        model = Invitation
        fields = (
            "id",
            "accepted",
            "declined",
            "email",
            "channel",
            "share_mode",
            "first_name",
            "last_name",
        )
        list_serializer_class = BulkListSerializer

    def create(self, validated_data):
        if "request" in self.context:
            # If this has been newly created add the current user as the sender
            self.validated_data["sender"] = self.context["request"].user

        return super(InvitationSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        accepted = validated_data.pop("accepted", None)
        declined = validated_data.pop("declined", None)
        instance = super(InvitationSerializer, self).update(instance, validated_data)
        if accepted:
            if instance.sender_id:
                user_id = instance.sender_id
                event = generate_update_event(
                    instance.id, INVITATION, {"accepted": True}
                )
                add_event_for_user(user_id, event)
            instance.accept()
        elif declined:
            if instance.sender_id:
                user_id = instance.sender_id
                event = generate_update_event(
                    instance.id, INVITATION, {"declined": True}
                )
                add_event_for_user(user_id, event)
            instance.delete()
        else:
            return instance


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
    filter_backends = (DjangoFilterBackend,)
    filter_class = InvitationFilter
    serializer_class = InvitationSerializer
    values = (
        "id",
        "invited",
        "email",
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
        "accepted": False,
    }

    def get_queryset(self):
        return Invitation.objects.filter(
            Q(email__iexact=self.request.user.email)
            | Q(sender=self.request.user)
            | Q(channel__editors=self.request.user)
            | Q(channel__viewers=self.request.user)
        ).distinct()

    def get_edit_queryset(self):
        return Invitation.objects.filter(
            Q(email__iexact=self.request.user.email)
            | Q(sender=self.request.user)
            | Q(channel__editors=self.request.user)
        ).distinct()

    def prefetch_queryset(self, queryset):
        return queryset.select_related("sender", "channel")
