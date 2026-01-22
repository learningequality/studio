import logging as logmodule
from itertools import chain

from contentcuration.models import AuditedSpecialPermissionsLicense, Channel, ChannelVersion, License
from django.core.management.base import BaseCommand
from le_utils.constants import licenses

logging = logmodule.getLogger("command")

def validate_published_data(data, channel):
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
    if not data.get('included_categories'):
        included_categories_dicts = published_nodes.exclude(categories=None).values_list(
            "categories", flat=True
        )
        data['included_categories'] = sorted(
            set(
                chain.from_iterable(
                    (
                        node_categories_dict.keys()
                        for node_categories_dict in included_categories_dicts
                    )
                )
            )
        )
    if not data.get('included_languages'):
        node_languages = published_nodes.exclude(language=None).values_list(
            "language", flat=True
        )
        file_languages = published_nodes.exclude(files__language=None).values_list(
            "files__language", flat=True
        )
        data['included_languages'] = list(set(chain(node_languages, file_languages)))

    if not data.get('included_licenses'):
        data['included_licenses'] = list(published_nodes.exclude(license=None).values_list(
            "license", flat=True
        ))
    if not data.get('non_distributable_licenses_included'):
        # Calculate non-distributable licenses (All Rights Reserved)
        all_rights_reserved_id = (
            License.objects.filter(license_name=licenses.ALL_RIGHTS_RESERVED)
            .values_list("id", flat=True)
            .first()
        )

        data['non_distributable_licenses'] = (
            [all_rights_reserved_id]
            if all_rights_reserved_id and all_rights_reserved_id in data['included_licenses']
            else []
        )
    if not data.get('special_permissions_included'):
        # records for each unique description so reviewers can approve/reject them individually.
        # This allows centralized tracking of custom licenses across all channels.
        special_permissions_id = (
            License.objects.filter(license_name=licenses.SPECIAL_PERMISSIONS)
            .values_list("id", flat=True)
            .first()
        )

        special_perms_descriptions = None
        if special_permissions_id and special_permissions_id in data['included_licenses']:
            special_perms_descriptions = list(
                published_nodes.filter(license_id=special_permissions_id)
                .exclude(license_description__isnull=True)
                .exclude(license_description="")
                .values_list("license_description", flat=True)
                .distinct()
            )

            if special_perms_descriptions:
                new_licenses = [
                    AuditedSpecialPermissionsLicense(
                        description=description, distributable=False
                    )
                    for description in special_perms_descriptions
                ]

                data['special_permissions_included'] = AuditedSpecialPermissionsLicense.objects.bulk_create(
                    new_licenses, ignore_conflicts=True
                )


class Command(BaseCommand):
    def handle(self, *args, **options):
        logging.info("Creating channel versions")

        channels = Channel.objects.filter(version__gt=0)

        # Create ChannelVersions for each published version and set version_info
        # to the most recent ChannelVersion instance
        for channel in channels.iterator():
            logging.info(f"Processing channel {channel.id}")
            last_created_ch_ver = None

            # Validate published_data
            for pub_data in channel.published_data.values():
                logging.info(f"Validating published data for channel {channel.id} version {pub_data['version']}")
                validate_published_data(pub_data, channel)

                # TODO This is a m2m field for AuditedSpecialPermissionsLicense do that instead
                # special_permissions_included=pub_data.get('special_permissions_included'),
                # Create a new channel version
                last_created_ch_ver = ChannelVersion.objects.create(
                    channel=channel,
                    version=pub_data.get('version'),
                    included_categories=pub_data.get('included_categories', []),
                    included_licenses=pub_data.get('included_licenses'),
                    included_languages=pub_data.get('included_languages'),
                    non_distributable_licenses_included=pub_data.get('non_distributable_licenses_included'),
                )
                logging.info(f"Created channel version {last_created_ch_ver.id} for channel {channel.id}")

            channel.version_info = last_created_ch_ver
            channel.save()
