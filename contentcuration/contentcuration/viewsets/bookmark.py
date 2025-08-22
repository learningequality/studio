from rest_framework.permissions import IsAuthenticated

from contentcuration.models import Channel
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import CreateModelMixin
from contentcuration.viewsets.base import DestroyModelMixin
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField


class BookmarkSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    channel = UserFilteredPrimaryKeyRelatedField(
        queryset=Channel.objects.all(), required=True, edit=False
    )

    class Meta:
        model = Channel.bookmarked_by.through
        fields = ("channel",)
        list_serializer_class = BulkListSerializer
        update_lookup_field = "channel"

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super(BookmarkSerializer, self).create(validated_data)


class BookmarkViewSet(ReadOnlyValuesViewset, CreateModelMixin, DestroyModelMixin):
    queryset = Channel.bookmarked_by.through.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = BookmarkSerializer

    values = ("channel_id",)

    field_map = {
        "channel": "channel_id",
    }

    def get_edit_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
