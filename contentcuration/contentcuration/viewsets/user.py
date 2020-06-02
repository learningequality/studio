from django.db.models import BooleanField
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.functions import Cast
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import Channel
from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import NotNullArrayAgg


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class UserFilter(FilterSet):
    ids = CharFilter(method="filter_ids")
    channel = CharFilter(method="filter_channel")

    def filter_ids(self, queryset, name, value):
        try:
            # Limit SQL params to 50 - shouldn't be fetching this many
            # ids at once
            return queryset.filter(pk__in=value.split(",")[:50])
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()

    def filter_channel(self, queryset, name, value):
        channel_queryset = Channel.objects.filter(pk=value)
        queryset = queryset.annotate(
            can_edit=Cast(
                Cast(
                    SQCount(
                        channel_queryset.filter(editors=OuterRef("id")), field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
            can_view=Cast(
                Cast(
                    SQCount(
                        channel_queryset.filter(viewers=OuterRef("id")), field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
        )
        if self.request.GET.get("include_viewonly"):
            return queryset.filter(Q(can_edit=True) | Q(can_view=True))

        return queryset.filter(can_edit=True)

    class Meta:
        model = User
        fields = ("ids",)


class UserSerializer(BulkModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "is_active",
        )
        list_serializer_class = BulkListSerializer


class UserViewSet(ValuesViewset):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = UserFilter
    values = (
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "editable_channels__ids",
        "view_only_channels__ids",
    )
    field_map = {
        "editable_channels": "editable_channels__ids",
        "view_only_channels": "view_only_channels__ids",
    }

    def get_queryset(self):
        assert not self.request.user.is_anonymous()

        if self.request.user.is_admin:
            queryset = User.objects.all()
        else:
            channel_list = Channel.objects.filter(
                Q(
                    pk__in=self.request.user.editable_channels.values_list(
                        "pk", flat=True
                    )
                )
                | Q(
                    pk__in=self.request.user.view_only_channels.values_list(
                        "pk", flat=True
                    )
                )
            ).values_list("pk", flat=True)
            queryset = User.objects.filter(
                id__in=User.objects.filter(
                    Q(pk=self.request.user.pk)
                    | Q(editable_channels__pk__in=channel_list)
                    | Q(view_only_channels__pk__in=channel_list)
                )
            )

        return queryset.order_by("first_name", "last_name")

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(
            editable_channels__ids=NotNullArrayAgg("editable_channels__id"),
            view_only_channels__ids=NotNullArrayAgg("view_only_channels__id"),
        )
        return queryset
