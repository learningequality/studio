import json
import traceback
import uuid
from contextlib import contextmanager

from celery import states
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.db.utils import IntegrityError
from django.http import Http404
from django.http.request import HttpRequest
from django_celery_results.models import TaskResult
from django_filters.constants import EMPTY_VALUES
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.filters import OrderingFilter
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.serializers import ListSerializer
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import raise_errors_on_nested_writes
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError
from rest_framework.settings import api_settings
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.utils import html
from rest_framework.utils import model_meta
from rest_framework.viewsets import GenericViewSet

from contentcuration.models import Change
from contentcuration.models import CustomTaskMetadata
from contentcuration.utils.celery.tasks import generate_task_signature
from contentcuration.utils.celery.tasks import ProgressTracker
from contentcuration.viewsets.common import MissingRequiredParamsException
from contentcuration.viewsets.sync.constants import TASK_ID
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.utils import log_sync_exception


class SimpleReprMixin(object):
    def __repr__(self):
        """
        DRF's default __repr__ implementation prints out all fields, and in the process
        of that can evaluate querysets. If those querysets haven't yet had filters applied,
        this will lead to full table scans, which are a big no-no if you like running servers.
        """
        return "{} object".format(self.__class__.__name__)


# Add mixin first to make sure __repr__ for mixin is first in MRO
class BulkModelSerializer(SimpleReprMixin, ModelSerializer):
    def __init__(self, *args, **kwargs):
        super(BulkModelSerializer, self).__init__(*args, **kwargs)
        # Track any changes that should be propagated back to the frontend
        self.changes = []

    @classmethod
    def id_attr(cls):
        ModelClass = cls.Meta.model
        info = model_meta.get_field_info(ModelClass)
        return getattr(cls.Meta, "update_lookup_field", info.pk.name)

    def get_value(self, data, attr):
        """
        Method to get a value based on the attribute name
        accepts data which can be either a dict or a Django Model
        Uses the underlying DRF Field methods for the field
        to return the value.
        """
        id_field = self.fields[attr]
        if isinstance(data, dict):
            return id_field.get_value(data)
        # Otherwise should be a model instance
        return id_field.get_attribute(data)

    def id_value_lookup(self, data):
        """
        Method to get the value for an id to use in lookup dicts
        In the case of a simple id, this is just the str of the value
        In the case of a combined index, we make a tuple of the values.
        """
        id_attr = self.id_attr()

        if isinstance(id_attr, str):
            return str(self.get_value(data, id_attr))
        # Could alternatively have coerced the list of values to a string
        # but this seemed more explicit in terms of the intended format.
        id_values = (self.get_value(data, attr) for attr in id_attr)

        # For the combined index, use any related objects' primary key
        combined_index = (idx.pk if hasattr(idx, "pk") else idx for idx in id_values)
        return tuple(combined_index)

    def set_id_values(self, data, obj):
        """
        Method to set all ids values on a dict (obj)
        from either a dict or a model (data)
        """
        obj.update(self.get_id_values(data))
        return obj

    def get_id_values(self, data):
        """
        Return a dict of the id value(s) from data
        which can be either a dict or a model
        """
        id_attr = self.id_attr()

        obj = {}

        if isinstance(id_attr, str):
            obj[id_attr] = self.get_value(data, id_attr)
        else:
            for attr in id_attr:
                obj[attr] = self.get_value(data, attr)
        return obj

    def remove_id_values(self, obj):
        """
        Return a copy of obj with its id value(s) removed.
        """
        obj = obj.copy()
        id_attr = self.id_attr()

        if isinstance(id_attr, str):
            del obj[id_attr]
        else:
            for attr in id_attr:
                del obj[attr]
        return obj

    def to_internal_value(self, data):
        ret = super(BulkModelSerializer, self).to_internal_value(data)

        # add update_lookup_field field back to validated data
        # since super by default strips out read-only fields
        # hence id will no longer be present in validated_data
        if isinstance(self.parent, BulkListSerializer):
            self.set_id_values(data, ret)

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
        for attr, value in validated_data.items():
            if attr in info.relations and info.relations[attr].to_many:
                raise ValueError("Many to many fields must be explicitly handled", attr)
            setattr(instance, attr, value)

        if not getattr(self, "parent"):
            instance.save()
        elif hasattr(instance, "on_update") and callable(instance.on_update):
            instance.on_update()

        return instance

    def create(self, validated_data):
        # To ensure caution, require nested_writes to be explicitly allowed
        if not (hasattr(self.Meta, "nested_writes") and self.Meta.nested_writes):
            raise_errors_on_nested_writes("create", self, validated_data)

        ModelClass = self.Meta.model

        # Remove many-to-many relationships from validated_data.
        # They are not valid arguments to the default `.create()` method,
        # as they require that the instance has already been saved.
        info = model_meta.get_field_info(ModelClass)
        for field_name, relation_info in info.relations.items():
            if relation_info.to_many and (field_name in validated_data):
                raise ValueError(
                    "Many to many fields must be explicitly handled", field_name
                )
            if not relation_info.reverse and (field_name in validated_data):
                if not isinstance(
                    validated_data[field_name], relation_info.related_model
                ):
                    # Trying to set a foreign key but do not have the object, only the key
                    validated_data[
                        relation_info.model_field.attname
                    ] = validated_data.pop(field_name)

        instance = ModelClass(**validated_data)

        if not getattr(self, "parent", False):
            instance.save()
        elif hasattr(instance, "on_create") and callable(instance.on_create):
            instance.on_create()

        return instance

    def save(self, **kwargs):
        instance = super(BulkModelSerializer, self).save(**kwargs)
        if self.changes:
            Change.create_changes(self.changes, applied=True)
        return instance


