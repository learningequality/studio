# -*- coding: utf-8 -*-
import datetime
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import tempfile
import zipfile
from io import BytesIO

import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import format_presets
from le_utils.constants import roles

from contentcuration import models
from contentcuration.api import write_raw_content_to_storage
from contentcuration.utils.files import create_file_from_contents
from contentcuration.utils.files import write_base64_to_file
from contentcuration.utils.garbage_collect import get_deleted_chefs_root


CHANNEL_TABLE = "content_channelmetadata"
NODE_TABLE = "content_contentnode"
ASSESSMENTMETADATA_TABLE = "content_assessmentmetadata"
FILE_TABLE = "content_file"
TAG_TABLE = "content_contenttag"
NODE_TAG_TABLE = "content_contentnode_tags"
LICENSE_TABLE = "content_license"
NODE_COUNT = 0
FILE_COUNT = 0
TAG_COUNT = 0

ANSWER_FIELD_MAP = {
    exercises.SINGLE_SELECTION: "radio 1",
    exercises.MULTIPLE_SELECTION: "radio 1",
    exercises.INPUT_QUESTION: "numeric-input 1",
}

log = logging.getLogger(__name__)


def import_channel(
    source_id, target_id=None, download_url=None, editor=None, logger=None
):
    """
    Import a channel from another Studio instance. This can be used to
    copy online Studio channels into local machines for development,
    testing, faster editing, or other purposes.

    :param source_id: The UUID of the channel to import from the source Studio instance.
    :param target_id: The UUID of the channel on the local instance. Defaults to source_id.
    :param download_url: The URL of the Studio instance to import from.
    :param editor: The email address of the user you wish to add as an editor, if any.

    """

    global log
    if logger:
        log = logger
    else:
        log = logging.getLogger(__name__)

    # Set up variables for the import process
    log.info("\n\n********** STARTING CHANNEL IMPORT **********")
    start = datetime.datetime.now()
    target_id = target_id or source_id

    # Test connection to database
    log.info("Connecting to database for channel {}...".format(source_id))

    tempf = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
    conn = None
    try:
        if download_url:
            response = requests.get(
                "{}/content/databases/{}.sqlite3".format(download_url, source_id)
            )
            for chunk in response:
                tempf.write(chunk)
        else:
            filepath = "/".join([settings.DB_ROOT, "{}.sqlite3".format(source_id)])
            # Check if database exists
            if not default_storage.exists(filepath):
                raise IOError("The object requested does not exist.")
            with default_storage.open(filepath) as fobj:
                shutil.copyfileobj(fobj, tempf)

        tempf.close()
        conn = sqlite3.connect(tempf.name)
        cursor = conn.cursor()

        # Start by creating channel
        log.info("Creating channel...")
        editor = models.User.objects.get(email=editor)
        channel, root_pk = create_channel(conn, target_id, editor)
        channel.editors.add(editor)
        channel.save()

        # Create root node
        root = models.ContentNode.objects.create(
            node_id=root_pk,
            title=channel.name,
            kind_id=content_kinds.TOPIC,
            original_channel_id=target_id,
            source_channel_id=target_id,
        )

        # Create nodes mapping to channel
        log.info("   Creating nodes...")
        with transaction.atomic():
            create_nodes(cursor, target_id, root, download_url=download_url)
            # TODO: Handle prerequisites

        # Delete the previous tree if it exists
        old_previous = channel.previous_tree
        if old_previous:
            old_previous.parent = get_deleted_chefs_root()
            old_previous.title = "Old previous tree for channel {}".format(channel.pk)
            old_previous.save()

        # Save tree to target tree
        channel.previous_tree = channel.main_tree
        channel.main_tree = root
        channel.save()
    finally:
        conn and conn.close()
        tempf.close()
        os.unlink(tempf.name)

    # Print stats
    log.info(
        "\n\nChannel has been imported (time: {ms})\n".format(
            ms=datetime.datetime.now() - start
        )
    )
    log.info("\n\n********** IMPORT COMPLETE **********\n\n")


def create_channel(cursor, target_id, editor):
    """create_channel: Create channel at target id
    Args:
        cursor (sqlite3.Connection): connection to export database
        target_id (str): channel_id to write to
    Returns: channel model created and id of root node
    """
    id, name, description, thumbnail, root_pk, version, last_updated = cursor.execute(
        "SELECT id, name, description, thumbnail, root_pk, version, last_updated FROM {table}".format(
            table=CHANNEL_TABLE
        )
    ).fetchone()
    channel, is_new = models.Channel.objects.get_or_create(
        pk=target_id, actor_id=editor.id
    )
    channel.name = name
    channel.description = description
    channel.thumbnail = write_to_thumbnail_file(thumbnail)
    channel.thumbnail_encoding = {"base64": thumbnail, "points": [], "zoom": 0}
    channel.version = version
    channel.save()
    log.info("\tCreated channel {} with name {}".format(target_id, name))
    return channel, root_pk


