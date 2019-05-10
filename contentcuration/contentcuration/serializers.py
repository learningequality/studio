import json
import re
from collections import OrderedDict

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Max
from django.db.models import Sum
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import set_value
from rest_framework.fields import SkipField
from rest_framework.settings import api_settings
from rest_framework.utils import model_meta
from rest_framework_bulk import BulkSerializerMixin

from contentcuration.celery import app
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import FileFormat
from contentcuration.models import FormatPreset
from contentcuration.models import generate_object_storage_name
from contentcuration.models import generate_storage_url
from contentcuration.models import Invitation
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.models import SecretToken
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.statistics import record_node_addition_stats
from contentcuration.utils.format import format_size


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
        nodes_to_check = []
        with transaction.atomic():
            # Get files that have the same contentnode, preset, and language as the files that are now attached to this node
            for item in validated_data:
                file_obj = File.objects.get(pk=item['id'])
                file_obj.language_id = item.get('language') and item['language']['id']
                file_obj.contentnode = item['contentnode']

                if item['contentnode'] not in nodes_to_check:
                    nodes_to_check.append(item['contentnode'])

                # Make sure file exists
                file_path = generate_object_storage_name(file_obj.checksum, str(file_obj))
                if not default_storage.exists(file_path):
                    raise OSError("Error: file {} was not found".format(str(file_obj)))

                # Replace existing files
                files_to_replace = item['contentnode'].files.exclude(pk=file_obj.pk)\
                    .filter(preset_id=file_obj.preset_id, language_id=file_obj.language_id)
                files_to_replace.delete()

                file_obj.save()
                ret.append(file_obj)

            # Remove items that are not in the validated data (file has been removed)
            for node in nodes_to_check:
                file_ids = [f['id'] for f in validated_data if f['contentnode'].pk == node.pk]
                node.files.exclude(pk__in=file_ids).delete()

        return ret


class FileSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    file_on_disk = serializers.SerializerMethodField('get_file_url')
    storage_url = serializers.SerializerMethodField('retrieve_storage_url')
    mimetype = serializers.SerializerMethodField('retrieve_extension')
    language = LanguageSerializer(many=False, required=False, allow_null=True)
    display_name = serializers.SerializerMethodField('retrieve_display_name')
    id = serializers.CharField(required=False)
    preset = FormatPresetSerializer(many=False, read_only=True)

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

    def update(self, instance, validated_data):  # noqa: C901
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

    def update(self, queryset, validated_data):
        exercise_image_checksum_regex = re.compile(r"\!\[[^]]*\]\(\${placeholder}/([a-f0-9]{{32}})\.[\w]+\)".format(placeholder=exercises.IMG_PLACEHOLDER))
        ret = []

        validated_data_by_id = {
            i.pop('id'): i
            for i in validated_data
        }

        with transaction.atomic():
            # only handle existing items
            aitems = AssessmentItem.objects.filter(id__in=validated_data_by_id.keys())
            if len(validated_data) != aitems.count():
                raise ValidationError('Could not find all objects to update')
            for aitem in aitems:
                item = validated_data_by_id.get(aitem.id)
                # Defer to child serializer for update operations
                self.child.update(aitem, item)
                # Get unique checksums in the assessment item text fields markdown
                # Coerce to a string, for Python 2, as the stored data is in unicode, and otherwise
                # the unicode char in the placeholder will not match
                checksums = set(exercise_image_checksum_regex.findall(str(aitem.question + aitem.answers + aitem.hints)))
                # delete any files that are no longer being used
                aitem.files.exclude(checksum__in=checksums).delete()
                if len(checksums) != aitem.files.count():
                    # We have some checksums that do not have files associated
                    no_files = checksums - set(aitem.files.values_list('checksum', flat=True))
                    for checksum in no_files:
                        # Find an existing file object for this file
                        file = File.objects.filter(checksum=checksum).first()
                        file.id = None
                        file.assessment_item = aitem
                        file.save()
                ret.append(aitem)

        return ret


class AssessmentItemSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    contentnode = serializers.PrimaryKeyRelatedField(queryset=ContentNode.objects.all())
    id = serializers.IntegerField(required=False)

    class Meta:
        model = AssessmentItem
        fields = ('id', 'question', 'type', 'answers', 'contentnode', 'assessment_id',
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
        return list(node.get_ancestors().values_list('id', flat=True))

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

    def retrieve_thumbail_src(self, node):
        """ Get either the encoding or the url to use as the <img> src attribute """
        try:
            if node.thumbnail_encoding:
                return json.loads(node.thumbnail_encoding).get('base64')
        except ValueError:
            pass

        thumbnail_file = node.files.filter(preset__thumbnail=True).first()
        if thumbnail_file:
            return generate_storage_url(str(thumbnail_file))


class RootNodeSerializer(SimplifiedContentNodeSerializer, ContentNodeFieldMixin):
    channel_name = serializers.SerializerMethodField('retrieve_channel_name')

    def retrieve_metadata(self, node):
        descendants = node.get_descendants()
        data = {
            "total_count": node.get_descendant_count(),
            "resource_count": descendants.exclude(kind_id=content_kinds.TOPIC).count(),
            "max_sort_order": node.children.aggregate(max_sort_order=Max('sort_order'))['max_sort_order'] or 1,
            "resource_size": 0,
            "has_changed_descendant": node.changed or descendants.filter(changed=True).exists(),
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
    thumbnail_src = serializers.SerializerMethodField('retrieve_thumbail_src')
    tags = TagSerializer(many=True, read_only=False)

    def retrieve_associated_presets(self, node):
        return list(node.get_associated_presets())

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

            if not node.parent:  # Add extra data to root node
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
        fields = ('title', 'changed', 'id', 'description', 'sort_order', 'author', 'copyright_holder', 'license', 'language',
                  'license_description', 'assessment_items', 'files', 'parent_title', 'ancestors', 'modified', 'original_channel',
                  'kind', 'parent', 'children', 'published', 'associated_presets', 'valid', 'metadata', 'original_source_node_id',
                  'tags', 'extra_fields', 'prerequisite', 'is_prerequisite_of', 'node_id', 'tree_id', 'publishing', 'freeze_authoring_data',
                  'role_visibility', 'provider', 'aggregator', 'thumbnail_src')


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
                  'tags', 'extra_fields', 'original_channel', 'prerequisite', 'is_prerequisite_of', 'thumbnail_encoding', 'thumbnail_src',
                  'freeze_authoring_data', 'publishing', 'original_source_node_id', 'role_visibility', 'provider', 'aggregator')


class ContentNodeCompleteSerializer(ContentNodeEditSerializer):

    class Meta:
        list_serializer_class = CustomListSerializer
        model = ContentNode
        fields = (
            'title', 'changed', 'id', 'description', 'sort_order', 'author', 'node_id', 'copyright_holder', 'license',
            'license_description', 'kind', 'prerequisite', 'is_prerequisite_of', 'parent_title', 'ancestors', 'language',
            'original_channel', 'original_source_node_id', 'source_node_id', 'content_id', 'original_channel_id',
            'source_channel_id', 'source_id', 'source_domain', 'thumbnail_encoding', 'publishing', 'thumbnail_src',
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
    thumbnail_encoding = serializers.JSONField(required=False)

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
            'public', 'thumbnail_url', 'thumbnail_encoding', 'pending_editors', 'viewers', 'tags', 'content_defaults',
            'language', 'primary_token', 'priority', 'published_size')
        read_only_fields = ('id', 'version')


class ChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    """
    Primarily used by ricecooker, exposes fields not necessarily needed by Studio consumers, such as deleted state
    and viewers.
    """
    thumbnail_url = serializers.SerializerMethodField('generate_thumbnail_url')
    published = serializers.SerializerMethodField('check_published')
    publishing = serializers.SerializerMethodField('check_publishing')
    count = serializers.SerializerMethodField("get_resource_count")
    created = serializers.SerializerMethodField('get_date_created')
    modified = serializers.SerializerMethodField('get_date_modified')
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')
    content_defaults = serializers.JSONField()

    class Meta:
        model = Channel
        fields = ('id', 'created', 'name', 'published', 'pending_editors', 'editors', 'viewers', 'modified', 'language', 'primary_token', 'priority',
                  'description', 'count', 'version', 'public', 'thumbnail_url', 'thumbnail', 'thumbnail_encoding', 'deleted', 'content_defaults', 'publishing')


class StudioChannelListSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    """
    Primarily used for the channel list APIs in Studio, called by the channels list page.
    """
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
        fields = ('id', 'created', 'name', 'published', 'editors', 'modified', 'language', 'primary_token', 'priority',
                  'description', 'count', 'public', 'thumbnail_url', 'thumbnail', 'thumbnail_encoding', 'content_defaults', 'publishing',
                  'main_tree', 'last_published', 'secret_tokens', 'version', 'ricecooker_version')


# to minimize refactoring, we are aliasing the StudioChannelListSerializer to other serializers that contained the same
# data, or a subset of it
AltChannelListSerializer = StudioChannelListSerializer
ChannelSetChannelListSerializer = StudioChannelListSerializer


class PublicChannelSerializer(ChannelFieldMixin, serializers.ModelSerializer):
    """
    Called by the public API, primarily used by Kolibri. Contains information more specific to Kolibri's needs.
    """
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
    mb_space = serializers.SerializerMethodField('calculate_space')

    def calculate_space(self, user):
        size, unit = format_size(user.disk_space)
        return {"size": round(float(size)), "unit": unit}

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'id', 'disk_space', 'mb_space', 'is_active', 'information', 'policies', 'content_defaults')


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
    resource_count = serializers.IntegerField()
    created = serializers.SerializerMethodField('get_date_created')
    modified = serializers.SerializerMethodField('get_date_modified')
    download_url = serializers.SerializerMethodField('generate_db_url')
    editors = UserChannelListSerializer(many=True, read_only=True)
    viewers = UserChannelListSerializer(many=True, read_only=True)
    primary_token = serializers.SerializerMethodField('get_channel_primary_token')

    def generate_db_url(self, channel):
        return "{path}{id}.sqlite3".format(path=settings.CONTENT_DATABASE_URL, id=channel.pk)

    class Meta:
        model = Channel
        fields = ('id', 'created', 'modified', 'name', 'published', 'editors', 'viewers', 'staging_tree', 'description',
                  'resource_count', 'version', 'public', 'deleted', 'ricecooker_version', 'download_url', 'primary_token', 'priority')