# Add mixin first to make sure __repr__ for mixin is first in MRO
class BulkListSerializer(SimpleReprMixin, ListSerializer):
    def __init__(self, *args, **kwargs):
        super(BulkListSerializer, self).__init__(*args, **kwargs)
        # Track any changes that should be propagated back to the frontend
        self.changes = []
        # Track any objects that weren't found
        self.missing_keys = set()

    def _data_lookup_dict(self):
        """
        Return a data lookup dict keyed by the id attribute
        based off the Django in bulk method
        """
        if self.instance:
            return {self.child.id_value_lookup(obj): obj for obj in self.instance}
        return {}

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

        data_lookup = self._data_lookup_dict()

        for item in data:
            try:
                # prepare child serializer to only handle one instance
                self.child.instance = data_lookup.get(self.child.id_value_lookup(item))
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
        concrete_fields = {f.name for f in self.child.Meta.model._meta.concrete_fields}

        all_validated_data_by_id = {}

        properties_to_update = set()

        for obj in all_validated_data:
            obj_id = self.child.id_value_lookup(obj)
            obj = self.child.remove_id_values(obj)
            if obj.keys():
                all_validated_data_by_id[obj_id] = obj
                properties_to_update.update(obj.keys())

        properties_to_update = properties_to_update.intersection(concrete_fields)

        # this method is handed a queryset that has been pre-filtered
        # to the specific instance ids in question, by `create_from_updates` on the bulk update mixin
        objects_to_update = queryset.only(*properties_to_update)

        updated_objects = []

        updated_keys = set()

        for obj in objects_to_update:
            # Coerce to string as some ids are of the UUID class
            obj_id = self.child.id_value_lookup(obj)
            obj_validated_data = all_validated_data_by_id.get(obj_id)

            # If no valid data was passed back then this will be None
            if obj_validated_data is not None:

                # Reset the child serializer changes attribute
                self.child.changes = []
                # use model serializer to actually update the model
                # in case that method is overwritten

                instance = self.child.update(obj, obj_validated_data)
                # If the update method does not return an instance for some reason
                # do not try to run further updates on the model, as there is no
                # object to update.
                if instance:
                    updated_objects.append(instance)
                    updated_keys.add(obj_id)
                    # Collect any registered changes from this run of the loop
                    self.changes.extend(self.child.changes)

        if len(all_validated_data_by_id) != len(updated_keys):
            self.missing_keys = set(all_validated_data_by_id.keys()).difference(
                updated_keys
            )

        if len(properties_to_update) > 0:
            self.child.Meta.model.objects.bulk_update(
                updated_objects, list(properties_to_update)
            )

        return updated_objects

    def create(self, validated_data):
        ModelClass = self.child.Meta.model
        objects_to_create = []
        for model_data in validated_data:
            # Reset the child serializer changes attribute
            self.child.changes = []
            object_to_create = self.child.create(model_data)
            objects_to_create.append(object_to_create)
            # Collect any registered changes from this run of the loop
            self.changes.extend(self.child.changes)
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
        return created_objects

    def save(self, **kwargs):
        instance = super(BulkListSerializer, self).save(**kwargs)
        if self.changes:
            Change.create_changes(self.changes, applied=True)
        return instance


