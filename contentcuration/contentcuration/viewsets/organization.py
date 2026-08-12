from django.db import transaction
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import NumberFilter
from django_filters.rest_framework import UUIDFilter
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_ROLE_STATUS_ACTIVE
from contentcuration.constants.organization_roles import ORGANIZATION_VIEWER
from contentcuration.constants.organization_roles import (
    organization_role_status_choices,
)
from contentcuration.models import Organization
from contentcuration.models import OrganizationRole
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import RESTCreateModelMixin
from contentcuration.viewsets.base import RESTDestroyModelMixin
from contentcuration.viewsets.base import RESTUpdateModelMixin
from contentcuration.viewsets.base import ValuesViewset


class OrganizationSerializer(BulkModelSerializer):
    """
    Write serializer for organizations.

    Read operations are handled by OrganizationViewSet.values, following the
    ValuesViewset pattern used elsewhere in Studio.
    """

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "thumbnail",
            "thumbnail_encoding",
            "public",
        )
        list_serializer_class = BulkListSerializer


class OrganizationMemberSerializer(BulkModelSerializer):
    """
    Write serializer for OrganizationRole membership records.

    Organization and user are writable when creating a membership. They are
    immutable once the membership exists; admins may update role, description,
    or status. Read operations are handled by the viewset values map.
    """

    status = serializers.ChoiceField(
        choices=organization_role_status_choices,
        required=False,
    )

    class Meta:
        model = OrganizationRole
        fields = (
            "id",
            "organization",
            "user",
            "role",
            "description",
            "status",
        )
        list_serializer_class = BulkListSerializer

    def update(self, instance, validated_data):
        validated_data.pop("organization", None)
        validated_data.pop("user", None)
        return super(OrganizationMemberSerializer, self).update(
            instance, validated_data
        )


class OrganizationFilter(FilterSet):
    name = CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Organization
        fields = ("name", "public")


class OrganizationMemberFilter(FilterSet):
    organization = UUIDFilter(field_name="organization_id")
    user = NumberFilter(field_name="user_id")

    class Meta:
        model = OrganizationRole
        fields = ("organization", "user", "role", "status")


