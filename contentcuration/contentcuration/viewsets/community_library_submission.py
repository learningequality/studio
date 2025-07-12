from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

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
