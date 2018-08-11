"""
This module acts as the only interface point between other apps and the database backend for the content.
"""
import hashlib
import json
import logging
import os
import shutil
from cStringIO import StringIO

import contentcuration.models as models
from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from django.core.files.storage import default_storage
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils.translation import ugettext as _
from le_utils.constants import format_presets, content_kinds, file_formats
import contentcuration.models as models
from contentcuration.tasks import deletetree_task

def check_health_check_browser(user_agent_string):
    """
    Check if the user agent string matches either the Kubernetes or
    the Google Health Check agents.
    """

    if not user_agent_string:
        return False

    for expected_agent in settings.HEALTH_CHECK_BROWSERS:
        if expected_agent in user_agent_string:
            return True


def write_file_to_storage(fobj, check_valid=False, name=None):
    fobj.seek(0) # Make sure reading file from beginning
    # Check that hash is valid
    checksum = hashlib.md5()
    for chunk in iter(lambda: fobj.read(4096), b""):
        checksum.update(chunk)
    name = name or fobj._name or ""
    filename, ext = os.path.splitext(name)
    hashed_filename = checksum.hexdigest()
    full_filename = "{}{}".format(hashed_filename, ext.lower())
    fobj.seek(0)

    if check_valid and hashed_filename != filename:
        raise SuspiciousOperation("Failed to upload file {0}: hash is invalid".format(name))

    # Get location of file
    file_path = models.generate_object_storage_name(hashed_filename, full_filename)

    # Write file
    storage = default_storage
    storage.save(file_path, fobj)
    return full_filename


def write_raw_content_to_storage(contents, ext=None):
    # Check that hash is valid
    checksum = hashlib.md5()
    checksum.update(contents)
    hashed_filename = checksum.hexdigest()
    full_filename = "{}.{}".format(hashed_filename, ext.lower())

    # Get location of file
    file_path = models.generate_object_storage_name(hashed_filename, full_filename)

    # Write file
    storage = default_storage
    storage.save(file_path, StringIO(contents))

    return hashed_filename, full_filename, file_path

def get_hash(fobj):
    md5 = hashlib.md5()
    for chunk in fobj.chunks():
        md5.update(chunk)
    fobj.seek(0)
    return md5.hexdigest()


def recurse(node, level=0):
    print ('\t' * level), node.id, node.lft, node.rght, node.title
    for child in models.ContentNode.objects.filter(parent=node).order_by('sort_order'):
        recurse(child, level + 1)


def clean_db():
    logging.debug("*********** CLEANING DATABASE ***********")
    for file_obj in models.File.objects.filter(Q(preset=None) & Q(contentnode=None)):
        logging.debug("Deletng unreferenced file {0}".format(file_obj.__dict__))
        file_obj.delete()
    for node_obj in models.ContentNode.objects.filter(Q(parent=None) & Q(channel_main=None) & Q(channel_trash=None) & Q(user_clipboard=None)):
        logging.debug("Deletng unreferenced node: {0}".format(node_obj.pk))
        node_obj.delete()
    for tag_obj in models.ContentTag.objects.filter(tagged_content=None):
        logging.debug("Deleting unreferenced tag: {0}".format(tag_obj.tag_name))
        tag_obj.delete()
    logging.debug("*********** DONE ***********")


def calculate_node_metadata(node):
    metadata = {
        "total_count": node.children.count(),
        "resource_count": 0,
        "max_sort_order": 1,
        "resource_size": 0,
        "has_changed_descendant": node.changed
    }

    if node.kind_id == "topic":
        for n in node.children.all():
            metadata['max_sort_order'] = max(n.sort_order, metadata['max_sort_order'])
            child_metadata = calculate_node_metadata(n)
            metadata['total_count'] += child_metadata['total_count']
            metadata['resource_size'] += child_metadata['resource_size']
            metadata['resource_count'] += child_metadata['resource_count']
            metadata['has_changed_descendant'] = metadata['has_changed_descendant'] or child_metadata['has_changed_descendant']

    else:
        metadata['resource_count'] = 1
        for f in node.files.values_list('file_size'):
            metadata['resource_size'] += f[0]
        metadata['max_sort_order'] = node.sort_order

    return metadata