class ValuesViewsetOrderingFilter(OrderingFilter):
    def get_default_valid_fields(self, queryset, view, context=None):
        """
        The original implementation of this makes the assumption that the DRF serializer for the class
        encodes all the serialization behaviour for the viewset:
        https://github.com/encode/django-rest-framework/blob/version-3.12.2/rest_framework/filters.py#L208

        With the ValuesViewset, this is no longer the case so here we do an equivalent mapping from the values
        defined by the values viewset, with consideration for the mapped fields.

        Importantly, we filter out values that have not yet been annotated on the queryset, so if an annotated
        value is requried for ordering, it should be defined in the get_queryset method of the viewset, and not
        the annotate_queryset method, which is executed after filtering.
        """
        if context is None:
            context = {}
        default_fields = set()
        # All the fields that we have field maps defined for - this only allows for simple mapped fields
        # where the field is essentially a rename, as we have no good way of doing ordering on a field that
        # that is doing more complex function based mapping.
        mapped_fields = {v: k for k, v in view.field_map.items() if isinstance(v, str)}
        # All the fields of the model
        model_fields = {f.name for f in queryset.model._meta.get_fields()}
        # Loop through every value in the view's values tuple
        for field in view.values:
            # If the value is for a foreign key lookup, we split it here to make sure that the first relation key
            # exists on the model - it's unlikely this would ever not be the case, as otherwise the viewset would
            # be returning 500s.
            fk_ref = field.split("__")[0]
            # Check either if the field is a model field, a currently annotated annotation, or
            # is a foreign key lookup on an FK on this model.
            if (
                field in model_fields
                or field in queryset.query.annotations
                or fk_ref in model_fields
            ):
                # If the field is a mapped field, we store the field name as returned to the client
                # not the actual internal field - this will later be mapped when we come to do the ordering.
                if field in mapped_fields:
                    default_fields.add((mapped_fields[field], mapped_fields[field]))
                else:
                    default_fields.add((field, field))

        return default_fields

    def remove_invalid_fields(self, queryset, fields, view, request):
        """
        Modified from https://github.com/encode/django-rest-framework/blob/version-3.12.2/rest_framework/filters.py#L259
        to do filtering based on valuesviewset setup
        """
        # We filter the mapped fields to ones that do simple string mappings here, any functional maps are excluded.
        mapped_fields = {k: v for k, v in view.field_map.items() if isinstance(v, str)}
        valid_fields = [
            item[0]
            for item in self.get_valid_fields(queryset, view, {"request": request})
        ]
        ordering = []
        for term in fields:
            if term.lstrip("-") in valid_fields:
                if term.lstrip("-") in mapped_fields:
                    # In the case that the ordering field is a mapped field on the values viewset
                    # we substitute the serialized name of the field for the database name.
                    prefix = "-" if term[0] == "-" else ""
                    new_term = prefix + mapped_fields[term.lstrip("-")]
                    ordering.append(new_term)
                else:
                    ordering.append(term)
        if len(ordering) > 1:
            raise ValidationError("Can only define a single ordering field")
        return ordering


class RequiredFilterSet(FilterSet):
    def __init__(self, required=False, **kwargs):
        self._required = required
        super().__init__(**kwargs)

    @property
    def qs(self):
        if self._required:
            has_filtering_queries = False
            if self.form.is_valid():
                for name, filter_ in self.filters.items():
                    value = self.form.cleaned_data.get(name)

                    if value not in EMPTY_VALUES:
                        has_filtering_queries = True
                        break
            if not has_filtering_queries and self.request.method == "GET":
                raise MissingRequiredParamsException(
                    "No valid filter parameters supplied"
                )
        return super(FilterSet, self).qs


class RequiredFiltersFilterBackend(DjangoFilterBackend):
    """
    Override the default filter backend to conditionalize initialization
    if we are using a RequiredFilterSet
    """

    def get_filterset(self, request, queryset, view):
        filterset_class = self.get_filterset_class(view, queryset)
        if filterset_class is None:
            return None

        kwargs = self.get_filterset_kwargs(request, queryset, view)

        if issubclass(filterset_class, RequiredFilterSet):
            action_handler = getattr(view, view.action)
            # Either this is a list action, or it's a decorated action that
            # had its detail attribute explicitly set to False.
            if view.action == "list" or not getattr(action_handler, "detail", True):
                kwargs["required"] = True

        return filterset_class(**kwargs)


