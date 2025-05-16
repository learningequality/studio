# -*- coding: utf-8 -*-
import datetime
import json
import logging
import os
import re
import sqlite3
import sys
import tempfile
from functools import cached_property
from io import BytesIO

import requests
import tqdm
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.db import transaction
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import format_presets
from le_utils.constants import mastery_criteria
from le_utils.constants import roles
from le_utils.constants.labels import learning_activities

from contentcuration import models
from contentcuration.api import write_raw_content_to_storage
from contentcuration.utils.files import create_file_from_contents
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.files import write_base64_to_file
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.utils.publish import publish_channel
from contentcuration.utils.storage.base import CompositeStorage
from contentcuration.viewsets.assessmentitem import exercise_image_filename_regex

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


class ImportClient(requests.Session):
    def __init__(self, base_url, api_token=None):
        super(ImportClient, self).__init__()
        self.base_url = base_url
        self.api_token = api_token
        self.headers.update(
            {
                "User-Agent": f"restore_channel/kolibri-studio/dev python-requests/{requests.__version__}",
            }
        )

    def __getattr__(self, name):
        if name.endswith("_with_token"):
            if not self.api_token:
                raise ValueError("API token is required for this method.")

            target_method = getattr(
                super(ImportClient, self), name.replace("_with_token", "")
            )
            token_headers = {
                "Authorization": f"Token {self.api_token}",
            }
            return lambda url, *args, **kwargs: target_method(
                url, *args, headers=token_headers, **kwargs
            )
        raise AttributeError(
            f"'{self.__class__.__name__}' object has no attribute '{name}'"
        )

    def request(self, method, url, *args, **kwargs):
        url = f"{self.base_url}{url}"
        return super(ImportClient, self).request(method, url, *args, **kwargs)


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


def convert_metadata_to_dict(metadata):
    """
    Convert metadata from a string to a dictionary.

    :param metadata: The metadata string to convert.
    :return: A dictionary representation of the metadata.
    """
    if isinstance(metadata, str):
        metadata_split = metadata.split(",")
        return {metadata_key: True for metadata_key in metadata_split}
    return metadata


def convert_learning_activities_to_dict(content_kind, metadata):
    """
    Convert learning activities from a string to a dictionary.

    :param content_kind: The content kind of the learning activities.
    :param metadata: The learning activities string to convert.
    :return: A dictionary representation of the learning activities.
    """
    metadata = convert_metadata_to_dict(metadata)
    if isinstance(metadata, dict):
        return metadata

    if content_kind == content_kinds.EXERCISE:
        return {learning_activities.PRACTICE: True}
    elif content_kind in [content_kinds.HTML5, content_kinds.H5P]:
        return {learning_activities.EXPLORE: True}
    elif content_kind == content_kinds.AUDIO:
        return {learning_activities.LISTEN: True}
    elif content_kind == content_kinds.VIDEO:
        return {learning_activities.WATCH: True}
    elif content_kind == content_kinds.DOCUMENT:
        return {learning_activities.READ: True}
    elif content_kind == content_kinds.SLIDESHOW:
        return {learning_activities.READ: True}
    elif content_kind == content_kinds.TOPIC:
        return None
    return {learning_activities.EXPLORE: True}


