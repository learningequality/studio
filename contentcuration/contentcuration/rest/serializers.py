import copy

from django.db.models import prefetch_related_objects
from django.utils.functional import cached_property
from rest_framework import serializers
from rest_framework.utils import model_meta
from rest_framework_bulk import BulkListSerializer
from rest_framework_bulk import BulkSerializerMixin


class ModelMixin(object):
    @cached_property
    def field_info(self):
        """
        :return: Returns the detailed field information for the serializer's model
        """
        return model_meta.get_field_info(self.get_model())

    def get_meta_attr(self, attr, default=None):
        """
        Abstract

        :param attr: Attribute name
        :param default: Default return value
        :return: Returns the attribute from the Meta class
        """
        raise NotImplementedError('Method `get_meta_attr` not implemented')

    def get_model(self):
        """
        :return: Returns the Model class associated with the serializer
        """
        return self.get_meta_attr('model')


class ModelSerializer(BulkSerializerMixin, ModelMixin, serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        """
        :param exclude_fields: Fields dynamically removed from Meta.fields
        :param args: Passed to super
        :param kwargs: Passed to super
        """
        self._exclude_fields = set(kwargs.pop('exclude_fields', []))
        super(ModelSerializer, self).__init__(*args, **kwargs)

    def get_field_names(self, declared_fields, info):
        """
        Override and handle `exclude_fields` functionality
        """
        field_names = super(ModelSerializer, self).get_field_names(declared_fields, info)
        return list(set(field_names) - self._exclude_fields)

    def get_extra_kwargs(self):
        """
        Allows `__all__` option for `read_only_fields`
        """
        read_only_fields = getattr(self.Meta, 'read_only_fields', None)

        if read_only_fields == serializers.ALL_FIELDS:
            fields = getattr(self.Meta, 'fields', None)

            if fields == serializers.ALL_FIELDS:
                declared_fields = copy.deepcopy(self._declared_fields)
                fields = super(ModelSerializer, self).get_field_names(declared_fields,
                                                                      self.field_info)
            setattr(self.Meta, 'read_only_fields', fields)

        return super(ModelSerializer, self).get_extra_kwargs()

    def get_meta_attr(self, attr, default=None):
        """
        :param attr: Attribute name
        :param default: Default return value
        :return: Returns the attribute from the Meta class
        """
        return getattr(self.Meta, attr, default)


class ListSerializer(ModelMixin, BulkListSerializer):
    def to_representation(self, objs):
        """
        For each serializable field, if it has a list serializer and is not write only, this
        will cause the associated objects to be prefetched for each of this serializer's objects

        :param objs: The objects to serialize
        :return: The serialized representation of the objects
        """
        for field, serializer in self.child.fields.items():
            if not serializer.write_only and getattr(serializer, 'many', False):
                prefetch_related_objects(objs, field)

        return super(ListSerializer, self).to_representation(objs)

    def get_meta_attr(self, attr, default=None):
        """
        :param attr: Attribute name
        :param default: Default return value
        :return: Returns the attribute from the Meta class, on the child serializer
        """
        return getattr(self.child.Meta, attr, default)
