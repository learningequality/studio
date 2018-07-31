import json
import math
import zlib
from collections import OrderedDict
from itertools import chain

import minio
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError, PermissionDenied
from django.core.files import File as DjFile
from django.db import transaction
from django.db.models import Q, Max
from le_utils.constants import licenses, roles
from django.utils.translation import ugettext as _
from minio.error import ResponseError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import set_value, SkipField
from rest_framework.settings import api_settings
from rest_framework.utils import model_meta
from rest_framework_bulk import BulkSerializerMixin

from contentcuration.models import *
from contentcuration.statistics import record_node_addition_stats, record_action_stats
from contentcuration.utils.format import format_size
from le_utils.constants import licenses

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
    # files = FileSerializer(many=True, read_only=True)
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


class FileListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        ret = []
        update_files = {}
        user = self.context['request'].user
        with transaction.atomic():
            for item in validated_data:
                item.update({
                    'preset_id': item['preset']['id'],
                    'language_id': item.get('language')['id'] if item.get('language') else None
                })

                # User should not be able to change files without a display
                if item['preset']['display']:
                    if 'id' in item:
                        update_files[item['id']] = item
                    else:
                        # create new nodes
                        ret.append(File.objects.create(**item))
                item.pop('preset', None)
                item.pop('language', None)

        files_to_delete = []
        nodes_to_parse = []
        current_files = [f['id'] for f in validated_data]

        # Get files that have the same contentnode, preset, and language as the files that are now attached to this node
        for file_obj in validated_data:
            delete_queryset = File.objects.filter(
                Q(contentnode=file_obj['contentnode']) &  # Get files that are associated with this node
                (Q(preset_id=file_obj['preset_id']) | Q(
                    preset=None)) &  # Look at files that have the same preset as this file
                Q(language_id=file_obj.get('language_id')) &  # Look at files with the same language as this file
                ~Q(id=file_obj['id'])  # Remove the file if it's not this file
            )
            files_to_delete += [f for f in delete_queryset.all()]
            if file_obj['contentnode'] not in nodes_to_parse:
                nodes_to_parse.append(file_obj['contentnode'])

        # Delete removed files
        for node in nodes_to_parse:
            previous_files = node.files.all()
            for f in previous_files:
                if f.id not in current_files:
                    files_to_delete.append(f)

        for to_delete in files_to_delete:
            to_delete.delete()

        if update_files:
            with transaction.atomic():
                for file_id, data in update_files.items():
                    file_obj, _new = File.objects.get_or_create(pk=file_id)

                    # potential optimization opportunity
                    for attr, value in data.items():
                        if attr != "preset" and attr != "language":
                            setattr(file_obj, attr, value)
                    file_path = generate_object_storage_name(file_obj.checksum, str(file_obj))

                    if not default_storage.exists(file_path):
                        raise OSError("Error: file {} was not found".format(str(file_obj)))

                    file = default_storage.open(file_path)
                    file_obj.file_on_disk = file

                    file_obj.uploaded_by = file_obj.uploaded_by or user
                    file_obj.save()
                    ret.append(file_obj)
        return ret


class FileSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    file_on_disk = serializers.SerializerMethodField('get_file_url')
    storage_url = serializers.SerializerMethodField('retrieve_storage_url')
    mimetype = serializers.SerializerMethodField('retrieve_extension')
    language = LanguageSerializer(many=False, required=False, allow_null=True)
    display_name = serializers.SerializerMethodField('retrieve_display_name')
    id = serializers.CharField(required=False)
    preset = FormatPresetSerializer(many=False)

    def get(*args, **kwargs):
        return super.get(*args, **kwargs)

    def get_file_url(self, obj):
        return obj.file_on_disk.url

    def retrieve_storage_url(self, obj):
        return generate_storage_url(str(obj))

    def retrieve_extension(self, obj):
        return obj.file_format.mimetype

    def retrieve_display_name(self, obj):
        preset = obj.preset.readable_name if obj.preset else ""
        language = " ({})".format(obj.language.readable_name) if obj.language else ""
        return "{}{}".format(preset, language)

    class Meta:
        model = File
        fields = (
            'id', 'checksum', 'display_name', 'file_size', 'language', 'file_on_disk', 'contentnode', 'file_format',
            'preset', 'original_filename', 'storage_url', 'mimetype', 'source_url')
        list_serializer_class = FileListSerializer


