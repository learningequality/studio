from django.db import models
from django.db.models import F
from kolibri_content import base_models
from kolibri_content.fields import JSONField
from kolibri_public.search import bitmask_fieldnames
from kolibri_public.search import metadata_bitmasks
from mptt.managers import TreeManager
from mptt.querysets import TreeQuerySet

from contentcuration.models import Country
from contentcuration.models import Language


class ContentTag(base_models.ContentTag):
    pass


class ContentNodeQueryset(TreeQuerySet):
    def has_all_labels(self, field_name, labels):
        bitmasks = metadata_bitmasks[field_name]
        bits = {}
        for label in labels:
            if label in bitmasks:
                bitmask_fieldname = bitmasks[label]["bitmask_field_name"]
                if bitmask_fieldname not in bits:
                    bits[bitmask_fieldname] = 0
                bits[bitmask_fieldname] += bitmasks[label]["bits"]

        filters = {}
        annotations = {}
        for bitmask_fieldname, bits in bits.items():
            annotation_fieldname = "{}_{}".format(bitmask_fieldname, "masked")
            # To get the correct result, i.e. an AND that all the labels are present,
            # we need to check that the aggregated value is euqal to the bits.
            # If we wanted an OR (which would check for any being present),
            # we would have to use GREATER THAN 0 here.
            filters[annotation_fieldname] = bits
            # This ensures that the annotated value is the result of the AND operation
            # so if all the values are present, the result will be the same as the bits
            # but if any are missing, it will not be equal to the bits, but will only be
            # 0 if none of the bits are present.
            annotations[annotation_fieldname] = F(bitmask_fieldname).bitand(bits)

        return self.annotate(**annotations).filter(**filters)


class ContentNodeManager(
    models.Manager.from_queryset(ContentNodeQueryset), TreeManager
):
    def get_queryset(self, *args, **kwargs):
        """
        Ensures that this manager always returns nodes in tree order.
        """
        return (
            super(TreeManager, self)
            .get_queryset(*args, **kwargs)
            .order_by(self.tree_id_attr, self.left_attr)
        )


class ContentNode(base_models.ContentNode):
    lang = models.ForeignKey(Language, blank=True, null=True, on_delete=models.SET_NULL)

    # Fields used only on Kolibri and not imported from a content database
    # Total number of coach only resources for this node
    num_coach_contents = models.IntegerField(default=0, null=True, blank=True)
    # Total number of available resources on the device under this topic - if this is not a topic
    # then it is 1
    on_device_resources = models.IntegerField(default=0, null=True, blank=True)

    # Use this to annotate ancestor information directly onto the ContentNode, as it can be a
    # costly lookup
    # Don't use strict loading as the titles used to construct the ancestors can contain
    # control characters, which will fail strict loading.
    ancestors = JSONField(
        default=[], null=True, blank=True, load_kwargs={"strict": False}
    )

    objects = ContentNodeManager()


for field_name in bitmask_fieldnames:
    field = models.BigIntegerField(default=0, null=True, blank=True)
    field.contribute_to_class(ContentNode, field_name)


class File(base_models.File):
    lang = models.ForeignKey(Language, blank=True, null=True, on_delete=models.SET_NULL)


class LocalFile(base_models.LocalFile):
    pass


class AssessmentMetaData(base_models.AssessmentMetaData):
    pass


class ChannelMetadata(base_models.ChannelMetadata):
    # precalculated fields during annotation/migration
    published_size = models.BigIntegerField(default=0, null=True, blank=True)
    total_resource_count = models.IntegerField(default=0, null=True, blank=True)
    included_languages = models.ManyToManyField(
        Language, related_name="public_channels", verbose_name="languages", blank=True
    )
    order = models.PositiveIntegerField(default=0, null=True, blank=True)
    public = models.BooleanField()
    categories = models.JSONField(null=True, blank=True)
    countries = models.ManyToManyField(Country, related_name="public_channels")


class MPTTTreeIDManager(models.Model):
    """
    This is added as insurance against concurrency issues. It seems far less likely than for our
    regular channel tree_ids, but is here as a safety.

    Because MPTT uses plain integers for tree IDs and does not use an auto-incrementing field for them,
    the same ID can sometimes be assigned to two trees if two channel create ops happen concurrently.

    As we are using this table only for the ID generation, it does not need any fields.

    We resolve this by creating a dummy table and using its ID as the tree index to take advantage of the db's
    concurrency-friendly way of generating sequential integer IDs. There is a custom migration that ensures
    that the number of records (and thus id) matches the max tree ID number when this table gets added.
    """
