import random

from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import licenses

from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.utils.db_tools import create_channel
from contentcuration.utils.db_tools import create_contentnode
from contentcuration.utils.db_tools import create_file
from contentcuration.utils.db_tools import create_topic
from contentcuration.utils.db_tools import create_user
from contentcuration.utils.files import duplicate_file

LICENSE = licenses.SPECIAL_PERMISSIONS


class Command(BaseCommand):

    help = 'Creates a user, then auto-generates channel and content data for stress testing performance.'

    def handle(self, *args, **options):

        self.editor = create_user("ivanbot@leq.org", "ivanisthe1", "Ivan", "NeoBot")

        self.document_file = create_file("Sample Document", format_presets.DOCUMENT, file_formats.PDF, user=self.editor)
        self.video_file = create_file("Sample Video", format_presets.VIDEO_HIGH_RES, file_formats.MP4, user=self.editor)
        self.subtitle_file = create_file("Sample Subtitle", format_presets.VIDEO_SUBTITLE, file_formats.VTT, user=self.editor)
        self.audio_file = create_file("Sample Audio", format_presets.AUDIO, file_formats.MP3, user=self.editor)
        self.html5_file = create_file("Sample HTML", format_presets.HTML5_ZIP, file_formats.HTML5, user=self.editor)

        self.license_id = License.objects.get(license_name=LICENSE).pk

        self.files = {
            content_kinds.DOCUMENT: self.document_file,
            content_kinds.VIDEO: self.video_file,
            content_kinds.AUDIO: self.audio_file,
            content_kinds.HTML5: self.html5_file
        }

        self.editor.clipboard_tree.get_descendants().delete()

        with ContentNode.objects.delay_mptt_updates():
            print("Creating channel...")
            self.generate_random_channels()

            # Make sure we have a channel with a lot of root topics to test initial channel load.
            one_hundred = create_channel("The one with a lot of root topics")
            self.generate_subtree(one_hundred.main_tree, num_topics=200, max_subtopics=0)

            # Generate a clipboard tree, intentionally large.
            self.generate_subtree(self.editor.clipboard_tree, num_topics=25)
            print("Created clipboard with {} nodes".format(self.editor.clipboard_tree.get_descendants().count()))

    def generate_random_channels(self, num_channels=1):
        for i in range(num_channels):
            new_channel = create_channel("The Potatoes Info Saga Part {}".format(i), editors=[self.editor])

            self.generate_subtree(new_channel.main_tree)

            print("Created channel with {} nodes".format(new_channel.main_tree.get_descendants().count()))

            # make sure we have a trash tree so that can be tested with real data as well.
            self.generate_subtree(new_channel.trash_tree)
            print("Created channel with id {}".format(new_channel.pk))

    def generate_subtree(self, root, num_topics=10, max_subtopics=5):
        # Purposefully picking a larger than normal value
        for i in range(num_topics):
            if max_subtopics == 0:
                subtopics = 0
            else:
                subtopics = random.randint(1, max(1, max_subtopics))
            print("Creating topic {} of {} with {} subtopics".format(i + 1, num_topics, subtopics))
            self.create_topic_with_data(root, subtopics=subtopics)

    def create_topic_with_data(self, parent, subtopics=2):
        main_topic = create_topic("The Topic At Hand", parent)
        for i in range(subtopics):
            self.create_topic_with_data(main_topic, subtopics=max(subtopics - 2, 0))

        for file_type in list(self.files.keys()) * 2:
            node = create_contentnode("A file", main_topic, self.files[file_type], file_type, self.license_id)
            if file_type == content_kinds.VIDEO:
                duplicate_file(self.subtitle_file, node=node)
