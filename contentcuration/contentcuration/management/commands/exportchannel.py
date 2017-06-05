import collections
import os
import zipfile
import shutil
import tempfile
import json
import re
import sys
import uuid
import base64
import sqlite3
from django.conf import settings
from django.http import HttpResponse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files import File
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.template.loader import render_to_string
from le_utils.constants import content_kinds,file_formats, format_presets, licenses, exercises

from contentcuration import models as ccmodels
from kolibri.content import models as kolibrimodels
from kolibri.content.utils.search import fuzz
from kolibri.content.content_db_router import using_content_database, THREAD_LOCAL
from django.db import transaction, connections
from django.db.utils import ConnectionDoesNotExist

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)
reload(sys)
sys.setdefaultencoding('utf8')

PERSEUS_IMG_DIR = exercises.IMG_PLACEHOLDER + "/images"

class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('--force', action='store_true', dest='force', default=False)

    def handle(self, *args, **options):
        # license_id = options['license_id']
        channel_id = options['channel_id']
        force = options['force']

        # license = ccmodels.License.objects.get(pk=license_id)
        try:
            channel = ccmodels.Channel.objects.get(pk=channel_id)
            # increment the channel version
            if not force:
                raise_if_nodes_are_all_unchanged(channel)
            fh, tempdb = tempfile.mkstemp(suffix=".sqlite3")

            with using_content_database(tempdb):
                prepare_export_database(tempdb)
                map_content_tags(channel)
                map_channel_to_kolibri_channel(channel)
                map_content_nodes(channel.main_tree,)
                save_export_database(channel_id)
                increment_channel_version(channel)
                mark_all_nodes_as_changed(channel)
                # use SQLite backup API to put DB into archives folder.
                # Then we can use the empty db name to have SQLite use a temporary DB (https://www.sqlite.org/inmemorydb.html)

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(message=e.message))
            self.stdout.write("You can find your database in {path}".format(path=e.db_path))

