import time

from django.core.management.base import BaseCommand
from le_utils.constants import licenses

from contentcuration.models import ContentNode
from contentcuration.utils.db_tools import create_channel
from contentcuration.utils.db_tools import create_user
from contentcuration.utils.db_tools import TreeBuilder

LICENSE = licenses.SPECIAL_PERMISSIONS


class Command(BaseCommand):

    help = "Creates a user, then auto-generates channel and content data for stress testing performance."

    def add_arguments(self, parser):
        parser.add_argument('--create-large-tree', action="store_true", dest="create_large_tree", default=False)

    def handle(self, *args, **options):

        create_large_tree = options["create_large_tree"]
        self.editor = create_user("ivanbot@leq.org", "ivanisthe1", "Ivan", "NeoBot")

        self.user_swarm = [self.editor]
        for i in range(100):
            self.user_swarm.append(create_user("ivanbot{}@leq.org".format(i), "ivanisthe1", "Ivan", "NeoBot"))

        with ContentNode.objects.delay_mptt_updates():
            self.generate_random_channels(num_channels=50)

            if create_large_tree:
                name = "The Big KAhuna"
                ka_like = create_channel(name, clear_existing_trees=False)
                if ka_like.main_tree.get_descendants().count() == 0:
                    print('Creating "{}" tree, this will take some time...'.format(name))
                    start = time.time()
                    ka_like.main_tree = TreeBuilder(
                        levels=6, num_children=5, user=self.editor
                    ).root
                    ka_like.save()
                    elapsed = time.time() - start
                    print("Creating large tree took {}s".format(elapsed))

            # Make sure we have a channel with a lot of root topics to test initial channel load.
            one_hundred = create_channel("The one with a lot of root topics", clear_existing_trees=False)
            if one_hundred.main_tree.get_descendants().count() == 0:
                one_hundred.main_tree = TreeBuilder(
                    levels=1, num_children=100, user=self.editor, resources=False
                ).root
                one_hundred.save()
            else:
                print('Channel tree for "{}" already created'.format(one_hundred.name))
            # Generate a clipboard tree, intentionally large.
            if self.editor.clipboard_tree.get_descendants().count() == 0:
                self.editor.clipboard_tree = TreeBuilder(
                    levels=2, num_children=25, user=self.editor
                ).root
                self.editor.save()
                print(
                    "Created clipboard with {} nodes".format(
                        self.editor.clipboard_tree.get_descendants().count()
                    )
                )

    def generate_random_channels(self, num_channels=1):
        for i in range(num_channels):
            new_channel = create_channel(
                "The Potatoes Info Saga Part {}".format(i), editors=self.user_swarm,
                clear_existing_trees=False
            )

            if new_channel.main_tree.get_descendants().count() == 0:
                print("Creating tree for {}...".format(new_channel.name))
                new_channel.main_tree = TreeBuilder(user=self.editor).root

                print(
                    "Created channel with {} nodes".format(
                        new_channel.main_tree.get_descendants().count()
                    )
                )
            else:
                print('Channel tree for "{}" already created'.format(new_channel.name))

            # make sure we have a trash tree so that can be tested with real data as well.
            if new_channel.trash_tree.get_descendants().count() == 0:
                new_channel.trash_tree = TreeBuilder(user=self.editor).root
                new_channel.save()
                print('Created trash tree for channel "{}"'.format(new_channel.name))