class ImportManager(object):
    """
    Import a channel from another Studio instance. This can be used to copy online Studio channels
    into local machines for development, testing, faster editing, or other purposes.
    """

    def __init__(
        self,
        source_url,
        source_id,
        target_id=None,
        editor=None,
        public=False,
        publish=False,
        token=None,
        download_content=True,
        logger=None,
    ):
        self.source_id = source_id
        self.target_id = target_id or source_id
        self.source_url = source_url
        self.editor = editor
        self.public = public
        self.publish = publish
        self.token = token
        self.download_content = download_content
        self.logger = logger or logging.getLogger(__name__)
        self.client = ImportClient(source_url, api_token=token)
        self.storage = (
            default_storage._get_writeable_backend()
            if isinstance(default_storage, CompositeStorage)
            else default_storage
        )
        self.conn = None
        self.cursor = None
        self.progress = None

    @cached_property
    def editor_user(self):
        """
        Get the User object for the editor email address.

        :return: The User object for the editor.
        """
        return models.User.objects.get(email=self.editor) if self.editor else None

    def run(self):
        """
        Run the import restoration process.
        """
        self.logger.info("********** STARTING CHANNEL RESTORATION **********")
        # Set up variables for the import process
        start = datetime.datetime.now()

        if not self.token:
            self.logger.warning(
                "No API token provided. This may result in limited functionality."
            )

        # Test connection to the database
        self.logger.info(f"Connecting to database for channel {self.source_id}...")

        tempf = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        try:
            response = self.client.get(f"/content/databases/{self.source_id}.sqlite3")
            for chunk in response:
                tempf.write(chunk)

            tempf.close()

            with using_content_database(tempf.name):
                call_command(
                    "migrate",
                    "content",
                    database=get_active_content_database(),
                    no_input=True,
                )

            self.conn = sqlite3.connect(tempf.name)
            self.cursor = self.conn.cursor()

            # Start by creating the channel
            self.logger.info("Creating channel...")
            channel, root_pk = self._create_channel()
            channel.editors.add(self.editor_user)
            channel.save()

            # Create the root node
            root = models.ContentNode.objects.create(
                node_id=root_pk,
                title=channel.name,
                kind_id=content_kinds.TOPIC,
                original_channel_id=self.target_id,
                source_channel_id=self.target_id,
                complete=True,
            )

            self.logger.info("Creating nodes...")
            total_nodes = self.cursor.execute(
                f"SELECT COUNT(*) FROM {NODE_TABLE}"
            ).fetchone()[0]
            node_progress = tqdm.tqdm(
                total=total_nodes, desc="Restoring nodes", unit="node"
            )

            # Create nodes mapping to channel
            with transaction.atomic():
                self._create_nodes(root, node_progress)
                node_progress.close()
                self.logger.info("Creating assessment items...")
                exercise_nodes = models.ContentNode.objects.filter(
                    kind_id=content_kinds.EXERCISE, tree_id=root.tree_id
                )
                exercise_progress = tqdm.tqdm(
                    total=exercise_nodes.count(),
                    desc="Restoring assessments",
                    unit="node",
                )
                chunk = []
                for node in exercise_nodes.iterator(chunk_size=20):
                    chunk.append(node)
                    if len(chunk) >= 20:
                        self._create_assessment_items(chunk)
                        exercise_progress.update(len(chunk))
                        chunk = []
                if chunk:
                    self._create_assessment_items(chunk)
                    exercise_progress.update(len(chunk))
                exercise_progress.close()
                # TODO: Handle prerequisites

            # Delete the previous tree if it exists
            old_previous = channel.previous_tree
            if old_previous:
                old_previous.parent = get_deleted_chefs_root()
                old_previous.title = f"Old previous tree for channel {channel.pk}"
                old_previous.save()

            # Save the new tree to the target tree, and preserve the old one
            channel.previous_tree = channel.main_tree
            channel.main_tree = root
            channel.save()
        finally:
            self.conn and self.conn.close()
            tempf.close()
            os.unlink(tempf.name)

        # Publish the channel if requested
        if self.publish:
            self.logger.info("Publishing channel...")
            publish_channel(self.editor_user.id, channel.id)

        # Print stats
        self.logger.info(
            f"Channel has been imported (time: {datetime.datetime.now() - start})"
        )
        self.logger.info("********** IMPORT COMPLETE **********")

    def _create_channel(self):
        """
        Create the channel at target id
        """
        (
            id,
            name,
            description,
            thumbnail,
            root_pk,
            version,
            last_updated,
            schema_version,
        ) = self.cursor.execute(
            f"""
                    SELECT
                        id, name, description, thumbnail, root_pk, version, last_updated,
                        min_schema_version
                    FROM {CHANNEL_TABLE}
                """
        ).fetchone()
        lang_id, _ = self.cursor.execute(
            f"""
                SELECT lang_id, COUNT(id) AS node_by_lang_count
                FROM {NODE_TABLE}
                ORDER BY node_by_lang_count DESC
            """
        ).fetchone()
        channel, is_new = models.Channel.objects.get_or_create(
            pk=self.target_id, actor_id=self.editor_user.id
        )
        channel.name = name
        channel.description = description
        channel.language_id = lang_id
        channel.thumbnail = write_to_thumbnail_file(thumbnail)
        channel.thumbnail_encoding = {"base64": thumbnail, "points": [], "zoom": 0}
        channel.version = version
        channel.public = self.public
        channel.save()
        self.logger.info(f"Created channel {self.target_id} with name {name}")
        return channel, root_pk

    def _create_nodes(self, parent, progress):
        """
        Create node(s) for a channel with target id

        :param parent: node's parent
        :param progress: progress bar for node creation
        """
        sql_command = f"""
            SELECT
                id, title, content_id, description, sort_order, license_owner, author, license_id,
                kind, coach_content, lang_id, grade_levels, resource_types, learning_activities,
                accessibility_labels, categories, learner_needs, duration, options
            FROM {NODE_TABLE}
            WHERE parent_id = ?
            ORDER BY sort_order;
        """
        query = self.cursor.execute(
            sql_command, (getattr(parent, "node_id", parent),)
        ).fetchall()

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
            grade_levels,
            resource_types,
            learning_activities_,
            accessibility_labels,
            categories,
            learner_needs,
            duration,
            options,
        ) in query:
            # Determine role
            role = roles.LEARNER
            if coach_content:
                role = roles.COACH

            # Determine license
            license_result = self._retrieve_license(license_id)
            license_description = license_result[1] if license_result else ""
            license_result = license_result[0] if license_result else None

            # Create the new node model
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
                license=license_result,
                license_description=license_description,
                language_id=lang_id,
                role_visibility=role,
                extra_fields=self._prepare_node_extra_fields(id, kind, options),
                kind_id=kind,
                parent=parent,
                original_channel_id=self.target_id,
                source_channel_id=self.target_id,
                grade_levels=convert_metadata_to_dict(grade_levels),
                resource_types=convert_metadata_to_dict(resource_types),
                learning_activities=convert_learning_activities_to_dict(
                    kind, learning_activities_
                ),
                accessibility_labels=convert_metadata_to_dict(accessibility_labels),
                categories=convert_metadata_to_dict(categories),
                learner_needs=convert_metadata_to_dict(learner_needs),
            )

            # Handle foreign key references (children, files, tags)
            if kind == content_kinds.TOPIC:
                self._create_nodes(node, progress)
            self._create_files(node)
            self._create_tags(node)

            # assessments are handled after all nodes are created, which also ensures nodes
            # are marked complete
            if kind != content_kinds.EXERCISE:
                errors = node.mark_complete()
                if errors:
                    self.logger.warning(f"Node {node.node_id} has errors: {errors}")
            node.save()
            progress.update(1)

    def _prepare_node_extra_fields(self, node_id, kind, options):
        """
        Prepare extra fields for the node based on the kind and options. For exercises, it
        retrieves the additional info from the assessment metadata.

        :param node_id: the node ID
        :param kind: the content kind
        :param options: the options JSON string
        :return: a dictionary of extra fields
        """
        extra_fields = {
            "options": json.loads(options) if options else {},
        }
        completion_criteria_ = extra_fields["options"].get("completion_criteria", {})

        # don't fill anything in if there is no completion_criteria, otherwise validation will fail
        if completion_criteria_ and "learner_managed" not in completion_criteria_:
            completion_criteria_.update(learner_managed=False)

        if kind == content_kinds.EXERCISE:
            randomize_sql = f"""
                SELECT randomize, mastery_model
                FROM {ASSESSMENTMETADATA_TABLE}
                WHERE contentnode_id = ?
            """
            randomize, mastery_criteria_ = self.cursor.execute(
                randomize_sql, (node_id,)
            ).fetchone()
            extra_fields["randomize"] = bool(randomize) if randomize else False
            if mastery_criteria_:
                mastery_criteria_ = json.loads(mastery_criteria_)
                mastery_criteria_.update(mastery_model=mastery_criteria_.pop("type"))
                completion_criteria_.update(
                    {
                        "model": completion_criteria.MASTERY,
                        "threshold": mastery_criteria_,
                    }
                )

        if completion_criteria_.get("model") == completion_criteria.MASTERY:
            mastery_model = completion_criteria_.get("threshold", {}).get(
                "mastery_model"
            )
            if mastery_model in [
                mastery_criteria.DO_ALL,
                mastery_criteria.NUM_CORRECT_IN_A_ROW_2,
                mastery_criteria.NUM_CORRECT_IN_A_ROW_3,
                mastery_criteria.NUM_CORRECT_IN_A_ROW_5,
                mastery_criteria.NUM_CORRECT_IN_A_ROW_10,
            ]:
                # remove m,n values
                completion_criteria_["threshold"] = {
                    "mastery_model": mastery_model,
                }

        extra_fields["options"].update(completion_criteria=completion_criteria_)
        return extra_fields

    def _retrieve_license(self, license_id):
        """
        Get license based on id from exported db

        :param license_id: id of license on exported db
        :return: license model matching the id and the associated license description
        :rtype: tuple
        """
        # Handle no license being assigned
        if license_id is None or license_id == "":
            return None

        # Return license that matches name
        name, description = self.cursor.execute(
            f"""
                SELECT license_name, license_description
                FROM {LICENSE_TABLE}
                WHERE id = ?
            """,
            (license_id,),
        ).fetchone()
        return models.License.objects.get(license_name=name), description

    def _create_files(self, contentnode):
        """
        Create and possibly download node files

        :param contentnode: node file references
        """
        # Parse database for files referencing content node and make file models
        sql_command = f"""
            SELECT checksum, extension, file_size, contentnode_id, lang_id, preset, thumbnail
            FROM {FILE_TABLE}
            WHERE contentnode_id = ?;
        """
        query = self.cursor.execute(sql_command, (contentnode.node_id,)).fetchall()

        for (
            checksum,
            extension,
            file_size,
            contentnode_id,
            lang_id,
            preset,
            is_thumbnail,
        ) in query:
            filename = "{}.{}".format(checksum, extension)

            try:
                self._download_file(
                    filename,
                    contentnode=contentnode,
                    preset=preset,
                    file_size=file_size,
                    lang_id=lang_id,
                    is_thumbnail=is_thumbnail,
                )
            except IOError as e:
                self.logger.warning(f"FAILED to download '{filename}': {str(e)}")
                if e.errno:
                    sys.stderr.write(
                        f"Restoration Process Error: Failed to save file object {filename}: {os.strerror(e.errno)}"
                    )
                continue

    def _download_file(
        self,
        filename,
        contentnode=None,
        assessment_item=None,
        preset=None,
        file_size=None,
        lang_id=None,
        is_thumbnail=False,
    ):
        """
        Create and possibly download a file from source instance and save to local storage

        :param filename: the name of the file to download
        :param contentnode: the associated content node
        :param assessment_item: the associated assessment item
        :param preset: the format preset for the file
        :param file_size: the known size of the file
        :param lang_id: the language ID of the file
        :param is_thumbnail: whether the file is a thumbnail
        """
        checksum, extension = os.path.splitext(filename)
        extension = extension.lstrip(".")
        filepath = models.generate_object_storage_name(checksum, filename)

        file_url = f"/content/storage/{filename[0]}/{filename[1]}/{filename}"
        file_exists = False

        # If the file already exists, get the size from the storage
        if self.storage.exists(filepath):
            file_size = file_size or self.storage.size(filepath)
            file_exists = True
        # if it needs downloading and if we were instructed to do so
        elif self.download_content or (is_thumbnail and contentnode):
            buffer = BytesIO()
            response = self.client.get(file_url)
            for chunk in response:
                buffer.write(chunk)

            if is_thumbnail and contentnode:
                # If the file is a thumbnail, save it to the content node
                contentnode.thumbnail_encoding = json.dumps(
                    {
                        "base64": get_thumbnail_encoding(filename, input_buffer=buffer),
                        "points": [],
                        "zoom": 0,
                    }
                )
            else:
                checksum, _, filepath = write_raw_content_to_storage(
                    buffer.getvalue(), ext=extension
                )
                buffer.close()
                file_exists = True
        # otherwise, if file size is not known, get it from the response headers
        elif not file_size:
            response = self.client.head(file_url)
            file_size = int(response.headers.get("Content-Length", 0))

        # Save values to a new file object
        file_obj = models.File(
            file_format_id=extension,
            file_size=file_size,
            contentnode=contentnode,
            assessment_item=assessment_item,
            language_id=lang_id,
            preset_id=preset or "",
            checksum=checksum,
        )
        file_obj.file_on_disk.name = filepath
        # set_by_file_on_disk: skip unless the file has been downloaded
        file_obj.save(set_by_file_on_disk=file_exists)

    def _create_tags(self, contentnode):
        """
        Create tags associated with node

        :param contentnode: node tags reference
        """
        # Parse database for files referencing content node and make file models
        sql_command = f"""
            SELECT ct.tag_name
            FROM {NODE_TAG_TABLE} cnt
            JOIN {TAG_TABLE} ct ON cnt.contenttag_id = ct.id
            WHERE cnt.contentnode_id = ?;
        """
        query = self.cursor.execute(sql_command, (contentnode.node_id,)).fetchall()

        models.ContentTag.objects.bulk_create(
            [
                models.ContentTag(
                    tag_name=tag_name,
                    channel_id=self.target_id,
                )
                for tag_name in query
            ],
            ignore_conflicts=True,
        )

        # Save tags to node
        contentnode.tags.set(
            models.ContentTag.objects.filter(
                tag_name__in=query, channel_id=self.target_id
            )
        )
        contentnode.save()

    def _create_assessment_items(self, nodes):
        """
        Generate assessment items based on API data

        :param nodes: nodes to lookup assessment items
        """
        # Note: there are several different IDs being used within this method
        node_ids = [node.node_id for node in nodes]

        if not self.token:
            self.logger.warning(
                f"Skipping assessment items for node(s) {','. join(node_ids)}"
            )
            return

        # first obtain the remote nodes' IDs with the node ID and channel ID
        node_channel_ids = f",{self.source_id},".join(node_ids)
        nodes_response = self.client.get_with_token(
            f"/api/contentnode?_node_id_channel_id___in={node_channel_ids},{self.source_id}"
        )
        if nodes_response.status_code != 200:
            self.logger.warning(
                f"Failed to obtain assessment items for node(s) {','. join(node_ids)}"
            )
            return

        nodes_data = nodes_response.json()
        remote_node_pks = [n["id"] for n in nodes_data] if nodes_data else None

        if not remote_node_pks:
            self.logger.warning(
                f"No content node found for node(s) {','. join(node_ids)}"
            )
            return

        # Get the content node's assessment items
        assessment_response = self.client.get_with_token(
            f"/api/assessmentitem?contentnode__in={','.join(remote_node_pks)}"
        )
        if assessment_response.status_code != 200:
            self.logger.warning(
                f"Failed to obtain assessment items for node(s) {','. join(node_ids)}"
            )
            return

        assessment_items = assessment_response.json()
        if not assessment_items:
            self.logger.warning(
                f"No assessment items found for node(s) {','. join(node_ids)}"
            )
            return

        remote_node_pk_map = (
            {n["node_id"]: n["id"] for n in nodes_data} if nodes_data else {}
        )

        for local_node in nodes:
            remote_contentnode_id = remote_node_pk_map.get(local_node.node_id)
            reduced_assessment_items = [
                item
                for item in assessment_items
                if item["contentnode"] == remote_contentnode_id
            ]

            if not reduced_assessment_items:
                self.logger.warning(
                    f"No assessment items found for node {local_node.node_id}"
                )
                continue

            for item in reduced_assessment_items:
                assessment_item = models.AssessmentItem.objects.create(
                    assessment_id=item["assessment_id"],
                    type=item["type"],
                    order=item["order"],
                    question=item["question"],
                    answers=item["answers"],
                    hints=item["hints"],
                    raw_data=item["raw_data"],
                    source_url=item["source_url"],
                    randomize=item.get("randomize", False),
                )
                self._process_assessment_images(assessment_item)
                local_node.assessment_items.add(assessment_item)
            errors = local_node.mark_complete()
            if errors:
                self.logger.warning(f"Node {local_node.node_id} has errors: {errors}")
            local_node.save()

    def _process_assessment_images(self, assessment_item):
        """
        Process images in assessment items and save them to the database.

        :param assessment_item: The assessment item to process.
        """
        if not self.download_content:
            # Skip if not downloading content
            return

        for content in [
            assessment_item.question,
            assessment_item.answers,
            assessment_item.hints,
        ]:
            for match in re.finditer(exercise_image_filename_regex, content):
                # Save files to db
                self._download_file(
                    match.group(3),
                    assessment_item=assessment_item,
                    preset=format_presets.EXERCISE,
                )