def write_to_thumbnail_file(raw_thumbnail):
    """write_to_thumbnail_file: Convert base64 thumbnail to file
    Args:
        raw_thumbnail (str): base64 encoded thumbnail
    Returns: thumbnail filename
    """
    if (
        raw_thumbnail
        and isinstance(raw_thumbnail, str)
        and raw_thumbnail != ""
        and "static" not in raw_thumbnail
    ):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tempf:
            try:
                tempf.close()
                write_base64_to_file(raw_thumbnail, tempf.name)
                with open(tempf.name, "rb") as tf:
                    fobj = create_file_from_contents(
                        tf.read(), ext="png", preset_id=format_presets.CHANNEL_THUMBNAIL
                    )
                    return str(fobj)
            finally:
                tempf.close()
                os.unlink(tempf.name)


def create_nodes(cursor, target_id, parent, indent=1, download_url=None):
    """create_channel: Create channel at target id
    Args:
        cursor (sqlite3.Connection): connection to export database
        target_id (str): channel_id to write to
        parent (models.ContentNode): node's parent
        indent (int): How far to indent print statements
    Returns: newly created node
    """
    # Read database rows that match parent
    parent_query = "parent_id='{}'".format(parent.node_id)

    sql_command = (
        "SELECT id, title, content_id, description, sort_order, "
        "license_owner, author, license_id, kind, coach_content, lang_id FROM {table} WHERE {query} ORDER BY sort_order;".format(
            table=NODE_TABLE, query=parent_query
        )
    )
    query = cursor.execute(sql_command).fetchall()

    # Parse through rows and create models
    for (
        id,
        title,
        content_id,
        description,
        sort_order,
        license_owner,
        author,
        license_id,
        kind,
        coach_content,
        lang_id,
    ) in query:
        log.info(
            "{indent} {id} ({title} - {kind})...".format(
                indent="   |" * indent, id=id, title=title, kind=kind
            )
        )

        # Determine role
        role = roles.LEARNER
        if coach_content:
            role = roles.COACH

        # Determine extra_fields
        assessment_query = "SELECT mastery_model, randomize FROM {table} WHERE contentnode_id='{node}'".format(
            table=ASSESSMENTMETADATA_TABLE, node=id
        )
        result = cursor.execute(assessment_query).fetchone()
        extra_fields = result[0] if result else {}
        if isinstance(extra_fields, str):
            extra_fields = json.loads(extra_fields)
        if result:
            extra_fields.update({"randomize": result[1]})

        # Determine license
        license = retrieve_license(cursor, license_id)
        license_description = license[1] if license else ""
        license = license[0] if license else None

        # TODO: Determine thumbnail encoding

        # Create new node model
        node = models.ContentNode.objects.create(
            node_id=id,
            original_source_node_id=id,
            source_node_id=id,
            title=title,
            content_id=content_id,
            description=description,
            sort_order=sort_order,
            copyright_holder=license_owner,
            author=author,
            license=license,
            license_description=license_description,
            language_id=lang_id,
            role_visibility=role,
            extra_fields=extra_fields,
            kind_id=kind,
            parent=parent,
            original_channel_id=target_id,
            source_channel_id=target_id,
        )

        # Handle foreign key references (children, files, tags)
        if kind == content_kinds.TOPIC:
            create_nodes(
                cursor, target_id, node, indent=indent + 1, download_url=download_url
            )
        elif kind == content_kinds.EXERCISE:
            create_assessment_items(
                cursor, node, indent=indent + 1, download_url=download_url
            )
        create_files(cursor, node, indent=indent + 1, download_url=download_url)
        create_tags(cursor, node, target_id, indent=indent + 1)

    return node


def retrieve_license(cursor, license_id):
    """retrieve_license_name: Get license based on id from exported db
    Args:
        cursor (sqlite3.Connection): connection to export database
        license_id (str): id of license on exported db
    Returns: license model matching the name and the associated license description
    """
    # Handle no license being assigned
    if license_id is None or license_id == "":
        return None

    # Return license that matches name
    name, description = cursor.execute(
        "SELECT license_name, license_description FROM {table} WHERE id={id}".format(
            table=LICENSE_TABLE, id=license_id
        )
    ).fetchone()
    return models.License.objects.get(license_name=name), description


