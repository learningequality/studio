"""
All task functions decorated with `app.task` transform the function to an instance of
`contentcuration.utils.celery.tasks.CeleryTask`. See the methods of that class for enqueuing and fetching results of
the tasks.
"""
import logging
import os
import time

from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.files.storage import default_storage as storage
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.translation import override

from le_utils.constants import content_kinds

from contentcuration.celery import app
from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.models import User
from contentcuration.utils.csv_writer import write_user_csv
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import generate_diff
from contentcuration.utils.publish import ensure_versioned_database_exists
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.user import AdminUserFilter
from kolibri_content.models import ContentNode as KolibriContentNode
from kolibri_public.utils.export_channel_to_kolibri_public import (
    using_temp_migrated_content_database,
)


logger = get_task_logger(__name__)


@app.task(bind=True, name="apply_user_changes")
def apply_user_changes_task(self, user_id):
    """
    :type self: contentcuration.utils.celery.tasks.CeleryTask
    :param user_id: The user ID for which to process changes
    """
    from contentcuration.viewsets.sync.base import apply_changes

    changes_qs = Change.objects.filter(
        applied=False, errored=False, user_id=user_id, channel__isnull=True
    )
    apply_changes(changes_qs)
    if changes_qs.exists():
        self.requeue()


@app.task(bind=True, name="apply_channel_changes")
def apply_channel_changes_task(self, channel_id):
    """
    :type self: contentcuration.utils.celery.tasks.CeleryTask
    :param channel_id: The channel ID for which to process changes
    """
    from contentcuration.viewsets.sync.base import apply_changes

    changes_qs = Change.objects.filter(
        applied=False, errored=False, channel_id=channel_id
    )
    apply_changes(changes_qs)
    if changes_qs.exists():
        self.requeue()


class CustomEmailMessage(EmailMessage):
    """
    jayoshih: There's an issue with the django postmark backend where
    _build_message attempts to attach files as base64. However,
    the django EmailMessage attach method makes all content with a text/*
    mimetype to be encoded as a string, causing `base64.b64encode(content)`
    to fail. This is a workaround to ensure that content is still encoded as
    bytes when it comes to encoding the attachment as base64
    """

    def attach(self, filename=None, content=None, mimetype=None):
        if filename is None:
            raise AssertionError
        if content is None:
            raise AssertionError
        if mimetype is None:
            raise AssertionError
        self.attachments.append((filename, content, mimetype))


@app.task(name="generateusercsv_task")
def generateusercsv_task(user_id, language=settings.LANGUAGE_CODE):
    with override(language):
        user = User.objects.get(pk=user_id)
        csv_path = write_user_csv(user)
        subject = render_to_string("export/user_csv_email_subject.txt", {})
        subject = "".join(subject.splitlines())
        message = render_to_string(
            "export/user_csv_email.txt",
            {
                "legal_email": settings.POLICY_EMAIL,
                "user": user,
                "edit_channels": user.editable_channels.values("name", "id"),
                "view_channels": user.view_only_channels.values("name", "id"),
            },
        )

        email = CustomEmailMessage(
            subject, message, settings.DEFAULT_FROM_EMAIL, [user.email]
        )
        email.encoding = "utf-8"
        email.attach_file(csv_path, mimetype="text/csv")

        email.send()


@app.task(name="deletetree_task")
def deletetree_task(tree_id):
    ContentNode.objects.filter(tree_id=tree_id).delete()


@app.task(name="getnodedetails_task")
def getnodedetails_task(node_id):
    node = ContentNode.objects.get(pk=node_id)
    return node.get_details()


@app.task(name="generatenodediff_task")
def generatenodediff_task(updated_id, original_id):
    return generate_diff(updated_id, original_id)


@app.task(name="calculate_user_storage_task")
def calculate_user_storage_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        user.set_space_used()
    except User.DoesNotExist:
        logging.error(
            "Tried to calculate user storage for user with id {} but they do not exist".format(
                user_id
            )
        )


