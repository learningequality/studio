import ast
import collections
import functools
import hashlib
import json
import logging
import os
import socket
import sys
import urlparse
import uuid

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.cache import cache
from django.core.exceptions import (MultipleObjectsReturned,
                                    ObjectDoesNotExist, PermissionDenied)
from django.core.files.storage import FileSystemStorage, default_storage
from django.core.mail import send_mail
from django.db import IntegrityError, connection, models
from django.db.models import Q, Sum, Max
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import ugettext as _
from django.contrib.postgres.fields import JSONField
from le_utils.constants import (content_kinds, exercises, file_formats, licenses,
                                format_presets, languages, roles)
from mptt.models import (MPTTModel, TreeForeignKey, TreeManager,
                         raise_if_unsaved)

from pg_utils import DistinctSum

from contentcuration.statistics import record_channel_stats
from contentcuration.utils.networking import get_local_ip_address

EDIT_ACCESS = "edit"
VIEW_ACCESS = "view"

DEFAULT_CONTENT_DEFAULTS = {
    'license': None,
    'language': None,
    'author': None,
    'aggregator': None,
    'provider': None,
    'copyright_holder': None,
    'license_description': None,
    'mastery_model': exercises.NUM_CORRECT_IN_A_ROW_5,
    'm_value': 5,
    'n_value': 5,
    'auto_derive_video_thumbnail': True,
    'auto_derive_audio_thumbnail': True,
    'auto_derive_document_thumbnail': True,
    'auto_derive_html5_thumbnail': True,
    'auto_derive_exercise_thumbnail': True,
    'auto_randomize_questions': True,
}
DEFAULT_USER_PREFERENCES = json.dumps(DEFAULT_CONTENT_DEFAULTS, ensure_ascii=False)


# Added 7-31-2018. We can remove this once we are certain we have eliminated all cases
# where root nodes are getting prepended rather than appended to the tree list.
def _create_tree_space(self, target_tree_id, num_trees=1):
    """
    Creates space for a new tree by incrementing all tree ids
    greater than ``target_tree_id``.
    """

    if target_tree_id == -1:
        raise Exception("ERROR: Calling _create_tree_space with -1! Something is attempting to sort all MPTT trees root nodes!")

    self._orig_create_tree_space(target_tree_id, num_trees)

