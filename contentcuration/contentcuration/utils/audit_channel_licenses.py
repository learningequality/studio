"""
Utility functions for auditing channel licenses for community library submission.
"""
import logging
import os

from django.conf import settings
from django.core.files.storage import default_storage as storage
from kolibri_content.models import ContentNode as KolibriContentNode
from kolibri_public.utils.export_channel_to_kolibri_public import (
    using_temp_migrated_content_database,
)
from le_utils.constants import content_kinds
from le_utils.constants import licenses

from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import License
from contentcuration.models import User
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.utils import generate_update_event

logger = logging.getLogger(__name__)


def _get_content_database_path(channel_id, channel_version):
    """
    Get the path to the content database for a channel version.
    Returns the versioned database path if it exists, otherwise the unversioned path.
    """
    versioned_db_path = os.path.join(
        settings.DB_ROOT, f"{channel_id}-{channel_version}.sqlite3"
    )
    unversioned_db_path = os.path.join(settings.DB_ROOT, f"{channel_id}.sqlite3")

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
    """Process the content database to calculate included_licenses and special permissions."""
    db_path = _get_content_database_path(channel_id, channel_version)
    if not db_path:
        return (included_licenses or []), None

    with using_temp_migrated_content_database(db_path):
        # Calculate included_licenses if not provided
        if included_licenses is None:
            license_names = list(
                KolibriContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(license_name__isnull=True)
                .exclude(license_name="")
                .values_list("license_name", flat=True)
                .distinct()
            )

            license_ids = []
            for license_name in license_names:
                studio_license = License.objects.get(license_name=license_name)
                license_ids.append(studio_license.id)

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

def calculate_included_licenses(channel_id, channel_version, published_data_version):
    """Calculate and cache included_licenses from the content database if not already present."""
    included_licenses = published_data_version.get("included_licenses")
    if not included_licenses:
        included_licenses, _ = _process_content_database(
            channel_id, channel_version
        )
        published_data_version["included_licenses"] = included_licenses

    return included_licenses


def check_invalid_licenses(included_licenses):
    """Check for invalid licenses (All Rights Reserved)."""
    invalid_license_ids = []
    all_rights_reserved_license = License.objects.get(
        license_name=licenses.ALL_RIGHTS_RESERVED
    )
    if all_rights_reserved_license.id in included_licenses:
        invalid_license_ids = [all_rights_reserved_license.id]

    return invalid_license_ids

def save_audit_results(
    channel,
    published_data_version,
    invalid_license_ids,
    special_permissions_license_ids,
    user_id,
):
    """Save audit results to published_data and create change event."""
    published_data_version["community_library_invalid_licenses"] = (
        invalid_license_ids if invalid_license_ids else None
    )
    published_data_version["community_library_special_permissions"] = (
        special_permissions_license_ids if special_permissions_license_ids else None
    )

    channel.save()

    Change.create_change(
        generate_update_event(
            channel.id,
            CHANNEL,
            {"published_data": channel.published_data},
            channel_id=channel.id,
        ),
        applied=True,
        created_by_id=user_id,
    )

def audit_channel_licenses(channel_id, user_id):
    user, channel = get_channel_and_user(channel_id, user_id)
    if not user or not channel:
        return

    channel_version = channel.version
    version_str = str(channel_version)

    if version_str not in channel.published_data:
        channel.published_data[version_str] = {}

    published_data_version = channel.published_data[version_str]

    included_licenses = published_data_version.get("included_licenses")
    
    if included_licenses:
        invalid_license_ids = check_invalid_licenses(included_licenses)
        _, special_permissions_license_ids = _process_content_database(
            channel_id, channel_version, included_licenses=included_licenses
        )
    else:
        included_licenses, special_permissions_license_ids = _process_content_database(
            channel_id, channel_version
        )
        published_data_version["included_licenses"] = included_licenses
        invalid_license_ids = check_invalid_licenses(included_licenses)

    if special_permissions_license_ids is None:
        save_audit_results(
            channel, published_data_version, invalid_license_ids, None, user_id
        )
        return

    save_audit_results(
        channel,
        published_data_version,
        invalid_license_ids,
        special_permissions_license_ids,
        user_id,
    )
