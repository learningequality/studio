from __future__ import division

import copy
import logging

from django.db.models import Q
from django_bulk_update.helper import bulk_update
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentTag
from contentcuration.models import File


def sync_channel(
    channel,
    sync_attributes=False,
    sync_tags=False,
    sync_files=False,
    sync_assessment_items=False,
    progress_tracker=None,
):
    """
    :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
    """
    nodes_to_sync = channel.main_tree.get_descendants().filter(
        Q(original_node__isnull=False)
        | Q(original_channel_id__isnull=False, original_source_node_id__isnull=False)
    )
    sync_node_count = nodes_to_sync.count()
    if not sync_node_count:
        raise ValueError("Tried to sync a channel that has no imported content")
    if progress_tracker:
        progress_tracker.set_total(sync_node_count)

    for node in nodes_to_sync:
        node = sync_node(
            node,
            sync_attributes=sync_attributes,
            sync_tags=sync_tags,
            sync_files=sync_files,
            sync_assessment_items=sync_assessment_items,
        )
        if progress_tracker:
            progress_tracker.increment()
        if node.changed:
            node.save()


def sync_node(
    node,
    sync_attributes=False,
    sync_tags=False,
    sync_files=False,
    sync_assessment_items=False,
):
    original_node = node.get_original_node()
    if original_node.node_id != node.node_id:  # Only update if node is not original
        logging.info(
            "----- Syncing: {} from {}".format(
                node.title, original_node.get_channel().name
            )
        )
        if sync_attributes:  # Sync node metadata
            sync_node_data(node, original_node)
        if sync_tags:  # Sync node tags
            sync_node_tags(node, original_node)
        if sync_files:  # Sync node files
            sync_node_files(node, original_node)
        if (
            sync_assessment_items and node.kind_id == content_kinds.EXERCISE
        ):  # Sync node exercises
            sync_node_assessment_items(node, original_node)
    return node


def sync_node_data(node, original):
    node.title = original.title
    node.description = original.description
    node.license_id = original.license_id
    node.copyright_holder = original.copyright_holder
    node.author = original.author
    node.extra_fields = original.extra_fields
    # Set changed if anything has changed
    node.on_update()


def sync_node_tags(node, original):
    # Remove tags that aren't in original
    for tag in node.tags.exclude(
        tag_name__in=original.tags.values_list("tag_name", flat=True)
    ):
        node.tags.remove(tag)
        node.changed = True
    # Add tags that are in original
    for tag in original.tags.exclude(
        tag_name__in=node.tags.values_list("tag_name", flat=True)
    ):
        new_tag = ContentTag.objects.filter(
            tag_name=tag.tag_name, channel_id=None,
        ).first()
        if not new_tag:
            new_tag = ContentTag.objects.create(tag_name=tag.tag_name, channel_id=None)
        node.tags.add(new_tag)
        node.changed = True


def sync_node_files(node, original):
    """
    Sync all files in ``node`` from the files in ``original`` node.
    """
    node_files = {}

    for file in node.files.all():
        if file.preset_id == format_presets.VIDEO_SUBTITLE:
            file_key = "{}:{}".format(file.preset_id, file.language_id)
        else:
            file_key = file.preset_id
        node_files[file_key] = file

    source_files = {}

    for file in original.files.all():
        if file.preset_id == format_presets.VIDEO_SUBTITLE:
            file_key = "{}:{}".format(file.preset_id, file.language_id)
        else:
            file_key = file.preset_id
        source_files[file_key] = file

    files_to_delete = []
    files_to_create = []
    # B. Add all files that are in original
    for file_key, source_file in source_files.items():
        # 1. Look for old file with matching preset (and language if subs file)
        node_file = node_files.get(file_key)
        if not node_file or node_file.checksum != source_file.checksum:
            if node_file:
                files_to_delete.append(node_file.id)
            source_file.id = None
            source_file.contentnode_id = node.id
            files_to_create.append(source_file)
            node.changed = True

    if files_to_delete:
        File.objects.filter(id__in=files_to_delete).delete()

    if files_to_create:
        File.objects.bulk_create(files_to_create)


assessment_item_fields = (
    "type",
    "question",
    "hints",
    "answers",
    "order",
    "raw_data",
    "source_url",
    "randomize",
    "deleted",
)


def sync_node_assessment_items(node, original):  # noqa C901
    node_assessment_items = {}

    for ai in node.assessment_items.all():
        node_assessment_items[ai.assessment_id] = ai

    node.extra_fields = original.extra_fields
    files_to_delete = []
    files_to_create = []

    ai_to_update = []

    for source_ai in original.assessment_items.all():
        ai_id = source_ai.assessment_id
        node_ai = node_assessment_items.get(ai_id)
        if not node_ai:
            node_ai = copy.copy(source_ai)
            node_ai.id = None
            node_ai.contentnode_id = node.id
            node_ai.save()
            node.changed = True
        else:
            for field in assessment_item_fields:
                setattr(node_ai, field, getattr(source_ai, field))
            if node_ai.has_changes():
                ai_to_update.append(node_ai)
            node_assessment_items.pop(ai_id)
        node_ai_files = {}
        if node_ai.id is not None:
            for file in node_ai.files.all():
                node_ai_files[file.checksum] = file
        for file in source_ai.files.all():
            if file.checksum not in node_ai_files:
                file.id = None
                file.assessment_item_id = node_ai.id
                files_to_create.append(file)
            else:
                node_ai_files.pop(file.checksum)
        files_to_delete.extend([f.id for f in node_ai_files.values()])

    ai_to_delete = [a.id for a in node_assessment_items.values()]
    if ai_to_delete:
        AssessmentItem.objects.filter(id__in=ai_to_delete).delete()
        node.changed = True

    if ai_to_update:
        bulk_update(ai_to_update, update_fields=assessment_item_fields)
        node.changed = True

    if files_to_delete:
        File.objects.filter(id__in=files_to_delete).delete()
        node.changed = True

    if files_to_create:
        File.objects.bulk_create(files_to_create)
        node.changed = True
