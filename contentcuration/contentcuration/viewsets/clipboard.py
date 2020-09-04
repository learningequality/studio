import re

from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import RegexField
from rest_framework.serializers import ValidationError

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import SQCount


class ClipboardFilter(RequiredFilterSet):
    class Meta:
        model = ContentNode
        fields = ("parent",)


uuidregex = re.compile("^[0-9a-f]{32}$")


class ClipboardSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    # These are set as editable=False on the model so by default DRF does not allow us
    # to set them.
    source_channel_id = RegexField(uuidregex)
    source_node_id = RegexField(uuidregex)

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "kind",
            "parent",
            "source_node_id",
            "source_channel_id",
        )
        list_serializer_class = BulkListSerializer

    def create(self, validated_data):
        # Creating a new node, by default put it in the clipboard root.
        if "parent" not in validated_data:
            if "request" in self.context and self.context["request"].user:
                validated_data["parent_id"] = self.context[
                    "request"
                ].user.clipboard_tree_id
            else:
                raise ValidationError(
                    "Trying to create a clipboard node when there is no user"
                )
        try:
            channel_query = Channel.objects.filter(
                main_tree__tree_id=OuterRef("tree_id")
            )
            ContentNode.objects.all().annotate(
                # Annotate channel id
                channel_id=Subquery(channel_query.values_list("id", flat=True)[:1])
            ).get(
                node_id=validated_data["source_node_id"],
                channel_id=validated_data["source_channel_id"],
            )
        except ContentNode.DoesNotExist:
            raise ValidationError("ContentNode does not exist")
        return super(ClipboardSerializer, self).create(validated_data)


class ClipboardViewSet(ValuesViewset):
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = ClipboardFilter
    serializer_class = ClipboardSerializer
    values = (
        "id",
        "source_node_id",
        "source_channel_id",
        "parent",
        "lft",
        "total_count",
        "resource_count",
    )

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        clipboard_tree_id_query = ContentNode.objects.filter(
            pk=user_queryset.values_list("clipboard_tree_id", flat=True)[:1]
        ).values_list("tree_id", flat=True)[:1]

        return ContentNode.objects.filter(tree_id=clipboard_tree_id_query)

    def annotate_queryset(self, queryset):
        descendant_resources = ContentNode.objects.filter(
            tree_id=OuterRef("tree_id"),
            lft__gt=OuterRef("lft"),
            rght__lt=OuterRef("rght"),
        ).exclude(kind_id=content_kinds.TOPIC)
        return queryset.annotate(
            total_count=(F("rght") - F("lft") - 1) / 2,
            resource_count=SQCount(descendant_resources, field="content_id"),
        )
