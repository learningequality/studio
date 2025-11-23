import django_filters
from django.utils import timezone
from django_filters import DateTimeFilter
from django_filters import MultipleChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.models import Country
from contentcuration.tasks import apply_channel_changes_task
from contentcuration.utils.pagination import ValuesViewsetCursorPagination
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RESTCreateModelMixin
from contentcuration.viewsets.base import RESTDestroyModelMixin
from contentcuration.viewsets.base import RESTUpdateModelMixin
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.sync.utils import (
    generate_added_to_community_library_event,
)
from contentcuration.viewsets.user import IsAdminUser


class CommunityLibrarySubmissionFilterSet(django_filters.FilterSet):
    """
    FilterSet for CommunityLibrarySubmission to support notifications page filtering.
    """

    date_updated__lte = DateTimeFilter(field_name="date_updated", lookup_expr="lte")
    date_updated__gte = DateTimeFilter(field_name="date_updated", lookup_expr="gte")
    status__in = MultipleChoiceFilter(
        field_name="status",
        choices=community_library_submission_constants.status_choices,
    )

    class Meta:
        model = CommunityLibrarySubmission
        fields = ["channel", "date_updated__lte", "date_updated__gte", "status__in"]


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

        # Prevent creating submissions while a publish is in progress
        if getattr(getattr(channel, "main_tree", None), "publishing", False):
            raise ValidationError(
                "Cannot create a community library submission while the channel is being published."
            )

        if channel.version == 0:
            # The channel is not published
            raise ValidationError(
                "Cannot create a community library submission for an "
                "unpublished channel."
            )

        if channel.public:
            raise ValidationError(
                "Cannot create a community library submission for a public channel."
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

        if "countries" in validated_data:
            countries = validated_data.pop("countries")
            instance.countries.set(countries)

        return super().update(instance, validated_data)


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

        if (
            "status" in validated_data
            and validated_data["status"]
            == community_library_submission_constants.STATUS_APPROVED
            and instance.channel.public
        ):
            raise ValidationError(
                "Cannot approve a community library submission for a channel that has been marked public."
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
            if not validated_data.get("resolution_reason", "").strip():
                raise ValidationError(
                    "Resolution reason must be provided when rejecting a submission."
                )
            if not validated_data.get("feedback_notes", "").strip():
                raise ValidationError(
                    "Feedback notes must be provided when rejecting a submission."
                )

        return super().update(instance, validated_data)


class CommunityLibrarySubmissionPagination(ValuesViewsetCursorPagination):
    ordering = "-date_updated"
    page_size_query_param = "max_results"
    max_page_size = 100


def get_author_name(item):
    return "{} {}".format(item["author__first_name"], item["author__last_name"])


def get_resolved_by_name(item):
    if item.get("resolved_by__first_name") and item.get("resolved_by__last_name"):
        return "{} {}".format(
            item["resolved_by__first_name"], item["resolved_by__last_name"]
        )
    return None


class CommunityLibrarySubmissionViewSetMixin:
    """
    Mixin with logic shared between the CommunityLibrarySubmissionViewSet and
    AdminCommunityLibrarySubmissionViewSet.
    """

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
        "date_updated",
        "resolved_by_id",
        "resolved_by__first_name",
        "resolved_by__last_name",
    )
    field_map = {
        "author_name": get_author_name,
        "resolved_by_name": get_resolved_by_name,
    }
    queryset = CommunityLibrarySubmission.objects.all().order_by("-date_updated")
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = CommunityLibrarySubmissionFilterSet
    search_fields = ["channel__name"]
    pagination_class = CommunityLibrarySubmissionPagination

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


class CommunityLibrarySubmissionViewSet(
    CommunityLibrarySubmissionViewSetMixin,
    RESTCreateModelMixin,
    RESTUpdateModelMixin,
    RESTDestroyModelMixin,
    ReadOnlyValuesViewset,
):
    permission_classes = [IsAuthenticated]
    serializer_class = CommunityLibrarySubmissionSerializer


class AdminCommunityLibrarySubmissionViewSet(
    CommunityLibrarySubmissionViewSetMixin,
    ReadOnlyValuesViewset,
):
    permission_classes = [IsAdminUser]

    values = CommunityLibrarySubmissionViewSetMixin.values + ("internal_notes",)
    field_map = CommunityLibrarySubmissionViewSetMixin.field_map.copy()

    def _mark_previous_pending_submissions_as_superseded(self, submission):
        CommunityLibrarySubmission.objects.filter(
            status=community_library_submission_constants.STATUS_PENDING,
            channel=submission.channel,
            channel_version__lt=submission.channel_version,
        ).update(status=community_library_submission_constants.STATUS_SUPERSEDED)

    def _add_to_community_library(self, submission):
        country_codes = sorted(country.code for country in submission.countries.all())

        Change.create_change(
            generate_added_to_community_library_event(
                key=submission.channel.id,
                channel_version=submission.channel_version,
                categories=submission.categories,
                country_codes=country_codes,
            ),
            created_by_id=submission.resolved_by_id,
        )
        apply_channel_changes_task.fetch_or_enqueue(
            submission.resolved_by,
            channel_id=submission.channel.id,
        )

    @action(
        methods=["post"],
        detail=True,
        serializer_class=CommunityLibrarySubmissionResolveSerializer,
        url_name="resolve",
        url_path="resolve",
    )
    def resolve(self, request, pk=None):
        instance = self.get_edit_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        date_updated = timezone.now()
        submission = serializer.save(
            date_updated=date_updated,
            resolved_by=request.user,
        )

        if submission.status == community_library_submission_constants.STATUS_APPROVED:
            self._mark_previous_pending_submissions_as_superseded(submission)
            self._add_to_community_library(submission)

        return Response(self.serialize_object())
