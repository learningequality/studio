import re

from django.core.files.storage import default_storage
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_s3_storage.storage import S3Error
from le_utils.constants import exercises
from le_utils.constants import format_presets

from contentcuration.models import AssessmentItem
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.common import NotNullArrayAgg


exercise_image_filename_regex = re.compile(
    r"\!\[[^]]*\]\(\${placeholder}/([a-f0-9]{{32}}\.[0-9a-z]+)\)".format(
        placeholder=exercises.IMG_PLACEHOLDER
    )
)


class AssessmentItemFilter(FilterSet):
    class Meta:
        model = AssessmentItem
        fields = ("contentnode",)


def get_filenames_from_assessment(validated_data):
    # Get unique checksums in the assessment item text fields markdown
    # Coerce to a string, for Python 2, as the stored data is in unicode, and otherwise
    # the unicode char in the placeholder will not match
    return set(
        exercise_image_filename_regex.findall(
            str(
                validated_data["question"]
                + validated_data["answers"]
                + validated_data["hints"]
            )
        )
    )


class AssessmentListSerializer(BulkListSerializer):
    def set_files(self, all_objects, all_validated_data):
        all_filenames = map(get_filenames_from_assessment, all_validated_data)
        files_to_delete = File.objects.none()
        files_to_create = []
        for aitem, filenames in zip(all_objects, all_filenames):
            checksums = [filename.split(".")[0] for filename in filenames]
            files_to_delete |= aitem.files.exclude(checksum__in=checksums)
            no_files = [
                filename
                for filename in filenames
                if filename.split(".")[0]
                in (checksums - set(aitem.files.values_list("checksum", flat=True)))
            ]
            for filename in no_files:
                checksum = filename.split(".")[0]
                file_path = generate_object_storage_name(checksum, filename)
                try:
                    file_object = default_storage.open(file_path)
                    # Only do this if the file already exists, otherwise, hope it comes into being later!
                    files_to_create.append(
                        File(
                            assessment_item=aitem,
                            checksum=checksum,
                            file_on_disk=file_object,
                            preset_id=format_presets.EXERCISE_IMAGE,
                        )
                    )
                except S3Error:
                    # File does not exist yet not much we can do about that here.
                    pass
        files_to_delete.delete()
        File.objects.bulk_create(files_to_create)

    def create(self, validated_data):
        all_objects = super(AssessmentListSerializer, self).create(validated_data)
        self.set_files(all_objects, validated_data)
        return all_objects

    def update(self, queryset, all_validated_data):
        all_objects = super(AssessmentListSerializer, self).update(
            queryset, all_validated_data
        )
        self.set_files(all_objects, all_validated_data)
        return all_objects


class AssessmentItemSerializer(BulkModelSerializer):
    class Meta:
        model = AssessmentItem
        fields = (
            "id",
            "question",
            "type",
            "answers",
            "contentnode",
            "assessment_id",
            "hints",
            "raw_data",
            "order",
            "source_url",
            "randomize",
            "deleted",
        )
        list_serializer_class = AssessmentListSerializer


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
    )

    field_map = {
        "contentnode": "contentnode_id",
    }

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(file_ids=NotNullArrayAgg("files__id"))
        return queryset
