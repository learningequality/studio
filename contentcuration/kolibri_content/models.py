"""
These models are defined by combining the base_models from Kolibri
and then manually adding the fields and models from legacy_models
in order to create a completely backwards compatible export database.
"""
from django.db import models
from kolibri_content import base_models
from kolibri_content.fields import UUIDField
from le_utils.constants import file_formats


class License(models.Model):
    license_name = models.CharField(max_length=50)
    license_description = models.CharField(max_length=400, null=True, blank=True)


class ContentTag(base_models.ContentTag):
    pass


class ContentNode(base_models.ContentNode):
    # Added legacy fields
    license = models.ForeignKey(
        "License", null=True, blank=True, on_delete=models.SET_NULL
    )
    stemmed_metaphone = models.CharField(
        max_length=1800, blank=True
    )  # for fuzzy search in title and description
    # For compatibility with Kolibri versions prior to v0.9.2 we could include these
    # description = models.CharField(max_length=400, blank=True, null=True)
    # license_description = models.CharField(max_length=400, blank=True, null=True)
    # However, as SQLite only has a single TEXT column type for strings
    # the distinction here is unnecessary, and exports of a TextField type will
    # function just as well.


class Language(base_models.Language):
    pass


class File(base_models.File):
    # Added legacy fields
    extension = models.CharField(
        max_length=40, choices=file_formats.choices, blank=True
    )
    file_size = models.IntegerField(blank=True, null=True)
    checksum = models.CharField(max_length=400, blank=True)
    available = models.BooleanField(default=False)


class LocalFile(base_models.LocalFile):
    pass


class AssessmentMetaData(base_models.AssessmentMetaData):
    pass


class ChannelMetadata(base_models.ChannelMetadata):
    # This has previously been rendered blank by setting as a CharField
    # in SQLite, datetime fields are stored as CharFields anyway,
    # so for exported channel databases this makes no difference.
    last_updated = models.CharField(null=True, max_length=200)
    # Added legacy fields
    root_pk = UUIDField()
