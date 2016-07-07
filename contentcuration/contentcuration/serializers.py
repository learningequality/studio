import logging
import json
from contentcuration.models import *
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin
from contentcuration.api import get_total_size, get_node_siblings, get_node_ancestors, get_child_names, count_files, count_all_children
from rest_framework.utils import model_meta
from collections import OrderedDict
from rest_framework.fields import set_value, SkipField
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.conf import settings

class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ('license_name', 'exists', 'id', 'license_url', 'license_description')

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ('lang_code', 'lang_subcode', 'id')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'is_active', 'is_admin', 'id')

class ChannelSerializer(serializers.ModelSerializer):
    resource_count = serializers.SerializerMethodField('count_resources')
    resource_size = serializers.SerializerMethodField('calculate_resources_size')

    def count_resources(self, channel):
        if not channel.main_tree:
            return 0
        else:
            return count_files(channel.main_tree)

    def calculate_resources_size(self, channel):
        if not channel.main_tree:
            return 0
        else:
            return get_total_size(channel.main_tree)

    class Meta:
        model = Channel
        fields = ('id', 'name', 'description', 'editors', 'main_tree',
                    'clipboard_tree', 'trash_tree','resource_count', 'resource_size',
                    'version', 'thumbnail', 'deleted', 'public', 'pending_editors')

class FileSerializer(serializers.ModelSerializer):
    file_on_disk = serializers.SerializerMethodField('get_file_url')

    def get(*args, **kwargs):
         return super.get(*args, **kwargs)
    class Meta:
        model = File
        fields = ('id', 'checksum', 'file_size', 'file_on_disk', 'contentnode', 'file_format', 'preset', 'lang','original_filename')

    def get_file_url(self, obj):
        return obj.file_on_disk.url

class FileFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileFormat
        fields = ("__all__")

class FormatPresetSerializer(serializers.ModelSerializer):
   # files = FileSerializer(many=True, read_only=True)

   class Meta:
        model = FormatPreset
        fields = ('id', 'readable_name', 'multi_language', 'supplementary', 'order', 'kind', 'allowed_formats')

class ContentKindSerializer(serializers.ModelSerializer):
   class Meta:
        model = ContentKind
        fields = ("__all__")

class CustomListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        node_mapping = {node.id: node for node in instance}
        update_nodes = {}
        tag_mapping = {}
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
            for node_id, data in update_nodes.items():
                node = node_mapping.get(node_id, None)
                if node:
                    # potential optimization opportunity
                    for attr, value in data.items():
                        setattr(node, attr, value)
                    taglist = []
                    for tag_data in tag_mapping.get(node_id, None):
                        # when deleting nodes, tag_data is a dict, but when adding nodes, it's a unicode string
                        if isinstance(tag_data, unicode):
                            tag_data = json.loads(tag_data)

                        # this requires optimization
                        for tag_itm in all_tags:
                            if tag_itm.tag_name==tag_data['tag_name'] and tag_itm.channel_id==tag_data['channel']:
                                taglist.append(tag_itm)

                    setattr(node, 'tags', taglist)

                    node.save()
                    ret.append(node)

        return ret

class TagSerializer(serializers.ModelSerializer):
   class Meta:
    model = ContentTag
    fields = ('tag_name', 'channel', 'id')

class ContentNodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    preset = FormatPresetSerializer(many=True, read_only=True)
    id = serializers.IntegerField(required=False)

    resource_count = serializers.SerializerMethodField('count_resources')
    resource_size = serializers.SerializerMethodField('calculate_resources_size')
    total_count = serializers.SerializerMethodField('count_all')
    ancestors = serializers.SerializerMethodField('get_node_ancestors')
    files = FileSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True)

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

    def count_resources(self, node):
        return count_files(node)

    def calculate_resources_size(self, node):
        return get_total_size(node)

    def get_node_ancestors(self,node):
        return get_node_ancestors(node)

    def count_all(self,node):
        return count_all_children(node)
    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = ('title', 'changed', 'id', 'description', 'sort_order','author', 'original_node', 'cloned_source',
                 'license_owner', 'license', 'kind', 'children', 'parent', 'content_id','preset',
                 'resource_count', 'resource_size', 'ancestors', 'tags', 'files', 'total_count')

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
