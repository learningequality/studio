from django.db import models
from mptt.models import MPTTModel, TreeForeignKey
from django.utils.translation import ugettext as _


class Channel(models.Model):
    """ Permissions come from association with organizations """
    name = models.CharField(
        max_length= 100,
        verbose_name=_("channel name"),
    )
    description = models.TextField(
        max_length = 300,
        verbose_name=_("channel description"),
        help_text=_("Description of what a channel contains"),
    )
    author = models.CharField(
        max_length=100,
        verbose_name=_("channel author"),
        help_text=_("Channel author can be a person or an organization"),
    )
    editors = models.ManyToManyField(
        'auth.User',
        verbose_name=_("editors"),
        help_text=_("Users with edit rights"),
    )

    class Meta:
        verbose_name = _("Channel")
        verbose_name_plural = _("Channels")


class TopicTree(models.Model):
    """Base model for all channels"""
    

    name = models.CharField(
        max_length=255,
        verbose_name=_("topic tree name"),
        help_text=_("Displayed to the user"),
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
    
    class Meta:
        verbose_name = _("Topic tree")
        verbose_name_plural = _("Topic trees")


class Node(MPTTModel):
    """
    By default, all nodes have a title and can be used as a topic.
    """

    created = models.DateTimeField(auto_now_add=True, verbose_name=_("created"))
    modified = models.DateTimeField(auto_now=True, verbose_name=_("modified"))

    parent = TreeForeignKey('self', null=True, blank=True, related_name='children')

    name = models.CharField(
        max_length=50,
        verbose_name=_("name"),
        help_text=_("Name of node to be displayed to the user in the menu"),
    )

    published = models.BooleanField(
        default=False,
        verbose_name=_("Published"),
        help_text=_("If published, students can access this item"),
    )

    deleted = models.BooleanField(
        default=False,
        verbose_name=_("Deleted"),
        help_text=_(
            "Indicates that the node has been deleted, and should only "
            "be retrievable through the admin backend"
        ),
    )

    sort_order = models.FloatField(
        max_length=50,
        unique=True,
        default=0,
        verbose_name=_("sort order"),
        help_text=_("Ascending, lowest number shown first"),
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
    
    class MPTTMeta:
        order_insertion_by = ['sort_order']

    class Meta:
        verbose_name = _("Topic")
        verbose_name_plural = _("Topics")
        # Do not allow two nodes with the same name on the same level
        unique_together = ('parent', 'name')


class TopicNode(Node):
    # Rename the colors when they have decided roles in the UI
    # Length 7 because hex codes?
    color1 = models.CharField(
        max_length=7
    )

    color2 = models.CharField(
        max_length=7
    )

    color3 = models.CharField(
        max_length=7
    )
    title = models.CharField(
        max_length=50,
        verbose_name=_("title"),
        default=_("Title"),
        help_text=_("Folder title"),
    )
    description = models.TextField(
        max_length=200,
        verbose_name=_("description"),
        default=_("Description"),
        help_text=_("Brief description of what is contained in this folder"),
    )


class ContentNode(Node):
    """
    Model for content data nodes, which will be stored as leaves only
    """

    title = models.CharField(
        max_length=50,
        verbose_name=_("title"),
        default=_("Title"),
        help_text=_("Title of the content item"),
    )
    author = models.CharField(
        max_length=255,
        help_text=_("Name of the author(s) of book/movie/exercise"),
    )

    license_owner = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Organization of person who holds the essential rights"),
    )

    published_on = models.DateField(
        null=True,
        blank=True,
        help_text=_(
            "If applicable, state when this work was first published (not on "
            "this platform, but for its original publication)."
        ),
    )

    retrieved_on = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("downloaded on"),
        help_text=_(
            "Should be automatically filled in when an item is downloaded "
            "from its source of origin, either manually by user or "
            "automatically by script."
        ),
    )

    content_file = models.FileField(
        blank=True,
        null=True,
        # TODO
        upload_to='contents/video/thumbnails/',
        help_text=_("Upload video here"),
    )

    thumbnail = models.ImageField(
        blank=True,
        null=True,
        upload_to='contents/video/thumbnails/',
        help_text=_("Automatically created when new video is uploaded")
    )

    license = models.ForeignKey(
        'ContentLicense',
        verbose_name=_("license"),
        help_text=_("License under which the work is distributed"),
    )
    description = models.TextField(
        max_length=200,
        verbose_name=_("description"),
        default=_("Description"),
        help_text=_("Brief description of what this content item is"),
    )

class ContentLicense(models.Model):
    name = models.CharField(
        max_length=255,
        default=(""),
        verbose_name=_("name"),
        help_text=_("Name of license, e.g. 'Creative Commons Share-Alike 2.0'"),
    )
    exists = models.BooleanField(
        default=False,
        verbose_name=_("license exists"),
        help_text=_("Tells whether or not a content item is licensed to share"),
    )


# If we decide to subclass Content:
#
# class ContentVideo(Content):
#     """
#     Model for video data
#     """
#
#     video_file = models.FileField(
#         blank=True,
#         null=True,
#         upload_to='contents/video/thumbnails/',
#         verbose_name=_("video file"),
#         help_text=_("Upload video here"),
#     )
#
#     thumbnail = models.ImageField(
#         null=True,
#         upload_to='contents/video/thumbnails/',
#         help_text=_("Automatically created when new video is uploaded")
#     )
#
#
# class ContentPDF(Content):
#     """
#     Model for video data
#     """
#     pdf_file = models.FileField(
#         blank=True,
#         null=True,
#         upload_to='contents/video/thumbnails/',
#         verbose_name=_("video file"),
#         help_text=_("Upload video here"),
#     )
#
#
# class Exercise(Content):
#     """
#     Model for Exercise data
#     """


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

    type = models.CharField(max_length=50)
    question = models.TextField()
    answers = models.TextField()
    exercise = models.ForeignKey('Exercise', related_name="all_assessment_items")
