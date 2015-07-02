from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers

class ContentSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentNode
        # TODO: content_file
        fields = ('created', 'modified', 'parent', 'title', 'published', 'sort_order',
                  'author', 'license_owner', 'license')

class TopicSerializer(serializers.ModelSerializer):
    class Meta: 
        model = TopicNode
        fields = ('created', 'modified', 'parent', 'title', 'description', 'sort_order',
                  'color1', 'color2', 'color3')

class LicenseSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentLicense
        fields = ('name')

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ('name', 'description', 'primary_topic_tree')

class TopicTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicTree
        fields = ('name', 'editors')