import collections
import itertools
import json
import logging as logmodule
import math
import os
import re
import sys
import tempfile
import uuid
import zipfile
from itertools import chain

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage as storage
from django.core.management import call_command
from django.db import transaction
from django.db.models import Count
from django.db.models import Q
from django.db.models import Sum
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from kolibri.content.utils.search import fuzz
from kolibri_content import models as kolibrimodels
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import roles

from contentcuration import models as ccmodels
from contentcuration.statistics import record_publish_stats
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.parser import extract_value
from contentcuration.utils.parser import load_json_string

logmodule.basicConfig()
logging = logmodule.getLogger(__name__)
reload(sys)
sys.setdefaultencoding('utf8')

PERSEUS_IMG_DIR = exercises.IMG_PLACEHOLDER + "/images"
THUMBNAIL_DIMENSION = 128
MIN_SCHEMA_VERSION = "1"


class EarlyExit(BaseException):

    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


def send_emails(channel, user_id):
    subject = render_to_string('registration/custom_email_subject.txt', {'subject': _('Kolibri Studio Channel Published')})

    if user_id:
        user = ccmodels.User.objects.get(pk=user_id)
        message = render_to_string('registration/channel_published_email.txt', {'channel': channel, 'user': user})
        user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )
    else:
        # Email all users about updates to channel
        for user in itertools.chain(channel.editors.all(), channel.viewers.all()):
            message = render_to_string('registration/channel_published_email.txt', {'channel': channel, 'user': user})
            user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )


def create_content_database(channel_id, force, user_id, force_exercises, task_object=None):
    channel = ccmodels.Channel.objects.get(pk=channel_id)
    # increment the channel version
    if not force:
        raise_if_nodes_are_all_unchanged(channel)
    fh, tempdb = tempfile.mkstemp(suffix=".sqlite3")

    with using_content_database(tempdb):
        channel.main_tree.publishing = True
        channel.main_tree.save()

        prepare_export_database(tempdb)
        if task_object:
            task_object.update_state(state='STARTED', meta={'progress': 10.0})
        map_channel_to_kolibri_channel(channel)
        map_content_nodes(channel.main_tree, channel.language, channel.id, channel.name, user_id=user_id,
                          force_exercises=force_exercises, task_object=task_object, starting_percent=10.0)
        # It should be at this percent already, but just in case.
        if task_object:
            task_object.update_state(state='STARTED', meta={'progress': 90.0})
        map_prerequisites(channel.main_tree)
        save_export_database(channel_id)


def create_kolibri_license_object(ccnode):
    use_license_description = not ccnode.license.is_custom
    return kolibrimodels.License.objects.get_or_create(
        license_name=ccnode.license.license_name,
        license_description=ccnode.license.license_description if use_license_description else ccnode.license_description
    )


def increment_channel_version(channel):
    channel.version += 1
    channel.last_published = timezone.now()
    channel.save()


def assign_license_to_contentcuration_nodes(channel, license):
    channel.main_tree.get_family().update(license_id=license.pk)


def map_content_nodes(root_node, default_language, channel_id, channel_name, user_id=None,
                      force_exercises=False, task_object=None, starting_percent=10.0):

    # make sure we process nodes higher up in the tree first, or else when we
    # make mappings the parent nodes might not be there

    node_queue = collections.deque()
    node_queue.append(root_node)

    task_percent_total = 80.0
    total_nodes = root_node.get_descendant_count()
    percent_per_node = task_percent_total / total_nodes

    current_node_percent = 0.0

    def queue_get_return_none_when_empty():
        try:
            return node_queue.popleft()
        except IndexError:
            return None

    with transaction.atomic():
        with ccmodels.ContentNode.objects.delay_mptt_updates():
            for node in iter(queue_get_return_none_when_empty, None):
                logging.debug("Mapping node with id {id}".format(
                    id=node.pk))

                if node.get_descendants(include_self=True).exclude(kind_id=content_kinds.TOPIC).exists():
                    children = (node.children.all())
                    node_queue.extend(children)

                    kolibrinode = create_bare_contentnode(node, default_language, channel_id, channel_name)

                    if node.kind.kind == content_kinds.EXERCISE:
                        exercise_data = process_assessment_metadata(node, kolibrinode)
                        if force_exercises or node.changed or not \
                                node.files.filter(preset_id=format_presets.EXERCISE).exists():
                            create_perseus_exercise(node, kolibrinode, exercise_data, user_id=user_id)
                    create_associated_file_objects(kolibrinode, node)
                    map_tags_to_node(kolibrinode, node)

                # if we have a large amount of nodes, like, say, 44000, we don't want to update the percent
                # of the task every node due to the latency involved, so only update in 1 percent increments.
                new_node_percent = current_node_percent + percent_per_node
                if task_object and new_node_percent > math.ceil(current_node_percent):
                    progress_percent = min(task_percent_total + starting_percent, starting_percent + new_node_percent)
                    task_object.update_state(state='STARTED', meta={'progress': progress_percent})
                current_node_percent = new_node_percent


