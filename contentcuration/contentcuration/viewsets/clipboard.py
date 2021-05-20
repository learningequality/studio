from django.db.models import F
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models.functions import Cast
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import BooleanField
from rest_framework.serializers import DictField
from rest_framework.serializers import ValidationError

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDRegexField


class ClipboardFilter(RequiredFilterSet):
    class Meta:
        model = ContentNode
        fields = ("parent",)


class ClipboardExtraFieldsSerializer(JSONFieldDictSerializer):
    excluded_descendants = DictField(required=False)
    CLIPBOARD_NODE_FLAG = BooleanField(required=False, default=True)


class ClipboardSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    # These are set as editable=False on the model so by default DRF does not allow us
    # to set them.
    source_channel_id = UUIDRegexField()
    source_node_id = UUIDRegexField()
    extra_fields = ClipboardExtraFieldsSerializer(required=False)

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "kind",
            "parent",
            "source_node_id",
            "source_channel_id",
            "extra_fields",
        )
        list_serializer_class = BulkListSerializer
        nested_writes = True

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

    def update(self, instance, validated_data):
        extra_fields = validated_data.pop("extra_fields", None)

        if extra_fields is not None:
            instance_extra_fields = instance.extra_fields
            excluded_descendants = extra_fields.get("excluded_descendants")
            if excluded_descendants:
                if (
                    "excluded_descendants" not in instance_extra_fields
                    or not instance_extra_fields["excluded_descendants"]
                ):
                    instance_extra_fields["excluded_descendants"] = excluded_descendants
                else:
                    instance_extra_fields["excluded_descendants"].update(
                        excluded_descendants
                    )
        return super(ClipboardSerializer, self).update(instance, validated_data)


class ClipboardViewSet(ValuesViewset):
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filterset_class = ClipboardFilter
    serializer_class = ClipboardSerializer
    values = (
        "id",
        "source_node_id",
        "source_channel_id",
        "extra_fields",
        "parent",
        "lft",
        "total_count",
        "resource_count",
    )

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        clipboard_tree_id_query = Cast(
            user_queryset.values_list("clipboard_tree__tree_id", flat=True)[:1],
            output_field=IntegerField(),
        )

        return ContentNode.objects.filter(tree_id=clipboard_tree_id_query)

    def get_edit_queryset(self):
        return self.get_queryset()

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
