from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.serializers import PrimaryKeyRelatedField

from contentcuration.models import AssessmentItem
from contentcuration.models import File
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.common import NotNullArrayAgg


class AssessmentItemFilter(FilterSet):
    class Meta:
        model = AssessmentItem
        fields = ("contentnode",)


class AssessmentItemSerializer(BulkModelSerializer):
    files = PrimaryKeyRelatedField(many=True, queryset=File.objects.all())

    class Meta:
        model = AssessmentItem
        fields = (
            "id",
            "question",
            "type",
            "answers",
            "contentnode",
            "assessment_id",
            "files",
            "hints",
            "raw_data",
            "order",
            "source_url",
            "randomize",
            "deleted",
        )
        list_serializer_class = BulkListSerializer


class AssessmentItemViewSet(ValuesViewset):
    queryset = AssessmentItem.objects.all()
    serializer_class = AssessmentItemSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = AssessmentItemFilter
    values = (
        "id",
        "question",
        "type",
        "answers",
        "contentnode_id",
        "assessment_id",
        "hints",
        "raw_data",
        "order",
        "source_url",
        "randomize",
        "deleted",
        "file_ids",
    )

    field_map = {
        "contentnode": "contentnode_id",
        "files": "file_ids",
    }

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(file_ids=NotNullArrayAgg("files__id"))
        return queryset
