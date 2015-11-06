from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin

class ContentSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentNode
        # TODO: content_file
        fields = ('created', 'modified', 'parent', 'title', 'published', 'sort_order',
                  'author', 'license_owner', 'license', 'id')

class TopicSerializer(serializers.ModelSerializer):
    class Meta: 
        model = TopicNode
        fields = ('created', 'modified', 'parent', 'title', 'description', 'sort_order',
                  'color1', 'color2', 'color3', 'id')

class LicenseSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentLicense
        fields = ('name', 'id')

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ('name', 'description', 'editors', 'id')

class TopicTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicTree
        fields = ('name', 'channel', 'root_node', 'id')

class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ('name', 'published', 'deleted', 'id')


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