def create_kolibri_license_object(ccnode):
    use_license_description = ccnode.license.license_name != licenses.SPECIAL_PERMISSIONS
    return kolibrimodels.License.objects.get_or_create(
        license_name=ccnode.license.license_name,
        license_description=ccnode.license.license_description if use_license_description else ccnode.license_description
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
    with transaction.atomic():
        with ccmodels.ContentNode.objects.delay_mptt_updates():
            for node in iter(queue_get_return_none_when_empty, None):
                logging.debug("Mapping node with id {id}".format(
                    id=node.pk))

                if node.get_descendants(include_self=True).exclude(kind_id=content_kinds.TOPIC).exists():
                    children = (node.children.all())
                    node_queue.extend(children)

                    kolibrinode = create_bare_contentnode(node)

                    if node.kind.kind == content_kinds.EXERCISE:
                        exercise_data = process_assessment_metadata(node, kolibrinode)
                        if node.changed or not node.files.filter(preset_id=format_presets.EXERCISE).exists():
                            create_perseus_exercise(node, kolibrinode, exercise_data)
                    create_associated_file_objects(kolibrinode, node)
                    map_tags_to_node(kolibrinode, node)

def create_bare_contentnode(ccnode):
    logging.debug("Creating a Kolibri node for instance id {}".format(
        ccnode.node_id))

    kolibri_license = None
    if ccnode.license is not None:
        kolibri_license = create_kolibri_license_object(ccnode)[0]

    kolibrinode, is_new = kolibrimodels.ContentNode.objects.update_or_create(
        pk=ccnode.node_id,
        defaults={'kind': ccnode.kind.kind,
            'title': ccnode.title,
            'content_id': ccnode.content_id,
            'author' : ccnode.author or "",
            'description': ccnode.description,
            'sort_order': ccnode.sort_order,
            'license_owner': ccnode.copyright_holder or "",
            'license': kolibri_license,
            'available': ccnode.get_descendants(include_self=True).exclude(kind_id=content_kinds.TOPIC).exists(),  # Hide empty topics
            'stemmed_metaphone': ' '.join(fuzz(ccnode.title + ' ' + ccnode.description)),
        }
    )

    if ccnode.parent:
        logging.debug("Associating {child} with parent {parent}".format(
            child=kolibrinode.pk,
            parent=ccnode.parent.node_id
        ))
        kolibrinode.parent = kolibrimodels.ContentNode.objects.get(pk=ccnode.parent.node_id)

    kolibrinode.save()
    logging.debug("Created Kolibri ContentNode with node id {}".format(ccnode.node_id))
    logging.debug("Kolibri node count: {}".format(kolibrimodels.ContentNode.objects.all().count()))

    return kolibrinode


def create_associated_file_objects(kolibrinode, ccnode):
    logging.debug("Creating File objects for Node {}".format(kolibrinode.id))
    for ccfilemodel in ccnode.files.exclude(Q(preset_id=format_presets.EXERCISE_IMAGE) | Q(preset_id=format_presets.EXERCISE_GRAPHIE)):
        preset = ccfilemodel.preset
        format = ccfilemodel.file_format
        if ccfilemodel.language_id:
            kolibrimodels.Language.objects.get_or_create(
                id=str(ccfilemodel.language),
                lang_code=ccfilemodel.language.lang_code,
                lang_subcode=ccfilemodel.language.lang_subcode
            )

        kolibrifilemodel = kolibrimodels.File.objects.create(
            pk=ccfilemodel.pk,
            checksum=ccfilemodel.checksum,
            extension=format.extension,
            available=True,  # TODO: Set this to False, once we have availability stamping implemented in Kolibri
            file_size=ccfilemodel.file_size,
            contentnode=kolibrinode,
            preset=preset.pk,
            supplementary=preset.supplementary,
            lang_id=str(ccfilemodel.language),
            thumbnail=preset.thumbnail,
        )

def create_perseus_exercise(ccnode, kolibrinode, exercise_data):
    logging.debug("Creating Perseus Exercise for Node {}".format(ccnode.title))
    filename="{0}.{ext}".format(ccnode.title, ext=file_formats.PERSEUS)
    with tempfile.NamedTemporaryFile(suffix="zip", delete=False) as tempf:
        create_perseus_zip(ccnode, exercise_data, tempf)
        file_size = tempf.tell()
        tempf.flush()

        ccnode.files.filter(preset_id=format_presets.EXERCISE).delete()

        assessment_file_obj = ccmodels.File.objects.create(
            file_on_disk=File(open(tempf.name, 'r'), name=filename),
            contentnode=ccnode,
            file_format_id=file_formats.PERSEUS,
            preset_id=format_presets.EXERCISE,
            original_filename=filename,
            file_size=file_size,
        )
        logging.debug("Created exercise for {0} with checksum {1}".format(ccnode.title, assessment_file_obj.checksum))

def process_assessment_metadata(ccnode, kolibrinode):
    # Get mastery model information, set to default if none provided
    assessment_items = ccnode.assessment_items.all().order_by('order')
    exercise_data = json.loads(ccnode.extra_fields) if ccnode.extra_fields else {}

    randomize = exercise_data.get('randomize') or True
    assessment_item_ids = [a.assessment_id for a in assessment_items]

    mastery_model = { 'type' : exercise_data.get('mastery_model') or exercises.M_OF_N }
    if mastery_model['type'] == exercises.M_OF_N:
        mastery_model.update({'n': exercise_data.get('n') or min(5, assessment_items.count()) or 1})
        mastery_model.update({'m': exercise_data.get('m') or min(5, assessment_items.count()) or 1})
    elif mastery_model['type'] == exercises.DO_ALL:
        mastery_model.update({'n': assessment_items.count() or 1, 'm': assessment_items.count() or 1})
    elif mastery_model['type'] == exercises.NUM_CORRECT_IN_A_ROW_2:
        mastery_model.update({'n': 2, 'm': 2})
    elif mastery_model['type'] == exercises.NUM_CORRECT_IN_A_ROW_3:
        mastery_model.update({'n': 3, 'm': 3})
    elif mastery_model['type'] == exercises.NUM_CORRECT_IN_A_ROW_5:
        mastery_model.update({'n': 5, 'm': 5})
    elif mastery_model['type'] == exercises.NUM_CORRECT_IN_A_ROW_10:
        mastery_model.update({'n': 10, 'm': 10})

    exercise_data.update({
        'mastery_model': exercises.M_OF_N,
        'legacy_mastery_model': mastery_model['type'],
        'randomize': randomize,
        'n': mastery_model.get('n'),
        'm': mastery_model.get('m'),
        'all_assessment_items': assessment_item_ids,
        'assessment_mapping': {a.assessment_id : a.type if a.type != 'true_false' else exercises.SINGLE_SELECTION.decode('utf-8') for a in assessment_items},
    })

    kolibriassessmentmetadatamodel = kolibrimodels.AssessmentMetaData.objects.create(
        id=uuid.uuid4(),
        contentnode=kolibrinode,
        assessment_item_ids=json.dumps(assessment_item_ids),
        number_of_assessments=assessment_items.count(),
        mastery_model=json.dumps(mastery_model),
        randomize=randomize,
        is_manipulable=ccnode.kind_id==content_kinds.EXERCISE,
    )

    return exercise_data


def create_perseus_zip(ccnode, exercise_data, write_to_path):
    with zipfile.ZipFile(write_to_path, "w") as zf:
        try:
            exercise_context = {
                'exercise': json.dumps(exercise_data, sort_keys=True, indent=4)
            }
            exercise_result = render_to_string('perseus/exercise.json', exercise_context)
            write_to_zipfile("exercise.json", exercise_result, zf)

            for question in ccnode.assessment_items.prefetch_related('files').all().order_by('order'):
                for image in question.files.filter(preset_id=format_presets.EXERCISE_IMAGE).order_by('checksum'):
                    image_name = "images/{}.{}".format(image.checksum, image.file_format_id)
                    if image_name not in zf.namelist():
                        with open(ccmodels.generate_file_on_disk_name(image.checksum, str(image)), 'rb') as content:
                            write_to_zipfile(image_name, content.read(), zf)

                for image in question.files.filter(preset_id=format_presets.EXERCISE_GRAPHIE).order_by('checksum'):
                    svg_name = "images/{0}.svg".format(image.original_filename)
                    json_name = "images/{0}-data.json".format(image.original_filename)
                    if svg_name not in zf.namelist() or json_name not in zf.namelist():
                        with open(ccmodels.generate_file_on_disk_name(image.checksum, str(image)), 'rb') as content:
                            content = content.read()
                            content = content.split(exercises.GRAPHIE_DELIMITER)
                            write_to_zipfile(svg_name, content[0], zf)
                            write_to_zipfile(json_name, content[1], zf)

            for item in ccnode.assessment_items.all().order_by('order'):
                write_assessment_item(item, zf)

        finally:
            zf.close()

def write_to_zipfile(filename, content, zf):
    info = zipfile.ZipInfo(filename, date_time=(2013, 3, 14, 1, 59, 26))
    info.comment = "Perseus file generated during export process".encode()
    info.compress_type = zipfile.ZIP_STORED
    info.create_system = 0
    zf.writestr(info, content)

def write_assessment_item(assessment_item, zf):
    if assessment_item.type == exercises.MULTIPLE_SELECTION:
        template = 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.SINGLE_SELECTION or assessment_item.type == 'true_false':
        template = 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.INPUT_QUESTION:
        template = 'perseus/input_question.json'
    elif assessment_item.type == exercises.PERSEUS_QUESTION:
        template = 'perseus/perseus_question.json'
    else:
        raise TypeError("Unrecognized question type on item {}".format(assessment_item.assessment_id))

    question, question_images = process_image_strings(assessment_item.question)

    answer_data = json.loads(assessment_item.answers)
    for answer in answer_data:
        answer['answer'] = answer['answer'].replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
        # In case perseus doesn't support =wxh syntax, use below code
        # answer['answer'], answer_images = process_image_strings(answer['answer'])
        # answer.update({'images': answer_images})

    hint_data = json.loads(assessment_item.hints)
    for hint in hint_data:
        hint['hint'], hint_images = process_image_strings(hint['hint'])
        hint.update({'images': hint_images})

    context = {
        'question': question,
        'question_images': question_images,
        'answers': sorted(answer_data, lambda x,y: cmp(x.get('order'), y.get('order'))),
        'multiple_select': assessment_item.type == exercises.MULTIPLE_SELECTION,
        'raw_data': assessment_item.raw_data.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR),
        'hints': sorted(hint_data, lambda x,y: cmp(x.get('order'), y.get('order'))),
        'randomize': assessment_item.randomize,
    }

    result = render_to_string(template, context).encode('utf-8', "ignore")
    write_to_zipfile("{0}.json".format(assessment_item.assessment_id), result, zf)

