from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin

class LicenseSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentLicense
        fields = ('name', 'id')

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ('name', 'description', 'editors', 'id', 'draft', 'clipboard', 'deleted', 'published','channel_id')

class TopicTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicTree
        fields = ('name', 'channel', 'root_node', 'id')

class NodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ('title', 'published', 'total_file_size', 'id', 'description', 'published', 
                  'sort_order', 'license_owner', 'license', 'kind', 'children', 'parent', 'content_id')

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ('checksum', 'extension', 'file_size', 'content_copy', 'id', 'available', 'format')

class FormatSerializer(serializers.ModelSerializer):
   class Meta:
    model = Format
    fields = ('format_size', 'quality', 'contentmetadata', 'available', 'mimetype', 'id') 

class MimeTypeSerializer(serializers.ModelSerializer):
   class Meta:
    model = MimeType
    fields = ('readable_name', 'machine_name', 'id') 

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ('title', 'description', 'id')

class AssessmentItemSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    exercise = serializers.PrimaryKeyRelatedField(queryset=Exercise.objects.all())

    class Meta:
        model = AssessmentItem
        fields = ('question', 'type', 'answers', 'id', 'exercise')
        list_serializer_class = BulkListSerializer
