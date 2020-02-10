import traceback

from django.http import Http404
from django_bulk_update.helper import bulk_update
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.serializers import ListSerializer
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import ValidationError
from rest_framework.serializers import raise_errors_on_nested_writes
from rest_framework.settings import api_settings
from rest_framework.utils import html
from rest_framework.utils import model_meta
from rest_framework.viewsets import ReadOnlyModelViewSet


class BulkModelSerializer(ModelSerializer):
    @classmethod
    def id_attr(cls):
        ModelClass = cls.Meta.model
        info = model_meta.get_field_info(ModelClass)
        return getattr(cls.Meta, "update_lookup_field", info.pk.name)

    def to_internal_value(self, data):
        ret = super(BulkModelSerializer, self).to_internal_value(data)

        id_attr = self.id_attr()

        # add update_lookup_field field back to validated data
        # since super by default strips out read-only fields
        # hence id will no longer be present in validated_data
        if all((isinstance(self.root, BulkListSerializer), id_attr,)):
            id_field = self.fields[id_attr]
            id_value = id_field.get_value(data)

            ret[id_attr] = id_value

        return ret

    def update(self, instance, validated_data):
        # To ensure caution, require nested_writes to be explicitly allowed
        if not (hasattr(self.Meta, "nested_writes") and self.Meta.nested_writes):
            raise_errors_on_nested_writes("update", self, validated_data)
        info = model_meta.get_field_info(instance)

        # Simply set each attribute on the instance, and then save it.
        # Note that unlike `.create()` we don't need to treat many-to-many
        # relationships as being a special case. During updates we already
        # have an instance pk for the relationships to be associated with.
        m2m_fields = []
        for attr, value in validated_data.items():
            if attr in info.relations and info.relations[attr].to_many:
                m2m_fields.append((attr, value))
            else:
                setattr(instance, attr, value)

        return instance, m2m_fields

    def post_save_update(self, instance, m2m_fields):
        # Note that many-to-many fields are set after updating instance.
        # Setting m2m fields triggers signals which could potentially change
        # updated instance and we do not want it to collide with .update()
        for attr, value in m2m_fields:
            field = getattr(instance, attr)
            field.set(value)

    def create(self, validated_data):
        # To ensure caution, require nested_writes to be explicitly allowed
        if not (hasattr(self.Meta, "nested_writes") and self.Meta.nested_writes):
            raise_errors_on_nested_writes("create", self, validated_data)

        ModelClass = self.Meta.model

        # Remove many-to-many relationships from validated_data.
        # They are not valid arguments to the default `.create()` method,
        # as they require that the instance has already been saved.
        info = model_meta.get_field_info(ModelClass)
        many_to_many = {}
        for field_name, relation_info in info.relations.items():
            if relation_info.to_many and (field_name in validated_data):
                many_to_many[field_name] = validated_data.pop(field_name)

        instance = ModelClass(**validated_data)

        return instance, many_to_many

    def post_save_create(self, instance, many_to_many):
        # Save many-to-many relationships after the instance is created.
        if many_to_many:
            for field_name, value in many_to_many.items():
                field = getattr(instance, field_name)
                field.set(value)


class BulkListSerializer(ListSerializer):
    def __init__(self, *args, **kwargs):
        super(BulkListSerializer, self).__init__(*args, **kwargs)
        # Track any changes that should be propagated back to the frontend
        self.changes = []

    def to_internal_value(self, data):
        """
        List of dicts of native values <- List of dicts of primitive datatypes.
        Modified from https://github.com/encode/django-rest-framework/blob/master/rest_framework/serializers.py
        based on suggestions from https://github.com/miki725/django-rest-framework-bulk/issues/68
        This is to prevent an error whereby the DRF Unique validator fails when the instance on the child
        serializer is a queryset and not an object.
        """
        if html.is_html_input(data):
            data = html.parse_html_list(data, default=[])

        if not isinstance(data, list):
            message = self.error_messages["not_a_list"].format(
                input_type=type(data).__name__
            )
            raise ValidationError(
                {api_settings.NON_FIELD_ERRORS_KEY: [message]}, code="not_a_list"
            )

        if not self.allow_empty and len(data) == 0:
            message = self.error_messages["empty"]
            raise ValidationError(
                {api_settings.NON_FIELD_ERRORS_KEY: [message]}, code="empty"
            )

        ret = []
        errors = []

        data_lookup = self.instance.in_bulk() if self.instance else {}
        id_attr = self.child.id_attr()

        for item in data:
            try:
                # prepare child serializer to only handle one instance
                self.child.instance = data_lookup.get(item[id_attr])
                self.child.initial_data = item
                validated = self.child.run_validation(item)
            except ValidationError as exc:
                errors.append(exc.detail)
            else:
                ret.append(validated)
                errors.append({})

        if any(errors):
            raise ValidationError(errors)

        return ret

    def update(self, queryset, all_validated_data):
        id_attr = self.child.id_attr()
        concrete_fields = set(
            f.name for f in self.child.Meta.model._meta.concrete_fields
        )

        all_validated_data_by_id = {}

        properties_to_update = set()

        for obj in all_validated_data:
            obj_id = obj.pop(id_attr)
            if obj.keys():
                all_validated_data_by_id[obj_id] = obj
                properties_to_update.update(obj.keys())

        properties_to_update = properties_to_update.intersection(concrete_fields)

        # since this method is given a queryset which can have many
        # model instances, first find all objects to update
        # and only then update the models
        objects_to_update = queryset.filter(
            **{"{}__in".format(id_attr): all_validated_data_by_id.keys()}
        ).only(*properties_to_update)

        if len(all_validated_data_by_id) != objects_to_update.count():
            raise ValidationError("Could not find all objects to update.")

        updated_objects = []

        m2m_fields_by_id = {}

        for obj in objects_to_update:
            obj_id = getattr(obj, id_attr)
            obj_validated_data = all_validated_data_by_id.get(obj_id)

            # use model serializer to actually update the model
            # in case that method is overwritten
            instance, m2m_fields_by_id[obj_id] = self.child.update(
                obj, obj_validated_data
            )
            updated_objects.append(instance)

        bulk_update(objects_to_update, update_fields=properties_to_update)

        for obj in objects_to_update:
            obj_id = getattr(obj, id_attr)
            m2m_fields = m2m_fields_by_id.get(obj_id)
            self.child.post_save_update(obj, m2m_fields)

        return updated_objects

    def create(self, validated_data):
        ModelClass = self.child.Meta.model
        objects_to_create, many_to_many_tuple = zip(
            *map(self.child.create, validated_data)
        )
        try:
            created_objects = ModelClass._default_manager.bulk_create(objects_to_create)
        except TypeError:
            tb = traceback.format_exc()
            msg = (
                "Got a `TypeError` when calling `%s.%s.create()`. "
                "This may be because you have a writable field on the "
                "serializer class that is not a valid argument to "
                "`%s.%s.create()`. You may need to make the field "
                "read-only, or override the %s.create() method to handle "
                "this correctly.\nOriginal exception was:\n %s"
                % (
                    ModelClass.__name__,
                    ModelClass._default_manager.name,
                    ModelClass.__name__,
                    ModelClass._default_manager.name,
                    self.__class__.__name__,
                    tb,
                )
            )
            raise TypeError(msg)
        for instance, many_to_many in zip(created_objects, many_to_many_tuple):
            self.child.post_save_create(instance, many_to_many)
        return created_objects


