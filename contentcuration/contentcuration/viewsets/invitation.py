from django.db.models import Q
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.response import Response
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework import serializers
from rest_framework_bulk import BulkSerializerMixin

from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.viewsets.base import ValuesViewset


class InvitationSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    accepted = serializers.BooleanField(default=False)

    class Meta:
        model = Invitation
        fields = ("id", "accepted", "email", "channel", "share_mode")
        read_only_fields = ("id",)

    def save(self, **kwargs):
        created = self.instance is None
        if "email" in self.validated_data:
            try:
                self.validated_data["invited"] = User.objects.get(
                    email=self.validated_data["email"]
                )
                self.validated_data.pop("email")
            except User.DoesNotExist:
                pass
        if created and "request" in self.context:
            # If this has been newly created add the current user as the sender
            self.validated_data["sender"] = self.context["request"].user
        instance = super(InvitationSerializer, self).save(**kwargs)
        return instance


class InvitationFilter(FilterSet):
    invited = CharFilter(method="filter_invited")

    class Meta:
        model = Invitation
        fields = ("invited",)

    def filter_invited(self, queryset, name, value):
        return queryset.filter(invited=self.request.user)


class InvitationViewSet(ValuesViewset):
    queryset = Invitation.objects.all()
    filter_backends = (DjangoFilterBackend,)
    filter_class = InvitationFilter
    serializer_class = InvitationSerializer
    values = (
        "id",
        "invited",
        "email",
        "sender__first_name",
        "sender__last_name",
        "channel_id",
        "share_mode",
        "channel__name",
    )
    field_map = {
        "first_name": "sender__first_name",
        "last_name": "sender__last_name",
        "channel_name": "channel__name",
        "accepted": False,
    }

    def get_queryset(self):
        return Invitation.objects.filter(
            Q(invited=self.request.user)
            | Q(sender=self.request.user)
            | Q(channel__editors=self.request.user)
            | Q(channel__viewers=self.request.user)
        ).distinct()

    def prefetch_queryset(self, queryset):
        return queryset.select_related("sender", "channel")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.query_params.get("accepted", False):
            instance.accept()
        else:
            instance.delete()
        return Response(status=HTTP_204_NO_CONTENT)
