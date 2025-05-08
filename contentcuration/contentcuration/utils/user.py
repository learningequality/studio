import logging

from contentcuration.tasks import calculate_user_storage_task


def calculate_user_storage(user_id):
    """TODO: Perhaps move this to User model to avoid unnecessary User lookups"""
    from contentcuration.models import User
    from contentcuration.decorators import delay_user_storage_calculation

    if delay_user_storage_calculation.is_active:
        delay_user_storage_calculation.add(user_id)
        return

    try:
        if user_id is None:
            raise User.DoesNotExist
        user = User.objects.get(pk=user_id)
        if not user.is_admin:
            calculate_user_storage_task.fetch_or_enqueue(user, user_id=user_id)
    except User.DoesNotExist:
        logging.error(
            "Tried to calculate user storage for user with id {} but they do not exist".format(
                user_id
            )
        )
