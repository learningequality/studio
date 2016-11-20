import sqlite3
import sys
import os
import datetime
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.core.files import File as DJFile
from le_utils.constants import content_kinds,file_formats, format_presets, licenses, exercises
from contentcuration import models
from contentcuration.api import write_file_to_storage
import logging as logmodule
logging = logmodule.getLogger(__name__)

CHANNEL_TABLE = 'content_channelmetadata'
NODE_TABLE = 'content_contentnode'
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

    help = 'Restores a channel based on its exported database (Usage: restore_channel [source-channel-id] [target-channel-id]'

    def add_arguments(self, parser):

        # ID of channel to read data from
        parser.add_argument('source_id', type=str)

        # ID of channel to write data to (can be same as source channel)
        parser.add_argument('target_id', type=str)

    def handle(self, *args, **options):
        try:
          # Set up variables for restoration process
          logging.info("\n\n********** STARTING CHANNEL RESTORATION **********")
          start = datetime.datetime.now()
          source_id = options['source_id']
          target_id = options.get('target_id') or source_id

          # Test connection to database
          logging.info("Connecting to database for channel {}...".format(source_id))
          conn = sqlite3.connect(os.path.join(settings.DB_ROOT,'{}.sqlite3'.format(source_id)))
          cursor=conn.cursor()

          # Start by creating channel
          logging.info("Creating channel...")
          channel, root_pk = create_channel(conn, target_id)

          # Create nodes mapping to channel
          logging.info("   Creating nodes...")
          root = None
          with transaction.atomic():
            root = create_nodes(cursor, target_id)

          # Save tree to target tree
          channel.main_tree = root
          channel.save()

          # Print stats
          logging.info("\n\nChannel has been restored (time: {ms}, {node_count} nodes, {file_count} files, {tag_count} tags)\n".format(
            ms = datetime.datetime.now() - start,
            node_count = NODE_COUNT,
            file_count = FILE_COUNT,
            tag_count = TAG_COUNT)
          )
          logging.info("\n\n********** RESTORATION COMPLETE **********\n\n")

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
            self.stdout.write("You can find your database in {path}".format(
                path=e.db_path))


def create_channel(cursor, target_id):
    """ create_channel: Create channel at target id
        Args:
            cursor (sqlite3.Connection): connection to export database
            target_id (str): channel_id to write to
        Returns: channel model created and id of root node
    """
    id, name, description, author, thumbnail, root_pk, version = cursor.execute('SELECT * FROM {table}'.format(table=CHANNEL_TABLE)).fetchone()
    channel, is_new = models.Channel.objects.get_or_create(pk=target_id)
    channel.name = name
    channel.description = description
    channel.thumbnail = write_to_thumbnail_file(thumbnail)
    channel.version = version
    channel.save()
    logging.info("\tCreated channel {} with name {}".format(target_id, name))
    return channel, root_pk

def write_to_thumbnail_file(raw_thumbnail):
    """ write_to_thumbnail_file: Convert base64 thumbnail to file
        Args:
            raw_thumbnail (str): base64 encoded thumbnail
        Returns: thumbnail filename
    """
    if raw_thumbnail and isinstance(raw_thumbnail, str) and raw_thumbnail != "" and 'static' not in raw_thumbnail:
        with SimpleUploadedFile('temp.png',raw_thumbnail.replace('data:image/png;base64,', '').decode('base64')) as tempf:
            filename = write_file_to_storage(tempf, check_valid=False)
            logging.info("\tCreated thumbnail {}".format(filename))
            return filename

def create_nodes(cursor, target_id, parent=None, indent=1):
    """ create_channel: Create channel at target id
        Args:
            cursor (sqlite3.Connection): connection to export database
            target_id (str): channel_id to write to
            parent (models.ContentNode): node's parent
            indent (int): How far to indent print statements
        Returns: newly created node
    """
    # Read database rows that match parent
    parent_query = 'parent_id IS NULL'
    if parent:
        parent_query = "parent_id=\'{}\'".format(parent.node_id)

    sql_command = 'SELECT id, title, content_id, description, sort_order, '\
        'license_owner, author, license_id, kind FROM {table} WHERE {query};'\
        .format(table=NODE_TABLE, query=parent_query)
    query = cursor.execute(sql_command).fetchall()

    # Parse through rows and create models
    for id, title, content_id, description, sort_order, license_owner, author, license_id, kind in query:
        logging.info("{indent} {id} ({title} - {kind})...".format(indent="   |"*indent, id=id, title=title, kind=kind))

        # Create new node model
        node = models.ContentNode.objects.create(
            node_id = id,
            title = title,
            content_id = content_id,
            description = description,
            sort_order = sort_order,
            copyright_holder = license_owner,
            author = author,
            license = retrieve_license_name(cursor, license_id),
            kind_id = kind,
            parent = parent,
        )

        # Update node stat
        global NODE_COUNT
        NODE_COUNT += 1

        # Handle foreign key references (children, files, tags)
        if kind == content_kinds.TOPIC:
            create_nodes(cursor, target_id, parent=node, indent=indent+1)
        else:
            create_files(cursor, node, indent=indent+1)
        create_tags(cursor, node, target_id, indent=indent+1)

    return node

def retrieve_license_name(cursor, license_id):
    """ retrieve_license_name: Get license based on id from exported db
        Args:
            cursor (sqlite3.Connection): connection to export database
            license_id (str): id of license on exported db
        Returns: license model matching the name
    """
    # Handle no license being assigned
    if license_id is None or license_id == "":
        return None

    # Return license that matches name
    name = cursor.execute('SELECT license_name FROM {table} WHERE id={id}'\
        .format(table=LICENSE_TABLE, id=license_id)).fetchone()
    return models.License.objects.get(license_name=name[0])

def create_files(cursor, contentnode, indent=0):
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

    # Build up list of files
    file_list = []
    query = cursor.execute(sql_command).fetchall()
    for checksum, extension, file_size, contentnode_id, lang_id, preset in query:
        filename = "{}.{}".format(checksum, extension)
        logging.info("{indent} * FILE {filename}...".format(indent="   |" * indent, filename=filename))
        file_path = models.generate_file_on_disk_name(checksum, filename)

        try:
            # Save values to new or existing file object
            with open(file_path, 'rb') as fobj:
                file_obj = models.File.objects.create(
                    file_on_disk = DJFile(fobj),
                    file_format_id = extension,
                    file_size = file_size,
                    contentnode = contentnode,
                    lang_id = lang_id,
                    preset_id = preset or "",
                )

            # Update file stat
            global FILE_COUNT
            FILE_COUNT += 1

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
        logging.info("{indent} ** TAG {tag}...".format(indent="   |" * indent, tag=tag_name))
        # Save values to new or existing tag object
        tag_obj, is_new = models.ContentTag.objects.get_or_create(
            pk=id,
            tag_name = tag_name,
            channel_id = target_id,
        )
        tag_list.append(tag_obj)

        # Update tag stat
        global TAG_COUNT
        TAG_COUNT += 1

    # Save tags to node
    contentnode.tags = tag_list
    contentnode.save()
