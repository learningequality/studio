import contextlib
import hashlib
import logging
import math
import uuid
import zlib
from collections import OrderedDict

from celery import states
from celery.app.task import Task
from celery.result import AsyncResult
from django.db import transaction

from contentcuration.constants.locking import TASK_LOCK
from contentcuration.db.advisory_lock import advisory_lock
from contentcuration.utils.sentry import report_exception


logger = logging.getLogger(__name__)


class ProgressTracker:
    """
    Helper to track task progress
    """

    __slots__ = ("task_id", "send_event", "total", "progress", "last_reported_progress")

    def __init__(self, task_id, send_event):
        """
        :param task_id: The ID of the calling task
        :param send_event: Callback to send the task event
        :type send_event: Callable
        """
        self.task_id = task_id
        self.send_event = send_event
        self.total = 100.0
        self.progress = 0.0
        self.last_reported_progress = 0.0

    def set_total(self, total):
        """
        :param total: The amount for which progress is deemed 100%, defaults to 100
        """
        self.total = total

    def increment(self, increment=1.0):
        """
        Increments and triggers tracking of the progress to the task meta
        """
        self.track(self.progress + increment)

    def track(self, progress):
        """
        :param progress: The current progress amount
        """
        self.progress = progress

        # only update the task progress in >=1% increments
        if math.floor(self.last_reported_progress) < math.floor(self.task_progress):
            self.last_reported_progress = self.task_progress
            self.send_event(progress=self.task_progress)

    @property
    def task_progress(self):
        return int(min((100.0 * self.progress / self.total), 100.0))


def get_task_model(ref, task_id):
    """
    Returns the task model for a task, will create one if not found
    :rtype: contentcuration.models.CustomTaskMetadata
    """
    from contentcuration.models import CustomTaskMetadata

    try:
        return CustomTaskMetadata.objects.get(task_id=task_id)
    except CustomTaskMetadata.DoesNotExist:
        return None


def generate_task_signature(task_name, task_kwargs=None, channel_id=None):
    """
    :type task_name: str
    :param task_kwargs: the celery encoded/serialized form of the task_kwargs dict
    :type task_kwargs: str|None
    :type channel_id: str|None
    :return: A hex string, md5
    :rtype: str
    """
    md5 = hashlib.md5()
    md5.update(task_name.encode("utf-8"))
    md5.update((task_kwargs or "").encode("utf-8"))
    md5.update((channel_id or "").encode("utf-8"))
    return md5.hexdigest()


