import hashlib
import itertools
import json
import logging as logmodule
import os
import re
import tempfile
import time
import traceback
import uuid
import zipfile
from copy import deepcopy
from io import BytesIO
from itertools import chain

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.files import File
from django.core.files.storage import default_storage as storage
from django.core.management import call_command
from django.db.models import Count
from django.db.models import Exists
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.db.utils import IntegrityError
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.utils.translation import override
from kolibri_content import models as kolibrimodels
from kolibri_content.base_models import MAX_TAG_LENGTH
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.utils.mapper import ChannelMapper
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import roles
from PIL import Image
from search.models import ChannelFullTextSearch
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_annotated_channel_qs
from search.utils import get_fts_annotated_contentnode_qs

from contentcuration import models as ccmodels
from contentcuration.decorators import delay_user_storage_calculation
from contentcuration.utils.cache import delete_public_channel_cache_keys
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import migrate_extra_fields
from contentcuration.utils.parser import extract_value
from contentcuration.utils.parser import load_json_string
from contentcuration.utils.sentry import report_exception


logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

PERSEUS_IMG_DIR = exercises.IMG_PLACEHOLDER + "/images"
THUMBNAIL_DIMENSION = 128
MIN_SCHEMA_VERSION = "1"
PUBLISHING_UPDATE_THRESHOLD = 3600


class NoNodesChangedError(Exception):
    pass


class ChannelIncompleteError(Exception):
    pass


class NoneContentNodeTreeError(Exception):
    pass


class SlowPublishError(Exception):
    """
    Used to track slow Publishing operations. We don't raise this error,
    just feed it to Sentry for reporting.
    """

    def __init__(self, time, channel_id):

        self.time = time
        self.channel_id = channel_id
        message = "publishing the channel with channel_id {} took {} seconds to complete, exceeding {} second threshold."
        self.message = message.format(
            self.channel_id, self.time, PUBLISHING_UPDATE_THRESHOLD
        )

        super(SlowPublishError, self).__init__(self.message)


def send_emails(channel, user_id, version_notes=""):
    subject = render_to_string(
        "registration/custom_email_subject.txt",
        {"subject": _("Kolibri Studio Channel Published")},
    )
    subject = "".join(subject.splitlines())
    token = channel.secret_tokens.filter(is_primary=True).first()
    token = "{}-{}".format(token.token[:5], token.token[-5:])
    domain = "https://{}".format(Site.objects.get_current().domain)

    if user_id:
        user = ccmodels.User.objects.get(pk=user_id)
        message = render_to_string(
            "registration/channel_published_email.html",
            {
                "channel": channel,
                "user": user,
                "token": token,
                "notes": version_notes,
                "domain": domain,
            },
        )
        user.email_user(
            subject, message, settings.DEFAULT_FROM_EMAIL, html_message=message
        )
    else:
        # Email all users about updates to channel
        for user in itertools.chain(channel.editors.all(), channel.viewers.all()):
            message = render_to_string(
                "registration/channel_published_email.html",
                {
                    "channel": channel,
                    "user": user,
                    "token": token,
                    "notes": version_notes,
                    "domain": domain,
                },
            )
            user.email_user(
                subject, message, settings.DEFAULT_FROM_EMAIL, html_message=message
            )


def create_content_database(
    channel,
    force,
    user_id,
    force_exercises,
    progress_tracker=None,
    use_staging_tree=False,
):
    """
    :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
    """
    # increment the channel version
    if not use_staging_tree and not force:
        raise_if_nodes_are_all_unchanged(channel)
    fh, tempdb = tempfile.mkstemp(suffix=".sqlite3")

    with using_content_database(tempdb):
        if not use_staging_tree and not channel.main_tree.publishing:
            channel.mark_publishing(user_id)

        call_command(
            "migrate", "content", database=get_active_content_database(), no_input=True
        )
        if progress_tracker:
            progress_tracker.track(10)
        base_tree = channel.staging_tree if use_staging_tree else channel.main_tree
        tree_mapper = TreeMapper(
            base_tree,
            channel.language,
            channel.id,
            channel.name,
            user_id=user_id,
            force_exercises=force_exercises,
            progress_tracker=progress_tracker,
            inherit_metadata=bool(channel.ricecooker_version),
        )
        tree_mapper.map_nodes()
        kolibri_channel = map_channel_to_kolibri_channel(channel, use_staging_tree)
        # It should be at this percent already, but just in case.
        if progress_tracker:
            progress_tracker.track(90)
        map_prerequisites(base_tree)
        # Need to save as version being published, not current version
        version = "next" if use_staging_tree else channel.version + 1
        save_export_database(
            channel.pk,
            version,
            use_staging_tree,
        )
        if channel.public:
            mapper = ChannelMapper(kolibri_channel)
            mapper.run()

    return tempdb


def create_kolibri_license_object(ccnode):
    use_license_description = not ccnode.license.is_custom
    return kolibrimodels.License.objects.get_or_create(
        license_name=ccnode.license.license_name,
        license_description=ccnode.license.license_description
        if use_license_description
        else ccnode.license_description,
    )


def increment_channel_version(channel):
    channel.version += 1
    channel.save()


def assign_license_to_contentcuration_nodes(channel, license):
    channel.main_tree.get_family().update(license_id=license.pk)


