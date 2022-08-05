import logging
from contextlib import ContextDecorator

from contentcuration.tasks import calculate_user_storage_task


class DelayUserStorageCalculation(ContextDecorator):
    """
    Decorator class that will dedupe and delay requests to enqueue storage calculation tasks for users
    until after the wrapped function has exited
    """
    depth = 0
    queue = []

    @property
    def is_active(self):
        return self.depth > 0

    def __enter__(self):
        self.depth += 1

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.depth -= 1
        if not self.is_active:
            user_ids = set(self.queue)
            self.queue = []
            for user_id in user_ids:
                calculate_user_storage(user_id)


delay_user_storage_calculation = DelayUserStorageCalculation()


def calculate_user_storage(user_id):
    """TODO: Perhaps move this to User model to avoid unnecessary User lookups"""
    from contentcuration.models import User

    if delay_user_storage_calculation.is_active:
        delay_user_storage_calculation.queue.append(user_id)
        return

    try:
        if user_id is None:
            raise User.DoesNotExist
        user = User.objects.get(pk=user_id)
        calculate_user_storage_task.fetch_or_enqueue(user, user_id=user_id)
    except User.DoesNotExist:
        logging.error("Tried to calculate user storage for user with id {} but they do not exist".format(user_id))
