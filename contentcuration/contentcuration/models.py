import logging
import os
from uuid import uuid4
import hashlib

from django.conf import settings
from django.contrib import admin
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, connections, models
from django.db.utils import ConnectionDoesNotExist
from mptt.models import MPTTModel, TreeForeignKey
from django.utils.translation import ugettext as _

from constants import content_kinds, extensions, presets

class Channel(models.Model):
    """ Permissions come from association with organizations """
    channel_id = models.UUIDField(primary_key=True, default=uuid4)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    author = models.CharField(max_length=400, blank=True)
    version = models.CharField(max_length=15, default='v0.01')
    editors = models.ManyToManyField(
        'auth.User',
        related_name='editable_channels',
        verbose_name=_("editors"),
        help_text=_("Users with edit rights"),
    )

    published = models.ForeignKey('TopicTree', null=True, blank=True, related_name='published')
    deleted =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='deleted')
    clipboard =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='clipboard')
    draft =  models.ForeignKey('TopicTree', null=True, blank=True, related_name='draft')
    bookmarked_by = models.ManyToManyField(
        'auth.User',
        related_name='bookmarked_channels',
        verbose_name=_("bookmarded by"),
    )

    def save(self, *args, **kwargs):
        super(Channel, self).save(*args, **kwargs)
        if not self.draft:
            self.draft = TopicTree.objects.create(channel=self, name=self.name + " draft")
            self.draft.save()
            self.clipboard = TopicTree.objects.create(channel=self, name=self.name + " clipboard")
            self.clipboard.save()
            self.deleted = TopicTree.objects.create(channel=self, name=self.name + " deleted")
            self.deleted.save()
            self.save()

    """
    def delete(self):
        logging.warning("Channel Delete")
        self.draft.delete()
        self.clipboard.delete()
        self.deleted.delete()
        super(Channel, self).delete()
    """
    class Meta:
        verbose_name = _("Channel")
        verbose_name_plural = _("Channels")

def content_copy_name(instance, filename):
    """
    Create a name spaced file path from the File obejct's checksum property.
    This path will be used to store the content copy

    :param instance: File (content File model)
    :param filename: str
    :return: str
    """
    h = instance.checksum
    basename, ext = os.path.splitext(filename)
    return os.path.join(h[0:1], h[1:2], h + ext.lower())

class ContentCopyStorage(FileSystemStorage):
    """
    Overrider FileSystemStorage's default save method to ignore duplicated file.
    """
    def get_available_name(self, name):
        return name

    def _save(self, name, content):
        if self.exists(name):
            # if the file exists, do not call the superclasses _save method
            logging.warn('Content copy "%s" already exists!' % name)
            return name
        return super(ContentCopyStorage, self)._save(name, content)

class ContentCopyTracking(models.Model):
    """
    Record how many times a content copy are referenced by File objects.
    If it reaches 0, it's supposed to be deleted.
    """
    referenced_count = models.IntegerField(blank=True, null=True)
    content_copy_id = models.CharField(max_length=400, unique=True)

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
        'ContentNode',
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
            self.root_node = ContentNode.objects.create(title=self.channel.name, kind=ContentKind.objects.get(kind = content_kinds.TOPIC), total_file_size = 0, license=License.objects.first())
            self.root_node.save()
            self.save()

    class Meta:
        verbose_name = _("Topic tree")
        verbose_name_plural = _("Topic trees")

class ContentTag(models.Model):
    tag_name = models.CharField(primary_key=True, max_length=30, unique=True)
    tag_type = models.CharField(max_length=30, blank=True)
    """
    def delete(self):
        # No other nodes except for node about to be deleted use tag
        if len(Node.objects.filter(tags__tag_name__contains = self.tag_name)) <= 1:
            super(ContentTag, self).delete()
    """

    def __str__(self):
        return self.tag_name

