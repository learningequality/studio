from django.db import IntegrityError
from django.db.models import BooleanField
from django.db.models import CharField
from django.db.models import Exists
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import Channel
from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RelationMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.common import CatalogPaginator
from contentcuration.viewsets.common import NotNullArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDFilter
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import VIEWER_M2M


class UserListPagination(PageNumberPagination):
    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 100
    django_paginator_class = CatalogPaginator

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page_number": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


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


class UserViewSet(ReadOnlyValuesViewset):
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

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(
            editable_channels__ids=NotNullArrayAgg("editable_channels__id"),
            view_only_channels__ids=NotNullArrayAgg("view_only_channels__id"),
        )
        return queryset


class ChannelUserFilter(RequiredFilterSet):
    channel = UUIDFilter(method="filter_channel")

    def filter_channel(self, queryset, name, value):
        # Check permissions
        self.request.user.can_edit(value)
        user_queryset = User.objects.filter(id=OuterRef("id"))
        queryset = queryset.annotate(
            can_edit=Exists(user_queryset.filter(editable_channels=value)),
            can_view=Exists(user_queryset.filter(view_only_channels=value)),
        )
        return queryset.filter(Q(can_edit=True) | Q(can_view=True))

    class Meta:
        model = User
        fields = ("channel",)


class ChannelUserViewSet(ReadOnlyValuesViewset, RelationMixin):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelUserFilter
    values = (
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "can_edit",
        "can_view",
    )

    def get_queryset(self):
        return self.queryset.order_by("first_name", "last_name")

    def create_relation(self, relation):
        try:
            table = relation["table"]
            user = relation["obj"]["user"]
            channel = relation["obj"]["channel"]
        except KeyError:
            return "Table, user, and channel must be specified", None
        try:
            if table == EDITOR_M2M:
                Channel.editors.through.objects.create(user_id=user, channel_id=channel)
            elif table == VIEWER_M2M:
                Channel.viewers.through.objects.create(user_id=user, channel_id=channel)
        except IntegrityError as e:
            errors = [str(e)]
        finally:
            errors = None
        return errors, None

    def delete_relation(self, relation):
        try:
            table = relation["table"]
            user = relation["obj"]["user"]
            channel = relation["obj"]["channel"]
        except KeyError:
            return "Table, user, and channel must be specified", None
        try:
            if table == EDITOR_M2M:
                Channel.editors.through.objects.filter(
                    user_id=user, channel_id=channel
                ).delete()
            elif table == VIEWER_M2M:
                Channel.viewers.through.objects.filter(
                    user_id=user, channel_id=channel
                ).delete()
        except IntegrityError as e:
            errors = [str(e)]
        finally:
            errors = None
        return errors, None


class AdminUserFilter(FilterSet):
    keywords = CharFilter(method="filter_keywords")
    is_active = BooleanFilter(method="filter_is_active")
    is_admin = BooleanFilter(method="filter_is_admin")
    chef = BooleanFilter(method="filter_chef")
    location = CharFilter(method="filter_location")

    def filter_keywords(self, queryset, name, value):
        regex = r"^(" + "|".join(value.split(" ")) + ")$"
        return queryset.filter(
            Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(email__icontains=value)
            | Q(editable_channels__name__iregex=regex)
            | Q(editable_channels__id__iregex=regex)
        )

    def filter_is_active(self, queryset, name, value):
        return queryset.filter(is_active=value)

    def filter_is_admin(self, queryset, name, value):
        return queryset.filter(is_admin=value)

    def filter_chef(self, queryset, name, value):
        chef_channel_query = (
            Channel.objects.filter(editors__id=OuterRef("id"), deleted=False)
            .exclude(ricecooker_version=None)
            .values_list("id", flat=True)
            .distinct()
        )
        return queryset.annotate(
            chef_count=SQCount(chef_channel_query, field="id")
        ).filter(chef_count__gt=0)

    def filter_location(self, queryset, name, value):
        return queryset.filter(information__locations__contains=value)

    class Meta:
        model = User
        fields = ("keywords", "is_active", "is_admin", "chef", "location")


class AdminUserViewSet(UserViewSet):
    pagination_class = UserListPagination
    permission_classes = [IsAdminUser]
    filter_class = AdminUserFilter
    filter_backends = (
        DjangoFilterBackend,
        OrderingFilter,
    )

    values = UserViewSet.values + (
        "disk_space",
        "edit_count",
        "view_count",
        "last_login",
        "date_joined",
        "is_admin",
        "is_active",
        "name",
    )
    ordering_fields = (
        "name",
        "last_name",
        "email",
        "disk_space",
        "edit_count",
        "view_count",
        "date_joined",
        "last_login",
    )
    ordering = ("name",)

    def annotate_queryset(self, queryset):
        queryset = super().annotate_queryset(queryset)

        edit_channel_query = (
            Channel.objects.filter(editors__id=OuterRef("id"), deleted=False)
            .values_list("id", flat=True)
            .distinct()
        )
        viewonly_channel_query = (
            Channel.objects.filter(viewers__id=OuterRef("id"), deleted=False)
            .values_list("id", flat=True)
            .distinct()
        )
        queryset = queryset.annotate(
            name=Concat(
                F("first_name"), Value(" "), F("last_name"), output_field=CharField()
            ),
            edit_count=SQCount(edit_channel_query, field="id"),
            view_count=SQCount(viewonly_channel_query, field="id"),
        )
        return queryset
