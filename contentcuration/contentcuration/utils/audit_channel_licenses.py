"""
Utility functions for auditing channel licenses for community library submission.
"""
import logging

from django.core.files.storage import default_storage as storage
from kolibri_content.models import ContentNode as KolibriContentNode
from kolibri_public.utils.export_channel_to_kolibri_public import (
    using_temp_migrated_content_database,
)
from le_utils.constants import content_kinds
from le_utils.constants import licenses

from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.models import License
from contentcuration.models import User
from contentcuration.utils.publish import get_content_db_path

logger = logging.getLogger(__name__)


def _get_content_database_path(channel_id, channel_version):
    """
    Get the path to the content database for a channel version.
    Returns the versioned database path if it exists, otherwise the unversioned path.
    """
    versioned_db_path = get_content_db_path(channel_id, channel_version)
    unversioned_db_path = get_content_db_path(channel_id)

    if storage.exists(versioned_db_path):
        return versioned_db_path

    if storage.exists(unversioned_db_path):
        return unversioned_db_path

    return None


def get_channel_and_user(channel_id, user_id):
    user = User.objects.get(pk=user_id)
    channel = Channel.objects.select_related("main_tree").get(pk=channel_id)

    if user and channel:
        return user, channel
    else:
        return None, None


def _process_content_database(channel_id, channel_version, included_licenses=None):

    db_path = _get_content_database_path(channel_id, channel_version)
    if not db_path:
        raise FileNotFoundError(
            f"Content database not found for channel {channel_id} version {channel_version}. "
            "This indicates missing or corrupted channel data."
        )

    with using_temp_migrated_content_database(db_path):
        if included_licenses is None:
            license_names = list(
                KolibriContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(license_name__isnull=True)
                .exclude(license_name="")
                .values_list("license_name", flat=True)
                .distinct()
            )

            license_ids = list(
                License.objects.filter(license_name__in=license_names).values_list(
                    "id", flat=True
                )
            )

            included_licenses = sorted(set(license_ids))

        special_permissions_license = License.objects.get(
            license_name=licenses.SPECIAL_PERMISSIONS
        )

        if not special_permissions_license:
            return included_licenses, []

        special_permissions_license_ids = []
        if special_permissions_license.id in included_licenses:
            special_perms_nodes = KolibriContentNode.objects.filter(
                license_name=licenses.SPECIAL_PERMISSIONS
            ).exclude(kind=content_kinds.TOPIC)

            license_descriptions = list(
                special_perms_nodes.exclude(license_description__isnull=True)
                .exclude(license_description="")
                .values_list("license_description", flat=True)
                .distinct()
            )

            if license_descriptions:
                existing_licenses = AuditedSpecialPermissionsLicense.objects.filter(
                    description__in=license_descriptions
                )
                existing_descriptions = set(
                    existing_licenses.values_list("description", flat=True)
                )

                new_licenses = [
                    AuditedSpecialPermissionsLicense(
                        description=description, distributable=False
                    )
                    for description in license_descriptions
                    if description not in existing_descriptions
                ]

                if new_licenses:
                    AuditedSpecialPermissionsLicense.objects.bulk_create(
                        new_licenses, ignore_conflicts=True
                    )

                all_licenses = AuditedSpecialPermissionsLicense.objects.filter(
                    description__in=license_descriptions
                )
                special_permissions_license_ids = list(
                    all_licenses.values_list("id", flat=True)
                )

        return included_licenses, special_permissions_license_ids


def check_invalid_licenses(included_licenses):
    """Check for invalid licenses (All Rights Reserved)."""
    invalid_license_ids = []
    all_rights_reserved_license = License.objects.get(
        license_name=licenses.ALL_RIGHTS_RESERVED
    )
    if all_rights_reserved_license.id in included_licenses:
        invalid_license_ids = [all_rights_reserved_license.id]

    return invalid_license_ids


def audit_channel_version(channel_version):
    """
    Compute audit results for a specific ChannelVersion.
    """
    included_licenses, special_permissions_license_ids = _process_content_database(
        channel_version.channel_id,
        channel_version.version,
        included_licenses=channel_version.included_licenses,
    )

    invalid_license_ids = check_invalid_licenses(included_licenses)

    _save_audit_results(
        channel_version,
        invalid_license_ids,
        special_permissions_license_ids,
        included_licenses,
    )


def _save_audit_results(
    channel_version,
    invalid_license_ids,
    special_permissions_license_ids,
    included_licenses,
):
    """Save audit results to ChannelVersion."""
    channel_version.included_licenses = included_licenses
    channel_version.non_distributable_included_licenses = (
        invalid_license_ids if invalid_license_ids else None
    )
    channel_version.save()

    if special_permissions_license_ids:
        channel_version.included_special_permissions.set(
            AuditedSpecialPermissionsLicense.objects.filter(
                id__in=special_permissions_license_ids
            )
        )
    else:
        channel_version.included_special_permissions.clear()


def audit_channel_licenses(channel_id, user_id=None):
    if user_id:
        user, channel = get_channel_and_user(channel_id, user_id)
        if not user or not channel:
            return
    else:
        channel = Channel.objects.select_related("main_tree").get(pk=channel_id)
        if not channel:
            return

    if not channel.version:
        return

    channel_version_obj, _ = ChannelVersion.objects.get_or_create(
        channel=channel, version=channel.version
    )
    audit_channel_version(channel_version_obj)
