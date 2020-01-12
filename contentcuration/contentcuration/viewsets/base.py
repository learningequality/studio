from django.http import Http404
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from rest_framework.status import HTTP_201_CREATED
from rest_framework.viewsets import ModelViewSet


class WriteOnlySerializer(ModelSerializer):
    """
    A simple modelserializer that does not expect
    to be able to make a readable representation of
    the model, because that has been taken over by the
    ValuesViewset below. Instead, it just returns an empty
    dict for its output serialization.
    """

    def to_representation(self, instance):
        """
        Just return an empty object here, to confirm that any write operations succeeded.
        """
        return {}


class ValuesViewset(ModelViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer. Best coupled with a 'write only' serializer
    that concerns itself with deserialization and validation only.
    """

    # A tuple of values to get from the queryset
    values = None
    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    field_map = {}

    def __init__(self, *args, **kwargs):
        viewset = super(ValuesViewset, self).__init__(*args, **kwargs)
        if not isinstance(self.values, tuple):
            raise TypeError("values must be defined as a tuple")
        self._values = tuple(self.values)
        if not isinstance(self.field_map, dict):
            raise TypeError("field_map must be defined as a dict")
        self._field_map = self.field_map.copy()
        return viewset

    def annotate_queryset(self, queryset):
        return queryset

    def prefetch_queryset(self, queryset):
        return queryset

    def _map_fields(self, item):
        for key, value in self._field_map.iteritems():
            if callable(value):
                item[key] = value(item)
            elif value in item:
                item[key] = item.pop(value)
            else:
                item[key] = value
        return item

    def _serialize_queryset(self, queryset):
        queryset = self.annotate_queryset(queryset)
        return queryset.values(*self._values)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = self._serialize_queryset(queryset)

        page = self.paginate_queryset(queryset)

        if page is not None:
            data = map(self._map_fields, page or [])
            return self.get_paginated_response(data)

        data = map(self._map_fields, queryset or [])
        return Response(data)

    def serialize_object(self, pk):
        queryset = self.filter_queryset(self.get_queryset())
        try:
            return self._map_fields(self._serialize_queryset(queryset).get(pk=pk))
        except queryset.model.DoesNotExist:
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )

    def retrieve(self, request, pk, *args, **kwargs):
        return Response(self.serialize_object(pk))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(self.serialize_object(instance.id), status=HTTP_201_CREATED)
