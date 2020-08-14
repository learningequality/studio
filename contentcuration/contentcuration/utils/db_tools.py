import json
import os
import tempfile
import uuid

from django.core.files import File as DjFile
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import licenses

from contentcuration.api import write_file_to_storage
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import FormatPreset
from contentcuration.models import User
from contentcuration.utils.files import duplicate_file

LICENSE_DESCRIPTION = "Sample text for content with special permissions"
SORT_ORDER = 0



def create_user(email, password, first_name, last_name, admin=False):
    user, new = User.objects.get_or_create(email=email)
    if new:
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        print("User created (email: {}, password: {}, admin: {})".format(email, password, admin))
    user.is_staff = admin
    user.is_admin = admin
    user.is_active = True
    user.save()
    return user


def create_channel(name, description="", editors=None, language="en", bookmarkers=None, viewers=None, public=False):
    domain = uuid.uuid5(uuid.NAMESPACE_DNS, name)
    node_id = uuid.uuid5(domain, name)

    channel, _new = Channel.objects.get_or_create(pk=node_id.hex)

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


def create_exercise(title, parent, license_id, description="", user=None, empty=False):
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
    )
    exercise.save()

    if not empty:
        create_question(exercise, "What color is the sky", exercises.SINGLE_SELECTION, [
            {"answer": "Yellow", "correct": False, "order": 1},
            {"answer": "Black", "correct": False, "order": 2},
            {"answer": "Blue", "correct": True, "order": 3},
        ])

        create_question(exercise, "Which equations add up to $$\\frac{2^3}{\\surd\\overline{16}}$$ ?", exercises.MULTIPLE_SELECTION, [
            {"answer": "1+1", "correct": True, "order": 1},
            {"answer": "9+1", "correct": False, "order": 2},
            {"answer": "0+2", "correct": True, "order": 3},
        ])

        create_question(exercise, "Hot pink is a color in the rainbow", 'true_false', [
            {"answer": "True", "correct": False, "order": 1},
            {"answer": "False", "correct": True, "order": 2},
        ])

        create_question(exercise, "3+5=?", exercises.INPUT_QUESTION, [
            {"answer": "8", "correct": True, "order": 1},
            {"answer": "8.0", "correct": True, "order": 2},
        ])

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


def create_contentnode(title, parent, file, kind_id, license_id, description="", user=None, tags=None):
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
    )
    node.save()
    duplicate_file(file, node=node)

    add_tags(node, tags)

    return node


def create_file(display_name, preset_id, ext, user=None):
    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext), mode='wb+', delete=False) as f:
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
            language_id="mul" if FormatPreset.objects.filter(id=preset_id, multi_language=True).exists() else None,
        )
        file_object.save()
        f.close()

        os.unlink(f.name)

        return file_object