def create_bare_contentnode(ccnode, default_language, channel_id, channel_name):
    logging.debug("Creating a Kolibri contentnode for instance id {}".format(
        ccnode.node_id))

    kolibri_license = None
    if ccnode.license is not None:
        kolibri_license = create_kolibri_license_object(ccnode)[0]

    language = None
    if ccnode.language or default_language:
        language, _new = get_or_create_language(ccnode.language or default_language)

    kolibrinode, is_new = kolibrimodels.ContentNode.objects.update_or_create(
        pk=ccnode.node_id,
        defaults={
            'kind': ccnode.kind.kind,
            'title': ccnode.title if ccnode.parent else channel_name,
            'content_id': ccnode.content_id,
            'channel_id': channel_id,
            'author': ccnode.author or "",
            'description': ccnode.description,
            'sort_order': ccnode.sort_order,
            'license_owner': ccnode.copyright_holder or "",
            'license': kolibri_license,
            'available': ccnode.get_descendants(include_self=True).exclude(kind_id=content_kinds.TOPIC).exists(),  # Hide empty topics
            'stemmed_metaphone': ' '.join(fuzz(ccnode.title + ' ' + ccnode.description)),
            'lang': language,
            'license_name': kolibri_license.license_name if kolibri_license is not None else None,
            'license_description': kolibri_license.license_description if kolibri_license is not None else None,
            'coach_content': ccnode.role_visibility == roles.COACH,
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


def get_or_create_language(language):
    return kolibrimodels.Language.objects.get_or_create(
        id=language.pk,
        lang_code=language.lang_code,
        lang_subcode=language.lang_subcode,
        lang_name=language.lang_name if hasattr(language, 'lang_name') else language.native_name,
        lang_direction=language.lang_direction
    )


def create_associated_thumbnail(ccnode, ccfilemodel):
    """
        Gets the appropriate thumbnail for export (uses or generates a base64 encoding)
        Args:
            ccnode (<ContentNode>): node to derive thumbnail from (if encoding is provided)
            ccfilemodel (<File>): file to get thumbnail from if no encoding is available
        Returns <File> model of encoded, resized thumbnail
    """
    encoding = None
    try:
        encoding = ccnode.thumbnail_encoding and load_json_string(ccnode.thumbnail_encoding).get('base64')
    except ValueError:
        logging.error("ERROR: node thumbnail is not in correct format ({}: {})".format(ccnode.id, ccnode.thumbnail_encoding))
        return

    # Save the encoding if it doesn't already have an encoding
    if not encoding:
        try:
            encoding = get_thumbnail_encoding(str(ccfilemodel))
        except IOError:
            # ImageMagick may raise an IOError if the file is not a thumbnail. Catch that then just return early.
            logging.error("ERROR: cannot identify the thumbnail ({}: {})".format(ccnode.id, ccnode.thumbnail_encoding))
            return
        ccnode.thumbnail_encoding = json.dumps({
            "base64": encoding,
            "points": [],
            "zoom": 0,
        })
        ccnode.save()

    return create_thumbnail_from_base64(
        encoding,
        uploaded_by=ccfilemodel.uploaded_by,
        file_format_id=ccfilemodel.file_format_id,
        preset_id=ccfilemodel.preset_id
    )


def create_associated_file_objects(kolibrinode, ccnode):
    logging.debug("Creating LocalFile and File objects for Node {}".format(kolibrinode.id))
    for ccfilemodel in ccnode.files.exclude(Q(preset_id=format_presets.EXERCISE_IMAGE) | Q(preset_id=format_presets.EXERCISE_GRAPHIE)):
        preset = ccfilemodel.preset
        fformat = ccfilemodel.file_format
        if ccfilemodel.language:
            get_or_create_language(ccfilemodel.language)

        if preset.thumbnail:
            ccfilemodel = create_associated_thumbnail(ccnode, ccfilemodel) or ccfilemodel

        kolibrilocalfilemodel, new = kolibrimodels.LocalFile.objects.get_or_create(
            pk=ccfilemodel.checksum,
            defaults={
                'extension': fformat.extension,
                'file_size': ccfilemodel.file_size,
            }
        )

        kolibrimodels.File.objects.create(
            pk=ccfilemodel.pk,
            checksum=ccfilemodel.checksum,
            extension=fformat.extension,
            available=True,  # TODO: Set this to False, once we have availability stamping implemented in Kolibri
            file_size=ccfilemodel.file_size,
            contentnode=kolibrinode,
            preset=preset.pk,
            supplementary=preset.supplementary,
            lang_id=ccfilemodel.language and ccfilemodel.language.pk,
            thumbnail=preset.thumbnail,
            priority=preset.order,
            local_file=kolibrilocalfilemodel,
        )


def create_perseus_exercise(ccnode, kolibrinode, exercise_data, user_id=None):
    logging.debug("Creating Perseus Exercise for Node {}".format(ccnode.title))
    filename = "{0}.{ext}".format(ccnode.title, ext=file_formats.PERSEUS)
    temppath = None
    try:
        with tempfile.NamedTemporaryFile(suffix="zip", delete=False) as tempf:
            temppath = tempf.name
            create_perseus_zip(ccnode, exercise_data, tempf)
            file_size = tempf.tell()
            tempf.flush()

            ccnode.files.filter(preset_id=format_presets.EXERCISE).delete()

            assessment_file_obj = ccmodels.File.objects.create(
                file_on_disk=File(open(temppath, 'r'), name=filename),
                contentnode=ccnode,
                file_format_id=file_formats.PERSEUS,
                preset_id=format_presets.EXERCISE,
                original_filename=filename,
                file_size=file_size,
                uploaded_by_id=user_id,
            )
            logging.debug("Created exercise for {0} with checksum {1}".format(ccnode.title, assessment_file_obj.checksum))
    finally:
        temppath and os.unlink(temppath)


def process_assessment_metadata(ccnode, kolibrinode):
    # Get mastery model information, set to default if none provided
    assessment_items = ccnode.assessment_items.all().order_by('order')
    exercise_data = json.loads(ccnode.extra_fields) if ccnode.extra_fields else {}

    randomize = exercise_data.get('randomize') if exercise_data.get('randomize') is not None else True
    assessment_item_ids = [a.assessment_id for a in assessment_items]

    mastery_model = {'type': exercise_data.get('mastery_model') or exercises.M_OF_N}
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
        'assessment_mapping': {a.assessment_id: a.type if a.type != 'true_false' else exercises.SINGLE_SELECTION.decode('utf-8') for a in assessment_items},
    })

    kolibrimodels.AssessmentMetaData.objects.create(
        id=uuid.uuid4(),
        contentnode=kolibrinode,
        assessment_item_ids=json.dumps(assessment_item_ids),
        number_of_assessments=assessment_items.count(),
        mastery_model=json.dumps(mastery_model),
        randomize=randomize,
        is_manipulable=ccnode.kind_id == content_kinds.EXERCISE,
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
                try:
                    for image in question.files.filter(preset_id=format_presets.EXERCISE_IMAGE).order_by('checksum'):
                        image_name = "images/{}.{}".format(image.checksum, image.file_format_id)
                        if image_name not in zf.namelist():
                            with storage.open(ccmodels.generate_object_storage_name(image.checksum, str(image)), 'rb') as content:
                                write_to_zipfile(image_name, content.read(), zf)

                    for image in question.files.filter(preset_id=format_presets.EXERCISE_GRAPHIE).order_by('checksum'):
                        svg_name = "images/{0}.svg".format(image.original_filename)
                        json_name = "images/{0}-data.json".format(image.original_filename)
                        if svg_name not in zf.namelist() or json_name not in zf.namelist():
                            with storage.open(ccmodels.generate_object_storage_name(image.checksum, str(image)), 'rb') as content:
                                content = content.read()
                                content = content.split(exercises.GRAPHIE_DELIMITER)
                                write_to_zipfile(svg_name, content[0], zf)
                                write_to_zipfile(json_name, content[1], zf)
                    write_assessment_item(question, zf)
                except Exception as e:
                    logging.error("Publishing error: {}".format(str(e)))

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

    question = process_formulas(assessment_item.question)
    question, question_images = process_image_strings(question, zf)

    answer_data = json.loads(assessment_item.answers)
    for answer in answer_data:
        if assessment_item.type == exercises.INPUT_QUESTION:
            answer['answer'] = extract_value(answer['answer'])
        else:
            answer['answer'] = answer['answer'].replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
            answer['answer'] = process_formulas(answer['answer'])
            # In case perseus doesn't support =wxh syntax, use below code
            answer['answer'], answer_images = process_image_strings(answer['answer'], zf)
            answer.update({'images': answer_images})

    answer_data = list(filter(lambda a: a['answer'] or a['answer'] == 0, answer_data))  # Filter out empty answers, but not 0

    hint_data = json.loads(assessment_item.hints)
    for hint in hint_data:
        hint['hint'] = process_formulas(hint['hint'])
        hint['hint'], hint_images = process_image_strings(hint['hint'], zf)
        hint.update({'images': hint_images})

    context = {
        'question': question,
        'question_images': question_images,
        'answers': sorted(answer_data, lambda x, y: cmp(x.get('order'), y.get('order'))),
        'multiple_select': assessment_item.type == exercises.MULTIPLE_SELECTION,
        'raw_data': assessment_item.raw_data.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR),
        'hints': sorted(hint_data, lambda x, y: cmp(x.get('order'), y.get('order'))),
        'randomize': assessment_item.randomize,
    }

    result = render_to_string(template, context).encode('utf-8', "ignore")
    write_to_zipfile("{0}.json".format(assessment_item.assessment_id), result, zf)