TreeManager._orig_create_tree_space = TreeManager._create_tree_space
TreeManager._create_tree_space = _create_tree_space


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


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=100, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(_('active'), default=False,
                                    help_text=_('Designates whether this user should be treated as active.'))
    is_staff = models.BooleanField(_('staff status'), default=False,
                                   help_text=_('Designates whether the user can log into this admin site.'))
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    clipboard_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='user_clipboard')
    preferences = models.TextField(default=DEFAULT_USER_PREFERENCES)
    disk_space = models.FloatField(default=524288000, help_text=_('How many bytes a user can upload'))

    information = JSONField(null=True)
    content_defaults = JSONField(default=dict)
    policies = JSONField(default=dict, null=True)

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __unicode__(self):
        return self.email

    def can_edit(self, channel_id):
        channel = Channel.objects.filter(pk=channel_id).first()
        if not self.is_admin and channel and not channel.editors.filter(pk=self.pk).exists():
            raise PermissionDenied("Cannot edit content")
        return True

    def can_view(self, channel_id):
        channel = Channel.objects.filter(pk=channel_id).first()
        if not self.is_admin and channel and not channel.editors.filter(pk=self.pk).exists() and not channel.viewers.filter(pk=self.pk).exists():
            raise PermissionDenied("Cannot view content")
        return True

    def check_space(self, size, checksum):
        active_files = self.get_user_active_files()
        if checksum in active_files.values_list('checksum', flat=True):
            return True

        space = self.get_available_space(active_files=active_files)
        if space < size:
            raise PermissionDenied(_("Not enough space. Check your storage under Settings page."))

    def check_channel_space(self, channel):
        active_files = self.get_user_active_files()
        active_size = float(active_files.aggregate(used=Sum('file_size'))['used'] or 0)

        staging_tree_id = channel.staging_tree.tree_id
        channel_files = self.files.select_related('contentnode')\
                            .filter(contentnode__tree_id=staging_tree_id)\
                            .values('checksum', 'file_size')\
                            .distinct()\
                            .exclude(checksum__in=active_files.values_list('checksum', flat=True))
        staged_size = float(channel_files.aggregate(used=Sum('file_size'))['used'] or 0)

        if self.get_available_space(active_files=active_files) < (active_size + staged_size):
            raise PermissionDenied(_('Out of storage! Request more at %(email)s') % {'email': settings.SPACE_REQUEST_EMAIL})


    def check_staged_space(self, size, checksum):
        if checksum in self.staged_files.values_list('checksum', flat=True):
            return True
        space = self.get_available_staged_space()
        if space < size:
            raise PermissionDenied(_('Out of storage! Request more at %(email)s') % {'email': settings.SPACE_REQUEST_EMAIL})

    def get_available_staged_space(self):
        space_used = self.staged_files.aggregate(size=Sum("file_size"))['size'] or 0
        return float(max(self.disk_space - space_used, 0))

    def get_available_space(self, active_files=None):
        return float(max(self.disk_space - self.get_space_used(active_files=active_files), 0))

    def get_user_active_trees(self):
        return self.editable_channels.exclude(deleted=True)\
                .values_list('main_tree__tree_id', flat=True)

    def get_user_active_files(self):
        active_trees = self.get_user_active_trees()
        return self.files.select_related('contentnode')\
                            .filter(Q(contentnode__tree_id__in=active_trees))\
                            .values('checksum', 'file_size')\
                            .distinct()

    def get_space_used(self, active_files=None):
        active_files = active_files or self.get_user_active_files()
        files = active_files.aggregate(total_used=Sum('file_size'))
        return float(files['total_used'] or 0)

    def get_space_used_by_kind(self):
        active_files = self.get_user_active_files()
        files = active_files.values('preset__kind_id')\
                            .annotate(space=DistinctSum('file_size'))\
                            .order_by()

        kind_dict = {}
        for item in files:
            kind_dict[item['preset__kind_id']] = item['space']
        return kind_dict

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
        changed = False

        if not self.content_defaults:
            self.content_defaults = DEFAULT_CONTENT_DEFAULTS
            changed = True

        if not self.clipboard_tree:
            self.clipboard_tree = ContentNode.objects.create(title=self.email + " clipboard", kind_id="topic",
                                                             sort_order=get_next_sort_order())
            self.clipboard_tree.save()
            changed = True

        if changed:
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


def object_storage_name(instance, filename):
    """
    Create a name spaced file path from the File obejct's checksum property.
    This path will be used to store the content copy

    :param instance: File (content File model)
    :param filename: str
    :return: str
    """
    return generate_object_storage_name(instance.checksum, filename)


def generate_object_storage_name(checksum, filename):
    """ Separated from file_on_disk_name to allow for simple way to check if has already exists """
    h = checksum
    basename, ext = os.path.splitext(filename)
    # Use / instead of os.path.join as Windows makes this \\
    directory = "/".join([settings.STORAGE_ROOT, h[0], h[1]])
    return os.path.join(directory, h + ext.lower())


