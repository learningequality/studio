import logging as logmodule

from django.core.management.base import BaseCommand

from contentcuration.utils import publish

logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("--force", action="store_true", dest="force", default=False)
        parser.add_argument("--user_id", dest="user_id", default=None)
        parser.add_argument("--notes", dest="version_notes", default=None)
        parser.add_argument(
            "--force-exercises",
            action="store_true",
            dest="force-exercises",
            default=False,
        )

        # optional argument to send an email to the user when done with exporting channel
        parser.add_argument("--email", action="store_true", default=False)

    def handle(self, *args, **options):
        channel_id = options["channel_id"]
        force = options["force"]
        send_email = options["email"]
        user_id = options["user_id"]
        force_exercises = options["force-exercises"]
        version_notes = options.get("version_notes")

        try:
            publish.publish_channel(
                user_id,
                channel_id,
                force=force,
                force_exercises=force_exercises,
                send_email=send_email,
                version_notes=version_notes,
            )
        except ValueError as e:
            logging.warning(
                "Publishing exited early: {message}.".format(message=e.message)
            )
            self.stdout.write(
                "You can find your database in {path}".format(path=e.db_path)
            )