class OrganizationPagination(ValuesViewsetPageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _is_site_admin(user):
    return bool(getattr(user, "is_admin", False))


class OrganizationViewSet(
    ValuesViewset,
    RESTCreateModelMixin,
    RESTUpdateModelMixin,
    RESTDestroyModelMixin,
):
    """
    Organization CRUD API.

    Active organization admins may update or delete an organization. Any
    authenticated user may create an organization and becomes its first active
    administrator. Site administrators may manage every organization.
    """

    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = OrganizationFilter
    pagination_class = OrganizationPagination
    ordering_fields = ("name", "created_at", "updated_at")
    ordering = "name"

    values = (
        "id",
        "name",
        "description",
        "thumbnail",
        "thumbnail_encoding",
        "public",
        "created_at",
        "updated_at",
    )

    # def get_queryset(self):
    #     """
    #     Return organizations visible to the current user.

    #     Public organizations are visible to authenticated users. Private
    #     organizations require an active membership. Non-active memberships do
    #     not grant access.
    #     """
    #     queryset = Organization.objects.filter(deleted=False)
    #     user = self.request.user

    #     if _is_site_admin(user):
    #         return queryset

    #     if not user.is_authenticated:
    #         return queryset.filter(public=True)

    #     return queryset.filter(
    #         Q(public=True)
    #         | Q(
    #             user_roles__user=user,
    #             user_roles__status=ORGANIZATION_ROLE_STATUS_ACTIVE,
    #         )
    #     ).distinct()

    # def get_edit_queryset(self):
    #     """Return organizations that the current user may modify."""
    #     queryset = Organization.objects.filter(deleted=False)
    #     user = self.request.user

    #     if _is_site_admin(user):
    #         return queryset

    #     if not user.is_authenticated:
    #         return queryset.none()

    #     return queryset.filter(
    #         user_roles__user=user,
    #         user_roles__role=ORGANIZATION_ADMIN,
    #         user_roles__status=ORGANIZATION_ROLE_STATUS_ACTIVE,
    #     ).distinct()

    def perform_create(self, serializer, change=None):
        """Create the organization and its initial administrator atomically."""
        with transaction.atomic():
            organization = serializer.save()
            OrganizationRole.objects.create(
                organization=organization,
                user=self.request.user,
                role=ORGANIZATION_ADMIN,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )

    def perform_destroy(self, instance):
        """Soft-delete an organization."""
        instance.deleted = True
        instance.save(update_fields=["deleted", "updated_at"])


class OrganizationMemberViewSet(
    ValuesViewset,
    RESTCreateModelMixin,
    RESTUpdateModelMixin,
    RESTDestroyModelMixin,
):
    """
    Organization membership and role API.

    Active organization members may read the membership list. Active organization
    admins may create, update, or remove memberships and assign roles. Site admins
    may manage all memberships.
    """

    queryset = OrganizationRole.objects.all()
    serializer_class = OrganizationMemberSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = OrganizationMemberFilter
    pagination_class = OrganizationPagination
    ordering_fields = ("joined_at", "updated_at", "role", "status")
    ordering = "-joined_at"

    values = (
        "id",
        "organization_id",
        "organization__name",
        "user_id",
        "user__email",
        "user__first_name",
        "user__last_name",
        "role",
        "description",
        "status",
        "joined_at",
        "updated_at",
    )

    field_map = {
        "organization": "organization_id",
        "organization_name": "organization__name",
        "user": "user_id",
        "user_email": "user__email",
        "user_first_name": "user__first_name",
        "user_last_name": "user__last_name",
    }

    def consolidate(self, items, queryset):
        """Add the display name after field mappings have been applied."""
        for item in items:
            item["user_name"] = "{} {}".format(
                item.get("user_first_name", "") or "",
                item.get("user_last_name", "") or "",
            ).strip()
        return items

    def _require_admin(self, organization):
        user = self.request.user

        if _is_site_admin(user):
            return

        is_admin = OrganizationRole.objects.filter(
            organization=organization,
            user=user,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        ).exists()

        if not is_admin:
            raise PermissionDenied(
                "Only active organization admins may manage membership."
            )

    def perform_create(self, serializer, change=None):
        organization = serializer.validated_data["organization"]
        self._require_admin(organization)
        serializer.save()

    def _ensure_not_last_active_admin(
        self,
        membership,
        active_admin_count,
        new_role=None,
        new_status=None,
    ):
        """Prevent an organization from being left without an active admin."""
        if (
            membership.role != ORGANIZATION_ADMIN
            or membership.status != ORGANIZATION_ROLE_STATUS_ACTIVE
        ):
            return

        resulting_role = new_role if new_role is not None else membership.role
        resulting_status = new_status if new_status is not None else membership.status

        if (
            resulting_role == ORGANIZATION_ADMIN
            and resulting_status == ORGANIZATION_ROLE_STATUS_ACTIVE
        ):
            return

        if active_admin_count <= 1:
            raise ValidationError(
                "An organization must have at least one active admin."
            )

    def _lock_active_admins(self, organization_id):
        """Lock active admin memberships in a deterministic order."""
        return list(
            OrganizationRole.objects.select_for_update(of=("self",))
            .filter(
                organization_id=organization_id,
                role=ORGANIZATION_ADMIN,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )
            .order_by("id")
            .values_list("id", flat=True)
        )

    def perform_update(self, serializer):
        with transaction.atomic():
            active_admin_ids = self._lock_active_admins(
                serializer.instance.organization_id
            )
            membership = (
                OrganizationRole.objects.select_for_update(of=("self",))
                .select_related("organization", "user")
                .get(pk=serializer.instance.pk)
            )
            self._ensure_not_last_active_admin(
                membership,
                active_admin_count=len(active_admin_ids),
                new_role=serializer.validated_data.get("role"),
                new_status=serializer.validated_data.get("status"),
            )

            serializer.instance = membership
            serializer.save()

    def perform_destroy(self, instance):
        with transaction.atomic():
            active_admin_ids = self._lock_active_admins(instance.organization_id)
            membership = (
                OrganizationRole.objects.select_for_update(of=("self",))
                .select_related("organization", "user")
                .get(pk=instance.pk)
            )
            self._ensure_not_last_active_admin(
                membership,
                active_admin_count=len(active_admin_ids),
                new_role=ORGANIZATION_VIEWER,
                new_status=membership.status,
            )
            membership.delete()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_edit_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)

        self.perform_update(serializer)

        queryset = OrganizationRole.objects.select_related(
            "organization",
            "user",
        ).filter(pk=serializer.instance.pk)

        return Response(self.serialize(queryset)[0])


# The model is named OrganizationRole, while existing work may already import
# OrganizationMemberViewSet. Keep this alias so either name can be registered.
OrganizationRoleViewSet = OrganizationMemberViewSet