def count_files(node):
    if node.kind_id == "topic":
        count = 0
        for n in node.children.all():
            count += count_files(n)
        return count
    return 1


def count_all_children(node):
    count = node.children.count()
    for n in node.children.all():
        count += count_all_children(n)
    return count


def get_total_size(node):
    total_size = 0
    if node.kind_id == "topic":
        for n in node.children.all():
            total_size += get_total_size(n)
    else:
        for f in node.files.all():
            total_size += f.file_size
    return total_size


def get_node_siblings(node):
    siblings = []
    for n in node.get_siblings(include_self=False):
        siblings.append(n.title)
    return siblings


def get_node_ancestors(node):
    ancestors = []
    for n in node.get_ancestors():
        ancestors.append(n.id)
    return ancestors


def get_child_names(node):
    names = []
    for n in node.get_children():
        names.append({"title": n.title, "id": n.id})
    return names


def batch_add_tags(request):
    # check existing tag and subtract them from bulk_create
    insert_list = []
    tag_names = request.POST.getlist('tags[]')
    existing_tags = models.ContentTag.objects.filter(tag_name__in=tag_names)
    existing_tag_names = existing_tags.values_list('tag_name', flat=True)
    new_tag_names = set(tag_names) - set(existing_tag_names)
    for name in new_tag_names:
        insert_list.append(models.ContentTag(tag_name=name))
    new_tags = models.ContentTag.objects.bulk_create(insert_list)

    # bulk add all tags to selected nodes
    all_tags = set(existing_tags).union(set(new_tags))
    ThroughModel = models.Node.tags.through
    bulk_list = []
    node_pks = request.POST.getlist('nodes[]')
    for tag in all_tags:
        for pk in node_pks:
            bulk_list.append(ThroughModel(node_id=pk, contenttag_id=tag.pk))
    ThroughModel.objects.bulk_create(bulk_list)

    return HttpResponse("Tags are successfully saved.", status=200)


def add_editor_to_channel(invitation):
    if invitation.share_mode == models.VIEW_ACCESS:
        if invitation.invited in invitation.channel.editors.all():
            invitation.channel.editors.remove(invitation.invited)
        invitation.channel.viewers.add(invitation.invited)
    else:
        if invitation.invited in invitation.channel.viewers.all():
            invitation.channel.viewers.remove(invitation.invited)
        invitation.channel.editors.add(invitation.invited)
    invitation.channel.save()
    invitation.delete()


def activate_channel(channel, user):
    user.check_channel_space(channel)

    if channel.previous_tree and channel.previous_tree != channel.main_tree:
        garbage_node = models.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
        channel.previous_tree.parent = garbage_node
        channel.previous_tree.title = "Previous tree for channel {}".format(channel.pk)
        channel.previous_tree.save()

    channel.previous_tree = channel.main_tree
    channel.main_tree = channel.staging_tree
    channel.staging_tree = None
    channel.save()

    user.staged_files.all().delete()


