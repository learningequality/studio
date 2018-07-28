import json
import os
import re
import sys
import tempfile
import uuid

from django.core.files import File as DjFile
from django.core.management import call_command
from django.core.management.base import BaseCommand
from contentcuration.models import Channel, User, ContentNode, Invitation, ContentTag, File, AssessmentItem, License, FormatPreset
from contentcuration.api import write_file_to_storage
from contentcuration.utils.files import duplicate_file
from contentcuration.views.nodes import duplicate_node_bulk
from le_utils.constants import content_kinds, licenses, exercises, format_presets, file_formats

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

DESCRIPTION = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
LICENSE = licenses.SPECIAL_PERMISSIONS
LICENSE_DESCRIPTION = "Sample text for content with special permissions"
TAGS = ["Tag 1", "Tag 2", "Tag 3"]
SORT_ORDER = 0

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--email', dest="email", default="a@a.com")
        parser.add_argument('--password', dest="password", default="a")


    def handle(self, *args, **options):
        # Validate email
        email = options["email"]
        password = options["password"]
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            print "{} is not a valid email".format(email)
            sys.exit()

        # create the cache table
        call_command("createcachetable")

        # Run migrations
        call_command('migrate')

        # Run loadconstants
        call_command('loadconstants')


        # Set up user as admin
        admin = create_user(email, password, "Admin", "User", admin=True)

        # Create other users
        user1 = create_user("user@a.com", "a", "User", "A")
        user2 = create_user("user@b.com", "b", "User", "B")
        user3 = create_user("user@c.com", "c", "User", "C")

        # Create channels

        channel1 = create_channel("Published Channel", DESCRIPTION, editors=[admin], bookmarkers=[user1, user2], public=True)
        channel2 = create_channel("Ricecooker Channel", DESCRIPTION, editors=[admin, user1], bookmarkers=[user2], viewers=[user3])
        channel3 = create_channel("Empty Channel", editors=[user3], viewers=[user2])
        channel4 = create_channel("Imported Channel", editors=[admin])

        # Invite admin to channel 3
        invitation, _new = Invitation.objects.get_or_create(
            invited = admin,
            sender = user3,
            channel = channel3,
            email = admin.email,
        )
        invitation.share_mode = "edit"
        invitation.save()

        # Create pool of tags
        tags = []
        for t in TAGS:
            tag, _new = ContentTag.objects.get_or_create(tag_name=t, channel=channel1)

        # Generate file objects
        document_file = create_file("Sample Document", format_presets.DOCUMENT, file_formats.PDF, user=admin)
        video_file = create_file("Sample Video", format_presets.VIDEO_HIGH_RES, file_formats.MP4, user=admin)
        subtitle_file = create_file("Sample Subtitle", format_presets.VIDEO_SUBTITLE, file_formats.VTT, user=admin)
        audio_file = create_file("Sample Audio", format_presets.AUDIO, file_formats.MP3, user=admin)
        html5_file = create_file("Sample HTML", format_presets.HTML5_ZIP, file_formats.HTML5, user=admin)

        # Populate channel 1 with content and publish
        generate_tree(channel1.main_tree, document_file, video_file, subtitle_file, audio_file, html5_file, user=admin, tags=tags)
        call_command('exportchannel', channel1.pk)

        # Populate channel 2 with staged content
        channel2.ricecooker_version = "0.0.0"
        channel2.save()
        generate_tree(channel2.staging_tree, document_file, video_file, subtitle_file, audio_file, html5_file, user=admin, tags=tags)

        # Import content from channel 1 into channel 4
        duplicate_node_bulk(channel1.main_tree.children.first(), parent=channel4.main_tree)

        print "\n\n\nSETUP DONE: Log in as admin to view data (email: {}, password: {})\n\n\n".format(email, password)


def generate_tree(root, document, video, subtitle, audio, html5, user=None, tags=None):
    topic1 = create_topic("Topic 1", root, description=DESCRIPTION)
    topic2 = create_topic("Topic 2", root)
    topic3 = create_topic("Topic 3", topic2, description=DESCRIPTION)
    topic4 = create_topic("Topic 4", topic2, description=DESCRIPTION)

    # Add files to topic 1
    license_id = License.objects.get(license_name=LICENSE).pk
    videonode = create_contentnode("Sample Video", topic1, video, content_kinds.VIDEO, license_id, user=user, tags=tags)
    duplicate_file(subtitle, node=videonode)
    create_contentnode("Sample Document", topic1, document, content_kinds.DOCUMENT, license_id, user=user, tags=tags)
    create_contentnode("Sample Audio", topic1, audio, content_kinds.AUDIO, license_id, user=user, tags=tags)
    create_contentnode("Sample HTML", topic1, html5, content_kinds.HTML5, license_id, user=user, tags=tags)
    create_exercise("Sample Exercise", topic1, license_id, user=user)

def create_user(email, password, first_name, last_name, admin=False):
    user, new = User.objects.get_or_create(email=email)
    if new:
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        print "User created (email: {}, password: {}, admin: {})".format(email, password, admin)
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

def create_exercise(title, parent, license_id, description="", user=None):
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
        author= "{} {}".format(user.first_name, user.last_name),
        copyright_holder= "{} {}".format(user.first_name, user.last_name),
        license_id=license_id,
        license_description=LICENSE_DESCRIPTION,
        extra_fields=json.dumps(mastery_model),
        sort_order=get_sort_order(),
    )
    exercise.save()

    create_question(exercise, "Question 1", exercises.SINGLE_SELECTION)
    create_question(exercise, "Question 2", exercises.MULTIPLE_SELECTION)
    create_question(exercise, "Question 3", exercises.INPUT_QUESTION)
    return exercise

def create_question(node, question, question_type):
    answers = [
        {"answer": "1", "correct": False, "order": 1},
        {"answer": "2", "correct": True, "order": 2},
        {"answer": "3", "correct": False, "order": 3},
        {"answer": "4", "correct": False, "order": 4},
    ]

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
    node = ContentNode.objects.create(
        title=title,
        description=description,
        parent=parent,
        kind_id=kind_id,
        author= "{} {}".format(user.first_name, user.last_name),
        copyright_holder= "{} {}".format(user.first_name, user.last_name),
        license_id=license_id,
        license_description=LICENSE_DESCRIPTION,
        sort_order=get_sort_order(),
    )
    node.save()
    duplicate_file(file, node=node)

    add_tags(node, tags)

    return node

def create_file(display_name, preset_id, ext, user=None):
    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext), mode='w+t', delete=False) as f:
        f.write(":)")
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
