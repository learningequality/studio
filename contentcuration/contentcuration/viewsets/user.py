import csv
import logging
import uuid
from datetime import date
from functools import reduce

from django.db import IntegrityError
from django.db.models import BooleanField
from django.db.models import CharField
from django.db.models import Exists
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat
from django.http import HttpResponseBadRequest
from django.http import StreamingHttpResponse
from django.http.response import HttpResponseForbidden
from django.http.response import HttpResponseNotFound
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DateFilter
from django_filters.rest_framework import FilterSet
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_204_NO_CONTENT

from contentcuration.constants import feature_flags
from contentcuration.models import boolean_val
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import Country
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


logger = logging.getLogger(__name__)


# Shared at module scope so filter methods and the CSV action's annotate()
# call agree on semantics.
USER_HAS_PUBLISHED_CHANNEL = Exists(
    Channel.objects.filter(
        editors=OuterRef("id"),
        last_published__isnull=False,
        deleted=False,
    )
)
USER_HAS_EDITABLE_CHANNELS = Exists(
    Channel.objects.filter(editors=OuterRef("id"), deleted=False)
)
USER_HAS_VIEWABLE_CHANNELS = Exists(
    Channel.objects.filter(viewers=OuterRef("id"), deleted=False)
)
USER_HAS_STUDIO_EDITS = Exists(Change.objects.filter(created_by=OuterRef("id")))


