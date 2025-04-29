from functools import reduce

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
from django.http import HttpResponseBadRequest
from django.http.response import HttpResponseForbidden
from django.http.response import HttpResponseNotFound
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import FilterSet
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_204_NO_CONTENT

from contentcuration.constants import feature_flags
from contentcuration.models import boolean_val
from contentcuration.models import Channel
from contentcuration.models import User
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import RESTDestroyModelMixin
from contentcuration.viewsets.base import RESTUpdateModelMixin
from contentcuration.viewsets.common import NotNullArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDFilter
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import VIEWER_M2M


class IsAdminUser(BasePermission):
    """
    Our custom permission to check admin authorization.
    """

    def has_permission(self, request, view):
        try:
            return request.user and request.user.is_admin
        except AttributeError:
            return False


class IsAIFeatureEnabledForUser(BasePermission):
    """
    Permission to check if the AI feature is enabled for a user.
    """

    def _can_user_access_feature(self, request):
        try:
            if request.user.is_admin:
                return True
            else:
                return request.user.check_feature_flag('ai_feature')
        except AttributeError:
            return False

    def has_permission(self, request, view):
        return self._can_user_access_feature(request)

    def has_object_permission(self, request, view, obj):
        return self._can_user_access_feature(request)


class UserListPagination(ValuesViewsetPageNumberPagination):
    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 100


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
    filterset_class = UserFilter
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

    @action(detail=False, methods=["get"])
    def get_storage_used(self, request):
        return Response(request.user.disk_space_used)

    @action(detail=False, methods=["get"])
    def refresh_storage_used(self, request):
        return Response(request.user.set_space_used())

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
        if not self.request.user.can_edit(value):
            return queryset.none().annotate(can_edit=boolean_val(False), can_view=boolean_val(False))
        user_queryset = User.objects.filter(id=OuterRef("id"))
        queryset = queryset.annotate(
            can_edit=Exists(user_queryset.filter(editable_channels=value)),
            can_view=Exists(user_queryset.filter(view_only_channels=value)),
        )
        return queryset.filter(Q(can_edit=True) | Q(can_view=True))

    class Meta:
        model = User
        fields = ("channel",)


class ChannelUserViewSet(ReadOnlyValuesViewset):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ChannelUserFilter
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

    def _get_values_from_change(self, change):
        return {
            "user_id": change["key"][0],
            "channel_id": change["key"][1],
        }

    def _execute_changes(self, table, change_type, data):
        if data:
            if change_type == CREATED:
                if table == EDITOR_M2M:
                    Channel.editors.through.objects.bulk_create(
                        [Channel.editors.through(**d) for d in data]
                    )
                elif table == VIEWER_M2M:
                    Channel.viewers.through.objects.bulk_create(
                        [Channel.viewers.through(**d) for d in data]
                    )
            elif change_type == DELETED:
                q = reduce(lambda x, y: x | y, map(lambda x: Q(**x), data))
                if table == EDITOR_M2M:
                    Channel.editors.through.objects.filter(q).delete()
                elif table == VIEWER_M2M:
                    Channel.viewers.through.objects.filter(q).delete()

    def _check_permissions(self, changes):
        # Filter the passed in channels
        allowed_channels = set(
            Channel.filter_edit_queryset(Channel.objects.all(), self.request.user)
            .filter(id__in=list(map(lambda x: x["key"][1], changes)))
            .values_list("id", flat=True)
        )

        valid_changes = []
        invalid_changes = []

        for change in changes:
            if change["key"][1] in allowed_channels:
                valid_changes.append(change)
            else:
                invalid_changes.append(change)
        return valid_changes, invalid_changes

    def _handle_relationship_changes(self, changes):
        tables = set(map(lambda x: x["table"], changes))
        if len(tables) > 1:
            raise TypeError("Mixed tables passed to change handler")
        table = tuple(tables)[0]

        change_types = set(map(lambda x: x["type"], changes))
        if len(change_types) > 1:
            raise TypeError("Mixed change types passed to change handler")

        change_type = tuple(change_types)[0]

        valid_changes, invalid_changes = self._check_permissions(changes)
        errors = []

        data = list(map(self._get_values_from_change, valid_changes))

        # In Django 2.2 add ignore_conflicts to make this fool proof
        try:
            self._execute_changes(table, change_type, data)
        except IntegrityError as e:
            for change in valid_changes:
                change.update({"errors": str(e)})
                errors.append(change)

        for change in invalid_changes:
            change.update({"errors": ValidationError("Not found").detail})
            errors.append(change)

        return errors or None

    def create_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    def delete_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    @action(detail=True, methods=['delete'])
    def remove_self(self, request, pk=None):
        """
        Allows a user to remove themselves from a channel as a viewer.
        """
        user = self.get_object()
        channel_id = request.query_params.get('channel_id', None)

        if not channel_id:
            return HttpResponseBadRequest('Channel ID is required.')

        channel = Channel.objects.get(id=channel_id)
        if not channel:
            return HttpResponseNotFound("Channel not found {}".format(channel_id))

        if request.user != user and not request.user.can_edit(channel_id):
            return HttpResponseForbidden("You do not have permission to remove this user {}".format(user.id))

        if channel.viewers.filter(id=user.id).exists():
            channel.viewers.remove(user)
            return Response(status=HTTP_204_NO_CONTENT)
        else:
            return HttpResponseBadRequest('User is not a viewer of this channel.')


class AdminUserFilter(FilterSet):
    keywords = CharFilter(method="filter_keywords")
    is_active = BooleanFilter(method="filter_is_active")
    is_admin = BooleanFilter(method="filter_is_admin")
    chef = BooleanFilter(method="filter_chef")
    location = CharFilter(method="filter_location")
    ids = CharFilter(method="filter_ids")

    def filter_ids(self, queryset, name, value):
        try:
            return queryset.filter(pk__in=value.split(","))
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()

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


class AdminUserSerializer(UserSerializer):
    def validate(self, attrs):
        if "feature_flags" in attrs:
            feature_flags.validate(attrs["feature_flags"])
        return attrs

    def update(self, instance, validated_data):
        # support partial updates to feature flags
        flags = validated_data.pop("feature_flags", None)
        if flags is not None:
            if instance.feature_flags is None:
                instance.feature_flags = {}
            instance.feature_flags.update(flags)

        return super(UserSerializer, self).update(instance, validated_data)

    class Meta:
        model = User
        fields = (
            "id",
            "is_active",
            "disk_space",
            "is_active",
            "is_admin",
            "feature_flags",
        )
        list_serializer_class = BulkListSerializer


class AdminUserViewSet(ReadOnlyValuesViewset, RESTUpdateModelMixin, RESTDestroyModelMixin):
    pagination_class = UserListPagination
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filterset_class = AdminUserFilter

    values = (
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "disk_space",
        "last_login",
        "date_joined",
        "is_admin",
        "is_active",
        "name",
        "edit_count",
        "view_count",
    )
    queryset = User.objects.all()

    def annotate_queryset(self, queryset):
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

    @action(detail=True, methods=("get",))
    def metadata(self, request, pk=None):
        user = self._get_object_from_queryset(self.queryset)
        information = user.information or {}
        information.update({
            'edit_channels': user.editable_channels.filter(deleted=False).values('id', 'name'),
            'viewonly_channels': user.view_only_channels.filter(deleted=False).values('id', 'name'),
            'total_space': user.disk_space,
            'used_space': user.disk_space_used,
            'policies': user.policies,
            'feature_flags': user.feature_flags or {}
        })
        return Response(information)
