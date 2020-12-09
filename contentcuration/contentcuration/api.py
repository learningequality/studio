"""
This module contains utility functions used by API endpoints.
"""
from future import standard_library
standard_library.install_aliases()
import hashlib
import json
import logging
import os
from io import BytesIO

from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from django.core.files.storage import default_storage
from django.db.models import Count
from django.db.models import Sum
from django.utils.translation import ugettext as _
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

import contentcuration.models as models
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.constants import CHANNEL


def write_file_to_storage(fobj, check_valid=False, name=None):
    fobj.seek(0)  # Make sure reading file from beginning
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
    if storage.exists(file_path):
        logging.info("{} exists in Google Cloud Storage, so it's not saved again.".format(file_path))
    else:
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
    if storage.exists(file_path):
        logging.info("{} exists in Google Cloud Storage, so it's not saved again.".format(file_path))
    else:
        storage.save(file_path, BytesIO(contents))

    return hashed_filename, full_filename, file_path


def get_hash(fobj):
    md5 = hashlib.md5()
    for chunk in fobj.chunks():
        md5.update(chunk)
    fobj.seek(0)
    return md5.hexdigest()


def activate_channel(channel, user):
    user.check_channel_space(channel)

    if channel.previous_tree and channel.previous_tree != channel.main_tree:
        # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
        with models.ContentNode.objects.disable_mptt_updates():
            garbage_node = get_deleted_chefs_root()
            channel.previous_tree.parent = garbage_node
            channel.previous_tree.title = "Previous tree for channel {}".format(channel.pk)
            channel.previous_tree.save()

    channel.previous_tree = channel.main_tree
    channel.main_tree = channel.staging_tree
    channel.staging_tree = None
    channel.save()

    user.staged_files.all().delete()

    change = generate_update_event(
        channel.id,
        CHANNEL,
        {
            "root_id": channel.main_tree.id,
            "staging_root_id": None
        },
    )
    return change


def _get_staged_diff_filepath(channel_id):
    return os.path.join(settings.DIFFS_ROOT, '{}.json'.format(channel_id))


def _get_staged_created_time(channel):
    return channel.staging_tree.created.strftime('%Y-%m-%d %H:%M:%S')


def get_staged_diff_if_available(channel_id):
    jsonpath = _get_staged_diff_filepath(channel_id)
    if default_storage.exists(jsonpath):
        channel = models.Channel.objects.get(pk=channel_id)
        with default_storage.open(jsonpath, 'rb') as jsonfile:
            data = json.load(jsonfile)
            if data['generated'] == _get_staged_created_time(channel):
                return data
    return None


def get_staged_diff(channel_id):
    import time
    time.sleep(10)
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
            "live": channel.main_tree.extra_fields.get('ricecooker_version') if has_main and channel.main_tree.extra_fields else "---",
            "staged": channel.staging_tree.extra_fields.get('ricecooker_version') if has_staging and channel.staging_tree.extra_fields else "---",
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
        stats.append({"field": _("# of {}s".format(name)), "live": original, "staged": updated, "difference": updated - original})

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

    # Do one more check before we write the json file in case multiple tasks were triggered
    # and we need to ensure that we don't overwrite the latest version of the staged diff
    jsondata = get_staged_diff_if_available(channel_id)
    staged_creation_time = _get_staged_created_time(channel)

    if not jsondata or jsondata['generated'] <= staged_creation_time:
        jsondata = {
            'generated': staged_creation_time,
            'stats': stats
        }
        jsonpath = _get_staged_diff_filepath(channel_id)
        default_storage.save(jsonpath, BytesIO(json.dumps(jsondata).encode('utf-8')))

    return jsondata
