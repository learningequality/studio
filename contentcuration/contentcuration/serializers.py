from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers

class ContentSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentNode
        # TODO: content_file
        fields = (author, license_owner, license)

class TopicSerializer(serializers.ModelSerializer):
    class Meta: 
        model = TopicNode
        fields = (color1, color2, color3)