def download_file(
    filename,
    download_url=None,
    contentnode=None,
    assessment_item=None,
    preset=None,
    file_size=None,
    lang_id=None,
):
    checksum, extension = os.path.splitext(filename)
    extension = extension.lstrip(".")
    filepath = models.generate_object_storage_name(checksum, filename)

    # Download file if it hasn't already been downloaded
    if download_url and not default_storage.exists(filepath):
        buffer = BytesIO()
        response = requests.get(
            "{}/content/storage/{}/{}/{}".format(
                download_url, filename[0], filename[1], filename
            )
        )
        for chunk in response:
            buffer.write(chunk)

        checksum, _, filepath = write_raw_content_to_storage(
            buffer.getvalue(), ext=extension
        )
        buffer.close()

    # Save values to new file object
    file_obj = models.File(
        file_format_id=extension,
        file_size=file_size or default_storage.size(filepath),
        contentnode=contentnode,
        assessment_item=assessment_item,
        language_id=lang_id,
        preset_id=preset or "",
    )
    file_obj.file_on_disk.name = filepath
    file_obj.save()


def create_files(cursor, contentnode, indent=0, download_url=None):
    """create_files: Get license
    Args:
        cursor (sqlite3.Connection): connection to export database
        contentnode (models.ContentNode): node file references
        indent (int): How far to indent print statements
    Returns: None
    """
    # Parse database for files referencing content node and make file models
    sql_command = (
        "SELECT checksum, extension, file_size, contentnode_id, "
        "lang_id, preset FROM {table} WHERE contentnode_id='{id}';".format(
            table=FILE_TABLE, id=contentnode.node_id
        )
    )

    query = cursor.execute(sql_command).fetchall()
    for checksum, extension, file_size, contentnode_id, lang_id, preset in query:
        filename = "{}.{}".format(checksum, extension)
        log.info(
            "{indent} * FILE {filename}...".format(
                indent="   |" * indent, filename=filename
            )
        )

        try:
            download_file(
                filename,
                download_url=download_url,
                contentnode=contentnode,
                preset=preset,
                file_size=file_size,
                lang_id=lang_id,
            )

        except IOError as e:
            log.warning("\b FAILED (check logs for more details)")
            sys.stderr.write(
                "Restoration Process Error: Failed to save file object {}: {}".format(
                    filename, os.strerror(e.errno)
                )
            )
            continue


def create_tags(cursor, contentnode, target_id, indent=0):
    """create_tags: Create tags associated with node
    Args:
        cursor (sqlite3.Connection): connection to export database
        contentnode (models.ContentNode): node file references
        target_id (str): channel_id to write to
        indent (int): How far to indent print statements
    Returns: None
    """
    # Parse database for files referencing content node and make file models
    sql_command = (
        "SELECT ct.id, ct.tag_name FROM {cnttable} cnt "
        "JOIN {cttable} ct ON cnt.contenttag_id = ct.id "
        "WHERE cnt.contentnode_id='{id}';".format(
            cnttable=NODE_TAG_TABLE,
            cttable=TAG_TABLE,
            id=contentnode.node_id,
        )
    )
    query = cursor.execute(sql_command).fetchall()

    # Build up list of tags
    tag_list = []
    for id, tag_name in query:
        log.info(
            "{indent} ** TAG {tag}...".format(indent="   |" * indent, tag=tag_name)
        )
        # Save values to new or existing tag object
        tag_obj, is_new = models.ContentTag.objects.get_or_create(
            pk=id,
            tag_name=tag_name,
            channel_id=target_id,
        )
        tag_list.append(tag_obj)

    # Save tags to node
    contentnode.tags.set(tag_list)
    contentnode.save()


def create_assessment_items(cursor, contentnode, indent=0, download_url=None):
    """create_assessment_items: Generate assessment items based on perseus zip
    Args:
        cursor (sqlite3.Connection): connection to export database
        contentnode (models.ContentNode): node assessment items reference
        indent (int): How far to indent print statements
        download_url (str): Domain to download files from
    Returns: None
    """

    # Parse database for files referencing content node and make file models
    sql_command = (
        "SELECT checksum, extension "
        "preset FROM {table} WHERE contentnode_id='{id}' AND preset='exercise';".format(
            table=FILE_TABLE, id=contentnode.node_id
        )
    )

    query = cursor.execute(sql_command).fetchall()
    for checksum, extension in query:
        filename = "{}.{}".format(checksum, extension)
        log.info(
            "{indent} * EXERCISE {filename}...".format(
                indent="   |" * indent, filename=filename
            )
        )

        try:
            # Store the downloaded zip into temporary storage
            tempf = tempfile.NamedTemporaryFile(
                suffix=".{}".format(extension), delete=False
            )
            response = requests.get(
                "{}/content/storage/{}/{}/{}".format(
                    download_url, filename[0], filename[1], filename
                )
            )
            for chunk in response:
                tempf.write(chunk)
            tempf.close()
            extract_assessment_items(tempf.name, contentnode, download_url=download_url)
        except IOError as e:
            log.warning("\b FAILED (check logs for more details)")
            sys.stderr.write(
                "Restoration Process Error: Failed to save file object {}: {}".format(
                    filename, os.strerror(e.errno)
                )
            )
            continue
        finally:
            os.unlink(tempf.name)


