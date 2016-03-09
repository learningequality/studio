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
        fields = ('name', 'description', 'editors', 'id', 'draft', 'clipboard', 'deleted', 'published')

class TopicTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicTree
        fields = ('name', 'channel', 'root_node', 'id')

class NodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ('title', 'published', 'total_file_size', 'id', 'description', 'published', 
                  'sort_order', 'license_owner', 'license', 'kind', 'children', 'parent')


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
