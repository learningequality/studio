from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import IntegerField
from django.db.models import Subquery
from django.forms.fields import UUIDField
from django.utils.datastructures import MultiValueDict
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import Filter
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.fields import empty
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


class NotNullArrayAgg(ArrayAgg):
    def convert_value(self, value, expression, connection, context):
        if not value:
            return []
        return filter(lambda x: x is not None, value)


class DistinctNotNullArrayAgg(ArrayAgg):
    def convert_value(self, value, expression, connection, context):
        if not value:
            return []
        return list(set(filter(lambda x: x is not None, value)))


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class ContentDefaultsSerializer(serializers.Serializer):
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

    def get_value(self, dictionary):
        # get just field name
        value = dictionary.get(self.field_name, dict())

        # then merge in fields with keys like `content_defaults.author`
        multi_value = MultiValueDict()
        multi_value.update(dictionary)
        html_value = html.parse_html_dict(multi_value, prefix=self.field_name)
        value.update(html_value.dict())

        return value if len(value.keys()) else empty

    def create(self, validated_data):
        instance = DEFAULT_CONTENT_DEFAULTS.copy()
        instance.update(validated_data)
        return instance

    def update(self, instance, validated_data):
        instance.update(validated_data)
        return instance

    def validate_license(self, license):
        if license is not None:
            License.validate_name(license)
        return license