class ContentNode(MPTTModel, models.Model):
    """
    By default, all nodes have a title and can be used as a topic.
    """
    content_id = models.UUIDField(primary_key=False, default=uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    kind = models.ForeignKey('ContentKind', related_name='content_metadatas', blank=True, null=True)
    slug = models.CharField(max_length=100)
    total_file_size = models.IntegerField()
    license = models.ForeignKey('License')
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of', through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship', symmetrical=False, blank=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
    sort_order = models.FloatField(max_length=50, default=0, verbose_name=_("sort order"), help_text=_("Ascending, lowest number shown first"))
    license_owner = models.CharField(max_length=200, blank=True, help_text=_("Organization of person who holds the essential rights"))

    created = models.DateTimeField(auto_now_add=True, verbose_name=_("created"))
    modified = models.DateTimeField(auto_now=True, verbose_name=_("modified"))

    published = models.BooleanField(
        default=False,
        verbose_name=_("Published"),
        help_text=_("If published, students can access this item"),
    )

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
            #for format in Format.objects.filter(contentnode = self.pk):
            #    format.delete()
            n.delete()
        super(Node, self).delete()
    """
    def delete(self):
        for t in self.tags.all():
            t.delete()
        super(ContentNode, self).delete()

    class MPTTMeta:
        order_insertion_by = ['sort_order']

    class Meta:
        verbose_name = _("Topic")
        verbose_name_plural = _("Topics")
        # Do not allow two nodes with the same name on the same level
        #unique_together = ('parent', 'title')


class ContentKind(models.Model):
    kind = models.CharField(primary_key=True, max_length=200, choices=content_kinds.choices)

    def __str__(self):
        return self.kind

class FileFormat(models.Model):
    extension = models.CharField(primary_key=True, max_length=40, choices=extensions.choices)
    mimetype = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.extension

class FormatPreset(models.Model):
    id = models.CharField(primary_key=True, max_length=150, choices=presets.choices)
    readable_name = models.CharField(max_length=400)
    multi_language = models.BooleanField(default=False)
    supplementary = models.BooleanField(default=False)
    order = models.IntegerField()
    kind = models.ForeignKey(ContentKind, related_name='format_presets')
    allowed_formats = models.ManyToManyField(FileFormat, blank=True)

    def __str__(self):
        return self.id

class Language(models.Model):
    lang_code = models.CharField(primary_key=True, max_length=400)
    lang_name = models.CharField(max_length=400)

    def __str__(self):
        return self.lang_name

class File(models.Model):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    checksum = models.CharField(max_length=400, blank=True)
    file_size = models.IntegerField(blank=True, null=True)
    content_copy = models.FileField(upload_to=content_copy_name, storage=ContentCopyStorage(), max_length=500, blank=True)
    contentnode = models.ForeignKey(ContentNode, related_name='files', blank=True, null=True)
    file_format = models.ForeignKey(FileFormat, related_name='files', blank=True, null=True)
    preset = models.ForeignKey(FormatPreset, related_name='files', blank=True, null=True)
    lang = models.ForeignKey(Language, blank=True, null=True)
    original_filename = models.CharField(max_length=255, blank=True)

    class Admin:
        pass

    def __str__(self):
        return '{checksum}{extension}'.format(checksum=self.checksum, extension='.' + self.file_format.extension)

    def save(self, *args, **kwargs):
        """
        Overrider the default save method.
        If the content_copy FileField gets passed a content copy:
            1. generate the MD5 from the content copy
            2. fill the other fields accordingly
            3. update tracking for this content copy
        If None is passed to the content_copy FileField:
            1. delete the content copy.
            2. update tracking for this content copy
        """
        if self.content_copy:  # if content_copy is supplied, hash out the file
            md5 = hashlib.md5()
            for chunk in self.content_copy.chunks():
                md5.update(chunk)

            self.checksum = md5.hexdigest()
            self.file_size = self.content_copy.size
            self.extension = os.path.splitext(self.content_copy.name)[1]
            # update ContentCopyTracking
            try:
                content_copy_track = ContentCopyTracking.objects.get(content_copy_id=self.checksum)
                content_copy_track.referenced_count += 1
                content_copy_track.save()
            except ContentCopyTracking.DoesNotExist:
                ContentCopyTracking.objects.create(referenced_count=1, content_copy_id=self.checksum)
        else:
            # update ContentCopyTracking, if referenced_count reach 0, delete the content copy on disk
            try:
                content_copy_track = ContentCopyTracking.objects.get(content_copy_id=self.checksum)
                content_copy_track.referenced_count -= 1
                content_copy_track.save()
                if content_copy_track.referenced_count == 0:
                    content_copy_path = os.path.join(settings.CONTENT_COPY_DIR, self.checksum[0:1], self.checksum[1:2], self.checksum + self.extension)
                    if os.path.isfile(content_copy_path):
                        os.remove(content_copy_path)
            except ContentCopyTracking.DoesNotExist:
                pass
            self.checksum = None
            self.file_size = None
            self.extension = None
        super(File, self).save(*args, **kwargs)

class License(models.Model):
    """
    Normalize the license of ContentNode model
    """
    license_name = models.CharField(max_length=50)
    exists = models.BooleanField(
        default=False,
        verbose_name=_("license exists"),
        help_text=_("Tells whether or not a content item is licensed to share"),
    )

    def __str__(self):
        return self.license_name

class PrerequisiteContentRelationship(models.Model):
    """
    Predefine the prerequisite relationship between two ContentNode objects.
    """
    contentnode_1 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_1')
    contentnode_2 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_2')

    class Meta:
        unique_together = ['contentnode_1', 'contentnode_2']

    def clean(self, *args, **kwargs):
        # self reference exception
        if self.contentnode_1 == self.contentnode_2:
            raise IntegrityError('Cannot self reference as prerequisite.')
        # immediate cyclic exception
        elif PrerequisiteContentRelationship.objects.using(self._state.db)\
                .filter(contentnode_1=self.contentnode_2, contentnode_2=self.contentnode_1):
            raise IntegrityError(
                'Note: Prerequisite relationship is directional! %s and %s cannot be prerequisite of each other!'
                % (self.contentnode_1, self.contentnode_2))
        # distant cyclic exception
        # elif <this is a nice to have exception, may implement in the future when the priority raises.>
        #     raise Exception('Note: Prerequisite relationship is acyclic! %s and %s forms a closed loop!' % (self.contentnode_1, self.contentnode_2))
        super(PrerequisiteContentRelationship, self).clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super(PrerequisiteContentRelationship, self).save(*args, **kwargs)


class RelatedContentRelationship(models.Model):
    """
    Predefine the related relationship between two ContentNode objects.
    """
    contentnode_1 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_1')
    contentnode_2 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_2')

    class Meta:
        unique_together = ['contentnode_1', 'contentnode_2']

    def save(self, *args, **kwargs):
        # self reference exception
        if self.contentnode_1 == self.contentnode_2:
            raise IntegrityError('Cannot self reference as related.')
        # handle immediate cyclic
        elif RelatedContentRelationship.objects.using(self._state.db)\
                .filter(contentnode_1=self.contentnode_2, contentnode_2=self.contentnode_1):
            return  # silently cancel the save
        super(RelatedContentRelationship, self).save(*args, **kwargs)

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
