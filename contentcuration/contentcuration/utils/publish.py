import itertools
import json
import logging as logmodule
import os
import tempfile
import time
import uuid
from copy import deepcopy
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
from le_utils.constants import licenses
from le_utils.constants import roles
from search.models import ChannelFullTextSearch
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_annotated_channel_qs
from search.utils import get_fts_annotated_contentnode_qs

from contentcuration import models as ccmodels
from contentcuration.decorators import delay_user_storage_calculation
from contentcuration.utils.assessment.perseus import PerseusExerciseGenerator
from contentcuration.utils.assessment.qti.archive import QTIExerciseGenerator
from contentcuration.utils.assessment.qti.imsmanifest import (
    get_assessment_ids_from_manifest,
)
from contentcuration.utils.cache import delete_public_channel_cache_keys
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import migrate_extra_fields
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
    is_draft_version=False,
    use_staging_tree=False,
):
    """
    :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
    """
    if not is_draft_version and use_staging_tree:
        raise ValueError("Staging tree is only supported for draft versions")

    if not channel.language:
        raise ChannelIncompleteError("Channel must have a language set to be published")

    if not is_draft_version and not force:
        raise_if_nodes_are_all_unchanged(channel)
    fh, tempdb = tempfile.mkstemp(suffix=".sqlite3")

    with using_content_database(tempdb):
        if not is_draft_version and not channel.main_tree.publishing:
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
        version = "next" if is_draft_version else channel.version + 1
        save_export_database(
            channel.pk,
            version,
            is_draft_version,
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


def create_draft_channel_version(channel):
    
    channel_version, created = ccmodels.ChannelVersion.objects.get_or_create(
        channel=channel,
        version=None,
    )

    if created:
        channel_version.new_token()

    return channel_version


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
                exercise_data = process_assessment_metadata(node)
                any_free_response = any(
                    t == exercises.FREE_RESPONSE
                    for t in exercise_data["assessment_mapping"].values()
                )
                generator_class = (
                    QTIExerciseGenerator
                    if any_free_response
                    else PerseusExerciseGenerator
                )

                # If this exercise previously had a file generated by a different
                # generator, make sure we clean it up here.
                stale_presets = {
                    PerseusExerciseGenerator.preset,
                    QTIExerciseGenerator.preset,
                } - {generator_class.preset}

                # Remove archives produced by the previously-used generator
                node.files.filter(preset_id__in=stale_presets).delete()

                if (
                    self.force_exercises
                    or node.changed
                    or not node.files.filter(preset_id=generator_class.preset).exists()
                ):

                    generator = generator_class(
                        node,
                        exercise_data,
                        self.channel_id,
                        self.default_language.lang_code,
                        user_id=self.user_id,
                    )
                    generator.create_exercise_archive()

                create_kolibri_assessment_metadata(node, kolibrinode)
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


def _get_exercise_data_from_ccnode(ccnode, num_assessment_items):
    randomize, mastery_criteria = parse_assessment_metadata(ccnode)

    exercise_data = deepcopy(mastery_criteria)
    exercise_data_type = exercise_data.get("mastery_model", "")

    mastery_model = {"type": exercise_data_type or exercises.M_OF_N}
    if mastery_model["type"] == exercises.M_OF_N:
        mastery_model.update(
            {"n": exercise_data.get("n") or min(5, num_assessment_items) or 1}
        )
        mastery_model.update(
            {"m": exercise_data.get("m") or min(5, num_assessment_items) or 1}
        )
    elif mastery_model["type"] == exercises.DO_ALL:
        mastery_model.update(
            {"n": num_assessment_items or 1, "m": num_assessment_items or 1}
        )
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_2:
        mastery_model.update({"n": 2, "m": 2})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_3:
        mastery_model.update({"n": 3, "m": 3})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_5:
        mastery_model.update({"n": 5, "m": 5})
    elif mastery_model["type"] == exercises.NUM_CORRECT_IN_A_ROW_10:
        mastery_model.update({"n": 10, "m": 10})
    return randomize, exercise_data, mastery_model


def process_assessment_metadata(ccnode):
    # Get mastery model information, set to default if none provided
    assessment_items = ccnode.assessment_items.all().order_by("order")
    assessment_item_ids = [a.assessment_id for a in assessment_items]

    randomize, exercise_data, mastery_model = _get_exercise_data_from_ccnode(
        ccnode, len(assessment_item_ids)
    )

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

    return exercise_data


def create_kolibri_assessment_metadata(ccnode, kolibrinode):
    assessment_items = ccnode.assessment_items.all().order_by("order")
    assessment_item_ids = [a.assessment_id for a in assessment_items]
    randomize, _, mastery_model = _get_exercise_data_from_ccnode(
        ccnode, len(assessment_item_ids)
    )
    qti_file = ccnode.files.filter(preset_id=format_presets.QTI_ZIP).first()
    if qti_file:
        # Open the zip file from Django storage
        with qti_file.file_on_disk.open("rb") as file_handle:
            assessment_item_ids = get_assessment_ids_from_manifest(file_handle)

    kolibrimodels.AssessmentMetaData.objects.create(
        id=uuid.uuid4(),
        contentnode=kolibrinode,
        assessment_item_ids=assessment_item_ids,
        number_of_assessments=len(assessment_item_ids),
        mastery_model=mastery_model,
        randomize=randomize,
        is_manipulable=ccnode.kind_id == content_kinds.EXERCISE,
    )


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


def get_content_db_path(channel_id, version=None):
    if version is not None:
        return os.path.join(settings.DB_ROOT, f"{channel_id}-{version}.sqlite3")
    return os.path.join(settings.DB_ROOT, f"{channel_id}.sqlite3")


def save_export_database(channel_id, version, is_draft_version=False):
    logging.debug("Saving export database")
    current_export_db_location = get_active_content_database()
    target_paths = [get_content_db_path(channel_id, version)]
    # Only create non-version path if not is_draft_version
    if not is_draft_version:
        target_paths.append(get_content_db_path(channel_id))

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

    # Calculate non-distributable licenses (All Rights Reserved)
    all_rights_reserved_id = (
        ccmodels.License.objects.filter(license_name=licenses.ALL_RIGHTS_RESERVED)
        .values_list("id", flat=True)
        .first()
    )

    non_distributable_licenses = (
        [all_rights_reserved_id]
        if all_rights_reserved_id and all_rights_reserved_id in license_list
        else []
    )

    # records for each unique description so reviewers can approve/reject them individually.
    # This allows centralized tracking of custom licenses across all channels.
    special_permissions_id = (
        ccmodels.License.objects.filter(license_name=licenses.SPECIAL_PERMISSIONS)
        .values_list("id", flat=True)
        .first()
    )

    special_permissions_ids = []
    if special_permissions_id and special_permissions_id in license_list:
        special_perms_descriptions = list(
            published_nodes.filter(license_id=special_permissions_id)
            .exclude(license_description__isnull=True)
            .exclude(license_description="")
            .values_list("license_description", flat=True)
            .distinct()
        )

        if special_perms_descriptions:
            new_licenses = [
                ccmodels.AuditedSpecialPermissionsLicense(
                    description=description, distributable=False
                )
                for description in special_perms_descriptions
            ]

            ccmodels.AuditedSpecialPermissionsLicense.objects.bulk_create(
                new_licenses, ignore_conflicts=True
            )

    if channel.version_info:
        channel.version_info.resource_count = channel.total_resource_count
        channel.version_info.kind_count = kind_counts
        channel.version_info.size = int(channel.published_size)
        channel.version_info.date_published = channel.last_published
        channel.version_info.version_notes = version_notes
        channel.version_info.included_languages = language_list
        channel.version_info.included_licenses = license_list
        channel.version_info.included_categories = category_list
        channel.version_info.non_distributable_licenses_included = (
            non_distributable_licenses
        )
        channel.version_info.save()

        if special_perms_descriptions:
            channel.version_info.special_permissions_included.set(
                ccmodels.AuditedSpecialPermissionsLicense.objects.filter(
                    description__in=special_perms_descriptions
                )
            )
        else:
            channel.version_info.special_permissions_included.clear()

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
    is_draft_version=False,
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
            is_draft_version=is_draft_version,
            use_staging_tree=use_staging_tree,
        )
        add_tokens_to_channel(channel)
        if is_draft_version:
            create_draft_channel_version(channel)
        else:
            increment_channel_version(channel)
        if not is_draft_version:
            sync_contentnode_and_channel_tsvectors(channel_id=channel.id)
            mark_all_nodes_as_published(base_tree)
            fill_published_fields(channel, version_notes)
            base_tree.publishing = False
            base_tree.changed = False
            base_tree.published = True
            base_tree.save()

        # Delete public channel cache.
        if not is_draft_version and channel.public:
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
        if not is_draft_version:
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


