import logging as logmodule
from itertools import chain

from django.core.management.base import BaseCommand
from le_utils.constants import licenses

from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.models import License

logging = logmodule.getLogger("command")


def compute_special_permissions(data, channel, published_nodes):
    """
    Compute and create AuditedSpecialPermissionsLicense objects for special permissions content.

    Returns a list of AuditedSpecialPermissionsLicense objects to be associated with the ChannelVersion.
    Note: These objects are NOT stored in the data dict since they are not JSON serializable
    and the data dict may be saved to a JSONField (channel.published_data).
    """
    if data.get("special_permissions_included"):
        # Already computed, return empty (will be handled by existing data)
        return []

    special_permissions_id = (
        License.objects.filter(license_name=licenses.SPECIAL_PERMISSIONS)
        .values_list("id", flat=True)
        .first()
    )

    if not special_permissions_id or special_permissions_id not in data.get(
        "included_licenses", []
    ):
        return []

    special_perms_descriptions = list(
        published_nodes.filter(license_id=special_permissions_id)
        .exclude(license_description__isnull=True)
        .exclude(license_description="")
        .values_list("license_description", flat=True)
        .distinct()
    )

    if not special_perms_descriptions:
        return []

    new_licenses = [
        AuditedSpecialPermissionsLicense(
            description=description, distributable=channel.public
        )
        for description in special_perms_descriptions
    ]

    return AuditedSpecialPermissionsLicense.objects.bulk_create(
        new_licenses, ignore_conflicts=True
    )


def validate_published_data(data, channel):
    """
    Fill in any missing fields in the published_data dict.
    Returns a list of AuditedSpecialPermissionsLicense objects for the M2M relation.

    Note: special_permissions_included is returned separately since it contains
    model objects that cannot be JSON serialized into the data dict.
    """
    # Logic for filling each missing field stolen from
    # contentcuration.utils.publish.fill_published_fields
    published_nodes = (
        channel.main_tree.get_descendants()
        .filter(published=True)
        .prefetch_related("files")
    )

    if not data:
        data = {}

    # Go through each required field and calculate any missing fields if we can
    if not data.get("included_categories"):
        included_categories_dicts = published_nodes.exclude(
            categories=None
        ).values_list("categories", flat=True)
        data["included_categories"] = sorted(
            set(
                chain.from_iterable(
                    (
                        node_categories_dict.keys()
                        for node_categories_dict in included_categories_dicts
                    )
                )
            )
        )
    if not data.get("included_languages"):
        node_languages = published_nodes.exclude(language=None).values_list(
            "language", flat=True
        )
        file_languages = published_nodes.exclude(files__language=None).values_list(
            "files__language", flat=True
        )
        data["included_languages"] = list(set(chain(node_languages, file_languages)))

    if not data.get("included_licenses"):
        data["included_licenses"] = list(
            published_nodes.exclude(license=None).values_list("license", flat=True)
        )
    if not data.get("non_distributable_licenses_included"):
        # Calculate non-distributable licenses (All Rights Reserved)
        all_rights_reserved_id = (
            License.objects.filter(license_name=licenses.ALL_RIGHTS_RESERVED)
            .values_list("id", flat=True)
            .first()
        )

        data["non_distributable_licenses"] = (
            [all_rights_reserved_id]
            if all_rights_reserved_id
            and all_rights_reserved_id in data["included_licenses"]
            else []
        )

    # Compute special permissions and return them separately (not stored in data dict)
    special_permissions = compute_special_permissions(data, channel, published_nodes)
    return special_permissions


class Command(BaseCommand):
    def handle(self, *args, **options):
        logging.info("Creating channel versions")

        channels = Channel.objects.filter(version__gt=0)

        # Create ChannelVersions for each published version and set version_info
        # to the most recent ChannelVersion instance
        for channel in channels.iterator():
            logging.info(f"Processing channel {channel.id}")

            # Validate published_data
            for pub_data in channel.published_data.values():
                logging.info(
                    f"Validating published data for channel {channel.id} version {pub_data['version']}"
                )
                special_permissions = validate_published_data(pub_data, channel)

                # Create a new channel version
                channel_version = ChannelVersion.objects.create(
                    channel=channel,
                    version=pub_data.get("version"),
                    included_categories=pub_data.get("included_categories", []),
                    included_licenses=pub_data.get("included_licenses"),
                    included_languages=pub_data.get("included_languages"),
                    non_distributable_licenses_included=pub_data.get(
                        "non_distributable_licenses_included"
                    ),
                )

                if channel.version == pub_data.get("version"):
                    channel.version_info = channel_version

                # Set the M2M relation for special permissions
                if special_permissions:
                    channel_version.special_permissions_included.set(
                        special_permissions
                    )
                logging.info(
                    f"Created channel version {channel_version.id} for channel {channel.id}"
                )

            channel.save()
