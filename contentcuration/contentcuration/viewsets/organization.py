from django.db.models import Prefetch
from django_filters.rest_framework import CharFilter, FilterSet
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_403_FORBIDDEN

from contentcuration.constants.organization_roles import (
    ORGANIZATION_ADMIN,
    ORGANIZATION_EDITOR,
    ORGANIZATION_VIEWER,
)
from contentcuration.models import Organization, OrganizationRole, User
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.viewsets.base import (
    BulkListSerializer,
    BulkModelSerializer,
    ValuesViewset,
    RESTCreateModelMixin,
)



class OrganizationSerializer(BulkModelSerializer):
    """
    Serializer for Organization model.
    Includes basic organization details (name, description, public status).
    """

    class Meta:
        model = Organization
        fields = ("id", "name", "description", "thumbnail", "public", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")
        list_serializer_class = BulkListSerializer


class OrganizationMemberSerializer(BulkModelSerializer):
    """
    Serializer for OrganizationRole (membership).
    Represents user membership in an organization with their role.
    """

    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = OrganizationRole
        fields = ("id", "user", "user_email", "user_name", "role", "status", "joined_at", "description")
        read_only_fields = ("joined_at",)
        list_serializer_class = BulkListSerializer


class OrganizationRoleSerializer(BulkModelSerializer):
    """
    Serializer for reading organization roles.
    Returns available roles for an organization.
    """

    class Meta:
        model = OrganizationRole
        fields = ("id", "role", "description")
        list_serializer_class = BulkListSerializer


class OrganizationFilter(FilterSet):
    """Filter for organization listing."""
    name = CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Organization
        fields = ("name", "public")


class OrganizationPagination(ValuesViewsetPageNumberPagination):
    """Pagination for organization endpoints."""
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class OrganizationViewSet(ValuesViewset, RESTCreateModelMixin):
    """
    ViewSet for Organization CRUD and membership management.
    
    Endpoints:
    - GET /organizations/ - List organizations
    - POST /organizations/ - Create organization
    - GET /organizations/{id}/ - Retrieve organization
    - PUT /organizations/{id}/ - Update organization (admin only)
    - PATCH /organizations/{id}/ - Partial update (admin only)
    - DELETE /organizations/{id}/ - Delete organization (admin only)
    - GET /organizations/{id}/members/ - List members
    - POST /organizations/{id}/members/ - Add member (admin only)
    - PATCH /organizations/{id}/members/{member_id}/ - Update member role (admin only)
    - DELETE /organizations/{id}/members/{member_id}/ - Remove member (admin only)
    """

    queryset = Organization.objects.filter(deleted=False)
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = OrganizationFilter
    pagination_class = OrganizationPagination
    values = ("id", "name", "description", "thumbnail", "public", "created_at", "updated_at")

    def get_queryset(self):
        """Filter organizations by user membership."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Users can see organizations they are members of
        if user.is_authenticated:
            queryset = queryset.filter(user_roles__user=user).distinct()
        else:
            queryset = queryset.filter(public=True)
        
        return queryset

    def perform_create(self, serializer):
        """Create organization and set creator as admin."""
        instance = serializer.save()
        # Add the creating user as admin
        OrganizationRole.objects.create(
            user=self.request.user,
            organization=instance,
            role=ORGANIZATION_ADMIN,
            status="active",
        )
        return instance

    def perform_update(self, serializer):
        """Update organization - only admin can do this."""
        org = self.get_object()
        if not self._is_admin(org, self.request.user):
            raise serializers.ValidationError("Only admins can update organization.")
        serializer.save()

    def perform_destroy(self, instance):
        """Delete organization - only admin can do this."""
        if not self._is_admin(instance, self.request.user):
            raise serializers.ValidationError("Only admins can delete organization.")
        instance.deleted = True
        instance.save()

    def _is_admin(self, organization, user):
        """Check if user is admin in organization."""
        try:
            role = organization.user_roles.get(user=user)
            return role.role == ORGANIZATION_ADMIN
        except OrganizationRole.DoesNotExist:
            return False

    def _get_user_role(self, organization, user):
        """Get the user's role in the organization."""
        try:
            return organization.user_roles.get(user=user)
        except OrganizationRole.DoesNotExist:
            return None

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def members(self, request, pk=None):
        """
        List members of an organization.
        Permissions: Members can view.
        """
        organization = self.get_object()
        user_role = self._get_user_role(organization, request.user)
        
        if not user_role:
            return Response(
                {"detail": "You are not a member of this organization."},
                status=HTTP_403_FORBIDDEN,
            )
        
        members = organization.user_roles.all()
        page = self.paginate_queryset(members)
        if page is not None:
            serializer = OrganizationMemberSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        
        serializer = OrganizationMemberSerializer(members, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def add_member(self, request, pk=None):
        """
        Add a member to organization.
        Permissions: ORGANIZATION_ADMIN only.
        Body: {user_id, role}
        """
        organization = self.get_object()
        
        if not self._is_admin(organization, request.user):
            return Response(
                {"detail": "Only admins can add members."},
                status=HTTP_403_FORBIDDEN,
            )
        
        user_id = request.data.get("user_id")
        role = request.data.get("role", ORGANIZATION_VIEWER)
        
        if not user_id:
            return Response(
                {"detail": "user_id is required."},
                status=400,
            )
        
        valid_roles = [ORGANIZATION_ADMIN, ORGANIZATION_EDITOR, ORGANIZATION_VIEWER]
        if role not in valid_roles:
            return Response(
                {"detail": f"Invalid role. Must be one of: {', '.join(valid_roles)}"},
                status=400,
            )
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=404,
            )
        
        membership, created = OrganizationRole.objects.get_or_create(
            user=user,
            organization=organization,
            defaults={"role": role, "status": "active"},
        )
        
        if not created:
            membership.role = role
            membership.save()
        
        serializer = OrganizationMemberSerializer(membership, context={"request": request})
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=True, methods=["patch", "delete"], permission_classes=[IsAuthenticated])
    def update_member(self, request, pk=None):
        """
        Update or remove a member's role in organization.
        Permissions: ORGANIZATION_ADMIN only.
        """
        organization = self.get_object()
        
        if not self._is_admin(organization, request.user):
            return Response(
                {"detail": "Only admins can manage members."},
                status=HTTP_403_FORBIDDEN,
            )
        
        member_id = request.query_params.get("member_id")
        if not member_id:
            return Response(
                {"detail": "member_id query parameter is required."},
                status=400,
            )
        
        try:
            membership = organization.user_roles.get(id=member_id)
        except OrganizationRole.DoesNotExist:
            return Response(
                {"detail": "Member not found."},
                status=404,
            )
        
        if request.method == "PATCH":
            role = request.data.get("role")
            if not role:
                return Response(
                    {"detail": "role is required."},
                    status=400,
                )
            
            valid_roles = [ORGANIZATION_ADMIN, ORGANIZATION_EDITOR, ORGANIZATION_VIEWER]
            if role not in valid_roles:
                return Response(
                    {"detail": f"Invalid role. Must be one of: {', '.join(valid_roles)}"},
                    status=400,
                )
            
            membership.role = role
            membership.save()
            
            serializer = OrganizationMemberSerializer(membership, context={"request": request})
            return Response(serializer.data)
        
        elif request.method == "DELETE":
            membership.delete()
            return Response(status=204)


