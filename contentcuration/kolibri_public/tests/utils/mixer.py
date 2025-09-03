from django.db import models as django_models
from kolibri_content.fields import DateTimeTzField
from kolibri_content.fields import UUIDField
from kolibri_content.router import get_active_content_database
from mixer.backend.django import GenFactory
from mixer.backend.django import Mixer


class KolibriPublicMixer(Mixer):
    """Slightly modified Mixer that works correctly with the active
    content database and with UUIDField.
    """

    def __init__(self, *args, **kwargs):
        mixer_factory = GenFactory()
        mixer_factory.generators[UUIDField] = mixer_factory.generators[
            django_models.UUIDField
        ]
        mixer_factory.generators[DateTimeTzField] = mixer_factory.generators[
            django_models.DateTimeField
        ]

        return super().__init__(*args, factory=mixer_factory, **kwargs)

    def postprocess(self, target):
        if self.params.get("commit"):
            # Not sure why the `force_insert` is needed, but using the
            # mixer causes "Save with update_fields did not affect any rows" error
            # if this is not specified
            used_db = get_active_content_database(return_none_if_not_set=True)
            target.save(using=used_db, force_insert=True)

        return target
