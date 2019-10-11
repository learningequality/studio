import copy
import json
import logging
import math
import os
import uuid

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import BooleanField
from django.db.models import IntegerField
from django.db.models import Q
from django.db.models.aggregates import Count
from django.db.models.aggregates import Max
from django.db.models.expressions import Case
from django.db.models.expressions import Col
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import Expression
from django.db.models.expressions import Value
from django.db.models.expressions import When
from django.db.models.functions import Coalesce
from django.db.models.sql.where import WhereNode
from django.utils.translation import ugettext as _
from le_utils.constants import content_kinds
from le_utils.constants import roles

from contentcuration.db.models.aggregates import BoolOr
from contentcuration.db.models.expressions import get_output_field
from contentcuration.db.models.expressions import Join
from contentcuration.db.models.expressions import JoinField
from contentcuration.db.models.expressions import WhenQ
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import FormatPreset
from contentcuration.models import generate_object_storage_name
from contentcuration.models import Language
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.models import User
from contentcuration.utils.files import duplicate_file
from contentcuration.utils.files import get_thumbnail_encoding


def map_files_to_node(user, node, data):
    """
    Generate files that reference the content node.
    """
    if settings.DEBUG:
        # assert that our parameters match expected values
        assert isinstance(user, User)
        assert isinstance(node, ContentNode)
        assert isinstance(data, list)

    # filter out file that are empty
    valid_data = filter_out_nones(data)

    for file_data in valid_data:
        filename = file_data["filename"]
        checksum, ext1 = os.path.splitext(filename)
        ext = ext1.lstrip(".")

        # Determine a preset if none is given
        kind_preset = FormatPreset.get_preset(file_data["preset"]) or FormatPreset.guess_format_preset(filename)

        file_path = generate_object_storage_name(checksum, filename)
        storage = default_storage

        if not storage.exists(file_path):
            raise IOError('{} not found'.format(file_path))

        try:
            if file_data.get('language'):
                # TODO: Remove DB call per file?
                file_data['language'] = Language.objects.get(pk=file_data['language'])
        except ObjectDoesNotExist:
            invalid_lang = file_data.get('language')
            logging.warning("file_data with language {} does not exist.".format(invalid_lang))
            return ValidationError("file_data given was invalid; expected string, got {}".format(invalid_lang))

        resource_obj = File(
            checksum=checksum,
            contentnode=node,
            file_format_id=ext,
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size=file_data['size'],
            preset=kind_preset,
            language_id=file_data.get('language'),
            uploaded_by=user,
        )
        resource_obj.file_on_disk.name = file_path
        resource_obj.save()

        # Handle thumbnail
        if resource_obj.preset and resource_obj.preset.thumbnail:
            node.thumbnail_encoding = json.dumps({
                'base64': get_thumbnail_encoding(str(resource_obj)),
                'points': [],
                'zoom': 0
            })
            node.save()


def map_files_to_assessment_item(user, assessment_item, data):
    """
    Generate files referenced in given assesment item (a.k.a. question).
    """
    if settings.DEBUG:
        # assert that our parameters match expected values
        assert isinstance(user, User)
        assert isinstance(assessment_item, AssessmentItem)
        assert isinstance(data, list)

    # filter out file that are empty
    valid_data = filter_out_nones(data)

    for file_data in valid_data:
        filename = file_data["filename"]
        checksum, ext = filename.split(".")

        file_path = generate_object_storage_name(checksum, filename)
        storage = default_storage
        if not storage.exists(file_path):
            raise IOError('{} not found'.format(file_path))

        resource_obj = File(
            checksum=checksum,
            assessment_item=assessment_item,
            file_format_id=ext,
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size=file_data['size'],
            preset_id=file_data["preset"],   # assessment_item-files always have a preset
            uploaded_by=user,
        )
        resource_obj.file_on_disk.name = file_path
        resource_obj.save()