def process_image_strings(content):
    image_list = []
    content = content.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
    for match in re.finditer(ur'!\[(?:.*)]\((.+)\)', content):
        img_match = re.search(ur'(.+/images/.+)\s=([0-9\.]+)x([0-9\.]+)*', match.group(1))
        if img_match:
            image_list.append({
                'name': img_match.group(1),
                'width': float(img_match.group(2)),
                'height': float(img_match.group(3)) if img_match.group(3) else None
            })
            content = content.replace(match.group(1), img_match.group(1))
    return content, image_list

def map_channel_to_kolibri_channel(channel):
    logging.debug("Generating the channel metadata.")
    kolibri_channel = kolibrimodels.ChannelMetadata.objects.create(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        version=channel.version,
        thumbnail=convert_channel_thumbnail(channel.thumbnail),
        root_pk=channel.main_tree.node_id,
    )
    logging.info("Generated the channel metadata.")

    return kolibri_channel

def convert_channel_thumbnail(thumbnail):
    """ encode_thumbnail: gets base64 encoding of thumbnail
        Args:
            thumbnail (str): file path or url to channel's thumbnail
        Returns: base64 encoding of thumbnail
    """
    encoding = None
    if thumbnail is None or thumbnail=='' or 'static' in thumbnail:
        return ""

    with open(ccmodels.generate_file_on_disk_name(thumbnail.split('.')[0], thumbnail), 'rb') as file_obj:
        encoding = base64.b64encode(file_obj.read()).decode('utf-8')
    return "data:image/png;base64," + encoding

