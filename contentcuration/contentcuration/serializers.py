import json
from collections import OrderedDict

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from rest_framework_bulk import BulkSerializerMixin

from contentcuration.celery import app
from contentcuration.models import Channel
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import FileFormat
from contentcuration.models import FormatPreset
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.models import SlideshowSlide
from contentcuration.models import Task


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


class LicenseSerializer(serializers.ModelSerializer):

    class Meta:
        model = License
        fields = ('license_name', 'exists', 'id', 'license_url', 'license_description', 'copyright_holder_required', 'is_custom')


class LanguageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    ietf_name = serializers.SerializerMethodField('generate_ietf_name')

    def generate_ietf_name(self, language):
        return str(language)

    class Meta:
        model = Language
        fields = ('lang_code', 'lang_subcode', 'id', 'readable_name', 'ietf_name', 'native_name')


class FileFormatSerializer(serializers.ModelSerializer):

    class Meta:
        model = FileFormat
        fields = ("__all__")


class FormatPresetSerializer(serializers.ModelSerializer):
    associated_mimetypes = serializers.SerializerMethodField('retrieve_mimetypes')
    # Handles multi-language content (Backbone won't allow duplicate ids in collection, so name retains id)
    name = serializers.SerializerMethodField('retrieve_name')

    def retrieve_mimetypes(self, preset):
        return preset.allowed_formats.values_list('mimetype', flat=True)

    def retrieve_name(self, preset):
        return preset.id

    class Meta:
        model = FormatPreset
        fields = (
            'id', 'name', 'readable_name', 'multi_language', 'supplementary', 'thumbnail', 'subtitle', 'order', 'kind',
            'allowed_formats', 'associated_mimetypes', 'display')


class ContentKindSerializer(serializers.ModelSerializer):
    associated_presets = serializers.SerializerMethodField('retrieve_associated_presets')

    def retrieve_associated_presets(self, kind):
        return list(FormatPreset.objects.filter(kind=kind).values())

    class Meta:
        model = ContentKind
        fields = ("kind", 'associated_presets')


class TagSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentTag
        fields = ('tag_name', 'channel', 'id')


class SlideshowSlideSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    contentnode = serializers.PrimaryKeyRelatedField(queryset=ContentNode.objects.all())
    id = serializers.IntegerField(required=False)

    class Meta:
        model = SlideshowSlide
        fields = ('id', 'sort_order', 'metadata', 'contentnode')


class PublicChannelSerializer(serializers.ModelSerializer):
    """
    Called by the public API, primarily used by Kolibri. Contains information more specific to Kolibri's needs.
    """
    kind_count = serializers.SerializerMethodField('generate_kind_count')
    matching_tokens = serializers.SerializerMethodField('match_tokens')
    icon_encoding = serializers.SerializerMethodField('get_thumbnail_encoding')
    version_notes = serializers.SerializerMethodField('sort_published_data')

    def get_channel_primary_token(self, channel):
        try:
            token = channel.get_human_token().token
        except ObjectDoesNotExist:
            return channel.pk

        return "-".join([token[:5], token[5:]])

    def generate_thumbnail_url(self, channel):
        return channel.get_thumbnail()

    def check_for_changes(self, channel):
        return channel.main_tree and channel.main_tree.get_descendants().filter(changed=True).exists()

    def get_resource_count(self, channel):
        return channel.get_resource_count()

    def get_date_created(self, channel):
        return channel.main_tree.created

    def get_date_modified(self, channel):
        return channel.get_date_modified()

    def check_published(self, channel):
        return channel.main_tree.published

    def check_publishing(self, channel):
        return channel.main_tree.publishing

    def match_tokens(self, channel):
        tokens = json.loads(channel.tokens) if hasattr(channel, 'tokens') else []
        return list(channel.secret_tokens.filter(token__in=tokens).values_list('token', flat=True))

    def get_thumbnail_encoding(self, channel):
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

    def generate_kind_count(self, channel):
        return channel.published_kind_count and json.loads(channel.published_kind_count)

    def sort_published_data(self, channel):
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


class TaskSerializer(serializers.ModelSerializer):
    metadata = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    def get_status(self, task):
        # If CELERY_TASK_ALWAYS_EAGER is set, attempts to retrieve state will assert, so do a sanity
        # check first.
        if not settings.CELERY_TASK_ALWAYS_EAGER:
            result = app.AsyncResult(task.task_id)
            if result and result.status:
                return result.status

        return task.status

    def get_metadata(self, task):
        metadata = task.metadata
        # If CELERY_TASK_ALWAYS_EAGER is set, attempts to retrieve state will assert, so do a sanity check first.
        if not settings.CELERY_TASK_ALWAYS_EAGER:
            result = app.AsyncResult(task.task_id)

            # Just flagging this, but this appears to be the correct way to get task metadata,
            # even though the API is marked as private.
            meta = result._get_task_meta()
            if meta and 'result' in meta and meta['result'] and 'progress' in meta['result']:
                metadata['progress'] = meta['result']['progress']

        return metadata

    class Meta:
        model = Task
        fields = ('id', 'task_id', 'task_type', 'created', 'status', 'is_progress_tracking', 'user', 'metadata')
