import logging
import os
import uuid
import hashlib
import functools
import json

from django.conf import settings
from django.contrib import admin
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, connections, models, connection
from django.db.models import Q, Sum, Max, Count, Case, When, IntegerField
from django.db.utils import ConnectionDoesNotExist
from mptt.models import MPTTModel, TreeForeignKey, TreeManager
from django.utils.translation import ugettext as _
from django.dispatch import receiver
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.authtoken.models import Token
from le_utils.constants import content_kinds,file_formats, format_presets, licenses, exercises

class UserManager(BaseUserManager):
    def create_user(self, email, first_name, last_name, password=None):
        if not email:
            raise ValueError('Email address not specified')

        new_user = self.model(
            email=self.normalize_email(email),
        )

        new_user.set_password(password)
        new_user.first_name = first_name
        new_user.last_name = last_name
        new_user.save(using=self._db)
        return new_user

    def create_superuser(self, email, first_name, last_name, password=None):
        new_user = self.create_user(email, first_name, last_name, password=password)
        new_user.is_admin = True
        new_user.save(using=self._db)
        return new_user

class User(AbstractBaseUser):
    email = models.EmailField(max_length=100, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    clipboard_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='user_clipboard')

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __unicode__(self):
        return self.email

    def email_user(self, subject, message, from_email=None, **kwargs):
        # msg = EmailMultiAlternatives(subject, message, from_email, [self.email])
        # msg.attach_alternative(kwargs["html_message"],"text/html")
        # msg.send()
        send_mail(subject, message, from_email, [self.email], **kwargs)

    def clean(self):
        super(User, self).clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    def get_full_name(self):
        """
        Returns the first_name plus the last_name, with a space in between.
        """
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        "Returns the short name for the user."
        return self.first_name

    def save(self, *args, **kwargs):
        super(User, self).save(*args, **kwargs)
        if not self.clipboard_tree:
            self.clipboard_tree = ContentNode.objects.create(title=self.email + " clipboard", kind_id="topic", sort_order=0)
            self.clipboard_tree.save()
            self.save()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

class UUIDField(models.CharField):

    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 32
        super(UUIDField, self).__init__(*args, **kwargs)

    def get_default(self):
        result = super(UUIDField, self).get_default()
        if isinstance(result, uuid.UUID):
            result = result.hex
        return result

def file_on_disk_name(instance, filename):
    """
    Create a name spaced file path from the File obejct's checksum property.
    This path will be used to store the content copy

    :param instance: File (content File model)
    :param filename: str
    :return: str
    """
    return generate_file_on_disk_name(instance.checksum, filename)

def generate_file_on_disk_name(checksum, filename):
    """ Separated from file_on_disk_name to allow for simple way to check if has already exists """
    h = checksum
    basename, ext = os.path.splitext(filename)
    directory = os.path.join(settings.STORAGE_ROOT, h[0], h[1])
    if not os.path.exists(directory):
        os.makedirs(directory)
    return os.path.join(directory, h + ext.lower())

def generate_storage_url(filename):
    """ Returns place where file is stored """
    h, ext = os.path.splitext(filename)
    return "{}/{}/{}/{}".format(settings.STORAGE_URL.rstrip('/'), h[0], h[1], h + ext.lower())

class FileOnDiskStorage(FileSystemStorage):
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
        return super(FileOnDiskStorage, self)._save(name, content)


class ChannelResourceSize(models.Model):
    tree_id = models.IntegerField()
    resource_size = models.IntegerField()

    pg_view_name = "contentcuration_channel_resource_sizes"
    file_table = "contentcuration_file"
    node_table = "contentcuration_contentnode"

    @classmethod
    def initialize_view(cls):
        sql = 'CREATE MATERIALIZED VIEW {view} AS '\
                'SELECT tree_id as id, tree_id, SUM("{file_table}"."file_size") AS '\
                '"resource_size" FROM "{node}" LEFT OUTER JOIN "{file_table}" ON '\
                '("{node}"."id" = "{file_table}"."contentnode_id") GROUP BY {node}.tree_id'\
                ' WITH DATA;'.format(view=cls.pg_view_name, file_table=cls.file_table, node=cls.node_table)
        with connection.cursor() as cursor:
            cursor.execute(sql)

    @classmethod
    def refresh_view(cls):
        sql = "REFRESH MATERIALIZED VIEW {}".format(cls.pg_view_name)
        with connection.cursor() as cursor:
            cursor.execute(sql)


    class Meta:
        managed = False
        db_table = "contentcuration_channel_resource_sizes"

