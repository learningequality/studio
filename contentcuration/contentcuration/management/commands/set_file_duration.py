import logging as logmodule
import subprocess
import time

from django.core.management.base import BaseCommand

from contentcuration.models import File
from contentcuration.models import MEDIA_PRESETS

logging = logmodule.getLogger("command")


CHUNKSIZE = 10000


def extract_duration_of_media(f_in, extension):  # noqa C901
    """
    For more details on these commands, refer to the ffmpeg Wiki:
    https://trac.ffmpeg.org/wiki/FFprobeTips#Formatcontainerduration
    """
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
            "-f",
            extension,
            "-",
        ],
        stdin=f_in,
    )
    result = result.decode("utf-8").strip()
    try:
        return int(float(result))
    except ValueError:
        # This can happen if ffprobe returns N/A for the duration
        # So instead we try to stream the entire file to get the value
        f_in.seek(0)
        result = subprocess.run(
            [
                "ffmpeg",
                "-i",
                "pipe:",
                "-f",
                "null",
                "-",
            ],
            stdin=f_in,
            stderr=subprocess.PIPE,
        )
        try:
            second_last_line = result.stderr.decode("utf-8").strip().splitlines()[-2]
            time_code = second_last_line.split(" time=")[1].split(" ")[0]
            hours, minutes, seconds = time_code.split(":")
        except IndexError:
            raise RuntimeError("Unable to determine media length")
        try:
            hours = int(hours)
        except ValueError:
            hours = 0
        try:
            minutes = int(minutes)
        except ValueError:
            minutes = 0
        try:
            seconds = int(float(seconds))
        except ValueError:
            seconds = 0
        return (hours * 60 + minutes) * 60 + seconds


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()

        logging.info(
            "Setting default duration for media presets: {}".format(MEDIA_PRESETS)
        )

        excluded_files = set()

        null_duration = File.objects.filter(
            preset_id__in=MEDIA_PRESETS, duration__isnull=True
        )
        null_duration_count = null_duration.count()
        updated_count = 0

        i = 0

        while i < null_duration_count:
            for file in null_duration[i : i + CHUNKSIZE]:
                if file.file_on_disk.name in excluded_files:
                    continue
                file.refresh_from_db()
                if file.duration is not None:
                    continue
                try:
                    with file.file_on_disk.open() as f:
                        duration = extract_duration_of_media(
                            f, file.file_format.extension
                        )
                    if duration:
                        updated_count += File.objects.filter(
                            checksum=file.checksum, preset_id__in=MEDIA_PRESETS
                        ).update(duration=duration)
                except FileNotFoundError:
                    logging.warning("File {} not found".format(file))
                    excluded_files.add(file.file_on_disk.name)
                except (subprocess.CalledProcessError, RuntimeError):
                    logging.warning(
                        "File {} could not be read for duration".format(file)
                    )
                    excluded_files.add(file.file_on_disk.name)

            i += CHUNKSIZE

        logging.info(
            "Finished setting all null duration for {} files in {} seconds".format(
                updated_count, time.time() - start
            )
        )