inheritable_map_fields = [
    "grade_levels",
    "resource_types",
    "categories",
    "learner_needs",
]

inheritable_simple_value_fields = [
    "language",
]


class TreeMapper:
    def __init__(
        self,
        root_node,
        default_language,
        channel_id,
        channel_name,
        user_id=None,
        force_exercises=False,
        progress_tracker=None,
        inherit_metadata=False,
    ):
        if not root_node.is_publishable():
            raise ChannelIncompleteError(
                "Attempted to publish a channel with an incomplete root node or no resources"
            )

        self.root_node = root_node
        task_percent_total = 80.0
        total_nodes = (
            root_node.get_descendant_count() + 1
        )  # make sure we include root_node
        self.percent_per_node = task_percent_total / float(total_nodes)
        self.progress_tracker = progress_tracker
        self.default_language = default_language
        self.channel_id = channel_id
        self.channel_name = channel_name
        self.user_id = user_id
        self.force_exercises = force_exercises
        self.inherit_metadata = inherit_metadata

    def _node_completed(self):
        if self.progress_tracker:
            self.progress_tracker.increment(increment=self.percent_per_node)

    def map_nodes(self):
        self.recurse_nodes(self.root_node, {})

    def _gather_inherited_metadata(self, node, inherited_fields):
        metadata = {}

        for field in inheritable_map_fields:
            metadata[field] = {}
            inherited_keys = (
                (inherited_fields.get(field) or {}).keys()
                if self.inherit_metadata
                else []
            )
            own_keys = (getattr(node, field) or {}).keys()
            # Get a list of all keys in reverse order of length so we can remove any less specific values
            all_keys = sorted(
                set(inherited_keys).union(set(own_keys)), key=len, reverse=True
            )
            for key in all_keys:
                if not any(k != key and k.startswith(key) for k in all_keys):
                    metadata[field][key] = True

        for field in inheritable_simple_value_fields:
            if self.inherit_metadata and field in inherited_fields:
                metadata[field] = inherited_fields[field]
            if getattr(node, field):
                metadata[field] = getattr(node, field)
        return metadata

    def recurse_nodes(self, node, inherited_fields):  # noqa C901
        logging.debug("Mapping node with id {id}".format(id=node.pk))

        # Only process nodes that are either non-topics or have non-topic descendants
        if node.is_publishable():
            # early validation to make sure we don't have any exercises without mastery models
            # which should be unlikely when the node is complete, but just in case
            if node.kind_id == content_kinds.EXERCISE:
                try:
                    # migrates and extracts the mastery model from the exercise
                    _, mastery_model = parse_assessment_metadata(node)
                    if not mastery_model:
                        raise ValueError("Exercise does not have a mastery model")
                except Exception as e:
                    logging.warning(
                        "Unable to parse exercise {id} mastery model: {error}".format(
                            id=node.pk, error=str(e)
                        )
                    )
                    return

            metadata = self._gather_inherited_metadata(node, inherited_fields)

            kolibrinode = create_bare_contentnode(
                node,
                self.default_language,
                self.channel_id,
                self.channel_name,
                metadata,
            )

            if node.kind_id == content_kinds.EXERCISE:
                exercise_data = process_assessment_metadata(node, kolibrinode)
                if (
                    self.force_exercises
                    or node.changed
                    or not node.files.filter(preset_id=format_presets.EXERCISE).exists()
                ):
                    create_perseus_exercise(
                        node, kolibrinode, exercise_data, user_id=self.user_id
                    )
            elif node.kind_id == content_kinds.SLIDESHOW:
                create_slideshow_manifest(node, user_id=self.user_id)
            elif node.kind_id == content_kinds.TOPIC:
                for child in node.children.all():
                    self.recurse_nodes(child, metadata)
            create_associated_file_objects(kolibrinode, node)
            map_tags_to_node(kolibrinode, node)

        self._node_completed()


def create_slideshow_manifest(ccnode, user_id=None):
    print("Creating slideshow manifest...")  # noqa: T201

    preset = ccmodels.FormatPreset.objects.filter(pk="slideshow_manifest")[0]
    ext = file_formats.JSON
    filename = "{0}.{ext}".format(ccnode.title, ext=ext)

    try:
        with tempfile.NamedTemporaryFile(
            prefix="slideshow_manifest_", delete=False
        ) as temp_manifest:
            temp_filepath = temp_manifest.name

            temp_manifest.write(json.dumps(ccnode.extra_fields).encode("utf-8"))

            size_on_disk = temp_manifest.tell()
            temp_manifest.seek(0)
            file_on_disk = File(open(temp_filepath, mode="rb"), name=filename)
            # Create the file in Studio
            ccmodels.File.objects.create(
                file_on_disk=file_on_disk,
                contentnode=ccnode,
                file_format_id=file_formats.JSON,
                preset_id=preset,
                original_filename=filename,
                file_size=size_on_disk,
                uploaded_by_id=user_id,
            )
    finally:
        temp_manifest.close()