class Channel(models.Model):
    """ Permissions come from association with organizations """
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True, null=True)
    editors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='editable_channels',
        verbose_name=_("editors"),
        help_text=_("Users with edit rights"),
        blank=True,
    )
    viewers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='view_only_channels',
        verbose_name=_("viewers"),
        help_text=_("Users with view only rights"),
        blank=True,
    )
    language =  models.ForeignKey('Language', null=True, blank=True, related_name='channel_language')
    trash_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_trash')
    clipboard_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_clipboard')
    main_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_main')
    staging_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_staging')
    previous_tree =  models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_previous')
    bookmarked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='bookmarked_channels',
        verbose_name=_("bookmarked by"),
    )
    deleted = models.BooleanField(default=False, db_index=True)
    public = models.BooleanField(default=False, db_index=True)

    # Fields specific to content generated by Ricecooker
    source_id = models.CharField(max_length=200, blank=True, null=True)
    source_domain = models.CharField(max_length=300, blank=True, null=True)
    ricecooker_version = models.CharField(max_length=100, blank=True, null=True)


    def get_resource_size(self):
        size = ChannelResourceSize.objects.filter(id=self.main_tree.tree_id).first()
        if size:
            return size.resource_size
        return 0

    def save(self, *args, **kwargs):
        original_node = None
        if self.pk and Channel.objects.filter(pk=self.pk).exists():
            original_node = Channel.objects.get(pk=self.pk)

        super(Channel, self).save(*args, **kwargs)

        # Check if original thumbnail is no longer referenced
        if original_node and original_node.thumbnail and 'static' not in original_node.thumbnail:
            filename, ext = os.path.splitext(original_node.thumbnail)
            delete_empty_file_reference(filename, ext[1:])

        if not self.main_tree:
            self.main_tree = ContentNode.objects.create(
                title=self.name,
                kind_id=content_kinds.TOPIC,
                sort_order=0,
                content_id=self.id,
                node_id=self.id,
            )
            self.main_tree.save()
            self.save()
        elif self.main_tree.title != self.name:
            self.main_tree.title = self.name
            self.main_tree.save()

        if not self.trash_tree:
            self.trash_tree = ContentNode.objects.create(
                title=self.name,
                kind_id=content_kinds.TOPIC,
                sort_order=0,
                content_id=self.id,
                node_id=self.id,
            )
            self.trash_tree.save()
            self.save()
        elif self.trash_tree.title != self.name:
            self.trash_tree.title = self.name
            self.trash_tree.save()

    class Meta:
        verbose_name = _("Channel")
        verbose_name_plural = _("Channels")

class ContentTag(models.Model):
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    tag_name = models.CharField(max_length=30)
    channel = models.ForeignKey('Channel', related_name='tags', blank=True, null=True, db_index=True)

    def __str__(self):
        return self.tag_name

    class Meta:
        unique_together = ['tag_name', 'channel']

def delegate_manager(method):
    """
    Delegate method calls to base manager, if exists.
    """
    @functools.wraps(method)
    def wrapped(self, *args, **kwargs):
        if self._base_manager:
            return getattr(self._base_manager, method.__name__)(*args, **kwargs)
        return method(self, *args, **kwargs)
    return wrapped

class License(models.Model):
    """
    Normalize the license of ContentNode model
    """
    license_name = models.CharField(max_length=50)
    license_url = models.URLField(blank=True)
    license_description = models.TextField(blank=True)
    exists = models.BooleanField(
        default=False,
        verbose_name=_("license exists"),
        help_text=_("Tells whether or not a content item is licensed to share"),
    )

    def __str__(self):
        return self.license_name

