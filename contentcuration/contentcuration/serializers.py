from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin

class LicenseSerializer(serializers.ModelSerializer):
    class Meta: 
        model = License
        fields = ('license_name', 'exists', 'id')

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ('name', 'description', 'editors', 'id', 'draft', 'clipboard', 'deleted', 'published','channel_id')

class TopicTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicTree
        fields = ('name', 'channel', 'root_node', 'id')

class FileSerializer(serializers.ModelSerializer):
    content_copy = serializers.FileField(use_url=False)
 
    def get(*args, **kwargs):
         return super.get(*args, **kwargs)
    class Meta:
        model = File
        fields = ('checksum', 'extension', 'file_size', 'content_copy', 'id', 'available', 'format')

class FormatPresetSerializer(serializers.ModelSerializer):
   # files = FileSerializer(many=True, read_only=True)

   class Meta:
        model = Format
        fields = ('id', 'readable_name', 'multi_language', 'supplementary', 'order', 'kind', 'allowed_formats')

class ContentNodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    preset = FormatPresetSerializer(many=True, read_only=True)

    class Meta:
        model = ContentNode
        fields = ('title', 'published', 'total_file_size', 'id', 'description', 'published',
                  'sort_order', 'license_owner', 'license', 'kind', 'children', 'parent', 'content_id',
                  'preset', 'original_filename')

class TagSerializer(serializers.ModelSerializer):
   class Meta:
    model = ContentTag
    fields = ('tag_name', 'tag_type', 'id') 

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
