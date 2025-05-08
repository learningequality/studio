from django.core.management.base import BaseCommand
from le_utils.constants import licenses

from contentcuration.models import ContentNode
from contentcuration.utils.db_tools import create_channel
from contentcuration.utils.db_tools import create_user
from contentcuration.utils.db_tools import TreeBuilder

LICENSE = licenses.SPECIAL_PERMISSIONS


class Command(BaseCommand):

    help = "Creates a user, then auto-generates channel and content data for stress testing performance."

    def handle(self, *args, **options):

        self.editor = create_user("ivanbot@leq.org", "ivanisthe1", "Ivan", "NeoBot")

        self.editor.clipboard_tree.get_descendants().delete()

        with ContentNode.objects.delay_mptt_updates():
            print("Creating channel...")  # noqa: T201
            self.generate_random_channels()

            # Make sure we have a channel with a lot of root topics to test initial channel load.
            one_hundred = create_channel("The one with a lot of root topics")
            one_hundred.main_tree = TreeBuilder(
                levels=1, num_children=100, user=self.editor, resources=False
            ).root

            # Generate a clipboard tree, intentionally large.
            self.editor.clipboard_tree = TreeBuilder(
                levels=2, num_children=25, user=self.editor
            ).root
            print(  # noqa: T201
                "Created clipboard with {} nodes".format(
                    self.editor.clipboard_tree.get_descendants().count()
                )
            )

    def generate_random_channels(self, num_channels=1):
        for i in range(num_channels):
            new_channel = create_channel(
                "The Potatoes Info Saga Part {}".format(i), editors=[self.editor]
            )

            new_channel.main_tree = TreeBuilder(user=self.editor).root

            print(  # noqa: T201
                "Created channel with {} nodes".format(
                    new_channel.main_tree.get_descendants().count()
                )
            )

            # make sure we have a trash tree so that can be tested with real data as well.
            new_channel.trash_tree = TreeBuilder(user=self.editor).root
            print("Created channel with id {}".format(new_channel.pk))  # noqa: T201