class CeleryTask(Task):
    """
    This is set as the Task class on our Celery app, so to track progress on a task, mark it
    when decorating the task:
    ```
        @app.task(bind=True, track_progress=True)
        def my_task(self):
            progress = self.get_progress_tracker()
            progress.increment()
    ```
    """

    # by default, celery does not track task starting itself
    track_started = True
    send_events = True

    # Tasks are acknowledged just before they start executing
    acks_late = False

    @property
    def TaskModel(self):
        """
        :rtype: contentcuration.models.TaskResult
        """
        return self.backend.TaskModel

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        Report task failures to sentry as long as the exception is not one of the types for which it should `autoretry`
        """
        if not getattr(self, "autoretry_for", None) or not isinstance(
            exc, self.autoretry_for
        ):
            report_exception(exc)

    def shadow_name(self, *args, **kwargs):
        """
        DO NOT add functionality here as that will make it impossible to rely on `.name` for finding task by name in the
        result backend
        """
        return super(CeleryTask, self).shadow_name(*args, **kwargs)

    def _prepare_kwargs(self, kwargs):
        """
        Prepares kwargs, converting UUID to their hex value
        """
        return OrderedDict(
            (key, value.hex if isinstance(value, uuid.UUID) else value)
            for key, value in kwargs.items()
        )

    def generate_signature(self, kwargs):
        """
        :param kwargs: A dictionary of task kwargs
        :return: An hex string representing an md5 hash of task metadata
        """
        prepared_kwargs = self._prepare_kwargs(kwargs)
        return generate_task_signature(
            self.name,
            task_kwargs=self.backend.encode(prepared_kwargs),
            channel_id=prepared_kwargs.get("channel_id"),
        )

    @contextlib.contextmanager
    def _lock_signature(self, signature):
        """
        Opens a transaction and creates an advisory lock for its duration, based off a crc32 hash to convert
        the signature into an integer which postgres' lock function require
        :param signature: An hex string representing an md5 hash of task metadata
        """
        with transaction.atomic():
            # compute crc32 to turn signature into integer
            key2 = zlib.crc32(signature.encode("utf-8"))
            advisory_lock(TASK_LOCK, key2=key2)
            yield

    def find_ids(self, signature):
        """
        :param signature: An hex string representing an md5 hash of task metadata
        :return: A CustomTaskMetadata queryset
        :rtype: django.db.models.query.QuerySet
        """
        from contentcuration.models import CustomTaskMetadata

        return CustomTaskMetadata.objects.filter(signature=signature).values_list(
            "task_id", flat=True
        )

    def find_incomplete_ids(self, signature):
        """
        :param signature: An hex string representing an md5 hash of task metadata
        :return: A TaskResult queryset
        :rtype: django.db.models.query.QuerySet
        """
        from django_celery_results.models import TaskResult

        # Get the filtered task_ids from CustomTaskMetadata model
        filtered_task_ids = self.find_ids(signature)
        task_objects_ids = TaskResult.objects.filter(
            task_id__in=filtered_task_ids, status__in=states.UNREADY_STATES
        ).values_list("task_id", flat=True)
        return task_objects_ids

    def fetch(self, task_id):
        """
        Gets the result object for a task, assuming it was called async
        :param task_id: The hex task ID
        :return: A CeleryAsyncResult
        :rtype: CeleryAsyncResult
        """
        return self.AsyncResult(task_id)

    def enqueue(self, user, **kwargs):
        """
        Enqueues the task called with `kwargs`, and requires the user who wants to enqueue it.

        :param user: User object of the user performing the operation
        :param kwargs: Keyword arguments for task `apply_async`
        :return: The celery async result
        :rtype: CeleryAsyncResult
        """
        from contentcuration.models import User
        from contentcuration.models import CustomTaskMetadata

        if user is None or not isinstance(user, User):
            raise TypeError("All tasks must be assigned to a user.")

        signature = kwargs.pop("signature", None)
        if signature is None:
            signature = self.generate_signature(kwargs)

        task_id = uuid.uuid4().hex
        prepared_kwargs = self._prepare_kwargs(kwargs)
        channel_id = prepared_kwargs.get("channel_id")
        custom_task_result = CustomTaskMetadata(
            task_id=task_id, user=user, signature=signature, channel_id=channel_id
        )
        custom_task_result.save()

        logging.info(
            f"Enqueuing task:id {self.name}:{task_id} for user:channel {user.pk}:{channel_id} | {signature}"
        )

        # returns a CeleryAsyncResult
        async_result = self.apply_async(
            task_id=task_id,
            task_name=self.name,
            kwargs=prepared_kwargs,
        )

        # ensure the result is saved to the backend (database)
        self.backend.add_pending_result(async_result)
        return async_result

    def fetch_or_enqueue(self, user, **kwargs):
        """
        Fetches an existing incomplete task or enqueues one if not found, called with `kwargs`, and requires the user
        who wants to enqueue it. If `channel_id` is passed to the function, that will be set on the CustomTaskMetadata model

        :param user: User object of the user performing the operation
        :param kwargs: Keyword arguments for task `apply_async`
        :return: The celery async result
        :rtype: CeleryAsyncResult
        """
        # if we're eagerly executing the task (synchronously), then we shouldn't check for an existing task because
        # implementations probably aren't prepared to rely on an existing asynchronous task
        if self.app.conf.task_always_eager:
            return self.enqueue(user, **kwargs)

        signature = self.generate_signature(kwargs)

        # create an advisory lock to obtain exclusive control on preventing task duplicates
        with self._lock_signature(signature):
            # order by most recently created
            task_ids = self.find_incomplete_ids(signature).order_by("-date_created")[:1]
            if task_ids:
                async_result = self.fetch(task_ids[0])
                # double check
                if async_result and async_result.status not in states.READY_STATES:
                    logging.info(
                        f"Fetched matching task {self.name} for user {user.pk} with id {async_result.id} | {signature}"
                    )
                    return async_result
            logging.info(
                f"Didn't fetch matching task {self.name} for user {user.pk} | {signature}"
            )
            kwargs.update(signature=signature)
            return self.enqueue(user, **kwargs)

    def requeue(self, **kwargs):
        """
        Re-enqueues the same task, during execution of the task, with the same arguments
        :param kwargs: Keyword arguments to override the original arguments
        :return: The celery async result
        :rtype: CeleryAsyncResult
        """
        from contentcuration.models import CustomTaskMetadata

        request = self.request
        if request is None:
            raise NotImplementedError(
                "This method should only be called within the execution of a task"
            )
        task_kwargs = request.kwargs.copy()
        task_kwargs.update(kwargs)
        signature = self.generate_signature(kwargs)
        custom_task_metadata = CustomTaskMetadata.objects.get(task_id=request.id)
        logging.info(
            f"Re-queuing task {self.name} for user {custom_task_metadata.user.pk} from {request.id} | {signature}"
        )
        return self.enqueue(
            custom_task_metadata.user, signature=signature, **task_kwargs
        )

    def revoke(self, exclude_task_ids=None, **kwargs):
        """
        Revokes and terminates all unready tasks matching the kwargs
        :param exclude_task_ids: Any task ids to exclude from this behavior
        :param kwargs: Task keyword arguments that will be used to match against tasks
        :return: The number of tasks revoked
        """
        from django_celery_results.models import TaskResult

        signature = self.generate_signature(kwargs)
        task_ids = self.find_incomplete_ids(signature)

        if exclude_task_ids is not None:
            task_ids = task_ids.exclude(task_id__in=exclude_task_ids)
        count = 0
        for task_id in task_ids:
            logging.info(f"Revoking task {task_id}")
            self.app.control.revoke(task_id, terminate=True)
            count += 1
        # be sure the database backend has these marked appropriately
        TaskResult.objects.filter(task_id__in=task_ids).update(status=states.REVOKED)
        return count


class CeleryAsyncResult(AsyncResult):
    """
    Custom result class which has access to task data stored in the backend
    We access those from the CustomTaskMetadata model.
    """

    _cached_model = None

    def get_model(self):
        """
        :return: The CustomTaskMetadatamodel object
        :rtype: contentcuration.models.CustomTaskMetadata
        """
        if self._cached_model is None:
            self._cached_model = get_task_model(self, self.task_id)
        return self._cached_model

    @property
    def user_id(self):
        if self.get_model():
            return self.get_model().user_id

    @property
    def channel_id(self):
        if self.get_model():
            return self.get_model().channel_id

    @property
    def progress(self):
        if self.get_model():
            return self.get_model().progress