def map_files_to_slideshow_slide_item(user, node, slides, files):
    """
    Generate files referenced in given slideshow slide
    """
    for file_data in files:
        filename = file_data["filename"]
        checksum, ext = filename.split(".")

        matching_slide = next((slide for slide in slides if slide.metadata["checksum"] == checksum), None)

        if not matching_slide:
            # TODO(Jacob) Determine proper error type... raise it.
            print ("NO MATCH")

        file_path = generate_object_storage_name(checksum, filename)
        storage = default_storage

        if not storage.exists(file_path):
            raise IOError('{} not found'.format(file_path))

        file_obj = File(
            slideshow_slide=matching_slide,
            checksum=checksum,
            file_format_id=ext,
            original_filename=file_data.get("original_filename") or "file",
            source_url=file_data.get("source_url"),
            file_size=file_data["size"],
            preset_id=file_data["preset"],
            uploaded_by=user
        )

        file_obj.file_on_disk.name = file_path
        file_obj.save()


def filter_out_nones(data):
    """
    Filter out any falsey values from data.
    """
    return (l for l in data if l)


def duplicate_node_bulk(node, sort_order=None, parent=None, channel_id=None, user=None, task_object=None):  # noqa:C901
    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)

    # keep track of the in-memory models so that we can bulk-create them at the end (for efficiency)
    to_create = {
        "nodes": [],
        "node_files": [],
        "assessment_files": [],
        "assessments": [],
    }

    # perform the actual recursive node cloning
    new_node = _duplicate_node_bulk_recursive(node=node, sort_order=sort_order, parent=parent, channel_id=channel_id, to_create=to_create, user=user)
    node_percent = 0
    this_node_percent = 0
    node_copy_total_percent = 90.0

    if task_object:
        num_nodes_to_create = len(to_create["nodes"]) + 2
        this_node_percent = node_copy_total_percent / task_object.root_nodes_to_copy

        node_percent = this_node_percent / num_nodes_to_create

    # create nodes, one level at a time, starting from the top of the tree (so that we have IDs to pass as "parent" for next level down)
    for node_level in to_create["nodes"]:
        for node in node_level:
            node.parent_id = node.parent.id
        ContentNode.objects.bulk_create(node_level)
        for node in node_level:
            for tag in node._meta.tags_to_add:
                node.tags.add(tag)

        if task_object:
            task_object.progress = min(task_object.progress + node_percent, node_copy_total_percent)
            task_object.update_state(state='STARTED', meta={'progress': task_object.progress})

    # rebuild MPTT tree for this channel (since we're inside "disable_mptt_updates", and bulk_create doesn't trigger rebuild signals anyway)
    ContentNode.objects.partial_rebuild(to_create["nodes"][0][0].tree_id)

    ai_node_ids = []

    # create each of the assessment items
    for a in to_create["assessments"]:
        a.contentnode_id = a.contentnode.id
        ai_node_ids.append(a.contentnode_id)
    AssessmentItem.objects.bulk_create(to_create["assessments"])

    if task_object:
        task_object.progress = min(task_object.progress + node_percent, node_copy_total_percent)
        task_object.update_state(state='STARTED', meta={'progress': task_object.progress})

    # build up a mapping of contentnode/assessment_id onto assessment item IDs, so we can point files to them correctly after
    aid_mapping = {}
    for a in AssessmentItem.objects.filter(contentnode_id__in=ai_node_ids):
        aid_mapping[a.contentnode_id + ":" + a.assessment_id] = a.id

    # create the file objects, for both nodes and assessment items
    for f in to_create["node_files"]:
        f.contentnode_id = f.contentnode.id
    for f in to_create["assessment_files"]:
        f.assessment_item_id = aid_mapping[f.assessment_item.contentnode_id + ":" + f.assessment_item.assessment_id]
    File.objects.bulk_create(to_create["node_files"] + to_create["assessment_files"])

    if task_object:
        task_object.progress = min(task_object.progress + node_percent, node_copy_total_percent)
        task_object.update_state(state='STARTED', meta={'progress': task_object.progress})

    return new_node