def create_bare_contentnode(  # noqa: C901
    ccnode, default_language, channel_id, channel_name, metadata
):
    logging.debug(
        "Creating a Kolibri contentnode for instance id {}".format(ccnode.node_id)
    )

    kolibri_license = None
    if ccnode.license is not None:
        kolibri_license = create_kolibri_license_object(ccnode)[0]

    language = (
        ccnode.language
        if ccnode.kind_id == content_kinds.TOPIC
        else metadata.get("language")
    ) or default_language
    if language:
        language, _new = get_or_create_language(language)

    duration = None
    if ccnode.kind_id in [content_kinds.AUDIO, content_kinds.VIDEO]:
        # aggregate duration from associated files, choosing maximum if there are multiple, like hi and lo res videos
        duration = ccnode.files.aggregate(duration=Max("duration")).get("duration")

    options = {}
    if ccnode.extra_fields and "options" in ccnode.extra_fields:
        options = ccnode.extra_fields["options"]

    duration = None
    ccnode_completion_criteria = options.get("completion_criteria")
    if ccnode_completion_criteria:
        if (
            ccnode_completion_criteria["model"] == completion_criteria.TIME
            or ccnode_completion_criteria["model"] == completion_criteria.APPROX_TIME
        ):
            duration = ccnode_completion_criteria["threshold"]
    if duration is None and ccnode.kind_id in [
        content_kinds.AUDIO,
        content_kinds.VIDEO,
    ]:
        # aggregate duration from associated files, choosing maximum if there are multiple, like hi and lo res videos.
        duration = ccnode.files.aggregate(duration=Max("duration")).get("duration")

    learning_activities = None
    accessibility_labels = None
    if ccnode.kind_id != content_kinds.TOPIC:
        if ccnode.learning_activities:
            learning_activities = ",".join(ccnode.learning_activities.keys())
        if ccnode.accessibility_labels:
            accessibility_labels = ",".join(ccnode.accessibility_labels.keys())

    # Do not use the inherited metadata if this is a topic, just read from its own metadata instead.
    grade_levels = (
        ccnode.grade_levels
        if ccnode.kind_id == content_kinds.TOPIC
        else metadata["grade_levels"]
    )
    resource_types = (
        ccnode.resource_types
        if ccnode.kind_id == content_kinds.TOPIC
        else metadata["resource_types"]
    )
    categories = (
        ccnode.categories
        if ccnode.kind_id == content_kinds.TOPIC
        else metadata["categories"]
    )
    learner_needs = (
        ccnode.learner_needs
        if ccnode.kind_id == content_kinds.TOPIC
        else metadata["learner_needs"]
    )

    kolibrinode, is_new = kolibrimodels.ContentNode.objects.update_or_create(
        pk=ccnode.node_id,
        defaults={
            "kind": ccnode.kind.kind,
            "title": ccnode.title if ccnode.parent else channel_name,
            "content_id": ccnode.content_id,
            "channel_id": channel_id,
            "author": ccnode.author or "",
            "description": ccnode.description,
            "sort_order": ccnode.sort_order,
            "license_owner": ccnode.copyright_holder or "",
            "license": kolibri_license,
            "available": ccnode.get_descendants(include_self=True)
            .exclude(kind_id=content_kinds.TOPIC)
            .exists(),  # Hide empty topics
            "stemmed_metaphone": "",  # Stemmed metaphone is no longer used, and will cause no harm if blank
            "lang": language,
            "license_name": kolibri_license.license_name
            if kolibri_license is not None
            else None,
            "license_description": kolibri_license.license_description
            if kolibri_license is not None
            else None,
            "coach_content": ccnode.role_visibility == roles.COACH,
            "duration": duration,
            "options": options,
            # Fields for metadata labels
            "grade_levels": ",".join(grade_levels.keys()) if grade_levels else None,
            "resource_types": ",".join(resource_types.keys())
            if resource_types
            else None,
            "learning_activities": learning_activities,
            "accessibility_labels": accessibility_labels,
            "categories": ",".join(categories.keys()) if categories else None,
            "learner_needs": ",".join(learner_needs.keys()) if learner_needs else None,
        },
    )

    if ccnode.parent:
        logging.debug(
            "Associating {child} with parent {parent}".format(
                child=kolibrinode.pk, parent=ccnode.parent.node_id
            )
        )
        kolibrinode.parent = kolibrimodels.ContentNode.objects.get(
            pk=ccnode.parent.node_id
        )

    kolibrinode.save()
    logging.debug("Created Kolibri ContentNode with node id {}".format(ccnode.node_id))
    logging.debug(
        "Kolibri node count: {}".format(kolibrimodels.ContentNode.objects.all().count())
    )

    return kolibrinode