def ensure_versioned_database_exists(channel_id, channel_version):
    """
    Ensures that the versioned database exists, and if not, copies the unversioned database to the versioned path.
    This happens if the channel was published back when versioned databases were not used.
    """
    if channel_version == 0:
        raise ValueError("An unpublished channel cannot have a versioned database.")

    unversioned_db_storage_path = get_content_db_path(channel_id)
    versioned_db_storage_path = get_content_db_path(channel_id, channel_version)

    if not storage.exists(versioned_db_storage_path):
        if not storage.exists(unversioned_db_storage_path):
            # This should never happen, a published channel should always have an unversioned database
            raise FileNotFoundError(
                f"Neither unversioned nor versioned database found for channel {channel_id}."
            )

        # NOTE: This should not result in a race condition in the case that a newer
        # version of the channel is published before the task running this function
        # is executed. In that case, the publishing logic would have already created
        # the versioned database. The only case where this could be problematic is
        # if this happens between the check above this comment and the commands below
        # it. However, this is EXTREMELY unlikely, and could probably only be solved
        # by introducing a locking mechanism for the database storage objects.
        with storage.open(unversioned_db_storage_path, "rb") as unversioned_db_file:
            storage.save(versioned_db_storage_path, unversioned_db_file)

        logging.info(
            f"Versioned database for channel {channel_id} did not exist, copied the unversioned database to {versioned_db_storage_path}."
        )