def process_formulas(content):
    for match in re.finditer(ur'\$(\$.+\$)\$', content):
        content = content.replace(match.group(0), match.group(1))
    return content


def process_image_strings(content, zf):
    image_list = []
    content = content.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
    for match in re.finditer(ur'!\[(?:[^\]]*)]\(([^\)]+)\)', content):
        img_match = re.search(ur'(.+/images/[^\s]+)(?:\s=([0-9\.]+)x([0-9\.]+))*', match.group(1))
        if img_match:
            # Add any image files that haven't been written to the zipfile
            filename = img_match.group(1).split('/')[-1]
            checksum, ext = os.path.splitext(filename)
            image_name = "images/{}.{}".format(checksum, ext[1:])
            if image_name not in zf.namelist():
                with storage.open(ccmodels.generate_object_storage_name(checksum, filename), 'rb') as imgfile:
                    write_to_zipfile(image_name, imgfile.read(), zf)

            # Add resizing data
            if img_match.group(2) and img_match.group(3):
                image_data = {'name': img_match.group(1)}
                image_data.update({'width': float(img_match.group(2))})
                image_data.update({'height': float(img_match.group(3))})
                image_list.append(image_data)
            content = content.replace(match.group(1), img_match.group(1))

    return content, image_list


def map_prerequisites(root_node):
    for n in ccmodels.PrerequisiteContentRelationship.objects.filter(prerequisite__tree_id=root_node.tree_id)\
            .values('prerequisite__node_id', 'target_node__node_id'):
        target_node = kolibrimodels.ContentNode.objects.get(pk=n['target_node__node_id'])
        target_node.has_prerequisite.add(n['prerequisite__node_id'])