def get_staged_diff(channel_id):
    channel = models.Channel.objects.get(pk=channel_id)

    has_main = channel.main_tree
    has_staging = channel.staging_tree

    main_descendants = channel.main_tree.get_descendants() if has_main else None
    updated_descendants = channel.staging_tree.get_descendants() if has_staging else None

    original_stats = main_descendants.values('kind_id').annotate(count=Count('kind_id')).order_by() if has_main else {}
    updated_stats = updated_descendants.values('kind_id').annotate(count=Count('kind_id')).order_by() if has_staging else {}

    original_file_sizes = main_descendants.aggregate(
        resource_size=Sum('files__file_size'),
        assessment_size=Sum('assessment_items__files__file_size'),
        assessment_count=Count('assessment_items'),
    ) if has_main else {}

    updated_file_sizes = updated_descendants.aggregate(
        resource_size=Sum('files__file_size'),
        assessment_size=Sum('assessment_items__files__file_size'),
        assessment_count=Count('assessment_items')
    ) if has_staging else {}

    original_file_size = (original_file_sizes.get('resource_size') or 0) + (original_file_sizes.get('assessment_size') or 0)
    updated_file_size = (updated_file_sizes.get('resource_size') or 0) + (updated_file_sizes.get('assessment_size') or 0)
    original_question_count = original_file_sizes.get('assessment_count') or 0
    updated_question_count = updated_file_sizes.get('assessment_count') or 0

    stats = [
        {
            "field": _("Date/Time Created"),
            "live": channel.main_tree.created.strftime("%x %X") if main_descendants else _("Not Available"),
            "staged": channel.staging_tree.created.strftime("%x %X") if updated_descendants else _("Not Available"),
        },
        {
            "field": _("Ricecooker Version"),
            "live": json.loads(channel.main_tree.extra_fields).get('ricecooker_version') if has_main and channel.main_tree.extra_fields else "---",
            "staged": json.loads(channel.staging_tree.extra_fields).get('ricecooker_version') if has_staging and channel.staging_tree.extra_fields else "---",
        },
        {
            "field": _("File Size"),
            "live": original_file_size,
            "staged": updated_file_size,
            "difference": updated_file_size - original_file_size,
            "format_size": True,
        },
    ]

    for kind, name in content_kinds.choices:
        original = original_stats.get(kind_id=kind)['count'] if has_main and original_stats.filter(kind_id=kind).exists() else 0
        updated = updated_stats.get(kind_id=kind)['count'] if has_staging and updated_stats.filter(kind_id=kind).exists() else 0
        stats.append({ "field": _("# of {}s".format(name)), "live": original, "staged": updated, "difference": updated - original })

    # Add number of questions
    stats.append({
        "field": _("# of Questions"),
        "live": original_question_count,
        "staged": updated_question_count,
        "difference": updated_question_count - original_question_count,
    })

    # Add number of subtitles
    original_subtitle_count = main_descendants.filter(files__preset_id=format_presets.VIDEO_SUBTITLE).count() if has_main else 0
    updated_subtitle_count = updated_descendants.filter(files__preset_id=format_presets.VIDEO_SUBTITLE).count() if has_staging else 0
    stats.append({
        "field": _("# of Subtitles"),
        "live": original_subtitle_count,
        "staged": updated_subtitle_count,
        "difference": updated_subtitle_count - original_subtitle_count,
    })

    return stats

def compress_nodes(ids, ffmpeg_settings=None, overwrite=False):
    from contentcuration.utils.files import compress_video_wrapper

    for node in models.ContentNode.objects.filter(pk__in=ids):
        if node.kind_id == content_kinds.VIDEO:
            logging.debug("Compressing {}...".format(node.title))
            uncompressed_file = node.files.filter(preset_id=format_presets.VIDEO_HIGH_RES).first()\
                                or node.files.filter(preset_id=format_presets.VIDEO_LOW_RES).first()
            if uncompressed_file:
                compressed_file = compress_video_wrapper(uncompressed_file, ffmpeg_settings=ffmpeg_settings)
                logging.debug("   Compressed file {} to {}".format(str(uncompressed_file), str(compressed_file)))

                compressed_file.contentnode = node
                compressed_file.save()

                if overwrite:
                    uncompressed_file.delete()
                else:
                    uncompressed_file.preset_id = format_presets.VIDEO_HIGH_RES
                    uncompressed_file.save()

        elif node.kind_id == content_kinds.TOPIC:
            compress_nodes(node.children.values_list('pk', flat=True), ffmpeg_settings=ffmpeg_settings, overwrite=overwrite)

    logging.debug("COMPRESSION COMPLETE")