def generate_storage_url(filename, request=None, *args):
    """
    Generate a storage URL for the given content filename.
    """

    path = generate_object_storage_name(os.path.splitext(filename)[0], filename)

    # There are three scenarios where Studio might be run as:
    #
    # 1. In normal kubernetes, nginx will proxy for us. We'll know we're in kubernetes when the
    # environment variable RUN_MODE=k8s
    #
    # 2. In Docker Compose and bare metal runserver, we'll be running in runserver, and minio
    # will be exposed in port 9000 in the host's localhost network.

    # Note (aron): returning the true storage URL (e.g. https://storage.googleapis.com/storage/a.mp4)
    # isn't too important, because we have CDN in front of our servers, so it should be cached.
    # But change the logic here in case there is a potential for bandwidth and latency improvement.

    # Detect our current state first
    run_mode = os.getenv("RUN_MODE")

    # if we're running inside k8s, then just serve the normal /content/{storage,databases} URL,
    # and let nginx handle proper proxying.
    if run_mode == "k8s":
        url = "/content/{path}".format(
            bucket=settings.AWS_S3_BUCKET_NAME,
            path=path,
        )

    # if we're in docker-compose or in baremetal, just return the object storage URL as localhost:9000
    elif run_mode == "docker-compose" or run_mode is None:
        # generate the minio storage URL, so we can get the GET parameters that give everyone
        # access even if they don't need to log in
        params = urlparse.urlparse(default_storage.url(path)).query
        host = "localhost"
        port = 9000 # hardcoded to the default minio IP address
        url = "http://{host}:{port}/{bucket}/{path}?{params}".format(
            host=host,
            port=port,
            bucket=settings.AWS_S3_BUCKET_NAME,
            path=path,
            params=params,
        )

    return url


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
        sql = 'CREATE MATERIALIZED VIEW {view} AS ' \
              'SELECT tree_id as id, tree_id, SUM("{file_table}"."file_size") AS ' \
              '"resource_size" FROM "{node}" LEFT OUTER JOIN "{file_table}" ON ' \
              '("{node}"."id" = "{file_table}"."contentnode_id") GROUP BY {node}.tree_id' \
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


class SecretToken(models.Model):
    """Tokens for channels"""
    token = models.CharField(max_length=100, unique=True)
    is_primary = models.BooleanField(default=False)

    def __str__(self):
        return self.token