class OrganizationMemberViewSet(ValuesViewset):
    """
    ViewSet for managing organization members.
    This is an alternative to the nested /organizations/{id}/members/ endpoints.
    """

    queryset = OrganizationRole.objects.all()
    serializer_class = OrganizationMemberSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OrganizationPagination

    def get_queryset(self):
        """Filter members by organization."""
        queryset = super().get_queryset()
        organization_id = self.request.query_params.get("organization")
        
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        
        return queryset

    def perform_create(self, serializer):
        """Add member to organization."""
        organization_id = self.request.data.get("organization")
        if not organization_id:
            raise serializers.ValidationError("organization is required.")
        
        try:
            organization = Organization.objects.get(pk=organization_id)
        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organization not found.")
        
        # Check if user is admin
        user_role = organization.user_roles.filter(user=self.request.user).first()
        if not user_role or user_role.role != ORGANIZATION_ADMIN:
            raise serializers.ValidationError("Only admins can add members.")
        
        serializer.save()

    def perform_update(self, serializer):
        """Update member role."""
        membership = self.get_object()
        organization = membership.organization
        
        # Check if user is admin
        user_role = organization.user_roles.filter(user=self.request.user).first()
        if not user_role or user_role.role != ORGANIZATION_ADMIN:
            raise serializers.ValidationError("Only admins can update member roles.")
        
        serializer.save()

    def perform_destroy(self, instance):
        """Remove member from organization."""
        organization = instance.organization
        
        # Check if user is admin
        user_role = organization.user_roles.filter(user=self.request.user).first()
        if not user_role or user_role.role != ORGANIZATION_ADMIN:
            raise serializers.ValidationError("Only admins can remove members.")
        
        instance.delete()
