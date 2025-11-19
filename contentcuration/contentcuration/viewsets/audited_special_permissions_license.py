from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.permissions import IsAuthenticated

from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.models import AuditedSpecialPermissionsLicense


class AuditedSpecialPermissionsLicenseFilter(FilterSet):
    """
    Filter for AuditedSpecialPermissionsLicense viewset.
    Supports filtering by IDs and distributable status.
    """

    by_ids = CharFilter(method="filter_by_ids")
    distributable = BooleanFilter()

    def filter_by_ids(self, queryset, name, value):
        
        try:
            id_list = [uuid.strip() for uuid in value.split(",")[:50]]
            return queryset.filter(id__in=id_list)
        except (ValueError, AttributeError):
            return queryset.none()

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