def extract_assessment_items(filepath, contentnode, download_url=None):
    """extract_assessment_items: Create and save assessment items to content node
    Args:
        filepath (str): Where perseus zip is stored
        contentnode (models.ContentNode): node assessment items reference
        download_url (str): Domain to download files from
    Returns: None
    """

    try:
        tempdir = tempfile.mkdtemp()
        with zipfile.ZipFile(filepath, "r") as zipf:
            zipf.extractall(tempdir)
        os.chdir(tempdir)

        with open("exercise.json", "rb") as fobj:
            data = json.load(fobj)

        for index, assessment_id in enumerate(data["all_assessment_items"]):
            with open("{}.json".format(assessment_id), "rb") as fobj:
                assessment_item = generate_assessment_item(
                    assessment_id,
                    index,
                    data["assessment_mapping"][assessment_id],
                    json.load(fobj),
                    download_url=download_url,
                )
                contentnode.assessment_items.add(assessment_item)
    finally:
        shutil.rmtree(tempdir)


def generate_assessment_item(
    assessment_id, order, assessment_type, assessment_data, download_url=None
):
    """generate_assessment_item: Generates a new assessment item
    Args:
        assessment_id (str): AssessmentItem.assessment_id value
        order (Number): AssessmentItem.order value
        assessment_type (str): AssessmentItem.type value
        assessment_data (dict): Extracted data from perseus file
        download_url (str): Domain to download files from
    Returns: models.AssessmentItem
    """
    assessment_item = models.AssessmentItem.objects.create(
        assessment_id=assessment_id, type=assessment_type, order=order
    )
    if assessment_type == exercises.PERSEUS_QUESTION:
        assessment_item.raw_data = json.dumps(assessment_data)
    else:
        # Parse questions
        assessment_data["question"]["content"] = "\n\n".join(
            assessment_data["question"]["content"].split("\n\n")[:-1]
        )
        assessment_item.question = process_content(
            assessment_data["question"], assessment_item, download_url=download_url
        )

        # Parse answers
        answer_data = assessment_data["question"]["widgets"][
            ANSWER_FIELD_MAP[assessment_type]
        ]["options"]
        if assessment_type == exercises.INPUT_QUESTION:
            assessment_item.answers = json.dumps(
                [
                    {"answer": answer["value"], "correct": True}
                    for answer in answer_data["answers"]
                ]
            )
        else:
            assessment_item.answers = json.dumps(
                [
                    {
                        "answer": process_content(
                            answer, assessment_item, download_url=download_url
                        ),
                        "correct": answer["correct"],
                    }
                    for answer in answer_data["choices"]
                ]
            )
            assessment_item.randomize = answer_data["randomize"]

        # Parse hints
        assessment_item.hints = json.dumps(
            [
                {
                    "hint": process_content(
                        hint, assessment_item, download_url=download_url
                    )
                }
                for hint in assessment_data["hints"]
            ]
        )

    assessment_item.save()
    return assessment_item


def process_content(data, assessment_item, download_url=None):
    """process_content: Parses perseus text for special formatting (e.g. formulas, images)
    Args:
        data (dict): Perseus data to parse (e.g. parsing 'question' field)
        download_url (str): Domain to download files from
        assessment_item (models.AssessmentItem): assessment item to save images to
    Returns: models.AssessmentItem
    """
    data["content"] = data["content"].replace(
        " ", ""
    )  # Remove unrecognized non unicode characters
    # Process formulas
    for match in re.finditer(r"(\$[^\$☣]+\$)", data["content"]):
        data["content"] = data["content"].replace(
            match.group(0), "${}$".format(match.group(0))
        )

    # Process images

    for match in re.finditer(
        r"!\[[^\]]*\]\((\$(\{☣ LOCALPATH\}\/images)\/([^\.]+\.[^\)]+))\)",
        data["content"],
    ):
        data["content"] = data["content"].replace(
            match.group(2), exercises.CONTENT_STORAGE_PLACEHOLDER
        )
        image_data = data["images"].get(match.group(1))
        if image_data and image_data.get("width"):
            data["content"] = data["content"].replace(
                match.group(3),
                "{} ={}x{}".format(
                    match.group(3), image_data["width"], image_data["height"]
                ),
            )

        # Save files to db
        download_file(
            match.group(3),
            assessment_item=assessment_item,
            preset=format_presets.EXERCISE,
            download_url=download_url,
        )

    return data["content"]