def duplicate_node_inline(channel_id, node_id, target_parent, user=None):
    node = ContentNode.objects.get(pk=node_id)
    target_parent = ContentNode.objects.get(pk=target_parent)

    new_node = None
    with transaction.atomic():
        with ContentNode.objects.disable_mptt_updates():
            sort_order = (
                node.sort_order + node.get_next_sibling().sort_order) / 2 if node.get_next_sibling() else node.sort_order + 1
            new_node = duplicate_node_bulk(node, sort_order=sort_order, parent=target_parent, channel_id=channel_id,
                                           user=user)
            if not new_node.title.endswith(_(" (Copy)")):
                new_node.title = new_node.title + _(" (Copy)")
                new_node.save()

    return new_node


def _duplicate_node_bulk_recursive(node, sort_order, parent, channel_id, to_create, level=0, user=None):  # noqa

    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)

    if isinstance(parent, int) or isinstance(parent, basestring):
        parent = ContentNode.objects.get(pk=parent)

    if not parent.changed:
        parent.changed = True
        parent.save()

    source_channel = node.get_channel()
    # clone the model (in-memory) and update the fields on the cloned model
    new_node = copy.copy(node)
    new_node.id = None
    new_node.tree_id = parent.tree_id
    new_node.parent = parent
    new_node.published = False
    new_node.sort_order = sort_order or node.sort_order
    new_node.changed = True
    new_node.cloned_source = node
    new_node.source_channel_id = source_channel.id if source_channel else None
    new_node.node_id = uuid.uuid4().hex
    new_node.source_node_id = node.node_id
    new_node.freeze_authoring_data = not Channel.objects.filter(pk=node.original_channel_id, editors=user).exists()

    # There might be some legacy nodes that don't have these, so ensure they are added
    if not new_node.original_channel_id or not new_node.original_source_node_id:
        original_node = node.get_original_node()
        original_channel = original_node.get_channel()
        new_node.original_channel_id = original_channel.id if original_channel else None
        new_node.original_source_node_id = original_node.node_id

    # store the new unsaved model in a list, at the appropriate level, for later creation
    while len(to_create["nodes"]) <= level:
        to_create["nodes"].append([])
    to_create["nodes"][level].append(new_node)

    # find or create any tags that are needed, and store them under _meta on the node so we can add them to it later
    new_node._meta.tags_to_add = []
    for tag in node.tags.all():
        new_tag, is_new = ContentTag.objects.get_or_create(
            tag_name=tag.tag_name,
            channel_id=channel_id,
        )
        new_node._meta.tags_to_add.append(new_tag)

    # clone the file objects for later saving
    for fobj in node.files.all():
        f = duplicate_file(fobj, node=new_node, save=False)
        to_create["node_files"].append(f)

    # copy assessment item objects, and associated files
    for aiobj in node.assessment_items.prefetch_related("files").all():
        aiobj_copy = copy.copy(aiobj)
        aiobj_copy.id = None
        aiobj_copy.contentnode = new_node
        to_create["assessments"].append(aiobj_copy)
        for fobj in aiobj.files.all():
            f = duplicate_file(fobj, assessment_item=aiobj_copy, save=False)
            to_create["assessment_files"].append(f)

    # recurse down the tree and clone the children
    for child in node.children.all():
        _duplicate_node_bulk_recursive(node=child, sort_order=None, parent=new_node, channel_id=channel_id, to_create=to_create, level=level + 1, user=user)

    return new_node


def move_nodes(channel_id, target_parent_id, nodes, min_order, max_order, task_object=None):
    all_ids = []

    target_parent = ContentNode.objects.get(pk=target_parent_id)
    # last 20% is MPTT tree updates
    total_percent = 100.0
    percent_per_node = math.ceil(total_percent / len(nodes))
    percent_done = 0.0

    with transaction.atomic():
        for n in nodes:
            min_order = min_order + float(max_order - min_order) / 2
            node = ContentNode.objects.get(pk=n['id'])
            move_node(node, parent=target_parent, sort_order=min_order, channel_id=channel_id)
            percent_done = min(percent_done + percent_per_node, total_percent)
            if task_object:
                task_object.update_state(state='STARTED', meta={'progress': percent_done})
            all_ids.append(n['id'])

    return all_ids


