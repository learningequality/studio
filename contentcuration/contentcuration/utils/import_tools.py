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
import uuid
import zipfile
from contextlib import contextmanager
from io import BytesIO

import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import roles
from lxml import etree

from contentcuration import models
from contentcuration.api import write_raw_content_to_storage
from contentcuration.utils.assessment.qti.archive import QTIExerciseGenerator
from contentcuration.utils.assessment.qti.convert import qti_id_to_hex
from contentcuration.utils.assessment.qti.imsmanifest import (
    get_assessment_item_resources_from_manifest,
)
from contentcuration.utils.assessment.qti.ingest import (
    find_perseus_custom_interaction_path,
)
from contentcuration.utils.assessment.qti.media import rewrite_qti_media_paths
from contentcuration.utils.assessment.qti.validation import parse_qti_xml
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
                    filename, e
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


@contextmanager
def _download_to_tempfile(filename, download_url):
    tempf = tempfile.NamedTemporaryFile(
        suffix=os.path.splitext(filename)[1], delete=False
    )
    try:
        with tempf:
            if download_url:
                response = requests.get(
                    "{}/content/storage/{}/{}/{}".format(
                        download_url, filename[0], filename[1], filename
                    )
                )
                for chunk in response:
                    tempf.write(chunk)
            else:
                checksum = os.path.splitext(filename)[0]
                path = models.generate_object_storage_name(checksum, filename)
                with default_storage.open(path, "rb") as f:
                    shutil.copyfileobj(f, tempf)
        yield tempf.name
    finally:
        os.unlink(tempf.name)


def create_assessment_items(cursor, contentnode, indent=0, download_url=None):
    """create_assessment_items: Generate assessment items based on the QTI zip,
    or the perseus zip if the node has no QTI zip
    Args:
        cursor (sqlite3.Connection): connection to export database
        contentnode (models.ContentNode): node assessment items reference
        indent (int): How far to indent print statements
        download_url (str): Domain to download files from
    Returns: None
    """

    # Parse database for files referencing content node and make file models
    sql_command = (
        "SELECT checksum, extension, preset FROM {table} "
        "WHERE contentnode_id='{id}' AND preset IN ('{perseus}', '{qti}');".format(
            table=FILE_TABLE,
            id=contentnode.node_id,
            perseus=format_presets.EXERCISE,
            qti=format_presets.QTI_ZIP,
        )
    )

    archives = [
        ("{}.{}".format(checksum, extension), preset)
        for checksum, extension, preset in cursor.execute(sql_command).fetchall()
    ]
    qti_filename = next(
        (name for name, preset in archives if preset == format_presets.QTI_ZIP), None
    )
    if qti_filename:
        # No fallback: a dual node's exercise archive holds QTI ids, which
        # cannot republish.
        try:
            _restore_archive(
                qti_filename, _extract_qti_items, contentnode, indent, download_url
            )
        except (
            IOError,
            zipfile.BadZipFile,
            KeyError,
            ValueError,
            etree.XMLSyntaxError,
        ) as e:
            log.warning(f"QTI package unusable: {e}")
            sys.stderr.write(
                "Restoration Process Error: Failed to restore QTI package {}: {}".format(
                    qti_filename, e
                )
            )
        return
    for filename, _ in archives:
        try:
            _restore_archive(
                filename, extract_assessment_items, contentnode, indent, download_url
            )
        except IOError as e:
            log.warning("\b FAILED (check logs for more details)")
            sys.stderr.write(
                "Restoration Process Error: Failed to save file object {}: {}".format(
                    filename, e
                )
            )


def _restore_archive(filename, extract, contentnode, indent, download_url):
    log.info(
        "{indent} * EXERCISE {filename}...".format(
            indent="   |" * indent, filename=filename
        )
    )
    with _download_to_tempfile(filename, download_url) as filepath:
        extract(filepath, contentnode, download_url=download_url)


