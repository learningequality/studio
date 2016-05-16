import logging
from contentcuration.models import Channel, TopicTree, ContentTag, Node, ContentLicense, Exercise, AssessmentItem, File, Format, MimeType
from rest_framework import serializers
from rest_framework_bulk import BulkListSerializer, BulkSerializerMixin
from contentcuration.api import count_children, get_total_size, get_node_siblings, get_node_ancestors, get_child_names
from rest_framework.utils import model_meta
from collections import OrderedDict
from rest_framework.fields import set_value, SkipField
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentLicense
        fields = ('license_name', 'exists', 'id')

class ChannelSerializer(serializers.ModelSerializer):
    resource_count = serializers.SerializerMethodField('count_resources')
    resource_size = serializers.SerializerMethodField('calculate_resources_size')

    def count_resources(self, channel):
        if not channel.draft:
            return 0
        else:
            return count_children(channel.draft.root_node) + count_children(channel.clipboard.root_node)

    def calculate_resources_size(self, channel):
        if not channel.draft:
            return 0
        else:
            return get_total_size(channel.draft.root_node) + get_total_size(channel.clipboard.root_node)

    class Meta:
        model = Channel
        fields = ('name', 'description', 'editors', 'id', 'draft', 'clipboard', 'deleted', 'published','channel_id', 'resource_count', 'resource_size')

class TopicTreeSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField('get_channel_name')

    def get_channel_name(self, tree):
        return tree.channel.name

    class Meta:
        model = TopicTree
        fields = ('name', 'channel', 'root_node', 'id')

class FileSerializer(serializers.ModelSerializer):
    content_copy = serializers.FileField(use_url=False)

    def get(*args, **kwargs):
         return super.get(*args, **kwargs)
    class Meta:
        model = File
        fields = ('checksum', 'extension', 'file_size', 'content_copy', 'id', 'available', 'format')

class FormatSerializer(serializers.ModelSerializer):
   files = FileSerializer(many=True, read_only=True)

   class Meta:
        model = Format
        fields = ('format_size', 'quality', 'contentmetadata', 'available', 'mimetype', 'id', 'files')

class TagSerializer(serializers.ModelSerializer):
   class Meta:
    model = ContentTag
    fields = ('tag_name', 'tag_type')


class CustomListSerializer(serializers.ListSerializer):
    def update(self, instance, validated_data):
        node_mapping = {node.id: node for node in instance}
        update_nodes = {}
        ret = []
        tag_names = []
        with transaction.atomic():
            for item in validated_data:
                tag_names += item.pop('tags')
                if 'id' in item:
                    update_nodes[item['id']] = item
                else:
                    # create new nodes
                    ret.append(Node.objects.create(**item))

        # get all tags, if doesn't exist, create them.
        # this step is also needed for adding new tags to existing node.
        # in this case, we don't need the list of all_tags_pk, but we need to create the new tags.
        new_tags = []
        existing_tags = []
        tag_names = list(set(tag_names)) #get rid of repetitive tag_names
        for name in tag_names:
            tag_tuple = ContentTag.objects.get_or_create(tag_name=name)
            if tag_tuple[1]:
                new_tags.append(tag_tuple[0])
            else:
                existing_tags.append(tag_tuple[0])

        if ret:
            # new nodes and tags have been created, now add tags to them
            bulk_adding_list = []
            ThroughModel = Node.tags.through
            all_tags = existing_tags + new_tags
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

                    if new_tags:
                        setattr(node, 'tags', new_tags+existing_tags)
                    elif not existing_tags:
                        setattr(node, 'tags', [])

                    node.save()
                    ret.append(node)

        return ret


class NodeSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    formats = FormatSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, required=False)
    id = serializers.IntegerField(required=False)

    resource_count = serializers.SerializerMethodField('count_resources')
    resource_size = serializers.SerializerMethodField('calculate_resources_size')
    ancestors = serializers.SerializerMethodField('get_node_ancestors')


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
        return count_children(node)

    def calculate_resources_size(self, node):
        return get_total_size(node)

    def get_node_ancestors(self,node):
        return get_node_ancestors(node)

    class Meta:
        list_serializer_class = CustomListSerializer
        model = Node
        fields = ('title', 'published', 'total_file_size', 'id', 'description', 'published',  'sort_order',
                 'license_owner', 'license', 'kind', 'children', 'parent', 'content_id', 'formats',
                 'original_filename', 'resource_count', 'resource_size', 'ancestors', 'tags')

class MimeTypeSerializer(serializers.ModelSerializer):
   class Meta:
    model = MimeType
    fields = ('readable_name', 'machine_name', 'id')

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