class ContentKindSerializer(serializers.ModelSerializer):
    associated_presets = serializers.SerializerMethodField('retrieve_associated_presets')

    def retrieve_associated_presets(self, kind):
        return FormatPreset.objects.filter(kind=kind).values()

    class Meta:
        model = ContentKind
        fields = ("kind", 'associated_presets')


class CustomListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        update_nodes = {}
        tag_mapping = {}
        prerequisite_mapping = {}
        ret = []
        unformatted_input_tags = []

        with transaction.atomic():
            for item in validated_data:
                item_tags = item.get('tags')

                unformatted_input_tags += item.pop('tags')
                if 'id' in item:
                    update_nodes[item['id']] = item
                    tag_mapping[item['id']] = item_tags
                    prerequisite_mapping.update({item['id']: item.pop('prerequisite')})
                else:
                    # create new nodes
                    new_node = ContentNode.objects.create(**item)
                    ret.append(new_node)
                    prerequisite_mapping.update({new_node.pk: item.pop('prerequisite')})


        # get all ContentTag objects, if doesn't exist, create them.
        all_tags = []
        for tag_data in unformatted_input_tags:
            # when deleting nodes, tag_data is a dict, but when adding nodes, it's a unicode string
            if isinstance(tag_data, unicode):
                tag_data = json.loads(tag_data)
            tag_tuple = ContentTag.objects.get_or_create(tag_name=tag_data['tag_name'], channel_id=tag_data['channel'])
            all_tags.append(tag_tuple[0])

        if ret:
            # new nodes and tags have been created, now add tags to them
            bulk_adding_list = []
            ThroughModel = ContentNode.tags.through
            for tag in all_tags:
                for node in ret:
                    bulk_adding_list.append(ThroughModel(node_id=node.pk, contenttag_id=tag.pk))
            ThroughModel.objects.bulk_create(bulk_adding_list)

        # Perform updates.
        if update_nodes:
            record_node_addition_stats(update_nodes, ContentNode.objects.get(id=update_nodes.itervalues().next()['id']),
                                       self.context['request'].user.id)
            with transaction.atomic():
                with ContentNode.objects.delay_mptt_updates():
                    for node_id, data in update_nodes.items():
                        node, is_new = ContentNode.objects.get_or_create(pk=node_id)

                        taglist = []
                        for tag_data in tag_mapping.get(node_id, None):
                            # when deleting nodes, tag_data is a dict, but when adding nodes, it's a unicode string
                            if isinstance(tag_data, unicode):
                                tag_data = json.loads(tag_data)

                            # this requires optimization
                            for tag_itm in all_tags:
                                if tag_itm.tag_name == tag_data['tag_name'] \
                                        and tag_itm.channel_id == tag_data['channel']:
                                    taglist.append(tag_itm)

                        # Detect if model has been moved to a different tree
                        if node.pk is not None:
                            original = ContentNode.objects.get(pk=node.pk)
                            if original.parent_id and original.parent_id != node.parent_id:
                                original_parent = ContentNode.objects.get(pk=original.parent_id)
                                original_parent.changed = True
                                original_parent.save()

                        # potential optimization opportunity
                        for attr, value in data.items():
                            setattr(node, attr, value)
                        node.tags = taglist

                        node.save(request=self.context['request'])

                        PrerequisiteContentRelationship.objects.filter(target_node_id=node_id).delete()
                        for prereq_node in prerequisite_mapping.get(node_id) or []:
                            PrerequisiteContentRelationship.objects.get_or_create(target_node_id=node_id, prerequisite_id=prereq_node.id)
                        node.save(request=self.context['request'])
                        ret.append(node)
        return ret


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentTag
        fields = ('tag_name', 'channel', 'id')


class AssessmentListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        ret = []
        file_mapping = {}

        with transaction.atomic():
            for item in validated_data:
                files = item.pop('files', [])  # Remove here to avoid problems with setting attributes

                # Handle existing items
                if 'id' in item:
                    aitem, is_new = AssessmentItem.objects.get_or_create(pk=item['id'])
                    if item['deleted']:
                        aitem.delete()
                        continue
                    else:
                        # Set attributes for assessment item
                        for attr, value in item.items():
                            setattr(aitem, attr, value)
                        aitem.save()
                else:
                    # Create item
                    aitem = AssessmentItem.objects.create(**item)

                for f in files:
                    if f.checksum in str(aitem.__dict__):
                        if f.assessment_item_id != aitem.pk:
                            f.assessment_item = aitem
                            f.save()
                    else:
                        f.delete()

                ret.append(aitem)

        return ret


class AssessmentItemSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    contentnode = serializers.PrimaryKeyRelatedField(queryset=ContentNode.objects.all())
    id = serializers.IntegerField(required=False)

    class Meta:
        model = AssessmentItem
        fields = ('id', 'question', 'files', 'type', 'answers', 'contentnode', 'assessment_id',
                  'hints', 'raw_data', 'order', 'source_url', 'randomize', 'deleted')
        list_serializer_class = AssessmentListSerializer


class SimplifiedContentNodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    prerequisite = serializers.PrimaryKeyRelatedField(many=True, queryset=ContentNode.objects.all())
    is_prerequisite_of = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    metadata = serializers.SerializerMethodField('retrieve_metadata')
    parent_title = serializers.SerializerMethodField('retrive_parent_title')
    ancestors = serializers.SerializerMethodField('get_node_ancestors')

    def retrive_parent_title(self, node):
        return node.parent and node.parent.title

    def retrieve_metadata(self, node):
        if node.kind_id == content_kinds.TOPIC:
            # descendants = node.get_descendants(include_self=True)
            # aggregated = descendants.aggregate(resource_size=Sum('files__file_size'), assessment_size=Sum('assessment_items__files__file_size'))
            return {
                "total_count": node.get_descendant_count(),
                "resource_count": node.get_descendants().exclude(kind=content_kinds.TOPIC).count(),
                "coach_count": node.get_descendants().filter(role_visibility=roles.COACH).count(),
                # "resource_size" : (aggregated.get('resource_size') or 0) + (aggregated.get('assessment_size') or 0),
            }
        else:
            # assessment_size = node.assessment_items.aggregate(resource_size=Sum('files__file_size'))['resource_size'] or 0
            # resource_size = node.files.aggregate(resource_size=Sum('file_size')).get('resource_size') or 0
            return {
                "total_count": 1,
                "resource_count": 1,
            }

    @staticmethod
    def setup_eager_loading(queryset):
        """ Perform necessary eager loading of data. """
        queryset = queryset.prefetch_related('children').prefetch_related('files').prefetch_related('assessment_items')
        return queryset

    def to_internal_value(self, data):
        """
        In order to be able to handle passing tag_name in array,
        we need to overwrite this method to bypass run_validation for tags
        """
        if not isinstance(data, dict):
            message = self.error_messages['invalid'].format(
                datatype=type(data).__name__
            )
            raise ValidationError({
                api_settings.NON_FIELD_ERRORS_KEY: [message]
            })

        ret = OrderedDict()
        errors = OrderedDict()
        fields = self._writable_fields

        for field in fields:
            validate_method = getattr(self, 'validate_' + field.field_name, None)
            primitive_value = field.get_value(data)
            try:
                if field.field_name != 'tags':
                    validated_value = field.run_validation(primitive_value)
                else:
                    validated_value = primitive_value

                if validate_method is not None:
                    validated_value = validate_method(validated_value)
            except ValidationError as exc:
                errors[field.field_name] = exc.detail
            except DjangoValidationError as exc:
                errors[field.field_name] = list(exc.messages)
            except SkipField:
                pass
            else:
                set_value(ret, field.source_attrs, validated_value)

        if errors:
            raise ValidationError(errors)

        return ret

    def create(self, validated_data):
        ModelClass = self.Meta.model
        info = model_meta.get_field_info(ModelClass)
        many_to_many = {}
        for field_name, relation_info in info.relations.items():
            if relation_info.to_many and (field_name in validated_data):
                many_to_many[field_name] = validated_data.pop(field_name)

        try:
            instance = ModelClass.objects.create(**validated_data)
        except TypeError as exc:
            msg = (
                'Got a `TypeError` when calling `%s.objects.create()`. '
                'This may be because you have a writable field on the '
                'serializer class that is not a valid argument to '
                '`%s.objects.create()`. You may need to make the field '
                'read-only, or override the %s.create() method to handle '
                'this correctly.\nOriginal exception text was: %s.' %
                (
                    ModelClass.__name__,
                    ModelClass.__name__,
                    self.__class__.__name__,
                    exc
                )
            )
            raise TypeError(msg)

        # Save many-to-many relationships after the instance is created.
        if self.validated_data['tags']:
            tag_list = []
            for tag in self.validated_data['tags']:
                # tag_list.append(ContentTag.objects.get_or_create(tag_name=tag['tag_name'])[0])
                tag_list.append(ContentTag.objects.get_or_create(tag_name=tag)[0])
            setattr(instance, 'tags', tag_list)
            many_to_many.pop('tags')

        if many_to_many:
            for field_name, value in many_to_many.items():
                setattr(instance, field_name, value)

        instance.save()

        return instance

    def update(self, instance, validated_data):
        """
        Since we are not doing anything crazy about the nested writable field(tags here),
        so just bypass the raise_errors_on_nested_writes().
        This may need to change in the future when we need to do crazy things on nested writable field.
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def get_node_ancestors(self, node):
        return node.get_ancestors().values_list('id', flat=True)

    class Meta:
        model = ContentNode
        fields = ('title', 'id', 'sort_order', 'kind', 'children', 'parent', 'metadata', 'content_id', 'prerequisite',
                  'is_prerequisite_of', 'parent_title', 'ancestors', 'tree_id', 'language', 'role_visibility')


""" Shared methods across content node serializers """
class ContentNodeFieldMixin(object):

    def get_creators(self, descendants):
        creators = descendants.values_list('copyright_holder', 'author', 'aggregator', 'provider')
        split_lst = zip(*creators)

        return {
            "copyright_holders": filter(lambda x: x, set(split_lst[0])) if len(split_lst) > 0 else [],
            "authors": filter(lambda x: x, set(split_lst[1])) if len(split_lst) > 1 else [],
            "aggregators": filter(lambda x: x, set(split_lst[2])) if len(split_lst) > 2 else [],
            "providers": filter(lambda x: x, set(split_lst[3])) if len(split_lst) > 3 else [],
        }


class RootNodeSerializer(SimplifiedContentNodeSerializer, ContentNodeFieldMixin):
    channel_name = serializers.SerializerMethodField('retrieve_channel_name')

    def retrieve_metadata(self, node):
        descendants = node.get_descendants()
        data = {
            "total_count": node.get_descendant_count(),
            "resource_count": descendants.exclude(kind_id=content_kinds.TOPIC).count(),
            "max_sort_order": node.children.aggregate(max_sort_order=Max('sort_order'))['max_sort_order'] or 1,
            "resource_size": 0,
            "has_changed_descendant": descendants.filter(changed=True).exists(),
        }
        data.update(self.get_creators(descendants))
        return data

    def retrieve_channel_name(self, node):
        channel = node.get_channel()
        return channel.name if channel else None

    class Meta:
        model = ContentNode
        fields = ('title', 'id', 'kind', 'children', 'metadata', 'published', 'publishing', 'node_id', 'channel_name',
                  'prerequisite', 'is_prerequisite_of', 'parent_title', 'ancestors', 'tree_id', 'role_visibility')


class ContentNodeSerializer(SimplifiedContentNodeSerializer, ContentNodeFieldMixin):
    ancestors = serializers.SerializerMethodField('get_node_ancestors')
    valid = serializers.SerializerMethodField('check_valid')
    associated_presets = serializers.SerializerMethodField('retrieve_associated_presets')
    original_channel = serializers.SerializerMethodField('retrieve_original_channel')

    def retrieve_associated_presets(self, node):
        return node.get_associated_presets()

    def check_valid(self, node):
        isoriginal = node.node_id == node.original_source_node_id
        if node.kind_id == content_kinds.TOPIC:
            return True
        elif isoriginal and not node.license:
            return False
        elif isoriginal and node.license.copyright_holder_required and not node.copyright_holder:
            return False
        elif isoriginal and node.license.is_custom and not node.license_description:
            return False
        elif node.kind_id == content_kinds.EXERCISE:
            for aitem in node.assessment_items.exclude(type=exercises.PERSEUS_QUESTION):
                answers = json.loads(aitem.answers)
                correct_answers = filter(lambda a: a['correct'], answers)
                if aitem.question == "" or len(answers) == 0 or len(correct_answers) == 0 or \
                        any(filter(lambda a: a['answer'] == "", answers)) or \
                        (aitem.type == exercises.SINGLE_SELECTION and len(correct_answers) > 1) or \
                        any(filter(lambda h: h['hint'] == "", json.loads(aitem.hints))):
                    return False
            return True
        else:
            return node.files.filter(preset__supplementary=False).exists()

    def retrieve_metadata(self, node):
        if node.kind_id == content_kinds.TOPIC:
            descendants = node.get_descendants(include_self=True)
            data = {
                "total_count": node.get_descendant_count(),
                "resource_count": descendants.exclude(kind=content_kinds.TOPIC).count(),
                "max_sort_order": node.children.aggregate(max_sort_order=Max('sort_order'))['max_sort_order'] or 1,
                "resource_size": 0,  # Make separate request
                "has_changed_descendant": descendants.filter(changed=True).exists(),
                "coach_count": descendants.filter(role_visibility=roles.COACH).count(),
            }

            if not node.parent: # Add extra data to root node
                data.update(self.get_creators(descendants))

            return data

        else:
            assessment_size = node.assessment_items.values('files__checksum', 'files__file_size').distinct()\
                            .aggregate(resource_size=Sum('files__file_size')).get('resource_size') or 0
            resource_size = node.files.values('file_size', 'checksum').distinct()\
                            .aggregate(resource_size=Sum('file_size')).get('resource_size') or 0
            resource_count = 1
            if node.kind_id == content_kinds.EXERCISE:
                resource_count = node.assessment_items.filter(deleted=False).count()

            return {
                "total_count": 1,
                "resource_count": resource_count,
                "max_sort_order": node.sort_order,
                "resource_size": assessment_size + resource_size,
                "has_changed_descendant": node.changed,
            }

    def retrieve_original_channel(self, node):
        channel_id = node.original_channel_id
        channel = channel_id and Channel.objects.get(pk=channel_id)

        return {
            "id": channel.pk,
            "name": channel.name,
            "thumbnail_url": channel.get_thumbnail(),
        } if (channel and not channel.deleted) else None

    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = ('title', 'changed', 'id', 'description', 'sort_order', 'author', 'copyright_holder', 'license','language',
                  'license_description', 'assessment_items', 'files', 'parent_title', 'ancestors', 'modified', 'original_channel',
                  'kind', 'parent', 'children', 'published', 'associated_presets', 'valid', 'metadata', 'original_source_node_id',
                  'tags', 'extra_fields', 'prerequisite', 'is_prerequisite_of', 'node_id', 'tree_id', 'publishing', 'freeze_authoring_data',
                  'role_visibility', 'provider', 'aggregator')


class ContentNodeEditSerializer(ContentNodeSerializer):
    files = FileSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True)
    assessment_items = AssessmentItemSerializer(many=True, read_only=True)

    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = ('title', 'changed', 'id', 'description', 'sort_order', 'author', 'copyright_holder', 'license', 'language',
                  'node_id', 'license_description', 'assessment_items', 'files', 'parent_title', 'content_id', 'modified',
                  'kind', 'parent', 'children', 'published', 'associated_presets', 'valid', 'metadata', 'ancestors', 'tree_id',
                  'tags', 'extra_fields', 'original_channel', 'prerequisite', 'is_prerequisite_of', 'thumbnail_encoding',
                  'freeze_authoring_data', 'publishing', 'original_source_node_id', 'role_visibility', 'provider', 'aggregator')

class ContentNodeCompleteSerializer(ContentNodeEditSerializer):
    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = (
            'title', 'changed', 'id', 'description', 'sort_order', 'author', 'node_id', 'copyright_holder', 'license',
            'license_description', 'kind', 'prerequisite', 'is_prerequisite_of', 'parent_title', 'ancestors', 'language',
            'original_channel', 'original_source_node_id', 'source_node_id', 'content_id', 'original_channel_id',
            'source_channel_id', 'source_id', 'source_domain', 'thumbnail_encoding', 'publishing',
            'children', 'parent', 'tags', 'created', 'modified', 'published', 'extra_fields', 'assessment_items',
            'files', 'valid', 'metadata', 'tree_id', 'freeze_authoring_data', 'role_visibility', 'provider', 'aggregator')


class TokenSerializer(serializers.ModelSerializer):
    """ Serializer for channel tokens """
    display_token = serializers.SerializerMethodField('generate_token')

    def generate_token(self, token):
        # Break channel tokens into two groups for easier processing
        return "{}-{}".format(token.token[:5], token.token[5:])

    class Meta:
        model = SecretToken
        fields = ('display_token', 'token')



""" Shared methods across channel serializers """
class ChannelFieldMixin(object):

    def get_channel_primary_token(self, channel):
        if channel.secret_tokens.filter(is_primary=True).exists():
            token = channel.secret_tokens.filter(is_primary=True).first().token
            return token[:5] + '-' + token[5:]
        else:
            return channel.pk

    def generate_thumbnail_url(self, channel):
        if channel.thumbnail and 'static' not in channel.thumbnail:
            return generate_storage_url(channel.thumbnail)
        return '/static/img/kolibri_placeholder.png'

    def check_for_changes(self, channel):
        return channel.main_tree and channel.main_tree.get_descendants().filter(changed=True).count() > 0

    def get_resource_count(self, channel):
        return channel.main_tree.get_descendants().exclude(kind_id=content_kinds.TOPIC).count()

    def get_date_created(self, channel):
        return channel.main_tree.created

    def get_date_modified(self, channel):
        return channel.main_tree.get_descendants(include_self=True).aggregate(last_modified=Max('modified'))['last_modified']

    def check_published(self, channel):
        return channel.main_tree.published

    def check_publishing(self, channel):
        return channel.main_tree.publishing

    def generate_thumbnail_url(self, channel):
        if channel.thumbnail and 'static' not in channel.thumbnail:
            return generate_storage_url(channel.thumbnail)
        return '/static/img/kolibri_placeholder.png'


class ChannelSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    has_changed = serializers.SerializerMethodField('check_for_changes')
    main_tree = RootNodeSerializer(read_only=True)
    staging_tree = RootNodeSerializer(read_only=True)
    trash_tree = RootNodeSerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField('generate_thumbnail_url')
    created = serializers.SerializerMethodField('get_date_created')
    updated = serializers.SerializerMethodField('get_date_updated')
    tags = TagSerializer(many=True, read_only=True)
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')
    content_defaults = serializers.JSONField()

    def get_date_created(self, channel):
        return channel.main_tree.created.strftime("%X %x")

    def get_date_updated(self, channel):
        return channel.staging_tree.created.strftime("%X %x") if channel.staging_tree else None

    @staticmethod
    def setup_eager_loading(queryset):
        """ Perform necessary eager loading of data. """
        queryset = queryset.select_related('main_tree')
        return queryset

    class Meta:
        model = Channel
        fields = (
            'id', 'created', 'updated', 'name', 'description', 'has_changed', 'editors', 'main_tree', 'trash_tree',
            'staging_tree', 'source_id', 'source_domain', 'ricecooker_version', 'thumbnail', 'version', 'deleted',
            'public', 'thumbnail_url','thumbnail_encoding', 'pending_editors', 'viewers', 'tags', 'content_defaults',
            'language', 'primary_token', 'priority', 'published_size')


class AccessibleChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    size = serializers.SerializerMethodField("get_resource_size")
    count = serializers.SerializerMethodField("get_resource_count")
    created = serializers.SerializerMethodField('get_date_created')
    main_tree = RootNodeSerializer(read_only=True)

    def get_resource_size(self, channel):
        return channel.get_resource_size()

    class Meta:
        model = Channel
        fields = ('id', 'created', 'name', 'size', 'count', 'version', 'deleted', 'main_tree')


class ChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField('generate_thumbnail_url')
    published = serializers.SerializerMethodField('check_published')
    publishing = serializers.SerializerMethodField('check_publishing')
    count = serializers.SerializerMethodField("get_resource_count")
    created = serializers.SerializerMethodField('get_date_created')
    modified = serializers.SerializerMethodField('get_date_modified')
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')
    content_defaults = serializers.JSONField()

    def generate_thumbnail_url(self, channel):
        if channel.thumbnail and 'static' not in channel.thumbnail:
            return generate_storage_url(channel.thumbnail)
        return '/static/img/kolibri_placeholder.png'

    class Meta:
        model = Channel
        fields = ('id', 'created', 'name', 'published', 'pending_editors', 'editors', 'viewers', 'modified', 'language', 'primary_token', 'priority',
                  'description', 'count', 'version', 'public', 'thumbnail_url', 'thumbnail', 'thumbnail_encoding', 'deleted', 'content_defaults', 'publishing')

class AltChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField('generate_thumbnail_url')
    published = serializers.SerializerMethodField('check_published')
    publishing = serializers.SerializerMethodField('check_publishing')
    count = serializers.SerializerMethodField("get_resource_count")
    created = serializers.SerializerMethodField('get_date_created')
    modified = serializers.SerializerMethodField('get_date_modified')
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')
    content_defaults = serializers.JSONField()
    secret_tokens = TokenSerializer(many=True, read_only=True)

    class Meta:
        model = Channel
        fields = ('id', 'created', 'name', 'published', 'pending_editors', 'editors', 'modified', 'language', 'primary_token', 'priority',
                  'description', 'count', 'public', 'thumbnail_url', 'thumbnail', 'thumbnail_encoding', 'content_defaults', 'publishing',
                  'main_tree', 'last_published', 'secret_tokens')

class PublicChannelSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    kind_count = serializers.SerializerMethodField('generate_kind_count')
    matching_tokens = serializers.SerializerMethodField('match_tokens')

    def match_tokens(self, channel):
        tokens = json.loads(channel.tokens) if hasattr(channel, 'tokens') else []
        return list(channel.secret_tokens.filter(token__in=tokens).values_list('token', flat=True))

    def generate_kind_count(self, channel):
        return channel.published_kind_count and json.loads(channel.published_kind_count)

    class Meta:
        model = Channel
        fields = ('id', 'name', 'language', 'included_languages', 'description', 'total_resource_count', 'version',
                  'kind_count', 'published_size', 'last_published', 'icon_encoding', 'matching_tokens', 'public')

class UserSerializer(serializers.ModelSerializer):
    content_defaults = serializers.JSONField()

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'id', 'disk_space', 'is_active', 'information', 'policies', 'content_defaults')


class CurrentUserSerializer(serializers.ModelSerializer):
    clipboard_tree = RootNodeSerializer(read_only=True)
    available_space = serializers.SerializerMethodField('calculate_space')

    def calculate_space(self, user):
        return user.get_available_space()

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'is_active', 'is_admin', 'id', 'clipboard_tree', 'available_space')


class UserChannelListSerializer(serializers.ModelSerializer):
    bookmarks = serializers.SerializerMethodField('retrieve_bookmarks')

    def retrieve_bookmarks(self, user):
        return user.bookmarked_channels.values_list('id', flat=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'id', 'is_active', 'bookmarks')


class AdminChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    published = serializers.SerializerMethodField('check_published')
    count = serializers.SerializerMethodField("compute_item_count")
    created = serializers.SerializerMethodField('get_date_created')
    modified = serializers.SerializerMethodField('get_date_modified')
    download_url = serializers.SerializerMethodField('generate_db_url')
    editors = UserChannelListSerializer(many=True, read_only=True)
    viewers = UserChannelListSerializer(many=True, read_only=True)
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')

    def generate_db_url(self, channel):
        return "{path}{id}.sqlite3".format(path=settings.CONTENT_DATABASE_URL, id=channel.pk)

    def compute_item_count(self, channel):
        return channel.main_tree.get_descendant_count()

    class Meta:
        model = Channel
        fields = ('id', 'created', 'modified', 'name', 'published', 'editors', 'viewers', 'staging_tree', 'description', 'count',
                  'version', 'public', 'deleted', 'ricecooker_version', 'download_url', 'primary_token', 'priority')

class SimplifiedChannelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ('id', 'name', 'description', 'version', 'public')

class AdminUserListSerializer(serializers.ModelSerializer):
    editable_channels = SimplifiedChannelListSerializer(many=True, read_only=True)
    view_only_channels = SimplifiedChannelListSerializer(many=True, read_only=True)
    mb_space = serializers.SerializerMethodField('calculate_space')
    is_chef = serializers.SerializerMethodField('check_if_chef')

    def calculate_space(self, user):
        size, unit = format_size(user.disk_space)
        return {"size": round(float(size)), "unit": unit}

    def calculate_used_space(self, user):
        return user.get_space_used()

    def check_if_chef(self, user):
        return user.editable_channels.exclude(ricecooker_version=None).exists()

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'id', 'editable_channels', 'view_only_channels',
                'is_admin', 'date_joined', 'is_active', 'disk_space', 'mb_space', 'is_chef')

class InvitationSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    channel_name = serializers.SerializerMethodField('retrieve_channel_name')
    sender = UserSerializer(read_only=True)

    def retrieve_channel_name(self, invitation):
        return invitation and invitation.channel.name

    class Meta:
        model = Invitation
        fields = (
            'id', 'invited', 'email', 'sender', 'channel', 'first_name', 'last_name', 'share_mode', 'channel_name')
