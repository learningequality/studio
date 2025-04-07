"""
This file is an exact copy of the base_models.py file from Kolibri.
The only modifications are to vendor imports from Morango and Kolibri
for custom field definitions. These have been placed in kolibri_content.fields.

In addition, any foreign key fields have on_delete definitions added for Django 3 compatibility.
https://github.com/learningequality/kolibri/blob/0f6bb6781a4453cd9fdc836d52b65dd69e395b20/kolibri/core/content/base_models.py#L68
"""
from django.db import models
from kolibri_content.fields import DateTimeTzField
from kolibri_content.fields import JSONField
from kolibri_content.fields import UUIDField
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants.languages import LANGUAGE_DIRECTIONS
from mptt.models import MPTTModel
from mptt.models import TreeForeignKey


MAX_TAG_LENGTH = 30


class ContentTag(models.Model):
    id = UUIDField(primary_key=True)
    tag_name = models.CharField(max_length=MAX_TAG_LENGTH, blank=True)

    class Meta:
        abstract = True


class ContentNode(MPTTModel):
    """
    The primary object type in a content database. Defines the properties that are shared
    across all content types.

    It represents videos, exercises, audio, documents, and other 'content items' that
    exist as nodes in content channels.
    """

    id = UUIDField(primary_key=True)
    parent = TreeForeignKey(
        "self", null=True, blank=True, related_name="children", db_index=True, on_delete=models.CASCADE
    )
    license_name = models.CharField(max_length=50, null=True, blank=True)
    license_description = models.TextField(null=True, blank=True)
    has_prerequisite = models.ManyToManyField(
        "self", related_name="prerequisite_for", symmetrical=False, blank=True
    )
    related = models.ManyToManyField("self", symmetrical=True, blank=True)
    tags = models.ManyToManyField(
        "ContentTag", symmetrical=False, related_name="tagged_content", blank=True
    )
    title = models.CharField(max_length=200)
    coach_content = models.BooleanField(default=False)

    # the content_id is used for tracking a user's interaction with a piece of
    # content, in the face of possibly many copies of that content. When a user
    # interacts with a piece of content, all substantially similar pieces of
    # content should be marked as such as well. We track these "substantially
    # similar" types of content by having them have the same content_id.
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField(db_index=True)

    description = models.TextField(blank=True, null=True)
    sort_order = models.FloatField(blank=True, null=True)
    license_owner = models.CharField(max_length=200, blank=True)
    author = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=200, choices=content_kinds.choices, blank=True)
    available = models.BooleanField(default=False)
    lang = models.ForeignKey("Language", blank=True, null=True, on_delete=models.CASCADE)

    # A JSON Dictionary of properties to configure loading, rendering, etc. the file
    options = JSONField(default={}, blank=True, null=True)

    # Fields for metadata labels
    grade_levels = models.TextField(blank=True, null=True)
    resource_types = models.TextField(blank=True, null=True)
    learning_activities = models.TextField(blank=True, null=True)
    accessibility_labels = models.TextField(blank=True, null=True)
    categories = models.TextField(blank=True, null=True)
    learner_needs = models.TextField(blank=True, null=True)

    # The (suggested) duration of a resource, in seconds.
    duration = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        abstract = True


class Language(models.Model):
    id = models.CharField(max_length=14, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=10, db_index=True, blank=True, null=True)
    # Localized name
    lang_name = models.CharField(max_length=100, blank=True, null=True)
    lang_direction = models.CharField(
        max_length=3, choices=LANGUAGE_DIRECTIONS, default=LANGUAGE_DIRECTIONS[0][0]
    )

    class Meta:
        abstract = True


class File(models.Model):
    """
    The second to bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """

    id = UUIDField(primary_key=True)
    # The foreign key mapping happens here as many File objects can map onto a single local file
    local_file = models.ForeignKey("LocalFile", related_name="files", on_delete=models.CASCADE)
    contentnode = models.ForeignKey("ContentNode", related_name="files", on_delete=models.CASCADE)
    preset = models.CharField(
        max_length=150, choices=format_presets.choices, blank=True
    )
    lang = models.ForeignKey("Language", blank=True, null=True, on_delete=models.CASCADE)
    supplementary = models.BooleanField(default=False)
    thumbnail = models.BooleanField(default=False)
    priority = models.IntegerField(blank=True, null=True, db_index=True)

    class Meta:
        abstract = True


class LocalFile(models.Model):
    """
    The bottom layer of the contentDB schema, defines the local state of files on the device storage.
    """

    # ID should be the checksum of the file
    id = models.CharField(max_length=32, primary_key=True)
    extension = models.CharField(
        max_length=40, choices=file_formats.choices, blank=True
    )
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)

    class Meta:
        abstract = True


class AssessmentMetaData(models.Model):
    """
    A model to describe additional metadata that characterizes assessment behaviour in Kolibri.
    This model contains additional fields that are only revelant to content nodes that probe a
    user's state of knowledge and allow them to practice to Mastery.
    ContentNodes with this metadata may also be able to be used within quizzes and exams.
    """

    id = UUIDField(primary_key=True)
    contentnode = models.ForeignKey("ContentNode", related_name="assessmentmetadata", on_delete=models.CASCADE)
    # A JSON blob containing a serialized list of ids for questions that the assessment can present.
    assessment_item_ids = JSONField(default=[])
    # Length of the above assessment_item_ids for a convenience lookup.
    number_of_assessments = models.IntegerField()
    # A JSON blob describing the mastery model that is used to set this assessment as mastered.
    mastery_model = JSONField(default={})
    # Should the questions listed in assessment_item_ids be presented in a random order?
    randomize = models.BooleanField(default=False)
    # Is this assessment compatible with being previewed and answer filled for display in coach reports
    # and use in summative and formative tests?
    is_manipulable = models.BooleanField(default=False)

    class Meta:
        abstract = True


class ChannelMetadata(models.Model):
    """
    Holds metadata about all existing content databases that exist locally.
    """

    id = UUIDField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    tagline = models.CharField(max_length=150, blank=True, null=True)
    author = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True)
    last_updated = DateTimeTzField(null=True)
    # Minimum version of Kolibri that this content database is compatible with
    min_schema_version = models.CharField(max_length=50)
    root = models.ForeignKey("ContentNode", on_delete=models.CASCADE)

    class Meta:
        abstract = True
