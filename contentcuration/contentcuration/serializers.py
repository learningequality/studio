from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers

class ContentSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentNode
        # TODO: content_file
        fields = ('created', 'modified', 'parent', 'name', 'published', 'sort_order',
                  'author', 'license_owner', 'license')

class TopicSerializer(serializers.ModelSerializer):
    class Meta: 
        model = TopicNode
        fields = ('created', 'modified', 'parent', 'name', 'published', 'sort_order',
                  'color1', 'color2', 'color3')

class LicenseSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentLicense
        fields = ('name')
