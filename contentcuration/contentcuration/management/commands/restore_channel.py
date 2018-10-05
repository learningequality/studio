import json
import sqlite3
import sys
import os
import datetime
import requests
import shutil
import tempfile

from cStringIO import StringIO
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.core.files import File as DJFile
from django.core.files.storage import default_storage
from le_utils.constants import content_kinds, roles, exercises, format_presets
from pressurecooker.encodings import write_base64_to_file

from contentcuration import models
from contentcuration.api import write_file_to_storage
from contentcuration.utils.files import create_file_from_contents
from contentcuration.utils.garbage_collect import get_deleted_chefs_root

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

CHANNEL_TABLE = 'content_channelmetadata'
NODE_TABLE = 'content_contentnode'
ASSESSMENTMETADATA_TABLE = 'content_assessmentmetadata'
FILE_TABLE = 'content_file'
TAG_TABLE = 'content_contenttag'
NODE_TAG_TABLE = 'content_contentnode_tags'
LICENSE_TABLE = 'content_license'
NODE_COUNT = 0
FILE_COUNT = 0
TAG_COUNT = 0


class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):

    def add_arguments(self, parser):
        # ID of channel to read data from
        parser.add_argument('source_id', type=str)

        # ID of channel to write data to (can be same as source channel)
        parser.add_argument('--target', help='restore channel db to TARGET CHANNEL ID')
        parser.add_argument('--download-url', help='where to download db from')
        parser.add_argument('--editor', help='add user as editor to channel')

    def handle(self, *args, **options):
        try:
            # Set up variables for restoration process
            print "\n\n********** STARTING CHANNEL RESTORATION **********"
            start = datetime.datetime.now()
            source_id = options['source_id']
            target_id = options.get('target') or source_id

            # Test connection to database
            print "Connecting to database for channel {}...".format(source_id)


            tempf = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
            conn = None
            try:
                if options.get('download_url'):
                    response = requests.get('{}/content/databases/{}.sqlite3'.format(options['download_url'], source_id))
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
                print "Creating channel..."
                channel, root_pk = create_channel(conn, target_id)
                if options.get('editor'):
                    channel.editors.add(models.User.objects.get(email=options['editor']))
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
                print "   Creating nodes..."
                with transaction.atomic():
                    create_nodes(cursor, target_id, root, download_url=options.get('download_url'))
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
            print "\n\nChannel has been restored (time: {ms})\n".format(ms=datetime.datetime.now() - start)
            print "\n\n********** RESTORATION COMPLETE **********\n\n"

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(message=e.message))
            self.stdout.write("You can find your database in {path}".format(path=e.db_path))


def create_channel(cursor, target_id):
    """ create_channel: Create channel at target id
        Args:
            cursor (sqlite3.Connection): connection to export database
            target_id (str): channel_id to write to
        Returns: channel model created and id of root node
    """
    id, name, description, thumbnail, root_pk, version, last_updated = cursor.execute(
        'SELECT id, name, description, thumbnail, root_pk, version, last_updated FROM {table}'
        .format(table=CHANNEL_TABLE)).fetchone()
    channel, is_new = models.Channel.objects.get_or_create(pk=target_id)
    channel.name = name
    channel.description = description
    channel.thumbnail = write_to_thumbnail_file(thumbnail)
    channel.thumbnail_encoding = json.dumps({'base64': thumbnail, 'points': [], 'zoom': 0})
    channel.version = version
    channel.save()
    print "\tCreated channel {} with name {}".format(target_id, name)
    return channel, root_pk


def write_to_thumbnail_file(raw_thumbnail):
    """ write_to_thumbnail_file: Convert base64 thumbnail to file
        Args:
            raw_thumbnail (str): base64 encoded thumbnail
        Returns: thumbnail filename
    """
    if raw_thumbnail and isinstance(raw_thumbnail, basestring) and raw_thumbnail != "" and 'static' not in raw_thumbnail:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tempf:
            try:
                tempf.close()
                write_base64_to_file(raw_thumbnail, tempf.name)
                with open(tempf.name, 'rb') as tf:
                    fobj = create_file_from_contents(tf.read(), ext="png", preset_id=format_presets.CHANNEL_THUMBNAIL)
                    return str(fobj)
            finally:
                tempf.close()
                os.unlink(tempf.name)


