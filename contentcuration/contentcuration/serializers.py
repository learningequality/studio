import json
from collections import OrderedDict

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from contentcuration.models import Channel


def no_field_eval_repr(self):
    """
    DRF's default __repr__ implementation prints out all fields, and in the process
    of that can evaluate querysets. If those querysets haven't yet had filters applied,
    this will lead to full table scans, which are a big no-no if you like running servers.
    """
    return "{} object".format(self.__class__.__name__)


# We have to monkey patch because DRF has some internal logic that returns a
# ListSerializer object when a Serializer-derived object is requested if many=True.
# Monkey-patching also means we don't have to worry about missing any serializers, tho. :)
serializers.ListSerializer.__repr__ = no_field_eval_repr
serializers.ModelSerializer.__repr__ = no_field_eval_repr


class PublicChannelSerializer(serializers.ModelSerializer):
    """
    Called by the public API, primarily used by Kolibri. Contains information more specific to Kolibri's needs.
    """
    kind_count = serializers.SerializerMethodField('generate_kind_count')
    matching_tokens = serializers.SerializerMethodField('match_tokens')
    icon_encoding = serializers.SerializerMethodField('get_thumbnail_encoding')
    version_notes = serializers.SerializerMethodField('sort_published_data')

    @staticmethod
    def get_channel_primary_token(channel):
        try:
            token = channel.get_human_token().token
        except ObjectDoesNotExist:
            return channel.pk

        return "-".join([token[:5], token[5:]])

    @staticmethod
    def generate_thumbnail_url(channel):
        return channel.get_thumbnail()

    @staticmethod
    def check_for_changes(channel):
        return channel.main_tree and channel.main_tree.get_descendants().filter(changed=True).exists()

    @staticmethod
    def get_resource_count(channel):
        return channel.get_resource_count()

    @staticmethod
    def get_date_created(channel):
        return channel.main_tree.created

    @staticmethod
    def get_date_modified(channel):
        return channel.get_date_modified()

    @staticmethod
    def check_published(channel):
        return channel.main_tree.published

    @staticmethod
    def check_publishing(channel):
        return channel.main_tree.publishing

    @staticmethod
    def match_tokens(channel):
        tokens = json.loads(channel.tokens) if hasattr(channel, 'tokens') else []
        return list(channel.secret_tokens.filter(token__in=tokens).values_list('token', flat=True))

    @staticmethod
    def get_thumbnail_encoding(channel):
        """
        Historically, we did not set channel.icon_encoding in the Studio database. We
        only set it in the exported Kolibri sqlite db. So when Kolibri asks for the channel
        information, fall back to the channel thumbnail data if icon_encoding is not set.
        """
        if channel.icon_encoding:
            return channel.icon_encoding
        elif channel.thumbnail_encoding:
            base64 = channel.thumbnail_encoding.get('base64')
            if base64:
                return base64

        return None

    @staticmethod
    def generate_kind_count(channel):
        return channel.published_kind_count and json.loads(channel.published_kind_count)

    @staticmethod
    def sort_published_data(channel):
        data = {int(k): v['version_notes'] for k, v in channel.published_data.items()}
        return OrderedDict(sorted(data.items()))

    class Meta:
        model = Channel
        fields = ('id', 'name', 'language', 'included_languages', 'description', 'total_resource_count', 'version',
                  'kind_count', 'published_size', 'last_published', 'icon_encoding', 'matching_tokens', 'public',
                  'version_notes')


class SimplifiedChannelProbeCheckSerializer(serializers.ModelSerializer):
    """ Used for channel list dropdown on channel prober checks """

    class Meta:
        model = Channel
        fields = ('id', 'name', 'description', 'thumbnail', 'main_tree')


class GetTreeDataSerializer(serializers.Serializer):
    """
    Used by get_*_tree_data endpoints to ontain "lightweight" tree data.
    """
    channel_id = serializers.CharField(required=True)
    tree = serializers.CharField(required=False, default='main')
    node_id = serializers.CharField(required=False)
