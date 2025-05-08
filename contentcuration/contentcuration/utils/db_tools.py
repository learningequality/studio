import json
import os
import random
import string
import tempfile
import uuid

from django.core.files import File as DjFile
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import licenses
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.resource_type import RESOURCETYPELIST
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration.api import write_file_to_storage
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import FormatPreset
from contentcuration.models import License
from contentcuration.models import User
from contentcuration.utils.files import duplicate_file

LICENSE_DESCRIPTION = "Sample text for content with special permissions"
SORT_ORDER = 0

multi_lang = {p.id for p in format_presets.PRESETLIST if p.multi_language}


def create_user(email, password, first_name, last_name, admin=False):
    user, new = User.objects.get_or_create(email=email)
    if new:
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        print(  # noqa: T201
            "User created (email: {}, password: {}, admin: {})".format(
                email, password, admin
            )
        )
    user.is_staff = admin
    user.is_admin = admin
    user.is_active = True
    user.save()
    return user


def create_channel(
    name,
    description="",
    editors=None,
    language="en",
    bookmarkers=None,
    viewers=None,
    public=False,
):
    domain = uuid.uuid5(uuid.NAMESPACE_DNS, name)
    node_id = uuid.uuid5(domain, name)

    channel, _new = Channel.objects.get_or_create(
        actor_id=editors[0].id, pk=node_id.hex
    )

    channel.name = name
    channel.description = description
    channel.language_id = language
    channel.public = public
    channel.deleted = False

    editors = editors or []
    bookmarkers = bookmarkers or []
    viewers = viewers or []
    for e in editors:
        channel.editors.add(e)
    for b in bookmarkers:
        channel.bookmarked_by.add(b)
    for v in viewers:
        channel.viewers.add(v)

    channel.save()
    channel.main_tree.get_descendants().delete()
    channel.staging_tree and channel.staging_tree.get_descendants().delete()
    return channel


def add_tags(node, tags):
    tags = tags or []
    for t in tags:
        node.tags.add(t)
    node.save()


def get_sort_order():
    global SORT_ORDER
    SORT_ORDER += 1
    return SORT_ORDER


def create_topic(title, parent, description=""):
    topic = ContentNode.objects.create(
        title=title,
        description=description,
        parent=parent,
        kind_id=content_kinds.TOPIC,
        sort_order=get_sort_order(),
    )
    topic.save()
    return topic


question_1 = (
    "What color is the sky",
    exercises.SINGLE_SELECTION,
    [
        {"answer": "Yellow", "correct": False, "order": 1},
        {"answer": "Black", "correct": False, "order": 2},
        {"answer": "Blue", "correct": True, "order": 3},
    ],
)

question_2 = (
    "Which equations add up to $$\\frac{2^3}{\\surd\\overline{16}}$$ ?",
    exercises.MULTIPLE_SELECTION,
    [
        {"answer": "1+1", "correct": True, "order": 1},
        {"answer": "9+1", "correct": False, "order": 2},
        {"answer": "0+2", "correct": True, "order": 3},
    ],
)

question_3 = (
    "Hot pink is a color in the rainbow",
    "true_false",
    [
        {"answer": "True", "correct": False, "order": 1},
        {"answer": "False", "correct": True, "order": 2},
    ],
)

question_4 = (
    "3+5=?",
    exercises.INPUT_QUESTION,
    [
        {"answer": "8", "correct": True, "order": 1},
        {"answer": "8.0", "correct": True, "order": 2},
    ],
)


all_questions = (question_1, question_2, question_3, question_4)


def create_exercise(
    title, parent, license_id, description="", user=None, empty=False, complete=True
):
    mastery_model = {
        "mastery_model": exercises.M_OF_N,
        "randomize": False,
        "m": 3,
        "n": 5,
    }

    exercise = ContentNode.objects.create(
        title=title,
        description=description,
        parent=parent,
        kind_id=content_kinds.EXERCISE,
        author="{} {}".format(user.first_name, user.last_name),
        copyright_holder="{} {}".format(user.first_name, user.last_name),
        license_id=license_id,
        license_description=LICENSE_DESCRIPTION,
        extra_fields=mastery_model,
        sort_order=get_sort_order(),
        complete=complete,
    )
    exercise.save()

    if not empty:
        create_question(exercise, *question_1)

        create_question(exercise, *question_2)

        create_question(exercise, *question_3)

        create_question(exercise, *question_4)

    return exercise


def create_question(node, question, question_type, answers):
    hints = [
        {"hint": "Hint 1", "order": 1},
        {"hint": "Hint 2", "order": 2},
        {"hint": "Hint 3", "order": 3},
    ]

    ai = AssessmentItem.objects.create(
        contentnode=node,
        type=question_type,
        question=question,
        hints=json.dumps(hints),
        answers=json.dumps(answers),
        order=node.assessment_items.count(),
    )
    ai.save()


