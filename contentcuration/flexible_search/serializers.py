from contentcuration import models as cc_models
from rest_framework import serializers


class ContentSearchResultSerializer(serializers.ModelSerializer):

    class Meta:
        model = cc_models.ContentNode
        fields = (
            'id',
            'original_channel_id',
            'source_channel_id',
            'title',
            'kind',
            'tags',
            'children',
            'tree_id'
        )
