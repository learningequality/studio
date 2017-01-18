import logging
import json
import re
from contentcuration.models import *
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin
from contentcuration.api import get_total_size, get_node_ancestors, count_files, calculate_node_metadata, clean_db, recurse
from rest_framework.utils import model_meta
from collections import OrderedDict
from rest_framework.fields import set_value, SkipField
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.conf import settings
from django.core.files import File as DjFile

class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ('license_name', 'exists', 'id', 'license_url', 'license_description')

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ('lang_code', 'lang_subcode', 'id')


class FileListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        ret = []
        update_files = {}

        with transaction.atomic():
            for item in validated_data:
                if 'id' in item:
                    update_files[item['id']] = item
                else:
                    # create new nodes
                    ret.append(File.objects.create(**item))

        for file_obj in validated_data:
            contentnode = file_obj['contentnode'].pk
            preset = file_obj['preset'].pk
            file_id = file_obj['id']
            files_to_delete = File.objects.filter(Q(contentnode_id=contentnode) & (Q(preset_id=preset) | Q(preset=None)) & ~Q(id=file_id))
            for to_delete in files_to_delete:
                to_delete.delete()

        if update_files:
            with transaction.atomic():
                for file_id, data in update_files.items():
                    file_obj, is_new = File.objects.get_or_create(pk=file_id)
                    # potential optimization opportunity
                    for attr, value in data.items():
                        setattr(file_obj, attr, value)
                    file_path = generate_file_on_disk_name(file_obj.checksum, str(file_obj))
                    if os.path.isfile(file_path):
                        file_obj.file_on_disk = DjFile(open(file_path, 'rb'))
                    else:
                        raise FileNotFoundError("Error: file {} was not found".format(str(file_obj)))
                    file_obj.save()
                    ret.append(file_obj)
        return ret

class FileSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    file_on_disk = serializers.SerializerMethodField('get_file_url')
    storage_url = serializers.SerializerMethodField('retrieve_storage_url')
    recommended_kind = serializers.SerializerMethodField('retrieve_recommended_kind')
    mimetype = serializers.SerializerMethodField('retrieve_extension')
    id = serializers.CharField(required=False)

    def get(*args, **kwargs):
         return super.get(*args, **kwargs)

    def get_file_url(self, obj):
        return obj.file_on_disk.url

    def retrieve_storage_url(self, obj):
        return generate_storage_url(obj.checksum + '.' + obj.file_format.extension)

    def retrieve_recommended_kind(self, obj):
        if obj.contentnode is not None and obj.contentnode.kind:
            return obj.contentnode.kind.pk
        preset = FormatPreset.objects.filter(allowed_formats__extension=obj.file_format.extension).first()
        if preset is not None:
            return preset.kind.pk
        return None

    def retrieve_extension(self, obj):
        return obj.file_format.mimetype

    class Meta:
        model = File
        fields = ('id', 'checksum', 'file_size', 'file_on_disk', 'contentnode', 'file_format', 'preset', 'original_filename','recommended_kind', 'storage_url', 'mimetype', 'source_url')
        list_serializer_class = FileListSerializer

class FileFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileFormat
        fields = ("__all__")

class FormatPresetSerializer(serializers.ModelSerializer):
   # files = FileSerializer(many=True, read_only=True)
    associated_mimetypes = serializers.SerializerMethodField('retrieve_mimetypes')

    def retrieve_mimetypes(self, preset):
        mimetypes = []
        for m in preset.allowed_formats.all():
            mimetypes.append(m.mimetype)
        return mimetypes

    class Meta:
        model = FormatPreset
        fields = ('id', 'readable_name', 'multi_language', 'supplementary', 'order', 'kind', 'allowed_formats','associated_mimetypes', 'display')

class ContentKindSerializer(serializers.ModelSerializer):
    associated_presets = serializers.SerializerMethodField('retrieve_associated_presets')
    def retrieve_associated_presets(self, kind):
        return FormatPreset.objects.filter(kind = kind).values()

    class Meta:
        model = ContentKind
        fields = ("kind", 'associated_presets')

class CustomListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        update_nodes = {}
        tag_mapping = {}
        file_mapping = {}
        ret = []
        unformatted_input_tags = []

        with transaction.atomic():
            for item in validated_data:
                item_tags = item.get('tags')

                unformatted_input_tags += item.pop('tags')
                if 'id' in item:
                    update_nodes[item['id']] = item
                    tag_mapping[item['id']] = item_tags
                else:
                    # create new nodes
                    ret.append(ContentNode.objects.create(**item))

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
                                if tag_itm.tag_name==tag_data['tag_name'] and tag_itm.channel_id==tag_data['channel']:
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
                        node.save()
                        ret.append(node)
        return ret