class BaseValuesViewset(SimpleReprMixin, GenericViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer.
    """

    filter_backends = (RequiredFiltersFilterBackend, ValuesViewsetOrderingFilter)

    # A tuple of values to get from the queryset
    values = None
    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    # Alternatively, the source_key can be a callable that will be passed the object and return
    # the value for the target_key. This callable can also pop unwanted values from the obj
    # to remove unneeded keys from the object as a side effect.
    field_map = {}

    def __init__(self, *args, **kwargs):
        super(BaseValuesViewset, self).__init__(*args, **kwargs)
        if not isinstance(self.values, tuple):
            raise TypeError("values must be defined as a tuple")
        self._values = tuple(self.values)
        if not isinstance(self.field_map, dict):
            raise TypeError("field_map must be defined as a dict")
        self._field_map = self.field_map.copy()

    def sync_initial(self, user):
        """
        Runs anything that needs to occur prior to calling the changes handler.
        """
        self.request = HttpRequest()
        self.request.user = user
        self.format_kwarg = None

    @classmethod
    def id_attr(cls):
        if cls.serializer_class is not None and hasattr(
            cls.serializer_class, "id_attr"
        ):
            return cls.serializer_class.id_attr()
        return None

    @classmethod
    def values_from_key(cls, key):
        """
        Method to return an iterable that can be used as arguments for dict
        to return the values from key.
        Key is either a string, in which case the key is a singular value
        or a list, in which case the key is a combined value.
        """
        id_attr = cls.id_attr()

        if id_attr:
            if isinstance(id_attr, str):
                # Singular value
                # Just return the single id_attr and the original key
                return [(id_attr, key)]
            # Multiple values in the key, zip together the id_attr and the key
            # to create key, value pairs for a dict
            # Order in the key matters, and must match the "update_lookup_field"
            # property of the serializer.
            return list(zip(id_attr, key))
        return []

    @classmethod
    def filter_queryset_from_keys(cls, queryset, keys):
        """
        Method to filter a queryset based on keys.
        """
        id_attr = cls.id_attr()

        if id_attr:
            if isinstance(id_attr, str):
                # In the case of single valued keys, this is just an __in lookup
                return queryset.filter(**{"{}__in".format(id_attr): keys})
            # If id_attr is multivalued we need to do an ORed lookup for each
            # set of values represented by a key.
            # This is probably not as performant as the simple __in query
            # improvements welcome!
            query = Q()
            for key in keys:
                query |= Q(**dict(zip(id_attr, key)))
            return queryset.filter(query)
        return queryset.none()

    def get_serializer_class(self):
        if self.serializer_class is not None:
            return self.serializer_class
        # Hack to prevent the renderer logic from breaking completely.
        return Serializer

    def get_queryset(self):
        queryset = super(BaseValuesViewset, self).get_queryset()
        if hasattr(queryset.model, "filter_view_queryset"):
            return queryset.model.filter_view_queryset(queryset, self.request.user)
        return queryset

    def get_edit_queryset(self):
        """
        Return a filtered copy of the queryset to only the objects
        that a user is able to edit, rather than view.
        """
        queryset = super(BaseValuesViewset, self).get_queryset()
        if hasattr(queryset.model, "filter_edit_queryset"):
            return queryset.model.filter_edit_queryset(queryset, self.request.user)
        return self.get_queryset()

    def _get_lookup_filter(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        if lookup_url_kwarg not in self.kwargs:
            raise AssertionError(
                "Expected view %s to be called with a URL keyword argument "
                'named "%s". Fix your URL conf, or set the `.lookup_field` '
                "attribute on the view correctly."
                % (self.__class__.__name__, lookup_url_kwarg)
            )

        return {self.lookup_field: self.kwargs[lookup_url_kwarg]}

    def _get_object_from_queryset(self, queryset):
        """
        Returns the object the view is displaying.
        We override this to remove the DRF default behaviour
        of filtering the queryset.
        (rtibbles) There doesn't seem to be a use case for
        querying a detail endpoint and also filtering by query
        parameters that might result in a 404.
        """
        # Perform the lookup filtering.
        filter_kwargs = self._get_lookup_filter()
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    def get_object(self):
        return self._get_object_from_queryset(self.get_queryset())

    def get_edit_object(self):
        return self._get_object_from_queryset(self.get_edit_queryset())

    def annotate_queryset(self, queryset):
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

    def consolidate(self, items, queryset):
        return items

    def serialize(self, queryset):
        queryset = self.annotate_queryset(queryset)
        values_queryset = queryset.values(*self._values)
        return self.consolidate(
            list(map(self._map_fields, values_queryset or [])), queryset
        )

    def serialize_object(self, **filter_kwargs):
        try:
            filter_kwargs = filter_kwargs or self._get_lookup_filter()
            queryset = self.get_queryset().filter(**filter_kwargs)
            return self.serialize(self.filter_queryset(queryset))[0]
        except (IndexError, ValueError, TypeError):
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )


class ListModelMixin(object):
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page_queryset = self.paginate_queryset(queryset)

        if page_queryset is not None:
            queryset = page_queryset

        if page_queryset is not None:
            return self.get_paginated_response(self.serialize(queryset))

        return Response(self.serialize(queryset))


class RetrieveModelMixin(object):
    def retrieve(self, request, *args, **kwargs):
        return Response(self.serialize_object())


class ReadOnlyValuesViewset(BaseValuesViewset, RetrieveModelMixin, ListModelMixin):
    pass


class CreateModelMixin(object):
    def _map_create_change(self, change):
        return dict(list(change["obj"].items()) + self.values_from_key(change["key"]))

    def perform_create(self, serializer, change=None):
        serializer.save()

    def create_from_changes(self, changes):
        errors = []

        for change in changes:
            try:
                serializer = self.get_serializer(data=self._map_create_change(change))
                if serializer.is_valid():
                    self.perform_create(serializer, change=change)
                else:
                    change.update({"errors": serializer.errors})
                    errors.append(change)
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)

        return errors


class RESTCreateModelMixin(CreateModelMixin):
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=409)
        instance = serializer.instance
        return Response(self.serialize_object(pk=instance.pk), status=HTTP_201_CREATED)


class DestroyModelMixin(object):
    """
    Destroy a model instance.
    """

    def _map_delete_change(self, change):
        return change["key"]

    def perform_destroy(self, instance):
        instance.delete()

    def delete_from_changes(self, changes):
        errors = []
        queryset = self.get_edit_queryset().order_by()
        for change in changes:
            try:
                instance = queryset.get(**dict(self.values_from_key(change["key"])))

                self.perform_destroy(instance)
            except ObjectDoesNotExist:
                # If the object already doesn't exist, as far as the user is concerned
                # job done!
                pass
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors


class RESTDestroyModelMixin(DestroyModelMixin):
    def destroy(self, request, *args, **kwargs):
        instance = self.get_edit_object()
        self.perform_destroy(instance)
        return Response(status=HTTP_204_NO_CONTENT)


class UpdateModelMixin(object):
    def _map_update_change(self, change):
        return dict(list(change["mods"].items()) + self.values_from_key(change["key"]))

    def perform_update(self, serializer):
        serializer.save()

    def update_from_changes(self, changes):
        errors = []
        queryset = self.get_edit_queryset().order_by()
        for change in changes:
            try:
                instance = queryset.get(**dict(self.values_from_key(change["key"])))
                serializer = self.get_serializer(
                    instance, data=self._map_update_change(change), partial=True
                )
                if serializer.is_valid():
                    self.perform_update(serializer)
                else:
                    change.update({"errors": serializer.errors})
                    errors.append(change)
            except ObjectDoesNotExist:
                # Should we also check object permissions here and return a different
                # error if the user can view the object but not edit it?
                # N.B. the .detail property of the ValidationError is a list
                # so we don't need to wrap it in a list here.
                change.update({"errors": ValidationError("Not found").detail})
                errors.append(change)
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors


class RESTUpdateModelMixin(UpdateModelMixin):
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_edit_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(self.serialize_object())

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class ValuesViewset(
    ReadOnlyValuesViewset, DestroyModelMixin, CreateModelMixin, UpdateModelMixin
):
    pass


class BulkCreateMixin(CreateModelMixin):
    def perform_bulk_create(self, serializer):
        serializer.save()

    def create_from_changes(self, changes):
        data = list(map(self._map_create_change, changes))
        serializer = self.get_serializer(data=data, many=True)
        errors = []
        if serializer.is_valid():
            try:
                self.perform_bulk_create(serializer)
            except Exception as e:
                log_sync_exception(e, user=self.request.user, changes=changes)
                for change in changes:
                    change["errors"] = [str(e)]
                errors.extend(changes)
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
        return errors


class BulkUpdateMixin(UpdateModelMixin):
    def perform_bulk_update(self, serializer):
        serializer.save()

    def update_from_changes(self, changes):
        data = list(map(self._map_update_change, changes))
        keys = [change["key"] for change in changes]
        queryset = self.filter_queryset_from_keys(
            self.get_edit_queryset(), keys
        ).order_by()
        serializer = self.get_serializer(queryset, data=data, many=True, partial=True)
        errors = []

        if serializer.is_valid():
            try:
                self.perform_bulk_update(serializer)
            except Exception as e:
                log_sync_exception(e, user=self.request.user, changes=changes)
                for change in changes:
                    change["errors"] = [str(e)]
                errors.extend(changes)
            if serializer.missing_keys:
                # add errors for any changes that were specified but no object
                # corresponding could be found
                errors = [
                    # N.B. the .detail property of the ValidationError is a list
                    # so we don't need to wrap it in a list here.
                    dict(errors=ValidationError("Not found").detail, **change)
                    for change in changes
                    if tuple(change["key"]) in serializer.missing_keys
                ]
        else:
            valid_data = []
            for error, datum in zip(serializer.errors, data):
                if error:
                    # If the user does not have permission to write to this object
                    # it will throw a uniqueness validation error when trying to
                    # validate the id attribute for the change
                    # intercept this and replace with not found.

                    if self.id_attr() in error and any(
                        map(
                            lambda x: getattr(x, "code", None) == "unique",
                            error[self.id_attr()],
                        )
                    ):
                        error = ValidationError("Not found").detail
                    datum.update({"errors": error})
                    errors.append(datum)
                else:
                    valid_data.append(datum)
            if valid_data:
                serializer = self.get_serializer(
                    queryset, data=valid_data, many=True, partial=True
                )
                # This should now not raise an exception as we have filtered
                # all the invalid objects, but we still need to call is_valid
                # before DRF will let us save them.
                serializer.is_valid(raise_exception=True)
                self.perform_bulk_update(serializer)
        return errors


class BulkDeleteMixin(DestroyModelMixin):
    def delete_from_changes(self, changes):
        keys = [change["key"] for change in changes]
        queryset = self.filter_queryset_from_keys(
            self.get_edit_queryset(), keys
        ).order_by()
        errors = []
        try:
            queryset.delete()
        except Exception:
            errors = [
                {
                    "key": not_deleted_id,
                    "errors": ValidationError("Could not be deleted").detail,
                }
                for not_deleted_id in keys
            ]
        return errors


@contextmanager
def create_change_tracker(pk, table, channel_id, user, task_name):
    task_kwargs = json.dumps({"pk": pk, "table": table})

    # Clean up any previous tasks specific to this in case there were failures.
    signature = generate_task_signature(
        task_name, task_kwargs=task_kwargs, channel_id=channel_id
    )

    custom_task_metadata_qs = CustomTaskMetadata.objects.filter(
        channel_id=channel_id, signature=signature
    )
    if custom_task_metadata_qs.exists():
        task_result_qs = TaskResult.objects.filter(
            task_id=custom_task_metadata_qs[0].task_id, task_name=task_name
        )
        if task_result_qs.exists():
            task_result_qs[0].delete()
        custom_task_metadata_qs[0].delete()

    task_id = uuid.uuid4().hex

    task_object = TaskResult.objects.create(
        task_id=task_id,
        status=states.STARTED,
        task_name=task_name,
    )
    custom_task_metadata_object = CustomTaskMetadata.objects.create(
        task_id=task_id, channel_id=channel_id, user=user, signature=signature
    )

    def update_progress(progress=None):
        if progress:
            custom_task_metadata_object.progress = progress
            custom_task_metadata_object.save()

    Change.create_change(
        # These changes are purely for ephemeral progress updating, and do not constitute a publishable change.
        generate_update_event(
            pk, table, {TASK_ID: task_object.task_id}, channel_id=channel_id
        ),
        applied=True,
        unpublishable=True,
    )

    tracker = ProgressTracker(task_id, update_progress)

    try:
        yield tracker
    except Exception:
        task_object.status = states.FAILURE
        task_object.traceback = traceback.format_exc()
        task_object.save()
        raise
    finally:
        if task_object.status == states.STARTED:
            # No error reported, cleanup.
            # Mark as unpublishable, as this is a continuation of the progress updating, and not a publishable change.
            Change.create_change(
                generate_update_event(
                    pk, table, {TASK_ID: None}, channel_id=channel_id
                ),
                applied=True,
                unpublishable=True,
            )
            task_object.delete()
            custom_task_metadata_object.delete()
