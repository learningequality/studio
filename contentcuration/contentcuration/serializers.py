from contentcuration.models import *    # TODO: Change this later?
from rest_framework import serializers

class ContentSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContentNode
        # TODO: content_file
        fields = (author, license_owner, license)

class ContentLicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentLicense
        fields = (name)
