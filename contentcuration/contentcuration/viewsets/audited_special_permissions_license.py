from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.common import UUIDInFilter


class AuditedSpecialPermissionsLicenseFilter(FilterSet):
    """
    Filter for AuditedSpecialPermissionsLicense viewset.
    Supports filtering by IDs and distributable status.
    """

    by_ids = UUIDInFilter(field_name="id")
    distributable = BooleanFilter()

    class Meta:
        model = None
        fields = ("by_ids", "distributable")

    def __init__(self, *args, **kwargs):

        self.Meta.model = AuditedSpecialPermissionsLicense
        super().__init__(*args, **kwargs)


class AuditedSpecialPermissionsLicenseViewSet(ReadOnlyValuesViewset):
    """
    Read-only viewset for AuditedSpecialPermissionsLicense.
    Allows filtering by IDs and distributable status.
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = AuditedSpecialPermissionsLicenseFilter

    values = (
        "id",
        "description",
        "distributable",
    )

    def get_queryset(self):

        return AuditedSpecialPermissionsLicense.objects.all()
