import logging as logmodule
import subprocess
import time

from django.core.management.base import BaseCommand

from contentcuration.models import File
from contentcuration.models import MEDIA_PRESETS

logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger('command')


CHUNKSIZE = 10000


def extract_duration_of_media(f_in):
    result = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            "-loglevel",
            "panic",
            "-"
        ],
        stdin=f_in,
    )
    return int(float(result.decode("utf-8").strip()))


class Command(BaseCommand):

    def handle(self, *args, **options):
        start = time.time()

        logging.info("Setting default duration for media presets: {}".format(MEDIA_PRESETS))

        excluded_files = set()

        null_duration = File.objects.filter(preset_id__in=MEDIA_PRESETS, duration__isnull=True)
        null_duration_count = null_duration.count()
        updated_count = 0

        i = 0

        while i < null_duration_count:
            for file in null_duration[i:i + CHUNKSIZE]:
                if file.file_on_disk.name in excluded_files:
                    continue
                file.refresh_from_db()
                if file.duration is not None:
                    continue
                try:
                    with file.file_on_disk.open() as f:
                        duration = extract_duration_of_media(f)
                    if duration:
                        updated_count += File.objects.filter(checksum=file.checksum, preset_id__in=MEDIA_PRESETS).update(duration=duration)
                except FileNotFoundError:
                    logging.warning("File {} not found".format(file))
                    excluded_files.add(file.file_on_disk.name)
                except subprocess.CalledProcessError:
                    logging.warning("File {} could not be read for duration".format(file))
                    excluded_files.add(file.file_on_disk.name)

            i += CHUNKSIZE

        logging.info('Finished setting all null duration for {} files in {} seconds'.format(updated_count, time.time() - start))
