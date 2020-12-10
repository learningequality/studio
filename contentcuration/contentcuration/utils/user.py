from django.core.cache import cache

CACHE_USER_STORAGE_KEY = "user_storage_{}"


def calculate_user_storage(user_id):
    from contentcuration.tasks import calculate_user_storage_task

    key = CACHE_USER_STORAGE_KEY.format(user_id)
    if key not in cache:
        cache.set(key, True, timeout=600)  # Invalidate after 10 minutes
        calculate_user_storage_task.s(user_id).apply_async(countdown=5)