class Channel(models.Model):
    """ Permissions come from association with organizations """
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True, null=True)
    thumbnail_encoding = models.TextField(blank=True, null=True)
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
    language = models.ForeignKey('Language', null=True, blank=True, related_name='channel_language')
    trash_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_trash')
    clipboard_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_clipboard')
    main_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_main')
    staging_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_staging')
    chef_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_chef')
    previous_tree = models.ForeignKey('ContentNode', null=True, blank=True, related_name='channel_previous')
    bookmarked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='bookmarked_channels',
        verbose_name=_("bookmarked by"),
    )
    deleted = models.BooleanField(default=False, db_index=True)
    public = models.BooleanField(default=False, db_index=True)
    preferences = models.TextField(default=DEFAULT_USER_PREFERENCES)
    content_defaults = JSONField(default=dict)
    priority = models.IntegerField(default=0, help_text=_("Order to display public channels"))
    last_published = models.DateTimeField(blank=True, null=True)
    secret_tokens = models.ManyToManyField(
        SecretToken,
        related_name='channels',
        verbose_name=_("secret tokens"),
        blank=True,
    )

    # Fields specific to content generated by Ricecooker
    source_id = models.CharField(max_length=200, blank=True, null=True)
    source_domain = models.CharField(max_length=300, blank=True, null=True)
    ricecooker_version = models.CharField(max_length=100, blank=True, null=True)

    # Fields to calculate when channel is published
    icon_encoding = models.TextField(blank=True, null=True)
    total_resource_count = models.IntegerField(default=0)
    published_kind_count = models.TextField(blank=True, null=True)
    published_size = models.FloatField(default=0)
    included_languages = models.ManyToManyField(
        "Language",
        related_name='channels',
        verbose_name=_("languages"),
        blank=True,
    )

    def resource_size_key(self):
        return "{}_resource_size".format(self.pk)

    # Might be good to display resource size, but need to improve query time first

    def get_resource_size(self):
        cached_data = cache.get(self.resource_size_key())
        if cached_data:
            return cached_data
        tree_id = self.main_tree.tree_id
        files = File.objects.select_related('contentnode', 'assessment_item')\
            .filter(contentnode__tree_id=tree_id)\
            .values('checksum', 'file_size')\
            .distinct()\
            .aggregate(resource_size=Sum('file_size'))
        cache.set(self.resource_size_key(), files['resource_size'] or 0, None)
        return files['resource_size'] or 0


    def save(self, *args, **kwargs):

        original_channel = None
        if self.pk and Channel.objects.filter(pk=self.pk).exists():
            original_channel = Channel.objects.get(pk=self.pk)

        if not self.content_defaults:
            self.content_defaults = DEFAULT_CONTENT_DEFAULTS

        record_channel_stats(self, original_channel)

        # Check if original thumbnail is no longer referenced
        if original_channel and original_channel.thumbnail and 'static' not in original_channel.thumbnail:
            filename, ext = os.path.splitext(original_channel.thumbnail)
            delete_empty_file_reference(filename, ext[1:])

        if not self.main_tree:
            self.main_tree = ContentNode.objects.create(
                title=self.name,
                kind_id=content_kinds.TOPIC,
                sort_order=get_next_sort_order(),
                content_id=self.id,
                node_id=self.id,
            )
            self.main_tree.save()
        elif self.main_tree.title != self.name:
            self.main_tree.title = self.name
            self.main_tree.save()

        if not self.trash_tree:
            self.trash_tree = ContentNode.objects.create(
                title=self.name,
                kind_id=content_kinds.TOPIC,
                sort_order=get_next_sort_order(),
                content_id=self.id,
                node_id=self.id,
            )
            self.trash_tree.save()
        elif self.trash_tree.title != self.name:
            self.trash_tree.title = self.name
            self.trash_tree.save()

        super(Channel, self).save(*args, **kwargs)

        if original_channel and not self.main_tree.changed:
            fields_to_check = ['description', 'language_id', 'thumbnail', 'name', 'language', 'thumbnail_encoding', 'deleted']
            self.main_tree.changed = any([f for f in fields_to_check if getattr(self, f) != getattr(original_channel, f)])

            # Delete db if channel has been deleted and mark as unpublished
            if not original_channel.deleted and self.deleted:
                self.pending_editors.all().delete()
                channel_db_url = os.path.join(settings.DB_ROOT, self.id) + ".sqlite3"
                if os.path.isfile(channel_db_url):
                    os.unlink(channel_db_url)
                    self.main_tree.published = False
            self.main_tree.save()

    def get_thumbnail(self):
        if self.thumbnail_encoding:
            thumbnail_data = ast.literal_eval(self.thumbnail_encoding)
            if thumbnail_data.get("base64"):
                return thumbnail_data["base64"]

        if self.thumbnail and 'static' not in self.thumbnail:
            return generate_storage_url(self.thumbnail)

        return '/static/img/kolibri_placeholder.png'

    class Meta:
        verbose_name = _("Channel")
        verbose_name_plural = _("Channels")

        index_together = [
            ["deleted", "public"]
        ]


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
    copyright_holder_required = models.BooleanField(default=True)
    is_custom = models.BooleanField(default=False)
    exists = models.BooleanField(
        default=False,
        verbose_name=_("license exists"),
        help_text=_("Tells whether or not a content item is licensed to share"),
    )

    def __str__(self):
        return self.license_name