def create_contentnode(
    title,
    parent,
    file,
    kind_id,
    license_id,
    description="",
    user=None,
    tags=None,
    complete=True,
):
    copyright_holder = "Someone Somewhere"
    if user:
        copyright_holder = "{} {}".format(user.first_name, user.last_name)
    node = ContentNode.objects.create(
        title=title,
        description=description,
        parent=parent,
        kind_id=kind_id,
        author=copyright_holder,
        copyright_holder=copyright_holder,
        license_id=license_id,
        license_description=LICENSE_DESCRIPTION,
        sort_order=get_sort_order(),
        complete=complete,
    )
    node.save()
    duplicate_file(file, node=node)

    add_tags(node, tags)

    return node


def create_file(display_name, preset_id, ext, user=None):
    with tempfile.NamedTemporaryFile(
        suffix=".{}".format(ext), mode="wb+", delete=False
    ) as f:
        f.write(b":)")
        f.flush()
        size = f.tell()
        filename = write_file_to_storage(f, name=f.name)
        checksum, _ext = os.path.splitext(filename)

        f.seek(0)

        file_object = File(
            file_size=size,
            file_on_disk=DjFile(f),
            checksum=checksum,
            file_format_id=ext,
            original_filename=display_name,
            preset_id=preset_id,
            uploaded_by=user,
            language_id="mul"
            if FormatPreset.objects.filter(id=preset_id, multi_language=True).exists()
            else None,
        )
        file_object.save()
        f.close()

        os.unlink(f.name)

        return file_object


def uuid4_hex():
    return uuid.uuid4().hex


def choices(sequence, k):
    return [random.choice(sequence) for _ in range(0, k)]


