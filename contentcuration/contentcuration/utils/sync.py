import copy
import logging

from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentTag
from contentcuration.models import File


def sync_channel(
    channel,
    sync_titles_and_descriptions=False,
    sync_resource_details=False,
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
            sync_titles_and_descriptions=sync_titles_and_descriptions,
            sync_resource_details=sync_resource_details,
            sync_files=sync_files,
            sync_assessment_items=sync_assessment_items,
        )
        if progress_tracker:
            progress_tracker.increment()
        if node.changed:
            node.save()


def sync_node(
    node,
    sync_titles_and_descriptions=False,
    sync_resource_details=False,
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
        if sync_titles_and_descriptions:
            fields = [
                "title",
                "description",
            ]
            sync_node_data(node, original_node, fields)
        if sync_resource_details:
            fields = [
                "license_id",
                "license_description",
                "copyright_holder",
                "author",
                "extra_fields",
                "categories",
                "learner_needs",
                "accessibility_labels",
                "grade_levels",
                "resource_types",
                "learning_activities",
            ]
            sync_node_data(node, original_node, fields)
            sync_node_tags(node, original_node)
        if sync_files:
            sync_node_files(node, original_node)
        if (
            sync_assessment_items and node.kind_id == content_kinds.EXERCISE
        ):
            sync_node_assessment_items(node, original_node)
    return node


def sync_node_data(node, original, fields):
    for field in fields:
        setattr(node, field, getattr(original, field))
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


def sync_node_files(node, original):  # noqa C901
    """
    Sync all files in ``node`` from the files in ``original`` node.
    """
    is_node_uploaded_file = False

    source_files = {}

    # 1. Build a hashmap of all original node files.
    for file in original.files.all():
        if file.preset_id == format_presets.VIDEO_SUBTITLE:
            file_key = "{}:{}".format(file.preset_id, file.language_id)
        else:
            file_key = file.preset_id
        source_files[file_key] = file
        # If node has any non-thumbnail file then it means the node
        # is an uploaded file.
        if file.preset.thumbnail is False:
            is_node_uploaded_file = True

    # 2. Iterate through the copied node files. If the copied node file and
    # source file are same then we remove it from source_files hashmap.
    # Else we mark that file for deletion.
    files_to_delete = []
    for file in node.files.all():
        if file.preset_id == format_presets.VIDEO_SUBTITLE:
            file_key = "{}:{}".format(file.preset_id, file.language_id)
        else:
            file_key = file.preset_id
        source_file = source_files.get(file_key)
        if source_file and source_file.checksum == file.checksum:
            del source_files[file_key]
        else:
            files_to_delete.append(file.id)

    # 3. Mark all files present in source_files hashmap for creation.
    # Files that are not in copied node but in source node
    # will be present in source_files hashmap.
    files_to_create = []
    for source_file in source_files.values():
        source_file.id = None
        source_file.contentnode_id = node.id
        files_to_create.append(source_file)

    if files_to_delete:
        File.objects.filter(id__in=files_to_delete).delete()
        node.changed = True

    if files_to_create:
        File.objects.bulk_create(files_to_create)
        node.changed = True

    if node.changed and is_node_uploaded_file:
        node.content_id = original.content_id


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
        AssessmentItem.objects.bulk_update(ai_to_update, list(assessment_item_fields))
        node.changed = True

    if files_to_delete:
        File.objects.filter(id__in=files_to_delete).delete()
        node.changed = True

    if files_to_create:
        File.objects.bulk_create(files_to_create)
        node.changed = True

    # Now, node and its original have same content so
    # let us equalize its content_id.
    if node.changed:
        node.content_id = original.content_id