def create_nodes(cursor, target_id, parent, indent=1, download_url=None):
    """ create_channel: Create channel at target id
        Args:
            cursor (sqlite3.Connection): connection to export database
            target_id (str): channel_id to write to
            parent (models.ContentNode): node's parent
            indent (int): How far to indent print statements
        Returns: newly created node
    """
    # Read database rows that match parent
    parent_query = "parent_id=\'{}\'".format(parent.node_id)

    sql_command = 'SELECT id, title, content_id, description, sort_order, '\
        'license_owner, author, license_id, kind, coach_content, lang_id FROM {table} WHERE {query};'\
        .format(table=NODE_TABLE, query=parent_query)
    query = cursor.execute(sql_command).fetchall()

    # Parse through rows and create models
    for id, title, content_id, description, sort_order, license_owner, author, license_id, kind, coach_content, lang_id in query:
        print "{indent} {id} ({title} - {kind})...".format(indent="   |" * indent, id=id, title=title, kind=kind)

        # Determine role
        role = roles.LEARNER
        if coach_content:
            role = roles.COACH

        # Determine extra_fields
        assessment_query = "SELECT mastery_model, randomize FROM {table} WHERE contentnode_id='{node}'".format(table=ASSESSMENTMETADATA_TABLE, node=id)
        result = cursor.execute(assessment_query).fetchone()
        extra_fields = json.loads(result[0]) if result else {}
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
            extra_fields=json.dumps(extra_fields),
            kind_id=kind,
            parent=parent,
            original_channel_id=target_id,
            source_channel_id=target_id,
        )

        # Handle foreign key references (children, files, tags)
        if kind == content_kinds.TOPIC:
            create_nodes(cursor, target_id, node, indent=indent + 1, download_url=download_url)
        elif kind == content_kinds.EXERCISE:
            pass
        create_files(cursor, node, indent=indent + 1, download_url=download_url)
        create_tags(cursor, node, target_id, indent=indent + 1)

    return node


def retrieve_license(cursor, license_id):
    """ retrieve_license_name: Get license based on id from exported db
        Args:
            cursor (sqlite3.Connection): connection to export database
            license_id (str): id of license on exported db
        Returns: license model matching the name and the associated license description
    """
    # Handle no license being assigned
    if license_id is None or license_id == "":
        return None

    # Return license that matches name
    name, description = cursor.execute('SELECT license_name, license_description FROM {table} WHERE id={id}'.format(table=LICENSE_TABLE, id=license_id)).fetchone()
    return models.License.objects.get(license_name=name), description


def create_files(cursor, contentnode, indent=0, download_url=None):
    """ create_files: Get license
        Args:
            cursor (sqlite3.Connection): connection to export database
            contentnode (models.ContentNode): node file references
            indent (int): How far to indent print statements
        Returns: None
    """
    # Parse database for files referencing content node and make file models
    sql_command = 'SELECT checksum, extension, file_size, contentnode_id, '\
        'lang_id, preset FROM {table} WHERE contentnode_id=\'{id}\';'\
        .format(table=FILE_TABLE, id=contentnode.node_id)

    query = cursor.execute(sql_command).fetchall()
    for checksum, extension, file_size, contentnode_id, lang_id, preset in query:
        filename = "{}.{}".format(checksum, extension)
        print "{indent} * FILE {filename}...".format(indent="   |" * indent, filename=filename)

        try:
            filepath = models.generate_object_storage_name(checksum, filename)

            # Download file first
            if download_url and not default_storage.exists(filepath):
                buffer = StringIO()
                response = requests.get('{}/content/storage/{}/{}/{}'.format(download_url, filename[0], filename[1], filename))
                for chunk in response:
                    buffer.write(chunk)
                create_file_from_contents(buffer.getvalue(), ext=extension, node=contentnode, preset_id=preset or "")
                buffer.close()
            else:
                # Save values to new or existing file object
                file_obj = models.File(
                    file_format_id=extension,
                    file_size=file_size,
                    contentnode=contentnode,
                    language_id=lang_id,
                    preset_id=preset or "",
                )
                file_obj.file_on_disk.name = filepath
                file_obj.save()

        except IOError as e:
            logging.warning("\b FAILED (check logs for more details)")
            sys.stderr.write("Restoration Process Error: Failed to save file object {}: {}".format(filename, os.strerror(e.errno)))
            continue


def create_tags(cursor, contentnode, target_id, indent=0):
    """ create_tags: Create tags associated with node
        Args:
            cursor (sqlite3.Connection): connection to export database
            contentnode (models.ContentNode): node file references
            target_id (str): channel_id to write to
            indent (int): How far to indent print statements
        Returns: None
    """
    # Parse database for files referencing content node and make file models
    sql_command = 'SELECT ct.id, ct.tag_name FROM {cnttable} cnt '\
        'JOIN {cttable} ct ON cnt.contenttag_id = ct.id ' \
        'WHERE cnt.contentnode_id=\'{id}\';'\
        .format(
            cnttable=NODE_TAG_TABLE,
            cttable=TAG_TABLE,
            id=contentnode.node_id,
        )
    query = cursor.execute(sql_command).fetchall()

    # Build up list of tags
    tag_list = []
    for id, tag_name in query:
        print "{indent} ** TAG {tag}...".format(indent="   |" * indent, tag=tag_name)
        # Save values to new or existing tag object
        tag_obj, is_new = models.ContentTag.objects.get_or_create(
            pk=id,
            tag_name=tag_name,
            channel_id=target_id,
        )
        tag_list.append(tag_obj)

    # Save tags to node
    contentnode.tags = tag_list
    contentnode.save()
