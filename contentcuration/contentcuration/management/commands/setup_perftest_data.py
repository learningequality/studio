import random

from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import licenses

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

        print("Creating channel...")
        self.create_random_channel()


    def create_random_channel(self):
        new_channel = create_channel("Potatoes Info, Studio Edition", editors=[self.editor])

        # Purposefully picking a larger than normal value
        num_root_topics = 50
        for i in range(num_root_topics):
            subtopics = random.randint(1, 5)
            print("Creating topic {} of {} with {} subtopics".format(i+1, num_root_topics, subtopics))
            self.create_topic_with_data(new_channel.main_tree, subtopics=subtopics)

        print("Created channel with id {}".format(new_channel.pk))

    def create_topic_with_data(self, parent, subtopics=2):
        main_topic = create_topic("The Topic At Hand", parent)
        for i in range(subtopics):
            self.create_topic_with_data(main_topic, subtopics=max(subtopics-2, 0))

        for file_type in list(self.files.keys()) * 2:
            node = create_contentnode("A file", main_topic, self.files[file_type], file_type, self.license_id)
            if file_type == content_kinds.VIDEO:
                duplicate_file(self.subtitle_file, node=node)
