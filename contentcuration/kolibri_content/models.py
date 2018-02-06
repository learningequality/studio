from __future__ import unicode_literals

from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from kolibri.content import models as kolibri_models, legacy_models
from le_utils.constants import file_formats


@python_2_unicode_compatible
class ContentTag(kolibri_models.ContentTag):
    pass


@python_2_unicode_compatible
class ContentNode(kolibri_models.ContentNode):
    license = models.ForeignKey('License', null=True, blank=True)


@python_2_unicode_compatible
class Language(kolibri_models.Language):
    pass


@python_2_unicode_compatible
class File(kolibri_models.File):
    extension = models.CharField(max_length=40, choices=file_formats.choices, blank=True)
    file_size = models.IntegerField(blank=True, null=True)
    checksum = models.CharField(max_length=400, blank=True)


@python_2_unicode_compatible
class LocalFile(kolibri_models.LocalFile):
    pass


@python_2_unicode_compatible
class License(legacy_models.License):

    class Meta:
        pass


@python_2_unicode_compatible
class AssessmentMetaData(kolibri_models.AssessmentMetaData):
    pass


@python_2_unicode_compatible
class ChannelMetadata(kolibri_models.ChannelMetadata):
    root_pk = kolibri_models.UUIDField()
