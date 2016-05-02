import logging
import os
from uuid import uuid4

from django.conf import settings
from django.contrib import admin
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, connections, models
from django.db.utils import ConnectionDoesNotExist
from mptt.models import MPTTModel, TreeForeignKey
from django.utils.translation import ugettext as _
from kolibri.content.models import ChannelMetadata, AbstractContent, ContentMetadata, License, File, Format, MimeType
from kolibri.content.api import *

class Channel(ChannelMetadata):
    """ Permissions come from association with organizations """
    editors = models.ManyToManyField(
        'auth.User',
        verbose_name=_("editors"),
        help_text=_("Users with edit rights"),
    )

    published = models.ForeignKey('TopicTree', null=True, blank=True, related_name='published')
    deleted =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='deleted')
    clipboard =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='clipboard')
    draft =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='draft')

    def save(self, *args, **kwargs):
        isNew = not self.pk
        super(Channel, self).save(*args, **kwargs)
        if isNew:
            self.draft = TopicTree.objects.create(channel=self, name=self.name + " draft")
            self.draft.save()
            self.clipboard = TopicTree.objects.create(channel=self, name=self.name + " clipboard")
            self.clipboard.save()
            self.deleted = TopicTree.objects.create(channel=self, name=self.name + " deleted")
            self.deleted.save()
            self.save()

    def delete(self):
        logging.warning("Channel Delete")
        self.draft.delete()
        self.clipboard.delete()
        self.deleted.delete()
        super(Channel, self).delete()

    class Meta:
        verbose_name = _("Channel")
        verbose_name_plural = _("Channels")

class TopicTree(models.Model):
    """Base model for all channels"""

    name = models.CharField(
        max_length=255,
        verbose_name=_("topic tree name"),
        help_text=_("Displayed to the user"),
        default = "tree"
    )

    channel = models.ForeignKey(
        'Channel',
        verbose_name=_("channel"),
        null=True,
        help_text=_("For different versions of the tree in the same channel (trash, edit, workspace)"),
    )
    root_node = models.ForeignKey(
        'Node',
        verbose_name=_("root node"),
        null=True,
        help_text=_(
            "The starting point for the tree, the title of it is the "
            "title shown in the menu"
        ),
    )
    is_published = models.BooleanField(
        default=False,
        verbose_name=_("Published"),
        help_text=_("If published, students can access this channel"),
    )

    def save(self, *args, **kwargs):
        isNew = not self.pk
        super(TopicTree, self).save(*args, **kwargs)
        if isNew:
            self.root_node = Node.objects.create(title=self.channel.name, kind="topic", total_file_size = 0, license_id=ContentLicense.objects.first().id)
            self.root_node.save()
            self.save()

    """
    def delete(self):
        logging.warning(self)
        self.root_node.delete()
        super(TopicTree, self).delete()
    """

    class Meta:
        verbose_name = _("Topic tree")
        verbose_name_plural = _("Topic trees")

class ContentTag(AbstractContent):
    tag_name = models.CharField(primary_key=True, max_length=30, unique=True)
    tag_type = models.CharField(max_length=30, null=True, blank=True)

    def delete(self):
        # No other nodes except for node about to be deleted use tag
        if len(Node.objects.filter(tags__tag_name__contains = self.tag_name)) <= 1:
            super(ContentTag, self).delete()

    def __str__(self):
        return self.tag_name

class Node(ContentMetadata):
    """
    By default, all nodes have a title and can be used as a topic.
    """

    created = models.DateTimeField(auto_now_add=True, verbose_name=_("created"))
    modified = models.DateTimeField(auto_now=True, verbose_name=_("modified"))

    published = models.BooleanField(
        default=False,
        verbose_name=_("Published"),
        help_text=_("If published, students can access this item"),
    )

    sort_order = models.FloatField(
        max_length=50,
        default=0,
        verbose_name=_("sort order"),
        help_text=_("Ascending, lowest number shown first"),
    )

    license_owner = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Organization of person who holds the essential rights"),
    )
    original_filename = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)

    @property
    def has_draft(self):
        return self.draft_set.all().exists()

    @property
    def get_draft(self):
        """
        NB! By contract, only one draft should always exist per node, this is
        enforced by the OneToOneField relation.
        :raises: Draft.DoesNotExist and Draft.MultipleObjectsReturned
        """
        return Draft.objects.get(publish_in=self)
    """
    # If deleting all children
    def delete(self):
        logging.warning(self)
        for n in self.get_children():
            #for format in Format.objects.filter(contentmetadata = self.pk):
            #    format.delete()
            n.delete()
        super(Node, self).delete()
    """
    def delete(self):
        for t in self.tags.all():
            t.delete()
        super(Node, self).delete()

    class MPTTMeta:
        order_insertion_by = ['sort_order']

    class Meta:
        verbose_name = _("Topic")
        verbose_name_plural = _("Topics")
        # Do not allow two nodes with the same name on the same level
        #unique_together = ('parent', 'title')

class ContentLicense(License):
    exists = models.BooleanField(
        default=False,
        verbose_name=_("license exists"),
        help_text=_("Tells whether or not a content item is licensed to share"),
    )

class Exercise(models.Model):

    title = models.CharField(
        max_length=50,
        verbose_name=_("title"),
        default=_("Title"),
        help_text=_("Title of the content item"),
    )

    description = models.TextField(
        max_length=200,
        verbose_name=_("description"),
        default=_("Description"),
        help_text=_("Brief description of what this content item is"),
    )

class AssessmentItem(models.Model):

    type = models.CharField(max_length=50, default="multiplechoice")
    question = models.TextField(blank=True)
    answers = models.TextField(default="[]")
    exercise = models.ForeignKey('Exercise', related_name="all_assessment_items")
