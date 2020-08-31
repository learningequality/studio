from base import BaseAPITestCase
from django.db.models.query import QuerySet

from contentcuration.models import ContentNode
from contentcuration.serializers import ContentNodeSerializer


def ensure_no_querysets_in_serializer(object):
    # values and values_list return list-like QuerySet objects, which can cause troubles if we aggregate the
    # output into a larger json dict. DRF apparently catches and fixes this under the hood.
    for field in object:
        # If it's not a base type, that means it is not being serialized properly.
        assert not isinstance(object[field], QuerySet), '{} is not serialized'.format(field)


class ContentNodeSerializerTestCase(BaseAPITestCase):
    def test_fields_are_json_serializable(self):
        """
        The serializer should return data that is ready for serialization, and not in 'object' form.
        """

        node_ids = ['00000000000000000000000000000003', '00000000000000000000000000000004', '00000000000000000000000000000005']
        objects = ContentNodeSerializer(ContentNode.objects.filter(node_id__in=node_ids), many=True).data
        for object in objects:
            ensure_no_querysets_in_serializer(object)

    def test_repr_doesnt_evaluate_querysets(self):
        node_ids = [
            "00000000000000000000000000000003",
            "00000000000000000000000000000004",
            "00000000000000000000000000000005",
        ]
        objects = ContentNodeSerializer(
            ContentNode.objects.filter(node_id__in=node_ids), many=True
        )

        object = ContentNodeSerializer(
            ContentNode.objects.get(node_id=node_ids[0])
        )

        # Ensure we don't evaluate querysets when repr is called on a Serializer. See docs for
        # no_field_eval_repr in contentcuration/serializers.py for more info.
        obj_string = repr(object)
        assert "QuerySet" not in obj_string, "object __repr__ contains queryset: {}".format(obj_string)

        objs_string = repr(objects)
        assert "QuerySet" not in objs_string, "objects __repr__ contains queryset: {}".format(objs_string)