def move_node(node, parent=None, sort_order=None, channel_id=None):
    # if we move nodes, make sure the parent is marked as changed
    if node.parent and not node.parent.changed:
        node.parent.changed = True
        node.parent.save()
    node.parent = parent or node.parent
    node.sort_order = sort_order or node.sort_order
    node.changed = True
    descendants = node.get_descendants(include_self=True)

    if node.tree_id != parent.tree_id:
        PrerequisiteContentRelationship.objects.filter(Q(target_node_id=node.pk) | Q(prerequisite_id=node.pk)).delete()

    node.save()
    # we need to make sure the new parent is marked as changed as well
    if node.parent and not node.parent.changed:
        node.parent.changed = True
        node.parent.save()

    for tag in ContentTag.objects.filter(tagged_content__in=descendants).distinct():
        # If moving from another channel
        if tag.channel_id != channel_id:
            t, is_new = ContentTag.objects.get_or_create(tag_name=tag.tag_name, channel_id=channel_id)

            # Set descendants with this tag to correct tag
            for n in descendants.filter(tags=tag):
                n.tags.remove(tag)
                n.tags.add(t)

    return node


MPTT_FIELDS = [
    'left',
    'right',
    'tree_id',
    'level',
    'parent',
]


class MPTTFieldHelper(object):
    def __init__(self, query):
        """
        :param query: A query for a model's table
        """
        self.query = query
        self.table_alias = query.get_initial_alias()

    def get_mptt_field_name(self, field_name):
        """
        @see MPTTModel._mpttfield()
        """
        return getattr(getattr(self.query.model, '_mptt_meta'), field_name + '_attr', field_name)

    def resolve_field(self, field_name):
        """
        Determines the real field name and output field type, using the query which references a
        model class, handling both MPTT fields and normal fields

        :param field_name: String name of a field
        :return: A tuple of the real field name and output field instance
        """
        output_field = None

        if field_name in MPTT_FIELDS:
            suffix = ''
            if field_name == 'parent':
                suffix = '_id'

            field_name = self.get_mptt_field_name(field_name) + suffix
            output_field = IntegerField()

        if not output_field:
            output_field = get_output_field(self.query.model, field_name)

        return field_name, output_field

    def __getattr__(self, field_name):
        """
        Builds a column expression for a field, using the query which references a model class,
        handling both MPTT fields and normal fields

        :param field_name: String name of a field
        :return: A `Col` expression for the table field
        """
        field_name, output_field = self.resolve_field(field_name)
        return Col(self.table_alias, JoinField(field_name), output_field=output_field)


class DescendantJoin(Join):
    def __init__(self, queryset, *args, **kwargs):
        super(DescendantJoin, self).__init__(queryset, *args, **kwargs)
        self.helper = MPTTFieldHelper(queryset.query)

    def __getattr__(self, field_name):
        """
        Gets a join ref for the field_name, using the query which references a
        model class, handling both MPTT fields and normal fields

        :param field_name: String name of a field
        :return: A join field reference
        """
        field_name, output_field = self.helper.resolve_field(field_name)
        return self.get_ref(field_name, output_field)


class DescendantExpression(Expression):
    def filter_condition(self, lhs, comparator, rhs):
        return CombinedExpression(lhs, comparator, rhs, output_field=BooleanField())

    def resolve_expression(self, query=None, *args, **kwargs):
        if query is None:
            return self

        return WhereNode(self.resolve_conditions(MPTTFieldHelper(query)))

    def resolve_conditions(self, helper):
        return []


class DescendantCount(Expression):
    _output_field = IntegerField()

    def resolve_expression(self, query=None, *args, **kwargs):
        if query is None:
            return self

        helper = MPTTFieldHelper(query)
        diff = helper.right - helper.left - Value(1)

        # integer division floors the result in postgres
        return diff / Value(2)


class DescendantJoinExpression(DescendantExpression):
    def __init__(self, *args, **kwargs):
        self.join = kwargs.pop('join')
        super(DescendantJoinExpression, self).__init__(*args, **kwargs)


class IsChildCondition(DescendantJoinExpression):
    def resolve_conditions(self, helper):
        return [
            self.filter_condition(self.join.parent, '=', helper.id)
        ]


