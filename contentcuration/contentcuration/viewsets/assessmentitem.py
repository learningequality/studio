import re

from django.db import transaction
from django_bulk_update.helper import bulk_update
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import exercises
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ValidationError

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.viewsets.base import BulkCreateMixin
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.common import UUIDRegexField


exercise_image_filename_regex = re.compile(
    r"\!\[[^]]*\]\(\${placeholder}/([a-f0-9]{{32}}\.[0-9a-z]+)\)".format(
        placeholder=exercises.IMG_PLACEHOLDER
    )
)


class AssessmentItemFilter(RequiredFilterSet):
    contentnode__in = UUIDInFilter(field_name="contentnode")

    class Meta:
        model = AssessmentItem
        fields = (
            "contentnode",
            "contentnode__in",
        )


def get_filenames_from_assessment(assessment_item):
    # Get unique checksums in the assessment item text fields markdown
    # Coerce to a string, for Python 2, as the stored data is in unicode, and otherwise
    # the unicode char in the placeholder will not match
    return set(
        exercise_image_filename_regex.findall(
            str(
                assessment_item.question
                + assessment_item.answers
                + assessment_item.hints
            )
        )
    )


class AssessmentListSerializer(BulkListSerializer):
    def create(self, all_validated_data):
        with transaction.atomic():
            all_objects = super(AssessmentListSerializer, self).create(
                all_validated_data
            )
            self.child.set_files(all_objects)
            return all_objects

    def update(self, queryset, all_validated_data):
        with transaction.atomic():
            all_objects = super(AssessmentListSerializer, self).update(
                queryset, all_validated_data
            )
            self.child.set_files(all_objects, all_validated_data)
            return all_objects


class AssessmentItemSerializer(BulkModelSerializer):
    # This is set as editable=False on the model so by default DRF does not allow us
    # to set it.
    assessment_id = UUIDRegexField()
    contentnode = UserFilteredPrimaryKeyRelatedField(
        queryset=ContentNode.objects.all(), required=False
    )

    class Meta:
        model = AssessmentItem
        fields = (
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
        # Use the contentnode and assessment_id as the lookup field for updates
        update_lookup_field = ("contentnode", "assessment_id")

    def set_files(self, all_objects, all_validated_data=None):  # noqa C901
        files_to_delete = []
        files_to_update = {}
        current_files_by_aitem = {}

        # Create a set of assessment item ids that have had markdown fields modified.
        if all_validated_data:
            # If this is an update operation, check the validated data for which items
            # have had these fields modified.
            md_fields_modified = set(
                [
                    self.id_value_lookup(ai) for ai in all_validated_data
                    if "question" in ai or "hints" in ai or "answers" in ai
                ]
            )
        else:
            # If this is a create operation, just check if these fields are not null.
            md_fields_modified = set(
                [self.id_value_lookup(ai) for ai in all_objects if ai.question or ai.hints or ai.answers]
            )

        all_objects = [ai for ai in all_objects if self.id_value_lookup(ai) in md_fields_modified]

        for file in File.objects.filter(assessment_item__in=all_objects):
            if file.assessment_item_id not in current_files_by_aitem:
                current_files_by_aitem[file.assessment_item_id] = []
            current_files_by_aitem[file.assessment_item_id].append(file)

        for aitem in all_objects:
            current_files = current_files_by_aitem.get(aitem.id, [])
            filenames = get_filenames_from_assessment(aitem)
            set_checksums = set([filename.split(".")[0] for filename in filenames])
            current_checksums = set([f.checksum for f in current_files])

            missing_checksums = set_checksums.difference(current_checksums)

            for filename in filenames:
                checksum = filename.split(".")[0]
                if checksum in missing_checksums:
                    if checksum not in files_to_update:
                        files_to_update[checksum] = []
                    files_to_update[checksum].append(aitem)

            redundant_checksums = current_checksums.difference(set_checksums)

            files_to_delete.extend(
                [f.id for f in current_files if f.checksum in redundant_checksums]
            )

        if files_to_delete:
            File.objects.filter(id__in=files_to_delete).delete()
        if files_to_update:
            # Query file objects that this user has uploaded to set the assessment_item attribute
            source_files = list(
                File.objects.filter(
                    checksum__in=files_to_update.keys(),
                    uploaded_by=self.context["request"].user,
                    contentnode__isnull=True,
                    assessment_item__isnull=True,
                )
            )

            updated_files = []

            for file in source_files:
                if file.checksum in files_to_update and files_to_update[file.checksum]:
                    aitem = files_to_update[file.checksum].pop()
                    file.assessment_item = aitem
                    updated_files.append(file)
            if any(files_to_update.values()):
                # Not all the files to update had a file, raise an error
                raise ValidationError(
                    "Attempted to set files to an assessment item that do not have a file on the server"
                )
            bulk_update(source_files)

    def create(self, validated_data):
        with transaction.atomic():
            instance = super(AssessmentItemSerializer, self).create(validated_data)
            self.set_files([instance])
            return instance

    def update(self, instance, validated_data):
        with transaction.atomic():
            instance = super(AssessmentItemSerializer, self).update(
                instance, validated_data
            )
            self.set_id_values(instance, validated_data)
            self.set_files([instance], [validated_data])
            return instance


# Apply mixin first to override ValuesViewset
class AssessmentItemViewSet(BulkCreateMixin, BulkUpdateMixin, ValuesViewset):
    queryset = AssessmentItem.objects.all()
    serializer_class = AssessmentItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filterset_class = AssessmentItemFilter
    values = (
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