def map_channel_to_kolibri_channel(channel):
    logging.debug("Generating the channel metadata.")
    channel.icon_encoding = convert_channel_thumbnail(channel)
    channel.save()
    kolibri_channel = kolibrimodels.ChannelMetadata.objects.create(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        version=channel.version + 1,  # Need to save as version being published, not current version
        thumbnail=channel.icon_encoding,
        root_pk=channel.main_tree.node_id,
        root_id=channel.main_tree.node_id,
        min_schema_version=MIN_SCHEMA_VERSION,  # Need to modify Kolibri so we can import this without importing models
    )
    logging.info("Generated the channel metadata.")

    return kolibri_channel


def convert_channel_thumbnail(channel):
    """ encode_thumbnail: gets base64 encoding of thumbnail
        Args:
            thumbnail (str): file path or url to channel's thumbnail
        Returns: base64 encoding of thumbnail
    """
    if not channel.thumbnail or channel.thumbnail == '' or 'static' in channel.thumbnail:
        return ""

    if channel.thumbnail_encoding:
        try:
            thumbnail_data = channel.thumbnail_encoding
            if thumbnail_data.get("base64"):
                return thumbnail_data["base64"]
        except ValueError:
            logging.error("ERROR: channel thumbnail is not in correct format ({}: {})".format(channel.id, channel.thumbnail_encoding))
    return get_thumbnail_encoding(channel.thumbnail)