class IsDescendantCondition(DescendantJoinExpression):
    def __init__(self, *args, **kwargs):
        self.include_self = kwargs.pop('include_self', False)
        super(IsDescendantCondition, self).__init__(*args, **kwargs)

    def resolve_conditions(self, helper):
        left_op = '>='
        right_op = '<='

        if not self.include_self:
            left_op = '>'
            right_op = '<'

        return [
            self.filter_condition(self.join.left, left_op, helper.left),
            self.filter_condition(self.join.left, right_op, helper.right),
        ]


class IsResourceDescendantCondition(IsDescendantCondition):
    def resolve_conditions(self, helper):
        conditions = super(IsResourceDescendantCondition, self).resolve_conditions(helper)
        conditions.append(self.filter_condition(self.join.kind_id, '!=', Value(content_kinds.TOPIC)))
        return conditions


class IsCoachDescendantCondition(IsDescendantCondition):
    def resolve_conditions(self, helper):
        conditions = super(IsCoachDescendantCondition, self).resolve_conditions(helper)
        conditions.append(CombinedExpression(self.join.role_visibility, '=', Value(roles.COACH)))
        return conditions


class HasChangedDescendantCondition(IsDescendantCondition):
    def resolve_conditions(self, helper):
        conditions = super(HasChangedDescendantCondition, self).resolve_conditions(helper)
        conditions.append(CombinedExpression(helper.changed, 'IS', Value(True)))
        return conditions


DESCENDANT_COUNT = 'descendant_count'
RESOURCE_COUNT = 'resource_count'
COACH_COUNT = 'coach_count'
MAX_SORT_ORDER = 'max_sort_order'
HAS_CHANGED_DESCENDANT = 'has_changed_descendant'


class MetadataQuery(object):
    """
    Helper class to query for various ContentNode metadata, for multiple node-trees, in a single
    database query
    """
    def __init__(self, node_pks):
        """
        :param node_pks: list of ContentNode ID's
        """
        self.node_pks = node_pks
        self.query = ContentNode.objects.filter(pk__in=self.node_pks)
        self.annotations = {}
        self.join = None

    def get_join(self):
        if self.join:
            return self.join

        # be sure to clear ordering, to avoid influencing GROUP BY
        self.join = DescendantJoin(ContentNode.objects.all().order_by(), tree_id='tree_id')
        self.query = self.query.joining(self.join)
        return self.join

    def build_count_case_expression(self, condition):
        return Count(
            Case(
                When(WhenQ(condition), self.join.id),
                default=Value(None)
            ),
            distinct=True
        )

    def add_descendant_count(self):
        """
        @see MPTTModel.get_descendant_count()
        """
        # Use MAX to trigger aggregating, and GROUP BY in Django
        self.annotations[DESCENDANT_COUNT] = Max(DescendantCount())
        return self

    def add_resource_count(self):
        self.annotations[RESOURCE_COUNT] = self.build_count_case_expression(
            IsResourceDescendantCondition(join=self.get_join()))
        return self

    def add_coach_count(self):
        self.annotations[COACH_COUNT] = self.build_count_case_expression(
            IsCoachDescendantCondition(join=self.get_join()))
        return self

    def add_max_sort_order(self):
        join = self.get_join()
        self.annotations[MAX_SORT_ORDER] = Coalesce(
            Max(
                Case(
                    When(WhenQ(IsChildCondition(join=join)), join.sort_order),
                    default=Value(None)
                )
            ),
            Value(1)
        )
        return self

    def add_has_changed_descendant(self):
        join = self.get_join()
        self.annotations[HAS_CHANGED_DESCENDANT] = Coalesce(
            BoolOr(
                Case(
                    When(WhenQ(IsDescendantCondition(join=join)), join.changed),
                    default=Value(None)
                )
            ),
            Value(False)
        )
        return self

    def retrieve_metadata(self):
        if len(self.annotations) == 0:
            raise ValueError('No metadata to retrieve')

        results = self.query.values('id').annotate(**self.annotations).order_by()
        return {result.pop('id'): result for result in results}
