import copy
import logging

from django.db import transaction
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.models import ContentNode
from contentcuration.models import ContentTag


def sync_channel(channel, sync_attributes=False, sync_tags=False, sync_files=False,
                 sync_assessment_items=False, sync_sort_order=False, task_object=None):
    all_nodes = []
    parents_to_check = []  # Keep track of parents to make resorting easier

    sync_node_count = channel.main_tree.get_descendant_count()
    # last 20% is MPTT tree updates
    percent_per_node = 80.0 / sync_node_count
    percent_done = 0.0
    with transaction.atomic():
        with ContentNode.objects.delay_mptt_updates():
            for node in channel.main_tree.get_descendants():
                node, parents = sync_node(node, channel.pk,
                                          sync_attributes=sync_attributes,
                                          sync_tags=sync_tags,
                                          sync_files=sync_files,
                                          sync_assessment_items=sync_assessment_items,
                                          sync_sort_order=sync_sort_order)
                if task_object:
                    percent_done += percent_per_node
                    task_object.update_state(state='STARTED', meta={'progress': percent_done})
                parents_to_check += parents
                if node.changed:
                    node.save()
                all_nodes.append(node)
            # Avoid cases where sort order might have overlapped
            for parent in parents_to_check:
                sort_order = 1
                for child in parent.children.all().order_by('sort_order', 'title'):
                    child.sort_order = sort_order
                    child.save()
                    sort_order += 1
    if task_object:
        task_object.update_state(state='STARTED', meta={'progress': 100.0})
    return all_nodes


def sync_nodes(channel_id, node_ids, sync_attributes=True, sync_tags=True,
               sync_files=True, sync_assessment_items=True, task_object=None):
    all_nodes = []
    with transaction.atomic(), ContentNode.objects.delay_mptt_updates():
        for n in node_ids:
            node, _ = sync_node(ContentNode.objects.get(pk=n), channel_id,
                                sync_attributes=sync_attributes, sync_tags=sync_tags,
                                sync_files=sync_files,
                                sync_assessment_items=sync_assessment_items)
            if node.changed:
                node.save()
            all_nodes.append(node)

    return all_nodes


def sync_node(node, channel_id, sync_attributes=False, sync_tags=False, sync_files=False,
              sync_assessment_items=False, sync_sort_order=False):
    parents_to_check = []
    original_node = node.get_original_node()
    if original_node.node_id != node.node_id:  # Only update if node is not original
        logging.info("----- Syncing: {} from {}".format(node.title,
                                                        original_node.get_channel().name))
        if sync_attributes:  # Sync node metadata
            sync_node_data(node, original_node)
        if sync_tags:  # Sync node tags
            sync_node_tags(node, original_node, channel_id)
        if sync_files:  # Sync node files
            sync_node_files(node, original_node)
        if sync_assessment_items and node.kind_id == content_kinds.EXERCISE:  # Sync node exercises
            sync_node_assessment_items(node, original_node)
        if sync_sort_order:  # Sync node sort order
            node.sort_order = original_node.sort_order
            if node.parent not in parents_to_check:
                parents_to_check.append(node.parent)
    return node, parents_to_check


def sync_node_data(node, original):
    node.title = original.title
    node.description = original.description
    node.license = original.license
    node.copyright_holder = original.copyright_holder
    node.changed = True
    node.author = original.author
    node.extra_fields = original.extra_fields


def sync_node_tags(node, original, channel_id):
    # Remove tags that aren't in original
    for tag in node.tags.exclude(tag_name__in=original.tags.values_list('tag_name', flat=True)):
        node.tags.remove(tag)
        node.changed = True
    # Add tags that are in original
    for tag in original.tags.exclude(tag_name__in=node.tags.values_list('tag_name', flat=True)):
        new_tag, is_new = ContentTag.objects.get_or_create(
            tag_name=tag.tag_name,
            channel_id=channel_id,
        )
        node.tags.add(new_tag)
        node.changed = True


def sync_node_files(node, original):
    """
    Sync all files in ``node`` from the files in ``original`` node.
    """
    # A. Delete files that aren't in original
    node.files.exclude(checksum__in=original.files.values_list('checksum', flat=True)).delete()
    # B. Add all files that are in original
    for f in original.files.all():
        # 1. Look for old file with matching preset (and language if subs file)
        if f.preset_id == format_presets.VIDEO_SUBTITLE:
            oldf = node.files.filter(preset=f.preset, language=f.language).first()
        else:
            oldf = node.files.filter(preset=f.preset).first()
        # 2. Remove oldf if it exists and its checksum has changed
        if oldf:
            if oldf.checksum == f.checksum:
                continue             # No need to copy file if it hasn't changed
            else:
                oldf.delete()
                node.changed = True
        # 3. Copy over new file from original node
        fcopy = copy.copy(f)
        fcopy.id = None
        fcopy.contentnode = node
        fcopy.save()
        node.changed = True


def sync_node_assessment_items(node, original):
    node.extra_fields = original.extra_fields
    node.changed = True
    # Clear assessment items on node
    node.assessment_items.all().delete()
    # Add assessment items onto node
    for ai in original.assessment_items.all():
        ai_copy = copy.copy(ai)
        ai_copy.id = None
        ai_copy.contentnode = node
        ai_copy.save()
        for f in ai.files.all():
            f_copy = copy.copy(f)
            f_copy.id = None
            f_copy.assessment_item = ai_copy
            f_copy.save()
