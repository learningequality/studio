from django.core.cache import cache
from django.db.models import Count
from django.db.models import Sum
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import FileCTE
from contentcuration.models import User
from contentcuration.utils.cache import cache_stampede

CACHE_CHANNEL_KEY = "channel_metadata_{}"


@cache_stampede(expire=3600)
def calculate_channel_metadata(key, channel_id=None, tree_id=None):
    if key is None:
        return  # this is an error, it should not happen, but just in case

    cached_info = cache.get(key)
    if cached_info is not None:
        if cached_info["CALCULATING"]:
            return  # the task is already queued
    # the key will expire if the task is not achieved in one hour
    cache.set(key, {"CALCULATING": True}, timeout=3600)

    if tree_id is None:
        tree_id = Channel.objects.get(id=channel_id).main_tree.id

    nodes = With(
        ContentNode.objects.values("id", "tree_id").filter(tree_id=tree_id).order_by(),
        name="nodes",
    )
    size_sum = (
        nodes.join(FileCTE, contentnode_id=nodes.col.id)
        .values("checksum", "file_size")
        .with_cte(nodes)
        .distinct()
        .aggregate(Sum("file_size"))
    )
    size = size_sum["file_size__sum"] or 0

    editors = (
        User.objects.filter(editable_channels__id=channel_id)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    editors_count = editors["id__count"] or 0

    viewers = (
        User.objects.filter(view_only_channels__id=channel_id)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    viewers_count = viewers["id__count"] or 0

    # 1 day timeout, pending to review, maybe 0 (forever):
    metadata = {
        "size": size,
        "editors_count": editors_count,
        "viewers_count": viewers_count,
    }
    return metadata
