import csv
import os
import re
import progressbar
from statistics import mean, median, mode, pvariance, StatisticsError

from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Sum
from contentcuration.models import Channel
from le_utils.constants import content_kinds


class Command(BaseCommand):

    def handle(self, *args, **options):
        """ Puts channel counts in csv and prints out max, min, mean, median, and mode.

        Call with python manage.py get_channel_stats

        Keyword arguments: None
        Returns str path of generated csv
        """

        print("Gathering channel stats...")

        if not os.path.exists(settings.CSV_ROOT):
            os.makedirs(settings.CSV_ROOT)

        csv_path = os.path.join(settings.CSV_ROOT, "channel_stats.csv")

        channel_stats = []

        with open(csv_path, 'wb') as csvfile:
            writer = csv.writer(csvfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
            writer.writerow(['Channel ID', 'Name', 'Resource Count', 'Size'])

            channels = Channel.objects.filter(deleted=False).select_related('main_tree')
            bar = progressbar.ProgressBar(max_value=channels.count())

            for i, channel in enumerate(channels):
                try:
                    resources = channel.main_tree.get_descendants().prefetch_related('files').exclude(kind_id=content_kinds.TOPIC)
                    count = resources.count()
                    size = resources.values('files__checksum', 'files__file_size').distinct().aggregate(resource_size=Sum('files__file_size'))['resource_size'] or 0,
                    writer.writerow([ channel.id, channel.name, count, size])
                    channel_stats.append({ "id": channel.id, "name": channel.name, "count": count, "size": size })
                    bar.update(i)
                except Exception as e:
                    print(channel.id, str(e))

        counts = [ c['count'] for c in channel_stats]
        sizes = [ c['size'][0] for c in channel_stats]
        print("\nCount Stats:")
        print_stats(counts)

        print("\nSize Stats:")
        print_stats(sizes)

        print("\n\nFinished writing to CSV at {}\n\n".format(csv_path))


def print_stats(l):
    try:
        print("\tMean: {}".format(mean(l)))
    except StatisticsError as e:
        print("\tMean: {}".format(str(e)))

    try:
        print("\tMedian: {}".format(median(l)))
    except StatisticsError as e:
        print("\tMedian: {}".format(str(e)))

    try:
        print("\tMode: {}".format(mode(l)))
    except StatisticsError as e:
        print("\tMode: {}".format(str(e)))

    try:
        print("\tMax: {}".format(max(l)))
    except StatisticsError as e:
        print("\tMax: {}".format(str(e)))

    try:
        print("\tMin: {}".format(min(l)))
    except StatisticsError as e:
        print("\tMin: {}".format(str(e)))
