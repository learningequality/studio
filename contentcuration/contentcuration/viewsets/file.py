from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.serializers import PrimaryKeyRelatedField

from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset


class FileFilter(FilterSet):
    ids = CharFilter(method="filter_ids")

    def filter_ids(self, queryset, name, value):
        try:
            # Limit SQL params to 50 - shouldn't be fetching this many
            # ids at once
            return queryset.filter(pk__in=value.split(",")[:50])
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()

    class Meta:
        model = File
        fields = ("ids",)


class FileSerializer(BulkModelSerializer):
    contentnode = PrimaryKeyRelatedField(queryset=ContentNode.objects.all())

    class Meta:
        model = File
        fields = (
            "id",
            "checksum",
            "file_size",
            "language",
            "file_on_disk",
            "contentnode",
            "file_format",
            "preset",
            "original_filename",
        )


class FileViewSet(ValuesViewset):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = FileFilter
    values = (
        "id",
        "checksum",
        "file_size",
        "language",
        "file_format",
        "contentnode",
        "file_on_disk",
        "preset",
        "original_filename",
    )
