from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet

from contentcuration.models import File
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset


class FileFilter(FilterSet):
    class Meta:
        model = File
        fields = ("contentnode",)


class FileSerializer(BulkModelSerializer):
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
        "file_on_disk",
        "contentnode",
        "file_format",
        "preset",
        "original_filename",
    )

    field_map = {
        "contentnode": "contentnode_id",
        "file_on_disk": "file_on_disk__url",
    }