@app.task(name="calculate_resource_size_task")
def calculate_resource_size_task(node_id, channel_id):
    node = ContentNode.objects.get(pk=node_id)
    size, _ = calculate_resource_size(node=node, force=True)
    return size


@app.task(name="sendcustomemails_task")
def sendcustomemails_task(subject, message, query):
    subject = render_to_string(
        "registration/custom_email_subject.txt", {"subject": subject}
    )
    subject = "".join(subject.splitlines())
    recipients = AdminUserFilter(data=query).qs.distinct()

    for recipient in recipients:
        text = message.format(
            current_date=time.strftime("%A, %B %d"),
            current_time=time.strftime("%H:%M %Z"),
            **recipient.__dict__
        )
        text = render_to_string("registration/custom_email.txt", {"message": text})
        recipient.email_user(
            subject,
            text,
            settings.DEFAULT_FROM_EMAIL,
        )


@app.task(name="ensure_versioned_database_exists_task")
def ensure_versioned_database_exists_task(channel_id, channel_version):
    ensure_versioned_database_exists(channel_id, channel_version)


@app.task(bind=True, name="audit-channel-licenses")
def audit_channel_licenses_task(self, channel_id, user_id):
    """
    Audits channel licenses for community library submission.
    Checks for invalid licenses (All Rights Reserved) and special permissions licenses,
    and updates the channel's published_data with audit results.

    :type self: contentcuration.utils.celery.tasks.CeleryTask
    :param channel_id: The channel ID to audit
    :param user_id: The user ID requesting the audit
    """
    # Validate user exists and is a channel editor
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} does not exist")
        return

    try:
        channel = Channel.objects.get(pk=channel_id)
    except Channel.DoesNotExist:
        logger.error(f"Channel with id {channel_id} does not exist")
        return

    # Check if user is an editor of the channel
    if not channel.editors.filter(pk=user_id).exists() and not user.is_admin:
        logger.error(
            f"User {user_id} is not an editor of channel {channel_id} and is not an admin"
        )
        return

    # Check if channel is published
    if not channel.main_tree.published:
        logger.error(f"Channel {channel_id} is not published")
        return

    channel_version = channel.version
    version_str = str(channel_version)

    # Initialize published_data for this version if it doesn't exist
    if version_str not in channel.published_data:
        channel.published_data[version_str] = {}

    published_data_version = channel.published_data[version_str]

    # Check/calculate included_licenses
    included_licenses = published_data_version.get("included_licenses")
    if not included_licenses:
        # Query main_tree to get license IDs
        published_nodes = (
            channel.main_tree.get_descendants()
            .filter(published=True)
            .exclude(kind_id=content_kinds.TOPIC)
        )
        license_ids = list(
            published_nodes.exclude(license=None).values_list("license", flat=True).distinct()
        )
        included_licenses = sorted(set(license_ids))
        published_data_version["included_licenses"] = included_licenses
        logger.info(
            f"Calculated included_licenses for channel {channel_id} version {channel_version}: {included_licenses}"
        )

    # Check for invalid licenses (All Rights Reserved)
    invalid_license_ids = []
    try:
        all_rights_reserved_license = License.objects.get(license_name="All Rights Reserved")
        if all_rights_reserved_license.id in included_licenses:
            invalid_license_ids = [all_rights_reserved_license.id]
    except License.DoesNotExist:
        logger.warning("License 'All Rights Reserved' not found in database")
    except License.MultipleObjectsReturned:
        logger.warning("Multiple 'All Rights Reserved' licenses found, using first one")
        all_rights_reserved_license = License.objects.filter(
            license_name="All Rights Reserved"
        ).first()
        if all_rights_reserved_license and all_rights_reserved_license.id in included_licenses:
            invalid_license_ids = [all_rights_reserved_license.id]

    # Check for special permissions licenses
    special_permissions_license_ids = []
    try:
        special_permissions_license = License.objects.get(license_name="Special Permissions")
        if special_permissions_license.id in included_licenses:
            # Download unversioned database and query for special permissions license descriptions
            unversioned_db_filename = f"{channel_id}.sqlite3"
            unversioned_db_storage_path = os.path.join(settings.DB_ROOT, unversioned_db_filename)

            if not storage.exists(unversioned_db_storage_path):
                logger.error(
                    f"Unversioned database not found at {unversioned_db_storage_path} for channel {channel_id}"
                )
                # Set fields to null and continue
                published_data_version["community_library_invalid_licenses"] = (
                    invalid_license_ids if invalid_license_ids else None
                )
                published_data_version["community_library_special_permissions"] = None
                channel.save()
                # Create change
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
                return

            with using_temp_migrated_content_database(unversioned_db_storage_path):
                # Query content database for nodes with Special Permissions license
                special_perms_nodes = KolibriContentNode.objects.filter(
                    license_name="Special Permissions"
                ).exclude(kind=content_kinds.TOPIC)

                # Get unique license descriptions (exclude None/empty)
                license_descriptions = (
                    special_perms_nodes.exclude(license_description__isnull=True)
                    .exclude(license_description="")
                    .values_list("license_description", flat=True)
                    .distinct()
                )

                # Get or create AuditedSpecialPermissionsLicense for each description
                audited_license_ids = []
                for description in license_descriptions:
                    audited_license, created = AuditedSpecialPermissionsLicense.objects.get_or_create(
                        description=description, defaults={"distributable": False}
                    )
                    audited_license_ids.append(audited_license.id)
                    if created:
                        logger.info(
                            f"Created new AuditedSpecialPermissionsLicense for description: {description[:100]}"
                        )

                special_permissions_license_ids = audited_license_ids

    except License.DoesNotExist:
        logger.warning("License 'Special Permissions' not found in database")
    except License.MultipleObjectsReturned:
        logger.warning("Multiple 'Special Permissions' licenses found, using first one")
        special_permissions_license = License.objects.filter(
            license_name="Special Permissions"
        ).first()
        if special_permissions_license and special_permissions_license.id in included_licenses:
            # Same logic as above for querying content database
            unversioned_db_filename = f"{channel_id}.sqlite3"
            unversioned_db_storage_path = os.path.join(settings.DB_ROOT, unversioned_db_filename)

            if storage.exists(unversioned_db_storage_path):
                with using_temp_migrated_content_database(unversioned_db_storage_path):
                    special_perms_nodes = KolibriContentNode.objects.filter(
                        license_name="Special Permissions"
                    ).exclude(kind=content_kinds.TOPIC)

                    license_descriptions = (
                        special_perms_nodes.exclude(license_description__isnull=True)
                        .exclude(license_description="")
                        .values_list("license_description", flat=True)
                        .distinct()
                    )

                    audited_license_ids = []
                    for description in license_descriptions:
                        audited_license, created = (
                            AuditedSpecialPermissionsLicense.objects.get_or_create(
                                description=description, defaults={"distributable": False}
                            )
                        )
                        audited_license_ids.append(audited_license.id)
                        if created:
                            logger.info(
                                f"Created new AuditedSpecialPermissionsLicense for description: {description[:100]}"
                            )

                    special_permissions_license_ids = audited_license_ids

    # Update published_data
    published_data_version["community_library_invalid_licenses"] = (
        invalid_license_ids if invalid_license_ids else None
    )
    published_data_version["community_library_special_permissions"] = (
        special_permissions_license_ids if special_permissions_license_ids else None
    )

    channel.save()

    # Create channel change
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

    logger.info(
        f"License audit completed for channel {channel_id} version {channel_version}. "
        f"Invalid licenses: {invalid_license_ids}, "
        f"Special permissions count: {len(special_permissions_license_ids) if special_permissions_license_ids else 0}"
    )
