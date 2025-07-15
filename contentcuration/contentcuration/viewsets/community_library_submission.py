import datetime

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.models import Channel
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.models import Country
from contentcuration.utils.pagination import ValuesViewsetCursorPagination
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RESTCreateModelMixin
from contentcuration.viewsets.base import RESTDestroyModelMixin
from contentcuration.viewsets.base import RESTUpdateModelMixin
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.user import IsAdminUser


class CommunityLibrarySubmissionSerializer(BulkModelSerializer):
    countries = PrimaryKeyRelatedField(
        many=True,
        queryset=Country.objects.all(),
        required=False,
    )
    channel = UserFilteredPrimaryKeyRelatedField(
        queryset=Channel.objects.all(),
        edit=False,
    )

    class Meta:
        model = CommunityLibrarySubmission
        fields = [
            "id",
            "description",
            "channel",
            "countries",
            "categories",
        ]
        list_serializer_class = BulkListSerializer

    def create(self, validated_data):
        channel = validated_data["channel"]
        user = self.context["request"].user

        if channel.version == 0:
            # The channel is not published
            raise ValidationError(
                "Cannot create a community library submission for an "
                "unpublished channel."
            )

        if not channel.editors.filter(id=user.id).exists():
            raise ValidationError(
                "Only editors can create a community library "
                "submission for this channel."
            )

        validated_data["channel_version"] = channel.version
        validated_data["author"] = self.context["request"].user

        countries = validated_data.pop("countries", [])
        instance = super().create(validated_data)

        instance.countries.set(countries)

        instance.save()
        return instance

    def update(self, instance, validated_data):
        if (
            "channel" in validated_data
            and instance.channel.id != validated_data["channel"].id
        ):
            raise ValidationError(
                "Cannot change the channel corresponding to "
                "a community library submission."
            )

        countries = validated_data.pop("countries", [])
        instance.countries.set(countries)

        return super().update(instance, validated_data)


def timezoned_datetime_now():
    """
    Simple wrapper around datetime.datetime.now. The point of using a wrapper
    is that mocking datetime.datetime in tests runs into issues with
    isinstance in the serializer, and it is a lot easier to just mock this
    wrapper.
    """
    return datetime.datetime.now(datetime.timezone.utc)


class CommunityLibrarySubmissionResolveSerializer(CommunityLibrarySubmissionSerializer):
    class Meta(CommunityLibrarySubmissionSerializer.Meta):
        fields = CommunityLibrarySubmissionSerializer.Meta.fields + [
            "status",
            "resolution_reason",
            "feedback_notes",
            "internal_notes",
        ]

    def create(self, validated_data):
        raise ValidationError(
            "Cannot create a community library submission with this serializer. "
            "Use the standard CommunityLibrarySubmissionSerializer instead."
        )

    def update(self, instance, validated_data):
        if instance.status != community_library_submission_constants.STATUS_PENDING:
            raise ValidationError(
                "Cannot resolve a community library submission that is not pending."
            )

        if "status" not in validated_data or validated_data["status"] not in [
            community_library_submission_constants.STATUS_APPROVED,
            community_library_submission_constants.STATUS_REJECTED,
        ]:
            raise ValidationError(
                "Status must be either APPROVED or REJECTED when resolving a submission."
            )

        if (
            "status" not in validated_data
            or validated_data["status"]
            == community_library_submission_constants.STATUS_REJECTED
        ):
            if "resolution_reason" not in validated_data:
                raise ValidationError(
                    "Resolution reason must be provided when rejecting a submission."
                )
            if "feedback_notes" not in validated_data:
                raise ValidationError(
                    "Feedback notes must be provided when rejecting a submission."
                )

        return super().update(instance, validated_data)


class CommunityLibrarySubmissionPagination(ValuesViewsetCursorPagination):
    ordering = "-date_created"
    page_size_query_param = "max_results"
    max_page_size = 100


class CommunityLibrarySubmissionViewSet(
    RESTCreateModelMixin,
    RESTUpdateModelMixin,
    RESTDestroyModelMixin,
    ReadOnlyValuesViewset,
):
    values = (
        "id",
        "description",
        "channel_id",
        "channel_version",
        "author_id",
        "author__first_name",
        "author__last_name",
        "categories",
        "date_created",
        "status",
        "resolution_reason",
        "feedback_notes",
        "date_resolved",
    )
    field_map = {
        "author_first_name": "author__first_name",
        "author_last_name": "author__last_name",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["channel"]
    permission_classes = [IsAuthenticated]
    pagination_class = CommunityLibrarySubmissionPagination
    serializer_class = CommunityLibrarySubmissionSerializer
    queryset = CommunityLibrarySubmission.objects.all().order_by("-date_created")

    def consolidate(self, items, queryset):
        countries = {}
        for (submission_id, country_code,) in Country.objects.filter(
            community_library_submissions__in=queryset
        ).values_list("community_library_submissions", "code"):
            if submission_id not in countries:
                countries[submission_id] = []
            countries[submission_id].append(country_code)

        for item in items:
            item["countries"] = countries.get(item["id"], [])

        return items


class CommunityLibrarySubmissionAdminViewSet(CommunityLibrarySubmissionViewSet):
    permission_classes = [IsAdminUser]

    values = CommunityLibrarySubmissionViewSet.values + (
        "resolved_by_id",
        "resolved_by__first_name",
        "resolved_by__last_name",
        "internal_notes",
    )
    field_map = CommunityLibrarySubmissionViewSet.field_map.copy()
    field_map.update(
        {
            "resolved_by_first_name": "resolved_by__first_name",
            "resolved_by_last_name": "resolved_by__last_name",
        }
    )

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "Cannot create a community library submission with this viewset. "
            "Use the standard CommunityLibrarySubmissionViewSet instead."
        )

    def update(self, instance, *args, **kwargs):
        raise MethodNotAllowed(
            "Cannot update a community library submission with this viewset. "
            "Use the standard CommunityLibrarySubmissionViewSet instead."
        )

    def destroy(self, instance, *args, **kwargs):
        raise MethodNotAllowed(
            "Cannot delete a community library submission with this viewset. "
            "Use the standard CommunityLibrarySubmissionViewSet instead."
        )

    def _mark_previous_pending_submissions_as_superseded(self, submission):
        CommunityLibrarySubmission.objects.filter(
            status=community_library_submission_constants.STATUS_PENDING,
            channel=submission.channel,
            channel_version__lt=submission.channel_version,
        ).update(status=community_library_submission_constants.STATUS_SUPERSEDED)

    @action(
        methods=["post"],
        detail=True,
        serializer_class=CommunityLibrarySubmissionResolveSerializer,
    )
    def resolve(self, request, pk=None):
        instance = self.get_edit_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        date_resolved = timezoned_datetime_now()
        submission = serializer.save(
            date_resolved=date_resolved,
            resolved_by=request.user,
        )

        if submission.status == community_library_submission_constants.STATUS_APPROVED:
            self._mark_previous_pending_submissions_as_superseded(submission)

        return Response(serializer.data)
