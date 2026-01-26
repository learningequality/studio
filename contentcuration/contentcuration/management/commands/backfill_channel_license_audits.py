from django.core.management.base import BaseCommand

from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.utils.audit_channel_licenses import audit_channel_version


class Command(BaseCommand):
    help = "Backfill license audit results for published channels."

    def add_arguments(self, parser):
        parser.add_argument(
            "--channel-id",
            action="append",
            dest="channel_ids",
            help="Channel ID to backfill (repeatable).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of channels to process.",
        )
        parser.add_argument(
            "--offset",
            type=int,
            default=0,
            help="Offset into the channel list.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be updated without saving.",
        )

    def handle(self, *args, **options):
        channel_ids = options.get("channel_ids")
        limit = options.get("limit")
        offset = options.get("offset") or 0
        dry_run = options.get("dry_run")

        queryset = Channel.objects.filter(
            main_tree__published=True,
            version__gt=0,
        ).order_by("id")

        if channel_ids:
            queryset = queryset.filter(id__in=channel_ids)

        if offset:
            queryset = queryset[offset:]

        if limit:
            queryset = queryset[:limit]

        processed = 0
        failures = 0

        for channel in queryset.iterator():
            processed += 1
            try:
                channel_version, _ = ChannelVersion.objects.get_or_create(
                    channel=channel,
                    version=channel.version,
                )
                if channel.version_info_id != channel_version.id:
                    if dry_run:
                        self.stdout.write(
                            f"Would set version_info for channel {channel.id}"
                        )
                    else:
                        Channel.objects.filter(pk=channel.pk).update(
                            version_info=channel_version
                        )

                if dry_run:
                    self.stdout.write(
                        f"Would backfill audit results for channel {channel.id} "
                        f"version {channel_version.version}"
                    )
                    continue

                audit_channel_version(channel_version)
                self.stdout.write(
                    f"Backfilled audit results for channel {channel.id} "
                    f"version {channel_version.version}"
                )
            except Exception as error:  # noqa: BLE001
                failures += 1
                self.stderr.write(f"Failed to backfill channel {channel.id}: {error}")

        self.stdout.write(
            f"Backfill complete. Processed={processed} Failures={failures}"
        )
