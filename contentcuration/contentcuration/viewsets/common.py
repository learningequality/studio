from django.contrib.postgres.aggregates import ArrayAgg
from rest_framework import serializers
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import License


class NotNullArrayAgg(ArrayAgg):
    def convert_value(self, value, expression, connection, context):
        if not value:
            return []
        return filter(lambda x: x is not None, value)


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