class IsAdminUser(BasePermission):
    """
    Our custom permission to check admin authorization.
    """

    def has_permission(self, request, view):
        try:
            return request.user and request.user.is_admin
        except AttributeError:
            return False


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
                        channel_queryset.filter(editors=OuterRef("id")),
                        field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
            can_view=Cast(
                Cast(
                    SQCount(
                        channel_queryset.filter(viewers=OuterRef("id")),
                        field="id",
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


class MarkNotificationsReadSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField(
        required=True,
        help_text="Timestamp of the last read notification.",
    )


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

    @action(
        detail=False,
        methods=["post"],
        serializer_class=MarkNotificationsReadSerializer,
    )
    def mark_notifications_read(self, request):
        """
        Allows a user to mark the timestamp of their last read notification.
        """
        user = request.user

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        timestamp = serializer.validated_data["timestamp"]
        user.mark_notifications_read(timestamp)
        return Response(status=HTTP_204_NO_CONTENT)

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
            return queryset.none().annotate(
                can_edit=boolean_val(False), can_view=boolean_val(False)
            )
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
        except IntegrityError:
            logger.exception("_handle_relationship_changes IntegrityError")
            for change in valid_changes:
                change.update({"errors": ["Internal server error"]})
                errors.append(change)

        for change in invalid_changes:
            change.update({"errors": ValidationError("Not found").detail})
            errors.append(change)

        return errors or None

    def create_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    def delete_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    @action(detail=True, methods=["delete"])
    def remove_self(self, request, pk=None):
        """
        Allows a user to remove themselves from a channel as a viewer.
        """
        user = self.get_object()
        channel_id = request.query_params.get("channel_id", None)

        if not channel_id:
            return HttpResponseBadRequest("Channel ID is required.")
        try:
            channel_id = uuid.UUID(channel_id).hex
        except ValueError:
            return HttpResponseBadRequest("Invalid channel ID")

        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist:
            return HttpResponseNotFound("Channel not found {}".format(channel_id))

        if request.user != user and not request.user.can_edit(channel_id):
            return HttpResponseForbidden(
                "You do not have permission to remove this user {}".format(user.id)
            )

        if channel.viewers.filter(id=user.id).exists():
            channel.viewers.remove(user)
            return Response(status=HTTP_204_NO_CONTENT)
        else:
            return HttpResponseBadRequest("User is not a viewer of this channel.")


class AdminUserFilter(FilterSet):
    keywords = CharFilter(method="filter_keywords")
    is_active = BooleanFilter(method="filter_is_active")
    is_admin = BooleanFilter(method="filter_is_admin")
    chef = BooleanFilter(method="filter_chef")
    location = CharFilter(method="filter_location")
    ids = CharFilter(method="filter_ids")
    published_channel = BooleanFilter(method="filter_published_channel")
    has_edits = BooleanFilter(method="filter_has_edits")
    active_since = DateFilter(field_name="last_login", lookup_expr="gte")
    joined_since = DateFilter(field_name="date_joined", lookup_expr="gte")

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

    def filter_published_channel(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(USER_HAS_PUBLISHED_CHANNEL)

    def filter_has_edits(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(USER_HAS_STUDIO_EDITS)

    class Meta:
        model = User
        fields = (
            "keywords",
            "is_active",
            "is_admin",
            "chef",
            "location",
            "published_channel",
            "has_edits",
            "active_since",
            "joined_since",
        )


class AdminUserCSVFilter(AdminUserFilter, RequiredFilterSet):
    """Reject CSV requests with no filter params.

    Replaces a row-count cap: an unfiltered CSV export could pull the entire
    user table. `RequiredFiltersFilterBackend` sets `required=True` on this
    filterset because the action is `detail=False`, which makes
    `RequiredFilterSet.qs` raise `MissingRequiredParamsException` (412) when
    no filter is supplied.
    """


CSV_HEADERS = [
    "First name",
    "Last name",
    "Email",
    "Is active",
    "Is admin",
    "Date joined",
    "Last active",
    "Disk space (bytes)",
    "Disk space used (bytes)",
    "Has editable channels",
    "Has viewable channels",
    "Has published a channel",
    "Most recent publish date",
    "Has Studio edits",
    "Locations (country names)",
    "Primary location",
    "Location count",
    "Storage needed",
    "Heard from",
]

CSV_VALUES_COLUMNS = (
    "first_name",
    "last_name",
    "email",
    "is_active",
    "is_admin",
    "date_joined",
    "last_login",
    "disk_space",
    "disk_space_used",
    "has_editable_channels",
    "has_viewable_channels",
    "has_published_channel",
    "most_recent_publish",
    "has_studio_edits",
    "information",
)


def _yes_no(value):
    return "Yes" if value else "No"


def _iso_date(value):
    if value is None:
        return ""
    return value.date().isoformat() if hasattr(value, "date") else value.isoformat()


def _build_csv_row(values, country_names):
    """Translate one user .values() dict to a CSV row.

    `country_names` is a dict mapping alpha-2 codes to display names, built once
    per request.
    """
    info = values.get("information") or {}
    location_codes = info.get("locations") or []
    location_names = [country_names.get(c, c) for c in location_codes]

    return [
        values["first_name"],
        values["last_name"],
        values["email"],
        _yes_no(values["is_active"]),
        _yes_no(values["is_admin"]),
        _iso_date(values["date_joined"]),
        _iso_date(values["last_login"]),
        values["disk_space"],
        values["disk_space_used"],
        _yes_no(values["has_editable_channels"]),
        _yes_no(values["has_viewable_channels"]),
        _yes_no(values["has_published_channel"]),
        _iso_date(values["most_recent_publish"]),
        _yes_no(values["has_studio_edits"]),
        ", ".join(location_names),
        location_names[0] if location_names else "",
        len(location_codes),
        info.get("space_needed") or "",
        info.get("heard_from") or "",
    ]


class _Echo:
    """File-like stub that returns whatever is written to it (streaming CSV pattern)."""

    def write(self, value):
        return value


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


class AdminUserViewSet(
    ReadOnlyValuesViewset, RESTUpdateModelMixin, RESTDestroyModelMixin
):
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
    queryset = User.objects.filter(deleted=False)

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
        information.update(
            {
                "edit_channels": user.editable_channels.filter(deleted=False).values(
                    "id", "name"
                ),
                "viewonly_channels": user.view_only_channels.filter(
                    deleted=False
                ).values("id", "name"),
                "total_space": user.disk_space,
                "used_space": user.disk_space_used,
                "policies": user.policies,
                "feature_flags": user.feature_flags or {},
            }
        )
        return Response(information)

    @action(
        detail=False,
        methods=["get"],
        url_path="download_csv",
        url_name="download-csv",
        filterset_class=AdminUserCSVFilter,
    )
    def download_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.annotate(
            has_editable_channels=USER_HAS_EDITABLE_CHANNELS,
            has_viewable_channels=USER_HAS_VIEWABLE_CHANNELS,
            has_published_channel=USER_HAS_PUBLISHED_CHANNEL,
            most_recent_publish=Max(
                "editable_channels__last_published",
                filter=Q(editable_channels__deleted=False),
            ),
            has_studio_edits=USER_HAS_STUDIO_EDITS,
        )

        country_names = {c.code: c.name for c in Country.objects.all()}
        writer = csv.writer(_Echo())

        def stream():
            yield writer.writerow(CSV_HEADERS)
            rows = queryset.values(*CSV_VALUES_COLUMNS).iterator(chunk_size=2000)
            for values in rows:
                yield writer.writerow(_build_csv_row(values, country_names))

        response = StreamingHttpResponse(stream(), content_type="text/csv")
        response[
            "Content-Disposition"
        ] = f'attachment; filename="studio_users_{date.today().isoformat()}.csv"'
        return response
