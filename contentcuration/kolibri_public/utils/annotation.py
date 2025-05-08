"""
Functions in here are the subset of annotation functions from Kolibri related to channel metadata.
https://github.com/learningequality/kolibri/blob/caec91dd2da5617adfb50332fb698068248e8e47/kolibri/core/content/utils/annotation.py#L731
"""
import datetime

from django.db.models import Q
from django.db.models import Sum
from kolibri_public.models import ChannelMetadata
from kolibri_public.models import ContentNode
from kolibri_public.models import LocalFile
from le_utils.constants import content_kinds

from contentcuration.models import Channel


def set_channel_metadata_fields(channel_id, public=None):
    # Remove unneeded db_lock
    channel = ChannelMetadata.objects.get(id=channel_id)
    calculate_published_size(channel)
    calculate_total_resource_count(channel)
    calculate_included_languages(channel)
    calculate_next_order(channel, public=public)
    # Add this to ensure we keep this up to date.
    channel.last_updated = datetime.datetime.now()

    if public is not None:
        channel.public = public
    channel.save()


def files_for_nodes(nodes):
    return LocalFile.objects.filter(files__contentnode__in=nodes)


def total_file_size(files_or_nodes):
    if issubclass(files_or_nodes.model, LocalFile):
        localfiles = files_or_nodes
    elif issubclass(files_or_nodes.model, ContentNode):
        localfiles = files_for_nodes(files_or_nodes)
    else:
        raise TypeError("Expected queryset for LocalFile or ContentNode")
    return localfiles.distinct().aggregate(Sum("file_size"))["file_size__sum"] or 0


def calculate_published_size(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.published_size = total_file_size(
        files_for_nodes(content_nodes).filter(available=True)
    )
    channel.save()


def calculate_total_resource_count(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.total_resource_count = (
        content_nodes.filter(available=True).exclude(kind=content_kinds.TOPIC).count()
    )
    channel.save()


def calculate_included_languages(channel):
    content_nodes = ContentNode.objects.filter(
        channel_id=channel.id, available=True
    ).exclude(lang=None)
    languages = content_nodes.order_by("lang").values_list("lang", flat=True).distinct()
    channel.included_languages.add(*list(languages))


def calculate_next_order(channel, public=False):
    # This has been edited from the source Kolibri, in order
    # to make the order match given by the public channel API on Studio.
    if public:
        channel_list_order = list(
            Channel.objects.filter(
                # Ensure that this channel is always included in the list.
                Q(public=True, deleted=False, main_tree__published=True)
                | Q(id=channel.id)
            )
            .order_by("-priority")
            .values_list("id", flat=True)
        )
        # this shouldn't happen, but if we're exporting a channel database to Kolibri Public
        # and the channel does not actually exist locally, then this would fail
        if channel.id in channel_list_order:
            order = channel_list_order.index(channel.id)
            channel.order = order
            channel.save()
