from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import UUIDField
from search.models import SavedSearch

from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset


class SavedSearchSerializer(BulkModelSerializer):
    id = UUIDField(format="hex")

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
            "params",
        )


class SavedSearchViewSet(ValuesViewset):
    queryset = SavedSearch.objects.all()
    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]
    values = (
        "id",
        "name",
        "created",
        "modified",
        "params",
        "saved_by",
    )

    field_map = {
        "id": lambda x: x["id"].hex,
    }

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous and self.request.user.id
        return (
            SavedSearch.objects.filter(saved_by_id=user_id)
            .distinct()
            .order_by("-created")
        )