def get_or_create_language(language):
    return kolibrimodels.Language.objects.get_or_create(
        id=language.pk,
        lang_code=language.lang_code,
        lang_subcode=language.lang_subcode,
        lang_name=language.lang_name
        if hasattr(language, "lang_name")
        else language.native_name,
        lang_direction=language.lang_direction,
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
        encoding = ccnode.thumbnail_encoding and load_json_string(
            ccnode.thumbnail_encoding
        ).get("base64")
    except ValueError:
        logging.error(
            "ERROR: node thumbnail is not in correct format ({}: {})".format(
                ccnode.id, ccnode.thumbnail_encoding
            )
        )
        return

    # Save the encoding if it doesn't already have an encoding
    if not encoding:
        try:
            encoding = get_thumbnail_encoding(str(ccfilemodel))
        except IOError:
            # ImageMagick may raise an IOError if the file is not a thumbnail. Catch that then just return early.
            logging.error(
                "ERROR: cannot identify the thumbnail ({}: {})".format(
                    ccnode.id, ccnode.thumbnail_encoding
                )
            )
            return
        ccnode.thumbnail_encoding = json.dumps(
            {
                "base64": encoding,
                "points": [],
                "zoom": 0,
            }
        )
        ccnode.save(update_fields=("thumbnail_encoding",))

    return create_thumbnail_from_base64(
        encoding,
        uploaded_by=ccfilemodel.uploaded_by,
        file_format_id=ccfilemodel.file_format_id,
        preset_id=ccfilemodel.preset_id,
    )


def create_associated_file_objects(kolibrinode, ccnode):
    logging.debug(
        "Creating LocalFile and File objects for Node {}".format(kolibrinode.id)
    )
    for ccfilemodel in ccnode.files.exclude(
        Q(preset_id=format_presets.EXERCISE_IMAGE)
        | Q(preset_id=format_presets.EXERCISE_GRAPHIE)
    ):
        preset = ccfilemodel.preset
        fformat = ccfilemodel.file_format
        if ccfilemodel.language:
            get_or_create_language(ccfilemodel.language)

        if preset.thumbnail:
            ccfilemodel = (
                create_associated_thumbnail(ccnode, ccfilemodel) or ccfilemodel
            )

        kolibrilocalfilemodel, new = kolibrimodels.LocalFile.objects.get_or_create(
            pk=ccfilemodel.checksum,
            defaults={
                "extension": fformat.extension,
                "file_size": ccfilemodel.file_size,
            },
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
    resized_images_map = {}
    try:
        with tempfile.NamedTemporaryFile(suffix="zip", delete=False) as tempf:
            temppath = tempf.name
            create_perseus_zip(ccnode, exercise_data, tempf, resized_images_map)
            file_size = tempf.tell()
            tempf.flush()

            ccnode.files.filter(preset_id=format_presets.EXERCISE).delete()

            assessment_file_obj = ccmodels.File.objects.create(
                file_on_disk=File(open(temppath, "rb"), name=filename),
                contentnode=ccnode,
                file_format_id=file_formats.PERSEUS,
                preset_id=format_presets.EXERCISE,
                original_filename=filename,
                file_size=file_size,
                uploaded_by_id=user_id,
            )
            logging.debug(
                "Created exercise for {0} with checksum {1}".format(
                    ccnode.title, assessment_file_obj.checksum
                )
            )
    finally:
        temppath and os.unlink(temppath)


def parse_assessment_metadata(ccnode):
    extra_fields = ccnode.extra_fields
    if isinstance(extra_fields, str):
        extra_fields = json.loads(extra_fields)
    extra_fields = migrate_extra_fields(extra_fields) or {}
    randomize = (
        extra_fields.get("randomize")
        if extra_fields.get("randomize") is not None
        else True
    )
    return randomize, extra_fields.get("options").get("completion_criteria").get(
        "threshold"
    )


def process_assessment_metadata(ccnode, kolibrinode):
    # Get mastery model information, set to default if none provided
    assessment_items = ccnode.assessment_items.all().order_by("order")
    assessment_item_ids = [a.assessment_id for a in assessment_items]

    randomize, mastery_criteria = parse_assessment_metadata(ccnode)

    exercise_data = deepcopy(mastery_criteria)
    exercise_data_type = exercise_data.get("mastery_model", "")

    mastery_model = {"type": exercise_data_type or exercises.M_OF_N}
    if mastery_model["type"] == exercises.M_OF_N:
        mastery_model.update(
            {"n": exercise_data.get("n") or min(5, assessment_items.count()) or 1}
        )
        mastery_model.update(
            {"m": exercise_data.get("m") or min(5, assessment_items.count()) or 1}
        )
    elif mastery_model["type"] == exercises.DO_ALL:
        mastery_model.update(
            {"n": assessment_items.count() or 1, "m": assessment_items.count() or 1}
        )
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_2:
        mastery_model.update({"n": 2, "m": 2})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_3:
        mastery_model.update({"n": 3, "m": 3})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_5:
        mastery_model.update({"n": 5, "m": 5})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_10:
        mastery_model.update({"n": 10, "m": 10})

    exercise_data.update(
        {
            "mastery_model": exercises.M_OF_N,
            "legacy_mastery_model": mastery_model["type"],
            "randomize": randomize,
            "n": mastery_model.get("n"),
            "m": mastery_model.get("m"),
            "all_assessment_items": assessment_item_ids,
            "assessment_mapping": {
                a.assessment_id: a.type
                if a.type != "true_false"
                else exercises.SINGLE_SELECTION
                for a in assessment_items
            },
        }
    )

    kolibrimodels.AssessmentMetaData.objects.create(
        id=uuid.uuid4(),
        contentnode=kolibrinode,
        assessment_item_ids=assessment_item_ids,
        number_of_assessments=assessment_items.count(),
        mastery_model=mastery_model,
        randomize=randomize,
        is_manipulable=ccnode.kind_id == content_kinds.EXERCISE,
    )

    return exercise_data


def create_perseus_zip(ccnode, exercise_data, write_to_path, resized_images_map):
    with zipfile.ZipFile(write_to_path, "w") as zf:
        try:
            exercise_context = {
                "exercise": json.dumps(exercise_data, sort_keys=True, indent=4)
            }
            exercise_result = render_to_string(
                "perseus/exercise.json", exercise_context
            )
            write_to_zipfile("exercise.json", exercise_result, zf)

            channel_id = ccnode.get_channel_id()

            for question in (
                ccnode.assessment_items.prefetch_related("files")
                .all()
                .order_by("order")
            ):
                try:
                    write_assessment_item(question, zf, channel_id, resized_images_map)
                except Exception as e:
                    logging.error(
                        "Error while publishing channel `{}`: {}".format(
                            channel_id, str(e)
                        )
                    )
                    logging.error(traceback.format_exc())
                    # In production, these errors have historically been handled silently.
                    # Retain that behavior for now, but raise an error locally so we can
                    # better understand the cases in which this might happen.
                    report_exception(e)

                    # if we're in a testing or development environment, raise the error
                    if os.environ.get("BRANCH_ENVIRONMENT", "") != "master":
                        logging.warning(
                            "NOTE: the following error would have been swallowed silently in production"
                        )
                        raise
        finally:
            zf.close()


def write_to_zipfile(filename, content, zf):
    info = zipfile.ZipInfo(filename, date_time=(2013, 3, 14, 1, 59, 26))
    info.comment = "Perseus file generated during export process".encode()
    info.compress_type = zipfile.ZIP_STORED
    info.create_system = 0
    zf.writestr(info, content)


def _write_raw_perseus_image_files_to_zip(assessment_item, zf):
    # For raw perseus JSON questions, the files must be
    # specified in advance.

    # Files have been prefetched when the assessment item was
    # queried, so take advantage of that.
    files = sorted(assessment_item.files.all(), key=lambda x: x.checksum)
    image_files = filter(lambda x: x.preset_id == format_presets.EXERCISE_IMAGE, files)
    graphie_files = filter(
        lambda x: x.preset_id == format_presets.EXERCISE_GRAPHIE, files
    )
    for image in image_files:
        image_name = "images/{}.{}".format(image.checksum, image.file_format_id)
        if image_name not in zf.namelist():
            with storage.open(
                ccmodels.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                write_to_zipfile(image_name, content.read(), zf)

    for image in graphie_files:
        svg_name = "images/{0}.svg".format(image.original_filename)
        json_name = "images/{0}-data.json".format(image.original_filename)
        if svg_name not in zf.namelist() or json_name not in zf.namelist():
            with storage.open(
                ccmodels.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                content = content.read()
                # in Python 3, delimiter needs to be in bytes format
                content = content.split(exercises.GRAPHIE_DELIMITER.encode("ascii"))
                write_to_zipfile(svg_name, content[0], zf)
                write_to_zipfile(json_name, content[1], zf)


def write_assessment_item(  # noqa C901
    assessment_item, zf, channel_id, resized_images_map
):
    if assessment_item.type == exercises.MULTIPLE_SELECTION:
        template = "perseus/multiple_selection.json"
    elif (
        assessment_item.type == exercises.SINGLE_SELECTION
        or assessment_item.type == "true_false"
    ):
        template = "perseus/multiple_selection.json"
    elif assessment_item.type == exercises.INPUT_QUESTION:
        template = "perseus/input_question.json"
    elif assessment_item.type == exercises.PERSEUS_QUESTION:
        template = "perseus/perseus_question.json"
        _write_raw_perseus_image_files_to_zip(assessment_item, zf)
    else:
        raise TypeError(
            "Unrecognized question type on item {}".format(
                assessment_item.assessment_id
            )
        )

    question = process_formulas(assessment_item.question)
    question, question_images = process_image_strings(
        question, zf, channel_id, resized_images_map
    )

    answer_data = json.loads(assessment_item.answers)
    for answer in answer_data:
        if assessment_item.type == exercises.INPUT_QUESTION:
            answer["answer"] = extract_value(answer["answer"])
        else:
            answer["answer"] = answer["answer"].replace(
                exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR
            )
            answer["answer"] = process_formulas(answer["answer"])
            # In case perseus doesn't support =wxh syntax, use below code
            answer["answer"], answer_images = process_image_strings(
                answer["answer"], zf, channel_id, resized_images_map
            )
            answer.update({"images": answer_images})

    answer_data = [
        a for a in answer_data if a["answer"] or a["answer"] == 0
    ]  # Filter out empty answers, but not 0
    hint_data = json.loads(assessment_item.hints)
    for hint in hint_data:
        hint["hint"] = process_formulas(hint["hint"])
        hint["hint"], hint_images = process_image_strings(
            hint["hint"], zf, channel_id, resized_images_map
        )
        hint.update({"images": hint_images})

    answers_sorted = answer_data
    try:
        answers_sorted = sorted(answer_data, key=lambda x: x.get("order"))
    except TypeError:
        logging.error("Unable to sort answers, leaving unsorted.")

    hints_sorted = hint_data
    try:
        hints_sorted = sorted(hint_data, key=lambda x: x.get("order"))
    except TypeError:
        logging.error("Unable to sort hints, leaving unsorted.")

    context = {
        "question": question,
        "question_images": question_images,
        "answers": answers_sorted,
        "multiple_select": assessment_item.type == exercises.MULTIPLE_SELECTION,
        "raw_data": assessment_item.raw_data.replace(
            exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR
        ),
        "hints": hints_sorted,
        "randomize": assessment_item.randomize,
    }

    result = render_to_string(template, context).encode("utf-8", "ignore")
    write_to_zipfile("{0}.json".format(assessment_item.assessment_id), result, zf)


def process_formulas(content):
    for match in re.finditer(r"\$(\$.+\$)\$", content):
        content = content.replace(match.group(0), match.group(1))
    return content


def resize_image(image_content, width, height):
    try:
        with Image.open(BytesIO(image_content)) as img:
            original_format = img.format
            img = img.resize((int(width), int(height)), Image.LANCZOS)
            buffered = BytesIO()
            img.save(buffered, format=original_format)
            return buffered.getvalue()
    except Exception as e:
        logging.warning(f"Error resizing image: {str(e)}")
        return None, None


def get_resized_image_checksum(image_content):
    return hashlib.md5(image_content).hexdigest()


def process_image_strings(content, zf, channel_id, resized_images_map):  # noqa C901
    image_list = []
    content = content.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
    for match in re.finditer(r"!\[(?:[^\]]*)]\(([^\)]+)\)", content):
        img_match = re.search(
            r"(.+/images/[^\s]+)(?:\s=([0-9\.]+)x([0-9\.]+))*", match.group(1)
        )
        if img_match:
            # Add any image files that haven't been written to the zipfile
            filename = img_match.group(1).split("/")[-1]
            checksum, ext = os.path.splitext(filename)

            if not ext:
                logging.warning(
                    "While publishing channel `{}` a filename with no extension was encountered: `{}`".format(
                        channel_id, filename
                    )
                )
            try:
                # make sure the checksum is actually a hex string
                int(checksum, 16)
            except Exception:
                logging.warning(
                    "while publishing channel `{}` a filename with an improper checksum was encountered: `{}`".format(
                        channel_id, filename
                    )
                )

                # if we're in a testing or development environment, raise the error
                if os.environ.get("BRANCH_ENVIRONMENT", "") != "master":
                    logging.warning(
                        "NOTE: the following error would have been swallowed silently in production"
                    )
                    raise

            original_image_name = "images/{}.{}".format(checksum, ext[1:])
            original_img_ref = match.group(1)
            if img_match.group(2) and img_match.group(3):
                width, height = float(img_match.group(2)), float(img_match.group(3))
                resized_key = (original_image_name, width, height)

                # Check if this resized version already exists
                new_img_ref = None
                if resized_key in resized_images_map:
                    new_img_ref = resized_images_map[resized_key]
                else:
                    # Check for similar resized images with the same original name
                    similar_image = None
                    for key, resized_image in resized_images_map.items():
                        if (
                            key[0] == original_image_name
                            and abs(key[1] - width) / width < 0.01
                            and abs(key[2] - height) / height < 0.01
                        ):
                            similar_image = resized_image
                            break

                    if similar_image:
                        new_img_ref = similar_image
                    else:
                        with storage.open(
                            ccmodels.generate_object_storage_name(checksum, filename),
                            "rb",
                        ) as imgfile:
                            original_content = imgfile.read()

                        resized_content = resize_image(original_content, width, height)

                        if resized_content:
                            resized_checksum = get_resized_image_checksum(
                                resized_content
                            )
                            new_image_name = "images/{}.{}".format(
                                resized_checksum, ext[1:]
                            )

                            if new_image_name not in zf.namelist():
                                write_to_zipfile(new_image_name, resized_content, zf)
                            new_img_ref = original_img_ref.replace(
                                filename, f"{resized_checksum}{ext}"
                            )
                            resized_images_map[resized_key] = new_img_ref
                        else:
                            logging.warning(
                                f"Failed to resize image {filename}. Using original image."
                            )
                            new_img_ref = img_match.group(1)

                new_img_match = re.search(
                    r"(.+/images/[^\s]+)(?:\s=([0-9\.]+)x([0-9\.]+))*", new_img_ref
                )
                image_data = {"name": new_img_match.group(1)}
                image_data.update({"width": width})
                image_data.update({"height": height})
                image_list.append(image_data)
                content = content.replace(original_img_ref, new_img_match.group(1))

            else:
                if original_image_name not in zf.namelist():
                    with storage.open(
                        ccmodels.generate_object_storage_name(checksum, filename), "rb"
                    ) as imgfile:
                        original_content = imgfile.read()
                    write_to_zipfile(original_image_name, original_content, zf)
                content = content.replace(match.group(1), img_match.group(1))
    return content, image_list


def map_prerequisites(root_node):

    for n in ccmodels.PrerequisiteContentRelationship.objects.filter(
        prerequisite__tree_id=root_node.tree_id
    ).values("prerequisite__node_id", "target_node__node_id"):
        try:
            target_node = kolibrimodels.ContentNode.objects.get(
                pk=n["target_node__node_id"]
            )
            target_node.has_prerequisite.add(n["prerequisite__node_id"])
        except kolibrimodels.ContentNode.DoesNotExist as e:
            logging.error("Unable to find prerequisite {}".format(str(e)))
        except IntegrityError as e:
            logging.error(
                "Unable to find source node for prerequisite relationship {}".format(
                    str(e)
                )
            )


def map_channel_to_kolibri_channel(channel, use_staging_tree=False):
    logging.debug("Generating the channel metadata.")
    base_tree = channel.staging_tree if use_staging_tree else channel.main_tree
    kolibri_channel = kolibrimodels.ChannelMetadata.objects.create(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        tagline=channel.tagline,
        version=channel.version
        + 1,  # Need to save as version being published, not current version
        thumbnail=channel.icon_encoding,
        root_pk=base_tree.node_id,
        root_id=base_tree.node_id,
        min_schema_version=MIN_SCHEMA_VERSION,  # Need to modify Kolibri so we can import this without importing models
    )
    logging.info("Generated the channel metadata.")

    return kolibri_channel


def set_channel_icon_encoding(channel):
    channel.icon_encoding = convert_channel_thumbnail(channel)
    channel.save()


def convert_channel_thumbnail(channel):
    """encode_thumbnail: gets base64 encoding of thumbnail
    Args:
        thumbnail (str): file path or url to channel's thumbnail
    Returns: base64 encoding of thumbnail
    """
    if (
        not channel.thumbnail
        or channel.thumbnail == ""
        or "static" in channel.thumbnail
    ):
        return ""

    if channel.thumbnail_encoding:
        try:
            thumbnail_data = channel.thumbnail_encoding
            if thumbnail_data.get("base64"):
                return thumbnail_data["base64"]
        except ValueError:
            logging.error(
                "ERROR: channel thumbnail is not in correct format ({}: {})".format(
                    channel.id, channel.thumbnail_encoding
                )
            )
    return get_thumbnail_encoding(channel.thumbnail)


def map_tags_to_node(kolibrinode, ccnode):
    """map_tags_to_node: assigns tags to nodes (creates fk relationship)
    Args:
        kolibrinode (kolibri.models.ContentNode): node to map tag to
        ccnode (contentcuration.models.ContentNode): node with tags to map
    Returns: None
    """
    tags_to_add = []

    for tag in ccnode.tags.all():
        t, _new = kolibrimodels.ContentTag.objects.get_or_create(
            pk=tag.pk, tag_name=tag.tag_name
        )
        if len(t.tag_name) <= MAX_TAG_LENGTH:
            tags_to_add.append(t)

    kolibrinode.tags.set(tags_to_add)
    kolibrinode.save()


def raise_if_nodes_are_all_unchanged(channel):

    logging.debug("Checking if we have any changed nodes.")

    changed_models = channel.main_tree.get_family().filter(changed=True)

    if not changed_models.exists():
        logging.debug("No nodes have been changed!")
        raise NoNodesChangedError("No models changed!")

    logging.info("Some nodes are changed.")


def mark_all_nodes_as_published(tree):
    logging.debug("Marking all nodes as published.")

    tree.get_family().update(changed=False, published=True)

    logging.info("Marked all nodes as published.")


def save_export_database(channel_id, version, use_staging_tree=False):
    logging.debug("Saving export database")
    current_export_db_location = get_active_content_database()
    target_paths = [
        os.path.join(settings.DB_ROOT, "{}-{}.sqlite3".format(channel_id, version))
    ]
    # Only create non-version path if not using the staging tree
    if not use_staging_tree:
        target_paths.append(
            os.path.join(settings.DB_ROOT, "{id}.sqlite3".format(id=channel_id))
        )

    for target_export_db_location in target_paths:
        with open(current_export_db_location, "rb") as currentf:
            storage.save(target_export_db_location, currentf)
        logging.info("Successfully copied to {}".format(target_export_db_location))


def add_tokens_to_channel(channel):
    if not channel.secret_tokens.filter(is_primary=True).exists():
        logging.info("Generating tokens for the channel.")
        channel.make_token()


def fill_published_fields(channel, version_notes):
    channel.last_published = timezone.now()
    published_nodes = (
        channel.main_tree.get_descendants()
        .filter(published=True)
        .prefetch_related("files")
    )
    channel.total_resource_count = published_nodes.exclude(
        kind_id=content_kinds.TOPIC
    ).count()
    kind_counts = list(
        published_nodes.values("kind_id")
        .annotate(count=Count("kind_id"))
        .order_by("kind_id")
    )
    channel.published_kind_count = json.dumps(kind_counts)
    channel.published_size = (
        published_nodes.values("files__checksum", "files__file_size")
        .distinct()
        .aggregate(resource_size=Sum("files__file_size"))["resource_size"]
        or 0
    )

    node_languages = published_nodes.exclude(language=None).values_list(
        "language", flat=True
    )
    file_languages = published_nodes.values_list("files__language", flat=True)
    language_list = list(set(chain(node_languages, file_languages)))

    for lang in language_list:
        if lang:
            channel.included_languages.add(lang)

    included_licenses = published_nodes.exclude(license=None).values_list(
        "license", flat=True
    )
    license_list = sorted(set(included_licenses))

    included_categories_dicts = published_nodes.exclude(categories=None).values_list(
        "categories", flat=True
    )
    category_list = sorted(
        set(
            chain.from_iterable(
                (
                    node_categories_dict.keys()
                    for node_categories_dict in included_categories_dicts
                )
            )
        )
    )

    # TODO: Eventually, consolidate above operations to just use this field for storing historical data
    channel.published_data.update(
        {
            channel.version: {
                "resource_count": channel.total_resource_count,
                "kind_count": kind_counts,
                "size": channel.published_size,
                "date_published": channel.last_published.strftime(
                    settings.DATE_TIME_FORMAT
                ),
                "version_notes": version_notes,
                "included_languages": language_list,
                "included_licenses": license_list,
                "included_categories": category_list,
            }
        }
    )
    channel.save()


def sync_contentnode_and_channel_tsvectors(channel_id):
    """
    Creates, deletes and updates tsvectors of the channel and all its content nodes
    to reflect the current state of channel's main tree.
    """
    # Update or create channel tsvector entry.
    logging.info("Setting tsvector for channel with id {}.".format(channel_id))

    channel = (
        get_fts_annotated_channel_qs()
        .values("keywords_tsvector", "main_tree__tree_id")
        .get(pk=channel_id)
    )

    obj, is_created = ChannelFullTextSearch.objects.update_or_create(
        channel_id=channel_id,
        defaults={"keywords_tsvector": channel["keywords_tsvector"]},
    )
    del obj

    if is_created:
        logging.info("Created 1 channel tsvector.")
    else:
        logging.info("Updated 1 channel tsvector.")

    # Update or create contentnodes tsvector entry for channel_id.
    logging.info(
        "Setting tsvectors for all main tree contentnodes in channel {}.".format(
            channel_id
        )
    )

    if ContentNodeFullTextSearch.objects.filter(channel_id=channel_id).exists():
        # First, delete nodes that are no longer in main_tree.
        nodes_no_longer_in_main_tree = ~Exists(
            ccmodels.ContentNode.objects.filter(
                id=OuterRef("contentnode_id"), tree_id=channel["main_tree__tree_id"]
            )
        )
        ContentNodeFullTextSearch.objects.filter(
            nodes_no_longer_in_main_tree, channel_id=channel_id
        ).delete()

        # Now, all remaining nodes are in main_tree, so let's update them.
        # Update only changed nodes.
        node_tsv_subquery = (
            get_fts_annotated_contentnode_qs(channel_id)
            .filter(id=OuterRef("contentnode_id"))
            .order_by()
        )
        ContentNodeFullTextSearch.objects.filter(
            channel_id=channel_id, contentnode__complete=True, contentnode__changed=True
        ).update(
            keywords_tsvector=Subquery(
                node_tsv_subquery.values("keywords_tsvector")[:1]
            ),
            author_tsvector=Subquery(node_tsv_subquery.values("author_tsvector")[:1]),
        )

    # Insert newly created nodes.
    # "set_contentnode_tsvectors" command is defined in "search/management/commands" directory.
    call_command("set_contentnode_tsvectors", "--channel-id={}".format(channel_id))


@delay_user_storage_calculation
def publish_channel(  # noqa: C901
    user_id,
    channel_id,
    version_notes="",
    force=False,
    force_exercises=False,
    send_email=False,
    progress_tracker=None,
    language=settings.LANGUAGE_CODE,
    use_staging_tree=False,
):
    """
    :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
    """
    channel = ccmodels.Channel.objects.get(pk=channel_id)
    base_tree = channel.staging_tree if use_staging_tree else channel.main_tree
    if base_tree is None:
        tree_name = "staging_tree" if use_staging_tree else "main_tree"
        raise NoneContentNodeTreeError(f"{tree_name} is None!")
    kolibri_temp_db = None
    start = time.time()
    try:
        set_channel_icon_encoding(channel)
        kolibri_temp_db = create_content_database(
            channel,
            force,
            user_id,
            force_exercises,
            progress_tracker=progress_tracker,
            use_staging_tree=use_staging_tree,
        )
        add_tokens_to_channel(channel)
        if not use_staging_tree:
            increment_channel_version(channel)
            sync_contentnode_and_channel_tsvectors(channel_id=channel.id)
            mark_all_nodes_as_published(base_tree)
            fill_published_fields(channel, version_notes)

        # Attributes not getting set for some reason, so just save it here
        base_tree.publishing = False
        base_tree.changed = False
        base_tree.published = True
        base_tree.save()

        # Delete public channel cache.
        if not use_staging_tree and channel.public:
            delete_public_channel_cache_keys()

        if send_email:
            with override(language):
                send_emails(channel, user_id, version_notes=version_notes)

        # use SQLite backup API to put DB into archives folder.
        # Then we can use the empty db name to have SQLite use a temporary DB (https://www.sqlite.org/inmemorydb.html)

        if progress_tracker:
            progress_tracker.track(100)
    except NoNodesChangedError:
        logging.warning(
            "No nodes have changed for channel {} so no publish will happen".format(
                channel_id
            )
        )
    # No matter what, make sure publishing is set to False once the run is done
    finally:
        if kolibri_temp_db and os.path.exists(kolibri_temp_db):
            os.remove(kolibri_temp_db)
        base_tree.publishing = False
        base_tree.save()

    elapsed = time.time() - start

    if elapsed > PUBLISHING_UPDATE_THRESHOLD:
        # we raise the exception so that sentry has the stack trace when it tries to log it
        # we need to raise it to get Python to fill out the stack trace.
        try:
            raise SlowPublishError(elapsed, channel_id)
        except SlowPublishError as e:
            report_exception(e)
    return channel