class SimplifiedChannelListSerializer(serializers.ModelSerializer):

    class Meta:
        model = Channel
        fields = ('id', 'name', 'description', 'version', 'public')


class AdminUserListSerializer(serializers.ModelSerializer):
    editable_channels = SimplifiedChannelListSerializer(many=True, read_only=True)
    view_only_channels = SimplifiedChannelListSerializer(many=True, read_only=True)
    mb_space = serializers.SerializerMethodField('calculate_space')
    is_chef = serializers.SerializerMethodField('check_if_chef')
    chef_channels_count = serializers.IntegerField()

    def calculate_space(self, user):
        size, unit = format_size(user.disk_space)
        return {"size": round(float(size)), "unit": unit}

    def calculate_used_space(self, user):
        return user.get_space_used()

    def check_if_chef(self, user):
        return user.chef_channels_count > 0

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'id', 'editable_channels', 'view_only_channels', 'is_chef',
                  'is_admin', 'date_joined', 'is_active', 'disk_space', 'mb_space', 'chef_channels_count')


class InvitationSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    channel_name = serializers.SerializerMethodField('retrieve_channel_name')
    sender = UserSerializer(read_only=True)

    def retrieve_channel_name(self, invitation):
        return invitation and invitation.channel.name

    class Meta:
        model = Invitation
        fields = (
            'id', 'invited', 'email', 'sender', 'channel', 'first_name', 'last_name', 'share_mode', 'channel_name')


class GetTreeDataSerizlizer(serializers.Serializer):
    """
    Used by get_*_tree_data endpoints to ontain "lightweight" tree data.
    """
    channel_id = serializers.CharField(required=True)
    tree = serializers.CharField(required=False, default='main')
    node_id = serializers.CharField(required=False)


class ChannelSetSerializer(serializers.ModelSerializer):
    secret_token = TokenSerializer(required=False)
    channels = serializers.SerializerMethodField('get_channel_ids')

    def create(self, validated_data):
        channelset = super(ChannelSetSerializer, self).create(validated_data)
        channels = Channel.objects.filter(pk__in=self.initial_data['channels'])
        channelset.secret_token.set_channels(channels)
        return channelset

    def update(self, instance, validated_data):
        channelset = super(ChannelSetSerializer, self).update(instance, validated_data)
        channels = Channel.objects.filter(pk__in=self.initial_data['channels'])
        channelset.secret_token.set_channels(channels)
        return channelset

    def get_channel_ids(self, channelset):
        channels = channelset.get_channels()
        return channels and channels.values_list('id', flat=True)

    class Meta:
        model = ChannelSet
        fields = ('id', 'name', 'description', 'public', 'editors', 'channels', 'secret_token')


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
        fields = ('id', 'task_id', 'task_type', 'created', 'metadata', 'status', 'is_progress_tracking', 'user', 'metadata')