def get_next_sort_order(node=None):
    # Get the next sort order under parent (roots if None)
    # Based on Kevin's findings, we want to append node as prepending causes all other root sort_orders to get incremented
    max_order = ContentNode.objects.filter(parent=node).aggregate(max_order=Max('sort_order'))['max_order'] or 0
    return max_order + 1

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
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    node_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)

    # TODO: disallow nulls once existing models have been set
    original_channel_id = UUIDField(primary_key=False, editable=False, null=True,
                                    db_index=True)  # Original channel copied from
    source_channel_id = UUIDField(primary_key=False, editable=False, null=True)  # Immediate channel copied from
    original_source_node_id = UUIDField(primary_key=False, editable=False, null=True,
                                        db_index=True)  # Original node_id of node copied from (TODO: original_node_id clashes with original_node field - temporary)
    source_node_id = UUIDField(primary_key=False, editable=False, null=True)  # Immediate node_id of node copied from

    # Fields specific to content generated by Ricecooker
    source_id = models.CharField(max_length=200, blank=True, null=True)
    source_domain = models.CharField(max_length=300, blank=True, null=True)

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    kind = models.ForeignKey('ContentKind', related_name='contentnodes', db_index=True)
    license = models.ForeignKey('License', null=True, blank=True)
    license_description = models.CharField(max_length=400, null=True, blank=True)
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of',
                                          through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship',
                                        symmetrical=False, blank=True)
    language = models.ForeignKey('Language', null=True, blank=True, related_name='content_language')
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
    sort_order = models.FloatField(max_length=50, default=1, verbose_name=_("sort order"),
                                   help_text=_("Ascending, lowest number shown first"))
    copyright_holder = models.CharField(max_length=200, null=True, blank=True, default="",
                                        help_text=_("Organization of person who holds the essential rights"))
    cloned_source = TreeForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='clones')
    original_node = TreeForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='duplicates')
    thumbnail_encoding = models.TextField(blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True, verbose_name=_("created"))
    modified = models.DateTimeField(auto_now=True, verbose_name=_("modified"))
    published = models.BooleanField(default=False)
    publishing = models.BooleanField(default=False)

    changed = models.BooleanField(default=True)
    extra_fields = models.TextField(blank=True, null=True)
    author = models.CharField(max_length=200, blank=True, default="", help_text=_("Who created this content?"),
                              null=True)
    aggregator = models.CharField(max_length=200, blank=True, default="", help_text=_("Who gathered this content together?"),
                              null=True)
    provider = models.CharField(max_length=200, blank=True, default="", help_text=_("Who distributed this content?"),
                              null=True)

    role_visibility = models.CharField(max_length=50, choices=roles.choices, default=roles.LEARNER)
    freeze_authoring_data = models.BooleanField(default=False)

    objects = TreeManager()

    @raise_if_unsaved
    def get_root(self):
        # Only topics can be root nodes
        if not self.parent and self.kind_id != content_kinds.TOPIC:
            return self
        return super(ContentNode, self).get_root()

    def __init__(self, *args, **kwargs):
        super(ContentNode, self).__init__(*args, **kwargs)
        self._original_fields = self._as_dict() # Fast way to keep track of updates (no need to query db again)

    def _as_dict(self):
        return dict([(f.name, getattr(self, f.name)) for f in self._meta.local_fields if not f.rel])

    def get_changed_fields(self):
        """ Returns a dictionary of all of the changed (dirty) fields """
        new_state = self._as_dict()
        return dict([(key, value) for key, value in self._original_fields.iteritems() if value != new_state[key]])

    def get_tree_data(self, include_self=True):
        if not include_self:
            return [c.get_tree_data() for c in self.children.all()]
        elif self.kind_id == content_kinds.TOPIC:
            return {
                "title": self.title,
                "kind": self.kind_id,
                "children": [c.get_tree_data() for c in self.children.all()],
                "node_id": self.node_id,
            }
        elif self.kind_id == content_kinds.EXERCISE:
            return {
                "title": self.title,
                "kind": self.kind_id,
                "count": self.assessment_items.count(),
                "node_id": self.node_id,
            }
        else:
            return {
                "title": self.title,
                "kind": self.kind_id,
                "file_size": self.files.values('file_size').aggregate(size=Sum('file_size'))['size'],
                "node_id": self.node_id,
            }

    def get_node_tree_data(self):
        nodes = []
        for child in self.children.all():
            if child.kind_id == content_kinds.TOPIC:
                nodes.append({
                    "title": child.title,
                    "kind": child.kind_id,
                    "node_id": child.node_id,
                })
            elif child.kind_id == content_kinds.EXERCISE:
                nodes.append({
                    "title": child.title,
                    "kind": child.kind_id,
                    "count": child.assessment_items.count(),
                })
            else:
                nodes.append({
                "title": child.title,
                "kind": child.kind_id,
                "file_size": child.files.values('file_size').aggregate(size=Sum('file_size'))['size'],
            })
        return nodes

    def get_original_node(self):
        original_node = self.original_node or self
        if self.original_channel_id and self.original_source_node_id:
            original_tree_id = Channel.objects.select_related("main_tree").get(pk=self.original_channel_id).main_tree.tree_id
            original_node = ContentNode.objects.filter(tree_id=original_tree_id, node_id=self.original_source_node_id).first() or \
                            ContentNode.objects.filter(tree_id=original_tree_id, content_id=self.content_id).first() or self
        return original_node

    def get_associated_presets(self):
        key = "associated_presets_{}".format(self.kind_id)
        cached_data = cache.get(key)
        if cached_data:
            return cached_data
        presets = FormatPreset.objects.filter(kind=self.kind).values()
        cache.set(key, presets, None)
        return presets

    def get_prerequisites(self):
        prerequisite_mapping = {}
        prerequisites = self.prerequisite.all()
        prereqlist = list(prerequisites)
        for prereq in prerequisites:
            prlist, prereqmapping = prereq.get_prerequisites()
            prerequisite_mapping.update({prereq.pk: prereqmapping})
            prereqlist.extend(prlist)
        return prereqlist, prerequisite_mapping

    def get_postrequisites(self):
        postrequisite_mapping = {}
        postrequisites = self.is_prerequisite_of.all()
        postreqlist = list(postrequisites)
        for postreq in postrequisites:
            prlist, postreqmapping = postreq.get_postrequisites()
            postrequisite_mapping.update({postreq.pk: postreqmapping})
            postreqlist.extend(prlist)
        return postreqlist, postrequisite_mapping

    def get_channel(self):
        try:
            root = self.get_root()
            return root.channel_main.first() or root.channel_chef.first() or root.channel_trash.first() or root.channel_staging.first() or root.channel_previous.first()
        except (ObjectDoesNotExist, MultipleObjectsReturned, AttributeError):
            return None

    def save(self, *args, **kwargs):
        if kwargs.get('request'):
            request = kwargs.pop('request')
            channel = self.get_channel()
            request.user.can_edit(channel and channel.pk)

        self.changed = self.changed or len(self.get_changed_fields()) > 0

        # Detect if node has been moved to another tree (if the original parent has not already been marked as changed, mark as changed)
        # Necessary if nodes get deleted/moved to clipboard- user needs to be able to publish "changed" nodes
        if self.pk and ContentNode.objects.filter(pk=self.pk, parent__changed=False).exclude(parent_id=self.parent_id).exists():
            original = ContentNode.objects.get(pk=self.pk)
            original.parent.changed = True
            original.parent.save()

        if self.original_node is None:
            self.original_node = self
        if self.cloned_source is None:
            self.cloned_source = self

        if self.original_channel_id is None:
            # TODO: This SIGNIFICANTLY slows down the creation flow
            channel = (self.parent and self.parent.get_channel()) or self.get_channel() # Check parent first otherwise new content won't have root
            self.original_channel_id = channel.id if channel else None
        if self.source_channel_id is None:
            # TODO: This SIGNIFICANTLY slows down the creation flow
            channel = (self.parent and self.parent.get_channel()) or self.get_channel() # Check parent first otherwise new content won't have root
            self.source_channel_id = channel.id if channel else None

        if self.original_source_node_id is None:
            self.original_source_node_id = self.node_id
        if self.source_node_id is None:
            self.source_node_id = self.node_id

        super(ContentNode, self).save(*args, **kwargs)

        try:
            # During saving for fixtures, this fails to find the root node
            root = self.get_root()
            if self.is_prerequisite_of.exists() and (root.channel_trash.exists() or root.user_clipboard.exists()):
                PrerequisiteContentRelationship.objects.filter(Q(prerequisite_id=self.id) | Q(target_node_id=self.id)).delete()
        except (ContentNode.DoesNotExist, MultipleObjectsReturned) as e:
            logging.warn(str(e))

    class MPTTMeta:
        order_insertion_by = ['sort_order']

    class Meta:
        verbose_name = _("Topic")
        verbose_name_plural = _("Topics")
        # Do not allow two nodes with the same name on the same level
        # unique_together = ('parent', 'title')


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
    display = models.BooleanField(default=True)  # Render on client side
    order = models.IntegerField(default=0)
    kind = models.ForeignKey(ContentKind, related_name='format_presets', null=True)
    allowed_formats = models.ManyToManyField(FileFormat, blank=True)

    def __str__(self):
        return self.id


