import collections
import os
import zipfile
import shutil

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from contentcuration.constants import content_kinds

from contentcuration import models as ccmodels
from kolibri.content import models as kolibrimodels

import logging as logmodule
logging = logmodule.getLogger(__name__)


class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)

    def handle(self, *args, **options):
        # license_id = options['license_id']
        channel_id = options['channel_id']

        # license = ccmodels.License.objects.get(pk=license_id)
        try:
            channel = ccmodels.Channel.objects.get(pk=channel_id)
            # increment the channel version
            raise_if_nodes_are_all_unchanged(channel)
            mark_all_nodes_as_changed(channel)
            # assign_license_to_contentcuration_nodes(channel, license)
            # create_kolibri_license_object(license)
            increment_channel_version(channel)
            prepare_export_database()
            # TODO: increment channel version numbers when we mark nodes as changed as well
            map_content_tags(channel)

            map_channel_to_kolibri_channel(channel)
            map_content_nodes(channel.main_tree,)
            save_export_database(channel_id)
            # use SQLite backup API to put DB into archives folder.
            # Then we can use the empty db name to have SQLite use a temporary DB (https://www.sqlite.org/inmemorydb.html)

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
            self.stdout.write("You can find your database in {path}".format(
                path=e.db_path))


def create_kolibri_license_object(license):
    return kolibrimodels.License.objects.get_or_create(
        license_name=license.license_name
    )


def increment_channel_version(channel):
    channel.version += 1
    channel.save()


def assign_license_to_contentcuration_nodes(channel, license):
    channel.main_tree.get_family().update(license_id=license.pk)


def map_content_tags(channel):
    logging.debug("Creating the Kolibri content tags.")

    cctags = ccmodels.ContentTag.objects.filter(
        channel=channel).values("tag_name", "id")
    kolibrimodels.ContentTag.objects.bulk_create(
        [kolibrimodels.ContentTag(**vals) for vals in cctags])

    logging.info("Finished creating the Kolibri content tags.")


def map_content_nodes(root_node):

    # make sure we process nodes higher up in the tree first, or else when we
    # make mappings the parent nodes might not be there

    node_queue = collections.deque()
    node_queue.append(root_node)

    def queue_get_return_none_when_empty():
        try:
            return node_queue.popleft()
        except IndexError:
            return None


    # kolibri_license = kolibrimodels.License.objects.get(license_name=license.license_name)

    with ccmodels.ContentNode.objects.delay_mptt_updates():
        for node in iter(queue_get_return_none_when_empty, None):
            logging.debug("Mapping node with id {id}".format(
                id=node.pk))

            children = (node.children.
                        # select_related('parent', 'files__preset', 'files__file_format').
                        all())
            node_queue.extend(children)

            kolibrinode = create_bare_contentnode(node)

            if node.kind.kind != content_kinds.TOPIC:
                create_associated_file_objects(kolibrinode, node)


def create_bare_contentnode(ccnode):
    logging.debug("Creating a Kolibri node for instance id {}".format(
        ccnode.pk))

    kolibri_license = None
    if ccnode.license is not None:
        kolibri_license = create_kolibri_license_object(ccnode.license)[0]

    kolibrinode = kolibrimodels.ContentNode.objects.create(
        title=ccnode.title,
        pk=ccnode.pk,
        content_id=ccnode.content_id,
        description=ccnode.description,
        sort_order=ccnode.sort_order,
        license_owner=ccnode.copyright_holder,
        kind=ccnode.kind.kind,
        license=kolibri_license,
        available=False,
    )

    if ccnode.parent:
        logging.debug("Associating {child} with parent {parent}".format(
            child=kolibrinode.pk,
            parent=ccnode.parent.pk
        ))
        kolibrinode.parent = kolibrimodels.ContentNode.objects.get(pk=ccnode.parent.pk)

    kolibrinode.save()
    logging.debug("Created Kolibri ContentNode with instance id {}".format(ccnode.pk))
    logging.debug("Kolibri node count: {}".format(kolibrimodels.ContentNode.objects.all().count()))

    return kolibrinode


def create_associated_file_objects(kolibrinode, ccnode):
    logging.debug("Creating File objects for Node {}".format(kolibrinode.id))

    for ccfilemodel in ccnode.files.all():
        preset = ccfilemodel.preset
        format = ccfilemodel.file_format

        kolibrifilemodel = kolibrimodels.File.objects.create(
            pk=ccfilemodel.pk,
            checksum=ccfilemodel.checksum,
            extension=format.extension,
            available=False,
            file_size=ccfilemodel.file_size,
            contentnode=kolibrinode,
            preset=preset.pk,
            supplementary=preset.supplementary,
            lang=None,          # TODO: same, fix this once we've implemented lang importing.
            thumbnail=preset.thumbnail,    # TODO: maybe set to true or false once we bundle in more stuff than just the content db
        )


def map_channel_to_kolibri_channel(channel):
    logging.debug("Generating the channel metadata.")
    kolibri_channel = kolibrimodels.ChannelMetadata.objects.create(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        version=channel.version,
        thumbnail=channel.thumbnail,
        root_pk=channel.main_tree_id,
    )
    logging.info("Generated the channel metadata.")

    return kolibri_channel


def prepare_export_database():
    call_command("flush", "--noinput", database='export_staging')  # clears the db!
    call_command("migrate",
                 run_syncdb=True,
                 database="export_staging",
                 noinput=True)
    logging.info("Prepared the export database.")



def raise_if_nodes_are_all_unchanged(channel):

    logging.debug("Checking if we have any changed nodes.")

    changed_models = channel.main_tree.get_family().filter(changed=True)

    if changed_models.count() == 0:
        logging.debug("No nodes have been changed!")
        raise EarlyExit(message="No models changed!", db_path=None)

    logging.info("Some nodes are changed.")


def mark_all_nodes_as_changed(channel):
    logging.debug("Marking all nodes as changed.")

    channel.main_tree.get_family().update(changed=False)

    logging.info("Marked all nodes as changed.")

def save_export_database(channel_id):
    logging.debug("Saving export database")
    current_export_db_location = settings.DATABASES["export_staging"]["NAME"]
    target_export_db_location = os.path.join(settings.DB_ROOT, "{id}.sqlite3".format(id=channel_id))
    try:
        os.mkdir(settings.DB_ROOT)
    except OSError:
        logging.debug("{} directory already exists".format(settings.DB_ROOT))

    shutil.copyfile(current_export_db_location, target_export_db_location)
    logging.info("Successfully copied to {}".format(target_export_db_location))
