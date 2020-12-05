from django.core.cache import cache
from django.db.models import Count

from contentcuration.models import Channel
from contentcuration.utils.cache import cache_stampede

CACHE_USER_KEY = "user_metadata_{}"
CACHE_USER_STORAGE_KEY = "user_storage_{}"


@cache_stampede(expire=3600)
def calculate_user_metadata(key, user_id=None):
    if key is None:
        return  # this is an error, it should not happen, but just in case

    cached_info = cache.get(key)
    metadata = {}
    if cached_info is not None:
        if cached_info["CALCULATING"]:
            return  # the task is already queued
        metadata = cached_info.get("METADATA", None)
    # the key will expire if the task is not achieved in one hour
    cache.set(key, {"CALCULATING": True, "METADATA": {}}, timeout=3600)

    editors = (
        Channel.objects.filter(editors__id=user_id, deleted=False)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    editors_count = editors["id__count"] or 0

    viewers = (
        Channel.objects.filter(viewers__id=user_id, deleted=False)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    viewers_count = viewers["id__count"] or 0

    metadata = {
        "edit_count": editors_count,
        "view_count": viewers_count,
    }
    return metadata


def cache_multiple_users_metadata(users):
    for user in users:
        user_id = user["id"]
        key = CACHE_USER_KEY.format(user_id)
        calculate_user_metadata(key, user_id)


def calculate_user_storage(user_id):
    from contentcuration.tasks import calculate_user_storage_task

    key = CACHE_USER_STORAGE_KEY.format(user_id)
    if key not in cache:
        cache.set(key, True, timeout=600)  # Invalidate after 10 minutes
        calculate_user_storage_task.s(user_id).apply_async(countdown=5)