class TreeBuilder(object):
    """
    This class is purely to generate all the relevant data for a single
    tree for use during testing.
    """

    def __init__(self, levels=3, num_children=5, user=None, resources=True, tags=False):
        self.user = user or create_user(
            "ivanbot@leq.org", "ivanisthe1", "Ivan", "NeoBot"
        )
        self.levels = levels
        self.num_children = num_children
        self.resources = resources
        self.tags = tags

        self.license_id = License.objects.get(license_name=licenses.choices[0][0]).pk

        self.temporary_files = {}

        self.files = []
        self.assessment_items = []
        if self.tags:
            self.tag = ContentTag.objects.create(tag_name="just a tag")

        self._root_node = self.generate_topic()

        if self.levels:
            self._root_node["children"] = self.recurse_and_generate(
                self._root_node["id"], self.levels
            )

        self.insert_into_default_db()

        self.root = ContentNode.objects.get(id=self._root_node["id"])

    def insert_into_default_db(self):
        BATCH_SIZE = 1000
        nodes = ContentNode.objects.bulk_create(
            ContentNode.objects.build_tree_nodes(self._root_node), batch_size=BATCH_SIZE
        )
        AssessmentItem.objects.bulk_create(
            self.assessment_items,
            batch_size=BATCH_SIZE,
        )
        File.objects.bulk_create(self.files, batch_size=BATCH_SIZE)
        if self.tags:
            ContentNode.tags.through.objects.bulk_create(
                [
                    ContentNode.tags.through(
                        contentnode_id=n.id, contenttag_id=self.tag.id
                    )
                    for n in nodes
                ],
                batch_size=BATCH_SIZE,
            )

    def recurse_and_generate(self, parent_id, levels):
        children = []
        # Don't bother looping if we are not generating resources
        # and levels is 0
        if self.resources or levels > 0:
            for i in range(0, self.num_children):
                if levels == 0:
                    node = self.generate_leaf(parent_id)
                else:
                    node = self.generate_topic(parent_id=parent_id)
                    node["children"] = self.recurse_and_generate(node["id"], levels - 1)
                children.append(node)
        return children

    def generate_topic(self, parent_id=None):
        data = self.contentnode_data(
            kind=content_kinds.TOPIC,
            parent_id=parent_id,
        )
        self.generate_file(
            data["id"],
            "Topic Thumbnail",
            format_presets.TOPIC_THUMBNAIL,
            "png",
        )
        return data

    def generate_document(self, parent_id):
        data = self.contentnode_data(
            kind=content_kinds.DOCUMENT,
            parent_id=parent_id,
        )
        self.generate_file(
            data["id"], "Sample Document", format_presets.DOCUMENT, file_formats.PDF
        )
        self.generate_file(
            data["id"],
            "Sample Document Thumbnail",
            format_presets.DOCUMENT_THUMBNAIL,
            file_formats.PNG,
        )
        return data

    def generate_video(self, parent_id):
        data = self.contentnode_data(
            kind=content_kinds.VIDEO,
            parent_id=parent_id,
        )
        self.generate_file(
            data["id"],
            "Sample Video",
            format_presets.VIDEO_HIGH_RES,
            file_formats.MP4,
        )
        self.generate_file(
            data["id"],
            "Sample Subtitle",
            format_presets.VIDEO_SUBTITLE,
            file_formats.VTT,
        )
        self.generate_file(
            data["id"],
            "Sample Video Thumbnail",
            format_presets.VIDEO_THUMBNAIL,
            file_formats.PNG,
        )
        return data

    def generate_audio(self, parent_id):
        data = self.contentnode_data(
            kind=content_kinds.AUDIO,
            parent_id=parent_id,
        )
        self.generate_file(
            data["id"], "Sample Audio", format_presets.AUDIO, file_formats.MP3
        )
        self.generate_file(
            data["id"],
            "Sample Audio Thumbnail",
            format_presets.AUDIO_THUMBNAIL,
            file_formats.PNG,
        )
        return data

    def generate_html5(self, parent_id):
        data = self.contentnode_data(
            kind=content_kinds.HTML5,
            parent_id=parent_id,
        )
        self.generate_file(
            data["id"], "Sample HTML", format_presets.HTML5_ZIP, file_formats.HTML5
        )
        self.generate_file(
            data["id"],
            "Sample HTML Thumbnail",
            format_presets.HTML5_THUMBNAIL,
            file_formats.PNG,
        )
        return data

    def generate_question(
        self, contentnode_id, order, question, question_type, answers
    ):
        hints = [
            {"hint": "Hint 1", "order": 1},
            {"hint": "Hint 2", "order": 2},
            {"hint": "Hint 3", "order": 3},
        ]
        ai = AssessmentItem(
            contentnode_id=contentnode_id,
            type=question_type,
            question=question,
            hints=json.dumps(hints),
            answers=json.dumps(answers),
            order=order,
            assessment_id=uuid4_hex(),
        )
        self.assessment_items.append(ai)

    def generate_exercise(self, parent_id):
        mastery_model = {
            "type": exercises.M_OF_N,
            "randomize": False,
            "m": 3,
            "n": 5,
        }

        data = self.contentnode_data(
            kind=content_kinds.EXERCISE, parent_id=parent_id, extra_fields=mastery_model
        )
        self.generate_file(
            data["id"],
            "Sample Exercise Thumbnail",
            format_presets.EXERCISE_THUMBNAIL,
            file_formats.PNG,
        )
        for i, q in enumerate(all_questions):
            self.generate_question(data["id"], i, *q)

        return data

    def generate_leaf(self, parent_id):
        leaf_generators = (
            self.generate_document,
            self.generate_video,
            self.generate_audio,
            self.generate_html5,
            self.generate_exercise,
        )
        pick = random.choice(leaf_generators)
        node = pick(parent_id)
        return node

    def generate_file(
        self,
        contentnode_id,
        display_name,
        preset_id,
        extension,
    ):
        if extension not in self.temporary_files:
            with tempfile.NamedTemporaryFile(
                suffix=".{}".format(extension), mode="wb+", delete=False
            ) as f:
                f.write(b":)")
                f.flush()

                size = f.tell()
                filename = write_file_to_storage(f, name=f.name)
                checksum, _ext = os.path.splitext(filename)
                f.seek(0)

                self.temporary_files[extension] = {
                    "filename": filename,
                    "checksum": checksum,
                    "size": size,
                }

        file_info = self.temporary_files[extension]

        file = File(
            file_size=file_info["size"],
            file_on_disk=file_info["filename"],
            checksum=file_info["checksum"],
            file_format_id=extension,
            original_filename=display_name,
            preset_id=preset_id,
            uploaded_by=self.user,
            language_id="mul" if preset_id in multi_lang else None,
            id=uuid4_hex(),
            contentnode_id=contentnode_id,
        )
        self.files.append(file)

    def contentnode_data(
        self, parent_id=None, kind=None, extra_fields=None, complete=True
    ):
        return {
            "extra_fields": extra_fields or {},
            "content_id": uuid4_hex(),
            "node_id": uuid4_hex(),
            "description": "Blah blah blah",
            "id": uuid4_hex(),
            "license_id": self.license_id,
            "license_description": LICENSE_DESCRIPTION,
            "language_id": None,
            "author": "{} {}".format(self.user.first_name, self.user.last_name),
            "copyright_holder": "{} {}".format(
                self.user.first_name, self.user.last_name
            ),
            "title": "{} {}".format(
                kind, "".join(random.choices(string.ascii_letters, k=12))
            ),
            "parent_id": parent_id,
            "kind_id": kind,
            "complete": complete,
            "resource_types": {
                c: True for c in choices(RESOURCETYPELIST, k=random.randint(1, 2))
            },
            "learning_activities": {
                c: True for c in choices(LEARNINGACTIVITIESLIST, k=random.randint(1, 3))
            },
            "accessibility_labels": {
                c: True
                for c in choices(ACCESSIBILITYCATEGORIESLIST, k=random.randint(1, 3))
            },
            "grade_levels": {
                c: True for c in choices(LEVELSLIST, k=random.randint(1, 2))
            },
            "categories": {
                c: True for c in choices(SUBJECTSLIST, k=random.randint(1, 10))
            },
            "learner_needs": {
                c: True for c in choices(NEEDSLIST, k=random.randint(1, 5))
            },
            "suggested_duration": random.randint(5, 5000),
        }