class ContentNode(MPTTModel, models.Model):
    """
    By default, all nodes have a title and can be used as a topic.
    """
    # The id should be the same between the content curation server and Kolibri.
    id = UUIDField(primary_key=True, default=uuid.uuid4)

    # the content_id is used for tracking a user's interaction with a piece of
    # content, in the face of possibly many copies of that content. When a user
    # interacts with a piece of content, all substantially similar pieces of
    # content should be marked as such as well. We track these "substantially
    # similar" types of content by having them have the same content_id.
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    node_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)

    # TODO: disallow nulls once existing models have been set
    original_channel_id = UUIDField(primary_key=False, editable=False, null=True, db_index=True) # Original channel copied from
    source_channel_id = UUIDField(primary_key=False, editable=False, null=True) # Immediate channel copied from
    original_source_node_id = UUIDField(primary_key=False, editable=False, null=True) # Original node_id of node copied from (TODO: original_node_id clashes with original_node field - temporary)
    source_node_id = UUIDField(primary_key=False, editable=False, null=True) # Immediate node_id of node copied from

    # Fields specific to content generated by Ricecooker
    source_id = models.CharField(max_length=200, blank=True, null=True)
    source_domain = models.CharField(max_length=300, blank=True, null=True)

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    kind = models.ForeignKey('ContentKind', related_name='contentnodes', db_index=True)
    license = models.ForeignKey('License', null=True, default=settings.DEFAULT_LICENSE)
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of', through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship', symmetrical=False, blank=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
    sort_order = models.FloatField(max_length=50, default=1, verbose_name=_("sort order"), help_text=_("Ascending, lowest number shown first"))
    copyright_holder = models.CharField(max_length=200, blank=True, default="", help_text=_("Organization of person who holds the essential rights"))
    cloned_source = TreeForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='clones')
    original_node = TreeForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='duplicates')

    created = models.DateTimeField(auto_now_add=True, verbose_name=_("created"))
    modified = models.DateTimeField(auto_now=True, verbose_name=_("modified"))
    published = models.BooleanField(default=False)

    changed = models.BooleanField(default=True, db_index=True)
    extra_fields = models.TextField(blank=True, null=True)
    author = models.CharField(max_length=200, blank=True, default="", help_text=_("Person who created content"), null=True)

    objects = TreeManager()

    def get_original_node(self):
        if self.original_channel_id and self.original_source_node_id:
            original_channel = Channel.objects.get(pk=self.original_channel_id)
            return original_channel.main_tree.get_descendants().filter(node_id=self.original_source_node_id).first()

        # TEMPORARY: until all nodes have proper sources set (e.g. source_node_id)
        return self.original_node


    def get_channel(self):
        root = self.get_root()
        channel = root.channel_main or root.channel_trash or root.channel_language or root.channel_previous
        if channel:
            return channel.first()
        return channel

    def save(self, *args, **kwargs):
        # Detect if node has been moved to another tree
        if self.pk is not None and ContentNode.objects.filter(pk=self.pk).exists():
            original = ContentNode.objects.get(pk=self.pk)
            if original.parent and original.parent_id != self.parent_id and not original.parent.changed:
                original.parent.changed = True
                original.parent.save()

        super(ContentNode, self).save(*args, **kwargs)
        post_save_changes = False
        if self.original_node is None:
            self.original_node = self
            post_save_changes = True
        if self.cloned_source is None:
            self.cloned_source = self
            post_save_changes = True

        if self.original_channel_id is None and self.get_channel():
            self.original_channel_id = self.get_channel().id
            post_save_changes = True
        if self.source_channel_id is None and self.get_channel():
            self.source_channel_id = self.get_channel().id
            post_save_changes = True

        if self.original_source_node_id is None:
            self.original_source_node_id = self.node_id
            post_save_changes = True
        if self.source_node_id is None:
            self.source_node_id = self.node_id
            post_save_changes = True

        if post_save_changes:
            self.save()

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
    extension = models.CharField(primary_key=True, max_length=40, choices=file_formats.choices)
    mimetype = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.extension

class FormatPreset(models.Model):
    id = models.CharField(primary_key=True, max_length=150, choices=format_presets.choices)
    readable_name = models.CharField(max_length=400)
    multi_language = models.BooleanField(default=False)
    supplementary = models.BooleanField(default=False)
    thumbnail = models.BooleanField(default=False)
    subtitle = models.BooleanField(default=False)
    display = models.BooleanField(default=True) # Render on client side
    order = models.IntegerField(default=0)
    kind = models.ForeignKey(ContentKind, related_name='format_presets', null=True)
    allowed_formats = models.ManyToManyField(FileFormat, blank=True)

    def __str__(self):
        return self.id

class Language(models.Model):
    id = models.CharField(max_length=7, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=3, db_index=True, blank=True, null=True)
    readable_name = models.CharField(max_length=100, blank=True)
    native_name = models.CharField(max_length=100, blank=True)

    def ietf_name(self):
        return "{code}-{subcode}".format(code=self.lang_code, subcode=self.lang_subcode) if self.lang_subcode else self.lang_code

    def __str__(self):
        return self.ietf_name()

