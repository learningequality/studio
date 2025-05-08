#!/usr/bin/env python
"""
Studio garbage collection utilities. Clean up all these old, unused records!
"""
import datetime
import logging

from celery import states
from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Subquery
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import Exists
from django.db.models.expressions import F
from django.db.models.expressions import OuterRef
from django.db.models.expressions import Value
from django.db.models.signals import post_delete
from django.utils.timezone import now
from django_celery_results.models import TaskResult
from le_utils.constants import content_kinds

from contentcuration.constants import feature_flags
from contentcuration.constants import user_history
from contentcuration.db.models.functions import JSONObjectKeys
from contentcuration.models import ContentNode
from contentcuration.models import CustomTaskMetadata
from contentcuration.models import File
from contentcuration.models import User
from contentcuration.models import UserHistory


class DisablePostDeleteSignal(object):
    """
    Helper that disables the post_delete signal temporarily when deleting, so Morango doesn't
    create DeletedModels objects for what we're deleting
    """

    def __enter__(self):
        self.receivers = post_delete.receivers
        post_delete.receivers = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        post_delete.receivers = self.receivers
        self.receivers = None


def get_deleted_chefs_root():
    deleted_chefs_node, _new = ContentNode.objects.get_or_create(
        pk=settings.DELETED_CHEFS_ROOT_ID, kind_id=content_kinds.TOPIC
    )
    return deleted_chefs_node


def _clean_up_files(contentnode_ids):
    """
    Clean up the files (both in the DB and in object storage)
    associated with the `contentnode_ids` iterable that are
    not pointed by any other contentnode.
    """
    files = File.objects.filter(contentnode__in=contentnode_ids)
    files_on_storage = files.values_list("file_on_disk", flat=True)

    for disk_file_path in files_on_storage:
        is_other_node_pointing = Exists(
            File.objects.filter(file_on_disk=disk_file_path).exclude(
                contentnode__in=contentnode_ids
            )
        )
        if not is_other_node_pointing:
            default_storage.delete(disk_file_path)

    # use _raw_delete for much fast file deletions
    files._raw_delete(files.db)


def clean_up_soft_deleted_users():
    """
    Hard deletes user related data for soft deleted users that are older than ACCOUNT_DELETION_BUFFER.

    Note: User record itself is not hard deleted.

    User related data that gets hard deleted are:
        - sole editor non-public channels.
        - sole editor non-public channelsets.
        - sole editor non-public channels' content nodes and its underlying files that are not
          used by any other channel.
        - all user invitations.
    """
    account_deletion_buffer_delta = now() - datetime.timedelta(
        days=settings.ACCOUNT_DELETION_BUFFER
    )
    user_latest_deletion_time_subquery = Subquery(
        UserHistory.objects.filter(user_id=OuterRef("id"), action=user_history.DELETION)
        .values("performed_at")
        .order_by("-performed_at")[:1]
    )
    users_to_delete = User.objects.annotate(
        latest_deletion_time=user_latest_deletion_time_subquery
    ).filter(deleted=True, latest_deletion_time__lt=account_deletion_buffer_delta)

    for user in users_to_delete:
        user.hard_delete_user_related_data()
        logging.info("Hard deleted user related data for user {}.".format(user.email))


def clean_up_deleted_chefs():
    """
    Clean up all deleted chefs attached to the deleted chefs tree, including all
    child nodes in that tree.

    """
    deleted_chefs_node = get_deleted_chefs_root()
    # we cannot use MPTT methods like get_descendants() or use tree_id because for performance reasons
    # we are avoiding MPTT entirely.
    nodes_to_clean_up = ContentNode.objects.filter(parent=deleted_chefs_node)

    # don't delete files until we can ensure files are not referenced anywhere.
    # disable mptt updates as they are disabled when we insert nodes into this tree
    with ContentNode.objects.disable_mptt_updates(), DisablePostDeleteSignal():
        for i, node in enumerate(nodes_to_clean_up):
            try:
                node.delete()
            except ContentNode.DoesNotExist:
                # If it doesn't exist, job done!
                pass
            logging.info("Deleted {} node(s) from the deleted chef tree".format(i + 1))


def clean_up_contentnodes(delete_older_than=settings.ORPHAN_DATE_CLEAN_UP_THRESHOLD):
    """
    Clean up all contentnodes associated with the orphan tree with a `created`
    time older than `delete_older_than`, as well as all files (and their file
    objects on storage) linked to those contentnodes.

    delete_older_than=The age of the contentnode from the current time, before
    it's deleted. Default is two weeks from datetime.now().

    """
    nodes_to_clean_up = ContentNode.objects.filter(
        modified__lt=delete_older_than, parent_id=settings.ORPHANAGE_ROOT_ID
    )

    # delete all files first
    with DisablePostDeleteSignal():
        _clean_up_files(nodes_to_clean_up)

    # Use _raw_delete for fast bulk deletions
    try:
        with DisablePostDeleteSignal():
            count, _ = nodes_to_clean_up.delete()
        logging.info("Deleted {} node(s) from the orphanage tree".format(count))
    except ContentNode.DoesNotExist:
        pass


def clean_up_feature_flags():
    """
    Removes lingering feature flag settings in User records that aren't currently present in the
    feature_flag.json
    """
    current_flag_keys = feature_flags.SCHEMA.get("properties", {}).keys()
    existing_flag_keys = (
        User.objects.annotate(key=JSONObjectKeys("feature_flags"))
        .values_list("key", flat=True)
        .distinct()
    )

    for remove_flag in set(existing_flag_keys) - set(current_flag_keys):
        User.objects.filter(feature_flags__has_key=remove_flag).update(
            feature_flags=CombinedExpression(
                F("feature_flags"), "-", Value(remove_flag)
            )
        )


def clean_up_tasks():
    """
    Removes completed tasks that are older than a week
    """
    with DisablePostDeleteSignal():
        date_cutoff = now() - datetime.timedelta(days=7)

        tasks_to_delete = TaskResult.objects.filter(
            date_done__lt=date_cutoff, status__in=states.READY_STATES
        )
        CustomTaskMetadata.objects.filter(
            task_id__in=tasks_to_delete.values_list("task_id", flat=True)
        ).delete()
        count, _ = tasks_to_delete.delete()
    logging.info("Deleted {} completed task(s) from the task table".format(count))


CHUNKSIZE = 500000


def clean_up_stale_files(last_modified=None):
    """
    Clean up files that aren't attached to any ContentNode, AssessmentItem, or SlideshowSlide and where
    the modified date is older than `last_modified`
    """
    if last_modified is None:
        last_modified = now() - datetime.timedelta(days=30)

    with DisablePostDeleteSignal():
        files_to_clean_up = File.objects.filter(
            contentnode__isnull=True,
            assessment_item__isnull=True,
            slideshow_slide__isnull=True,
            modified__lt=last_modified,
        )

        files_to_clean_up_slice = files_to_clean_up.values_list("id", flat=True)[
            0:CHUNKSIZE
        ]

        count = 0

        while files_to_clean_up.exists():
            this_count, _ = File.objects.filter(id__in=files_to_clean_up_slice).delete()

            this_count = len(files_to_clean_up_slice)
            count += this_count
            files_to_clean_up_slice = files_to_clean_up.values_list("id", flat=True)[
                0:CHUNKSIZE
            ]

    logging.info(
        "Files with a modified date older than {} were deleted. Deleted {} file(s).".format(
            last_modified, count
        )
    )