def map_tags_to_node(kolibrinode, ccnode):
    """ map_tags_to_node: assigns tags to nodes (creates fk relationship)
        Args:
            kolibrinode (kolibri.models.ContentNode): node to map tag to
            ccnode (contentcuration.models.ContentNode): node with tags to map
        Returns: None
    """
    tags_to_add = []

    for tag in ccnode.tags.all():
        tags_to_add.append(kolibrimodels.ContentTag.objects.get(pk=tag.pk))

    kolibrinode.tags = tags_to_add
    kolibrinode.save()

def prepare_export_database(tempdb):
    call_command("flush", "--noinput", database=get_active_content_database())  # clears the db!
    call_command("migrate",
                 "content",
                 run_syncdb=True,
                 database=get_active_content_database(),
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

    channel.main_tree.get_family().update(changed=False, published=True)

    logging.info("Marked all nodes as changed.")

def save_export_database(channel_id):
    logging.debug("Saving export database")
    current_export_db_location = get_active_content_database()
    target_export_db_location = os.path.join(settings.DB_ROOT, "{id}.sqlite3".format(id=channel_id))
    try:
        os.mkdir(settings.DB_ROOT)
    except OSError:
        logging.debug("{} directory already exists".format(settings.DB_ROOT))

    shutil.copyfile(current_export_db_location, target_export_db_location)
    logging.info("Successfully copied to {}".format(target_export_db_location))

def get_active_content_database():

    # retrieve the temporary thread-local variable that `using_content_database` sets
    alias = getattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', None)

    # try to connect to the content database, and if connection doesn't exist, create it
    try:
        connections[alias]
    except ConnectionDoesNotExist:
        if not os.path.isfile(alias):
            raise KeyError("Content DB '%s' doesn't exist!!" % alias)
        connections.databases[alias] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': alias,
        }

    return alias