def map_tags_to_node(kolibrinode, ccnode):
    """ map_tags_to_node: assigns tags to nodes (creates fk relationship)
        Args:
            kolibrinode (kolibri.models.ContentNode): node to map tag to
            ccnode (contentcuration.models.ContentNode): node with tags to map
        Returns: None
    """
    tags_to_add = []

    for tag in ccnode.tags.all():
        t, _new = kolibrimodels.ContentTag.objects.get_or_create(pk=tag.pk, tag_name=tag.tag_name)
        tags_to_add.append(t)

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


def mark_all_nodes_as_published(channel):
    logging.debug("Marking all nodes as published.")

    channel.main_tree.get_family().update(changed=False, published=True)

    logging.info("Marked all nodes as published.")


def save_export_database(channel_id):
    logging.debug("Saving export database")
    current_export_db_location = get_active_content_database()
    target_export_db_location = os.path.join(settings.DB_ROOT, "{id}.sqlite3".format(id=channel_id))

    with open(current_export_db_location) as currentf:
        storage.save(target_export_db_location, currentf)
    logging.info("Successfully copied to {}".format(target_export_db_location))


def add_tokens_to_channel(channel):
    if not channel.secret_tokens.filter(is_primary=True).exists():
        logging.info("Generating tokens for the channel.")
        channel.make_token()


def fill_published_fields(channel):
    published_nodes = channel.main_tree.get_descendants().filter(published=True).prefetch_related('files')
    channel.total_resource_count = published_nodes.exclude(kind_id=content_kinds.TOPIC).count()
    channel.published_kind_count = json.dumps(list(published_nodes.values('kind_id').annotate(count=Count('kind_id')).order_by('kind_id')))
    channel.published_size = published_nodes.values('files__checksum', 'files__file_size').distinct(
    ).aggregate(resource_size=Sum('files__file_size'))['resource_size'] or 0

    node_languages = published_nodes.exclude(language=None).values_list('language', flat=True)
    file_languages = published_nodes.values_list('files__language', flat=True)
    language_list = list(set(chain(node_languages, file_languages)))

    for lang in language_list:
        if lang:
            channel.included_languages.add(lang)
    channel.save()


def publish_channel(user_id, channel_id, force=False, force_exercises=False, send_email=False, task_object=None):
    channel = ccmodels.Channel.objects.get(pk=channel_id)

    try:
        create_content_database(channel_id, force, user_id, force_exercises, task_object)
        increment_channel_version(channel)
        mark_all_nodes_as_published(channel)
        add_tokens_to_channel(channel)
        fill_published_fields(channel)

        # Attributes not getting set for some reason, so just save it here
        channel.main_tree.publishing = False
        channel.main_tree.changed = False
        channel.main_tree.published = True
        channel.main_tree.save()

        if send_email:
            send_emails(channel, user_id)

        # use SQLite backup API to put DB into archives folder.
        # Then we can use the empty db name to have SQLite use a temporary DB (https://www.sqlite.org/inmemorydb.html)

        record_publish_stats(channel)

        if task_object:
            task_object.update_state(state='STARTED', meta={'progress': 100.0})

    # No matter what, make sure publishing is set to False once the run is done
    finally:
        channel.main_tree.publishing = False
        channel.main_tree.save()
