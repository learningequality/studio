from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import PrimaryKeyRelatedField
from search.models import SavedSearch

from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset


class SavedSearchSerializer(BulkModelSerializer):
    saved_by = PrimaryKeyRelatedField(queryset=User.objects.all())

    def create(self, validated_data):
        if "request" in self.context:
            user_id = self.context["request"].user.id
            # Save under current user
            validated_data["saved_by_id"] = user_id
        return super().create(validated_data)

    class Meta:
        model = SavedSearch
        fields = (
            "id",
            "name",
            "created",
            "modified",
            "params",
            "saved_by",
        )
        read_only_fields = ("id",)
        list_serializer_class = BulkListSerializer


class SavedSearchViewSet(ValuesViewset):
    queryset = SavedSearch.objects.all()
    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    values = (
        "id",
        "name",
        "created",
        "modified",
        "params",
        "saved_by",
    )

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous and self.request.user.id
        return (
            SavedSearch.objects.filter(saved_by_id=user_id)
            .distinct()
            .order_by("-created")
        )
