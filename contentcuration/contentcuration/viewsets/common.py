import re

from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.core.paginator import Paginator
from django.db.models import CharField
from django.db.models import IntegerField
from django.db.models import Manager
from django.db.models import Subquery
from django.db.models.query import QuerySet
from django.forms.fields import UUIDField
from django.utils.datastructures import MultiValueDict
from django.utils.functional import cached_property
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import Filter
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.fields import empty
from rest_framework.relations import MANY_RELATION_KWARGS
from rest_framework.relations import ManyRelatedField
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import RegexField
from rest_framework.serializers import ValidationError
from rest_framework.utils import html

from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import License


class MissingRequiredParamsException(APIException):
    status_code = 412
    default_detail = "Required query parameters were missing from the request"
    default_code = "missing_parameters"


class UUIDFilter(Filter):
    field_class = UUIDField


class UUIDInFilter(BaseInFilter, UUIDFilter):
    pass


class NotNullMapArrayAgg(ArrayAgg):
    """
    Return a map of values - used for M2M fields to allow
    for patch modifications by adding and deleting by key
    """

    def convert_value(self, value, expression, connection):
        if not value:
            return {}
        return {v: True for v in value if v}


class NotNullArrayAgg(ArrayAgg):
    def convert_value(self, value, expression, connection):
        if not value:
            return []
        return filter(lambda x: x is not None, value)


class AggregateSubquery(Subquery):
    def __init__(self, queryset, **extra):
        """
        Set select fields on queryset to avoid outputting more select columns than are needed
        """
        super(AggregateSubquery, self).__init__(
            queryset.values(extra.get("field")), **extra
        )