class Language(models.Model):
    id = models.CharField(max_length=14, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=10, db_index=True, blank=True, null=True)
    readable_name = models.CharField(max_length=100, blank=True)
    native_name = models.CharField(max_length=100, blank=True)
    lang_direction = models.CharField(max_length=3, choices=languages.LANGUAGE_DIRECTIONS, default=languages.LANGUAGE_DIRECTIONS[0][0])

    def ietf_name(self):
        return "{code}-{subcode}".format(code=self.lang_code,
                                         subcode=self.lang_subcode) if self.lang_subcode else self.lang_code

    def __str__(self):
        return self.ietf_name()


class AssessmentItem(models.Model):
    type = models.CharField(max_length=50, default="multiplechoice")
    question = models.TextField(blank=True)
    hints = models.TextField(default="[]")
    answers = models.TextField(default="[]")
    order = models.IntegerField(default=1)
    contentnode = models.ForeignKey('ContentNode', related_name="assessment_items", blank=True, null=True,
                                    db_index=True)
    assessment_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    raw_data = models.TextField(blank=True)
    source_url = models.CharField(max_length=400, blank=True, null=True)
    randomize = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)

class StagedFile(models.Model):
    """
    Keeps track of files uploaded through Ricecooker to avoid user going over disk quota limit
    """
    checksum = models.CharField(max_length=400, blank=True, db_index=True)
    file_size = models.IntegerField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, related_name='staged_files', blank=True, null=True)