class ValuesViewset(ReadOnlyModelViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer.
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

    @classmethod
    def id_attr(cls):
        if cls.serializer_class is not None and hasattr(
            cls.serializer_class, "id_attr"
        ):
            return cls.serializer_class.id_attr()
        return None

    def get_serializer_class(self):
        if self.serializer_class is not None:
            return self.serializer_class
        # Hack to prevent the renderer logic from breaking completely.
        return Serializer

    def annotate_queryset(self, queryset):
        return queryset

    def prefetch_queryset(self, queryset):
        return queryset

    def _map_fields(self, item):
        for key, value in self._field_map.items():
            if callable(value):
                item[key] = value(item)
            elif value in item:
                item[key] = item.pop(value)
            else:
                item[key] = value
        return item

    def consolidate(self, items):
        return items

    def _cast_queryset_to_values(self, queryset):
        queryset = self.annotate_queryset(queryset)
        return queryset.values(*self._values)

    def serialize(self, queryset):
        return self.consolidate(list(map(self._map_fields, queryset or [])))

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))
        queryset = self._cast_queryset_to_values(queryset)

        page = self.paginate_queryset(queryset)

        if page is not None:
            return self.get_paginated_response(self.serialize(page))

        return Response(self.serialize(queryset))

    def serialize_object(self, pk):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))
        try:
            return self.serialize(
                self._cast_queryset_to_values(queryset.filter(pk=pk))
            )[0]
        except IndexError:
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )

    def retrieve(self, request, pk, *args, **kwargs):
        return Response(self.serialize_object(pk))

    def perform_bulk_update(self, serializer):
        serializer.save()

    def bulk_update(self, request, *args, **kwargs):
        data = kwargs.pop("data", request.data)
        instance = self.get_queryset().order_by()
        serializer = self.get_serializer(instance, data=data, many=True, partial=True)
        errors = []
        if serializer.is_valid():
            self.perform_bulk_update(serializer)
        else:
            valid_data = []
            for error, datum in zip(serializer.errors, data):
                if error:
                    datum.update({"errors": error})
                    errors.append(datum)
                else:
                    valid_data.append(datum)
            if valid_data:
                serializer = self.get_serializer(
                    instance, data=valid_data, many=True, partial=True
                )
                # This should now not raise an exception as we have filtered
                # all the invalid objects, but we still need to call is_valid
                # before DRF will let us save them.
                serializer.is_valid(raise_exception=True)
                self.perform_bulk_update(serializer)
        return errors, serializer.changes

    def bulk_create(self, request, *args, **kwargs):
        data = kwargs.pop("data", request.data)
        serializer = self.get_serializer(data=data, many=True)
        errors = []
        if serializer.is_valid():
            self.perform_bulk_create(serializer)
        else:
            valid_data = []
            for error, datum in zip(serializer.errors, data):
                if error:
                    datum.update({"errors": error})
                    errors.append(datum)
                else:
                    valid_data.append(datum)
            if valid_data:
                serializer = self.get_serializer(data=valid_data, many=True)
                # This should now not raise an exception as we have filtered
                # all the invalid objects, but we still need to call is_valid
                # before DRF will let us save them.
                serializer.is_valid(raise_exception=True)
                self.perform_bulk_create(serializer)
        return errors, serializer.changes

    def perform_bulk_create(self, serializer):
        serializer.save()

    def bulk_delete(self, ids):
        id_attr = self.serializer_class.id_attr()
        errors = []
        changes = []
        try:
            self.get_queryset().filter(**{"{}__in".format(id_attr): ids}).delete()
        except Exception as e:
            errors = [
                {
                    "key": not_deleted_id,
                    "errors": [ValidationError("Could not be deleted").details],
                }
                for not_deleted_id in ids
            ]
        return errors, changes