class SQCount(AggregateSubquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class SQSum(AggregateSubquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT SUM(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class SQArrayAgg(AggregateSubquery):
    # Include ALIAS at the end to support Postgres
    template = (
        "(SELECT ARRAY_AGG(%(field)s::text) FROM (%(subquery)s) AS %(field)s__sum)"
    )
    output_field = ArrayField(CharField())


class SQRelatedArrayAgg(SQArrayAgg):
    # For cases where fields are in a related table, for example language__native_name
    template = (
        "(SELECT ARRAY_AGG(%(fieldname)s::text) FROM (%(subquery)s) AS %(field)s__sum)"
    )


class SQJSONBKeyArrayAgg(AggregateSubquery):
    """
    An aggregate subquery to get all the distinct keys of a JSON field that contains maps to store
    e.g. metadata labels.
    """

    # Include ALIAS at the end to support Postgres
    template = "(SELECT ARRAY_AGG(f) FROM (SELECT DISTINCT jsonb_object_keys(%(field)s) AS f FROM (%(subquery)s) AS x) AS %(field)s__sum)"
    output_field = ArrayField(CharField())


dot_path_regex = re.compile(r"^([^.]+)\.(.+)$")


def unnest_dict(dictionary):
    complete = True
    ret = {}
    for field in dictionary:
        match = dot_path_regex.match(field)
        if not match:
            ret[field] = dictionary[field]
            continue
        matched_prefix, matched_key = match.groups()
        if dot_path_regex.match(matched_key):
            complete = False
        value = dictionary.get(field)
        if matched_prefix not in ret:
            ret[matched_prefix] = {}
        ret[matched_prefix][matched_key] = value
    if complete:
        return ret
    return unnest_dict(ret)


class DotPathValueMixin(object):
    def get_value(self, dictionary):
        # get just field name
        value = dictionary.get(self.field_name, {})

        if value is None:
            return empty

        if not isinstance(value, dict):
            raise ValidationError("Must be an object or null")

        # then merge in fields with keys like `content_defaults.author`
        multi_value = MultiValueDict()
        multi_value.update(dictionary)
        html_value = html.parse_html_dict(multi_value, prefix=self.field_name).dict()

        fields = getattr(self, "fields", {})

        for key in html_value:
            # Split on the first occurrence of a "." in case we are dealing with a dot path
            # referencing a child field of this field.
            keys = key.split(".", 1)
            # Only attempt to use this if there is a dot path, and the parent of the dot path is
            # a valid child field. Otherwise, we just use the value as-is.
            if key not in fields and len(keys) == 2 and keys[0] in fields:
                # If it is a valid child field, we invoke the nested field's get_value method
                # with the value of the child field.
                # N.B. the get_value method expects a dictionary that references the field's name
                # not just the value.
                nested_value = fields[keys[0]].get_value(
                    {keys[0]: {keys[1]: html_value[key]}}
                )
                if keys[0] not in value:
                    value[keys[0]] = {}
                value[keys[0]].update(nested_value)
                if key in value:
                    del value[key]
            else:
                value[key] = html_value[key]
        return value if value.keys() else empty


class JSONFieldDictSerializer(DotPathValueMixin, serializers.Serializer):
    default_value = dict

    def create(self, validated_data):
        instance = self.default_value()
        instance.update(validated_data)
        return instance

    def update(self, instance, validated_data):
        instance = instance or self.default_value()
        for key, value in validated_data.items():
            if value is None:
                # If the value is None, we delete the key from the instance.
                # Silently ignore deletion of values that don't exist
                if key in instance:
                    del instance[key]
            elif hasattr(self.fields[key], "update"):
                # If the nested field has an update method (e.g. a nested serializer),
                # call the update value so that we can do any recursive updates
                instance[key] = self.fields[key].update(
                    instance.get(key, {}), validated_data[key]
                )
            else:
                # Otherwise, just update the value
                instance[key] = validated_data[key]
        return instance


class ContentDefaultsSerializer(JSONFieldDictSerializer):
    author = serializers.CharField(allow_null=True, required=False)
    aggregator = serializers.CharField(allow_null=True, required=False)
    provider = serializers.CharField(allow_null=True, required=False)
    copyright_holder = serializers.CharField(allow_null=True, required=False)
    license = serializers.CharField(allow_null=True, required=False)
    license_description = serializers.CharField(allow_null=True, required=False)
    auto_derive_video_thumbnail = serializers.BooleanField(required=False)
    auto_derive_audio_thumbnail = serializers.BooleanField(required=False)
    auto_derive_document_thumbnail = serializers.BooleanField(required=False)
    auto_derive_html5_thumbnail = serializers.BooleanField(required=False)

    default_value = DEFAULT_CONTENT_DEFAULTS.copy

    def validate_license(self, license):
        if license is not None:
            License.validate_name(license)
        return license


class CatalogPaginator(Paginator):
    @cached_property
    def count(self):
        return self.object_list.order_by().values("id").count()


uuidregex = re.compile("^[0-9a-f]{32}$")


class UUIDRegexField(RegexField):
    def __init__(self, **kwargs):
        super(UUIDRegexField, self).__init__(
            uuidregex, max_length=32, min_length=32, **kwargs
        )


class UserFilteredManyToManyPrimaryKeyField(DotPathValueMixin, ManyRelatedField):
    def to_internal_value(self, data):
        if self.child_relation.pk_field is not None:
            pks = [self.child_relation.pk_field.to_internal_value(d) for d in data]
        else:
            pks = list(data)
        valid_pks = (
            self.child_relation.get_queryset()
            .filter(pk__in=pks)
            .values_list("pk", flat=True)
        )
        difference = set(pks).difference(set(valid_pks))
        if difference:
            raise ValidationError("Not found")
        return {pk: data[pk] for pk in valid_pks}


class UserFilteredPrimaryKeyRelatedField(PrimaryKeyRelatedField):
    def __init__(self, edit=True, **kwargs):
        self.edit = edit
        super().__init__(**kwargs)

    @classmethod
    def many_init(cls, *args, **kwargs):
        list_kwargs = {"child_relation": cls(*args, **kwargs)}
        for key in kwargs:
            if key in MANY_RELATION_KWARGS:
                list_kwargs[key] = kwargs[key]
        return UserFilteredManyToManyPrimaryKeyField(**list_kwargs)

    def get_queryset(self):
        """
        Vendored and modified from
        https://github.com/encode/django-rest-framework/blob/master/rest_framework/relations.py#L155
        """
        queryset = self.queryset
        if isinstance(queryset, (QuerySet, Manager)):
            # Ensure queryset is re-evaluated whenever used.
            # Note that actually a `Manager` class may also be used as the
            # queryset argument. This occurs on ModelSerializer fields,
            # as it allows us to generate a more expressive 'repr' output
            # for the field.
            # Eg: 'MyRelationship(queryset=ExampleModel.objects.all())'
            queryset = queryset.all()
        # Explicity use the edit queryset here, as we are only using serializers
        # for model writes, so the view queryset is not necessary.
        if self.edit and hasattr(queryset.model, "filter_edit_queryset"):
            queryset = queryset.model.filter_edit_queryset(
                queryset, self.context["request"].user
            )
        elif not self.edit and hasattr(queryset.model, "filter_view_queryset"):
            queryset = queryset.model.filter_view_queryset(
                queryset, self.context["request"].user
            )
        else:
            raise TypeError(
                "UserFilteredPrimaryKeyRelatedField used on queryset for model that does not have filter_edit_queryset method"
            )
        return queryset