class AssessmentItem(models.Model):
    type = models.CharField(max_length=50, default="multiplechoice")
    question = models.TextField(blank=True)
    hints = models.TextField(default="[]")
    answers = models.TextField(default="[]")
    order = models.IntegerField(default=1)
    contentnode = models.ForeignKey('ContentNode', related_name="assessment_items", blank=True, null=True, db_index=True)
    assessment_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    raw_data = models.TextField(blank=True)
    source_url = models.CharField(max_length=400, blank=True, null=True)
    randomize = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)

class File(models.Model):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    checksum = models.CharField(max_length=400, blank=True, db_index=True)
    file_size = models.IntegerField(blank=True, null=True)
    file_on_disk = models.FileField(upload_to=file_on_disk_name, storage=FileOnDiskStorage(), max_length=500, blank=True)
    contentnode = models.ForeignKey(ContentNode, related_name='files', blank=True, null=True, db_index=True)
    assessment_item = models.ForeignKey(AssessmentItem, related_name='files', blank=True, null=True, db_index=True)
    file_format = models.ForeignKey(FileFormat, related_name='files', blank=True, null=True, db_index=True)
    preset = models.ForeignKey(FormatPreset, related_name='files', blank=True, null=True, db_index=True)
    language = models.ForeignKey(Language, related_name='files', blank=True, null=True)
    original_filename = models.CharField(max_length=255, blank=True)
    source_url = models.CharField(max_length=400, blank=True, null=True)

    class Admin:
        pass

    def __str__(self):
        return '{checksum}{extension}'.format(checksum=self.checksum, extension='.' + self.file_format.extension)

    def save(self, *args, **kwargs):
        """
        Overrider the default save method.
        If the file_on_disk FileField gets passed a content copy:
            1. generate the MD5 from the content copy
            2. fill the other fields accordingly
        """
        if self.file_on_disk:  # if file_on_disk is supplied, hash out the file
            if self.checksum is None or self.checksum == "":
                md5 = hashlib.md5()
                for chunk in self.file_on_disk.chunks():
                    md5.update(chunk)

                self.checksum = md5.hexdigest()
                self.file_size = self.file_on_disk.size
                self.extension = os.path.splitext(self.file_on_disk.name)[1]
        super(File, self).save(*args, **kwargs)

@receiver(models.signals.post_delete, sender=File)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem if no other File objects are referencing the same file on disk
    when corresponding `File` object is deleted.
    Be careful! we don't know if this will work when perform bash delete on File obejcts.
    """
    delete_empty_file_reference(instance.checksum, instance.file_format.extension)

def delete_empty_file_reference(checksum, extension):
    filename = checksum + '.' + extension
    if not File.objects.filter(checksum=checksum).exists() and not Channel.objects.filter(thumbnail=filename).exists():
        file_on_disk_path = generate_file_on_disk_name(checksum, filename)
        if os.path.isfile(file_on_disk_path):
            os.remove(file_on_disk_path)

class PrerequisiteContentRelationship(models.Model):
    """
    Predefine the prerequisite relationship between two ContentNode objects.
    """
    target_node = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_target_node')
    prerequisite = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_prerequisite')

    class Meta:
        unique_together = ['target_node', 'prerequisite']

    def clean(self, *args, **kwargs):
        # self reference exception
        if self.target_node == self.prerequisite:
            raise IntegrityError('Cannot self reference as prerequisite.')
        # immediate cyclic exception
        elif PrerequisiteContentRelationship.objects.using(self._state.db)\
                .filter(target_node=self.prerequisite, prerequisite=self.target_node):
            raise IntegrityError(
                'Note: Prerequisite relationship is directional! %s and %s cannot be prerequisite of each other!'
                % (self.target_node, self.prerequisite))
        # distant cyclic exception
        # elif <this is a nice to have exception, may implement in the future when the priority raises.>
        #     raise Exception('Note: Prerequisite relationship is acyclic! %s and %s forms a closed loop!' % (self.target_node, self.prerequisite))
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
    contentnode = models.ForeignKey('ContentNode', related_name="exercise", null=True)
    mastery_model = models.CharField(max_length=200, default=exercises.DO_ALL, choices=exercises.MASTERY_MODELS)

class Invitation(models.Model):
    """ Invitation to edit channel """
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    invited = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='sent_to')
    share_mode = models.CharField(max_length=50, default='edit')
    email = models.EmailField(max_length=100, null=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='sent_by', null=True)
    channel = models.ForeignKey('Channel', on_delete=models.SET_NULL, null=True, related_name='pending_editors')
    first_name = models.CharField(max_length=100, default='Guest')
    last_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name = _("Invitation")
        verbose_name_plural = _("Invitations")