class TagSerializer(serializers.ModelSerializer):
   class Meta:
    model = ContentTag
    fields = ('tag_name', 'channel', 'id')

class AssessmentItemSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    contentnode = serializers.PrimaryKeyRelatedField(queryset=ContentNode.objects.all())

    class Meta:
        model = AssessmentItem
        fields = ('question', 'type', 'answers', 'id', 'contentnode', 'assessment_id', 'hints', 'raw_data', 'order')
        list_serializer_class = BulkListSerializer

class ContentNodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    tags = TagSerializer(many=True)
    id = serializers.CharField(required=False)

    ancestors = serializers.SerializerMethodField('get_node_ancestors')
    files = FileSerializer(many=True, read_only=True)
    assessment_items = AssessmentItemSerializer(many=True, read_only=True)
    associated_presets = serializers.SerializerMethodField('retrieve_associated_presets')
    metadata = serializers.SerializerMethodField('retrieve_metadata')
    original_channel = serializers.SerializerMethodField('retrieve_original_channel')

    def retrieve_original_channel(self, node):
        if node.original_node is None:
            return None
        root = node.original_node.get_root()
        root_channel = root.channel_main or root.channel_trash or root.channel_clipboard or root.channel_staging or root.channel_previous
        if root_channel.first():
            return {"id": root_channel.first().pk, "name": root_channel.first().name}
        return None

    def retrieve_metadata(self, node):
        if node.kind_id == content_kinds.TOPIC:
            resource_descendants = node.get_descendants().exclude(kind=content_kinds.TOPIC)
            return {
                "total_count" : node.get_descendant_count(),
                "resource_count" : resource_descendants.count(),
                "max_sort_order" : node.children.aggregate(max_sort_order=Max('sort_order'))['max_sort_order'],
                "resource_size" : resource_descendants.aggregate(resource_size=Sum('files__file_size'))['resource_size'],
                "has_changed_descendant" : node.get_descendants(include_self=True).filter(changed=True).exists()
            }
        else:
            return {
                "total_count" : 1,
                "resource_count" : 1,
                "max_sort_order" : node.sort_order,
                "resource_size" : node.files.aggregate(resource_size=Sum('file_size'))['resource_size'],
                "has_changed_descendant" : node.changed
            }

    @staticmethod
    def setup_eager_loading(queryset):
        """ Perform necessary eager loading of data. """
        queryset = queryset.prefetch_related('children').prefetch_related('files').prefetch_related('assessment_items')
        return queryset

    def retrieve_associated_presets(self, node):
        return FormatPreset.objects.filter(kind = node.kind).values()

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

    def get_node_ancestors(self,node):
        return get_node_ancestors(node)

    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = ('title', 'changed', 'id', 'description', 'sort_order','author', 'original_node', 'cloned_source', 'original_channel',
                 'copyright_holder', 'license', 'kind', 'children', 'parent', 'content_id','associated_presets',
                 'ancestors', 'tags', 'files', 'metadata', 'created', 'modified', 'published', 'extra_fields', 'assessment_items')

class ChannelSerializer(serializers.ModelSerializer):
    has_changed = serializers.SerializerMethodField('check_for_changes')
    main_tree = ContentNodeSerializer(read_only=True)
    trash_tree = ContentNodeSerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField('generate_thumbnail_url')

    def check_for_changes(self, channel):
        if channel.main_tree:
            return channel.main_tree.get_descendants().filter(changed=True).count() > 0
        else:
            return False

    @staticmethod
    def setup_eager_loading(queryset):
        """ Perform necessary eager loading of data. """
        queryset = queryset.select_related('main_tree')
        return queryset

    def generate_thumbnail_url(self, channel):
        if channel.thumbnail and 'static' not in channel.thumbnail:
            return generate_storage_url(channel.thumbnail)
        return '/static/img/kolibri_placeholder.png'

    class Meta:
        model = Channel
        fields = ('id', 'name', 'description', 'has_changed','editors', 'main_tree', 'trash_tree',
                'thumbnail', 'thumbnail_url', 'version', 'deleted', 'public', 'pending_editors')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'is_active', 'is_admin', 'id')

class CurrentUserSerializer(serializers.ModelSerializer):
    clipboard_tree = ContentNodeSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'is_active', 'is_admin', 'id','clipboard_tree')

class InvitationSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ('id', 'invited', 'email', 'sender', 'channel', 'first_name', 'last_name')
