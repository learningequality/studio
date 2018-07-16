import csv
import os
import re
import progressbar
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand
from contentcuration.models import User

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):

    def handle(self, *args, **options):

        logging.info("Writing CSV for users")

        csv_path = write_user_csv_file()

        logging.info("\n\nFinished writing to CSV at {}\n\n".format(csv_path))


def write_user_csv_file():
    if not os.path.exists(settings.CSV_ROOT):
        os.makedirs(settings.CSV_ROOT)

    csv_path = os.path.join(settings.CSV_ROOT, "users.csv")

    with open(csv_path, 'wb') as csvfile:
        writer = csv.writer(csvfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(['Name', 'Email', 'Date Joined', 'Intended Use', 'Target Locations', 'Heard about us from', 'Channels', '# of Items Uploaded', 'Space Needed', 'Total Storage'])

        users = User.objects.filter(is_active=True, is_admin=False).prefetch_related('files')

        bar = progressbar.ProgressBar(max_value=users.count())

        index = 0
        for user in users:
            _write_user_csv(writer, user)
            index += 1
            bar.update(index)
            sleep(0.01)

    return csv_path

def _write_user_csv(writer, user):
    try:
        information = user.information or {}
        channels = user.editable_channels.exclude(deleted=True).values('name', 'id')
        return writer.writerow([
            "{} {}".format(user.first_name, user.last_name),
            user.email,
            user.date_joined.strftime("%Y-%m-%d"),
            ", ".join(information['uses']) if information.get("uses") else "---",
            ", ".join(information['locations']) if information.get("locations") else "---",
            information.get("heard_from") or "---",
            "{} Channels ({})".format(channels.count(), ", ".join(["{} - {}".format(c['name'], c['id']) for c in channels])),
            user.files.count(),
            information.get("space_needed") or "---",
            _format_size(user.disk_space),
        ])
    except Exception as e:
        print(user.email, str(e))

def _format_size(num, suffix='B'):
    """ Format sizes """
    for unit in ['','K','M','G','T','P','E','Z']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)