@transaction.atomic
def _extract_qti_items(filepath, contentnode, download_url=None):
    with zipfile.ZipFile(filepath, "r") as zipf:
        resources = get_assessment_item_resources_from_manifest(zipf)
        if not resources:
            raise ValueError("QTI package has no item resources")
        for order, resource in enumerate(resources):
            item_xml = zipf.read(resource.href)
            perseus_path = find_perseus_custom_interaction_path(item_xml)
            if perseus_path:
                _create_perseus_item(zipf, perseus_path, resource, order, contentnode)
            else:
                _create_qti_item(zipf, item_xml, resource, order, contentnode)


def _create_qti_item(zipf, item_xml, resource, order, contentnode):
    # Packaged media sits under images/; the item XML stores bare filenames.
    image_hrefs = [
        href for href in resource.dependency_hrefs if href.startswith("images/")
    ]
    identifier = parse_qti_xml(item_xml).getroot().get("identifier")
    assessment_item = models.AssessmentItem.objects.create(
        contentnode=contentnode,
        # Only a converted legacy item's identifier encodes its assessment_id.
        assessment_id=qti_id_to_hex(identifier) or uuid.uuid4().hex,
        type=exercises.QTI,
        order=order,
        raw_data=rewrite_qti_media_paths(
            item_xml.decode("utf-8"),
            {href: os.path.basename(href) for href in image_hrefs},
        ),
    )
    for href in image_hrefs:
        # Item-relative hrefs resolve against the item's own directory.
        _create_image_file(
            zipf, os.path.join(os.path.dirname(resource.href), href), assessment_item
        )


def _create_perseus_item(zipf, perseus_path, resource, order, contentnode):
    """Restore a packaged Perseus question with its images and graphies (an .svg
    with a sibling -data.json).
    """
    image_dir = QTIExerciseGenerator.PERSEUS_IMAGE_DIR
    hrefs = set(resource.dependency_hrefs)
    graphie_hrefs = {
        href
        for href in hrefs
        if href.endswith(".svg") and f"{os.path.splitext(href)[0]}-data.json" in hrefs
    }
    # Perseus hrefs are relative to the package root.
    image_hrefs = [
        href
        for href in resource.dependency_hrefs
        if href.startswith(f"{image_dir}/")
        and not href.endswith("-data.json")
        and href not in graphie_hrefs
    ]
    raw_data = zipf.read(perseus_path).decode("utf-8")
    assessment_item = models.AssessmentItem.objects.create(
        contentnode=contentnode,
        assessment_id=os.path.splitext(os.path.basename(perseus_path))[0],
        type=exercises.PERSEUS_QUESTION,
        order=order,
        raw_data=raw_data.replace(
            f"{exercises.IMG_PLACEHOLDER}/{image_dir}",
            exercises.CONTENT_STORAGE_PLACEHOLDER,
        ),
    )
    for href in image_hrefs:
        _create_image_file(zipf, href, assessment_item)
    for href in sorted(graphie_hrefs):
        _create_graphie_file(zipf, os.path.splitext(href)[0], assessment_item)


def _create_image_file(zipf, path, assessment_item):
    create_file_from_contents(
        zipf.read(path),
        ext=os.path.splitext(path)[1].lstrip("."),
        preset_id=format_presets.EXERCISE_IMAGE,
        assessment_item=assessment_item,
    )


def _create_graphie_file(zipf, stem, assessment_item):
    """Reverse of `_write_raw_perseus_assets`: svg and data json back into one file."""
    create_file_from_contents(
        zipf.read(f"{stem}.svg")
        + exercises.GRAPHIE_DELIMITER.encode("ascii")
        + zipf.read(f"{stem}-data.json"),
        ext=file_formats.GRAPHIE,
        preset_id=format_presets.EXERCISE_GRAPHIE,
        assessment_item=assessment_item,
        original_filename=os.path.basename(stem),
    )


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

        with open(os.path.join(tempdir, "exercise.json"), "rb") as fobj:
            data = json.load(fobj)

        for index, assessment_id in enumerate(data["all_assessment_items"]):
            with open(
                os.path.join(tempdir, "{}.json".format(assessment_id)), "rb"
            ) as fobj:
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