class File(models.Model):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    checksum = models.CharField(max_length=400, blank=True, db_index=True)
    file_size = models.IntegerField(blank=True, null=True)
    file_on_disk = models.FileField(upload_to=object_storage_name, storage=default_storage, max_length=500,
                                    blank=True)
    contentnode = models.ForeignKey(ContentNode, related_name='files', blank=True, null=True, db_index=True)
    assessment_item = models.ForeignKey(AssessmentItem, related_name='files', blank=True, null=True, db_index=True)
    file_format = models.ForeignKey(FileFormat, related_name='files', blank=True, null=True, db_index=True)
    preset = models.ForeignKey(FormatPreset, related_name='files', blank=True, null=True, db_index=True)
    language = models.ForeignKey(Language, related_name='files', blank=True, null=True)
    original_filename = models.CharField(max_length=255, blank=True)
    source_url = models.CharField(max_length=400, blank=True, null=True)
    uploaded_by = models.ForeignKey(User, related_name='files', blank=True, null=True)

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
            if not self.file_size:
                self.file_size = self.file_on_disk.size
            if not self.file_format:
                self.file_format_id = os.path.splitext(self.file_on_disk.name)[1]
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
        elif PrerequisiteContentRelationship.objects.using(self._state.db) \
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

    def __unicode__(self):
        return u'%s' % (self.pk)

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
        elif RelatedContentRelationship.objects.using(self._state.db) \
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
    share_mode = models.CharField(max_length=50, default=EDIT_ACCESS)
    email = models.EmailField(max_length=100, null=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='sent_by', null=True)
    channel = models.ForeignKey('Channel', on_delete=models.SET_NULL, null=True, related_name='pending_editors')
    first_name = models.CharField(max_length=100, default='Guest')
    last_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name = _("Invitation")
        verbose_name_plural = _("Invitations")
