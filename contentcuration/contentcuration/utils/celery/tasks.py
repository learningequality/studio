import math

from celery import states
from celery.app.task import Task
from celery.result import AsyncResult

from contentcuration.utils.sentry import report_exception


class ProgressTracker:
    key = 'progress'

    """
    Helper to track task progress
    """
    def __init__(self, task):
        """
        :param task: The task instance
        :type task: CeleryTask
        """
        self.task = task
        self.request = None
        self.total = 100.0
        self.progress = 0.0
        self.last_reported_progress = 0.0

    def bind(self, request):
        """
        Attaches the request to the instance and resets data if it's new
        """
        self.request = request
        if self.request and request and self.request.id == request.id:
            return

        self.total = 100.0
        self.progress = 0.0
        self.last_reported_progress = 0.0
        return self

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
            metadata = {self.key: self.task_progress}
            self.task.update_state(state=states.STARTED, meta=metadata)

    @property
    def task_progress(self):
        return int(min((100.0 * self.progress / self.total), 100.0))


class CeleryTask(Task):
    """
    Custom task class so we can add default `after_return` handling which marks the task as
    succeeded or failed.

    This is set as the Task class on our Celery app, so to track progress on a task, mark it
    when decorating the task:
    ```
        @app.task(bind=True, track_progress=True)
        def my_task(self):
            self.progress.increment() # progress tracker
    ```
    """
    # by default, celery does not track task starting itself
    track_started = True
    send_events = True

    # non-celery option
    track_progress = False

    def __call__(self, *args, **kwargs):
        """
        Initialize the progress tracker. This should happen every time the task is executed
        because the task instance is instantiated once
        """
        self.progress = ProgressTracker(self) if self.track_progress else None
        return super(CeleryTask, self).__call__(*args, **kwargs)

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """
        Ensures status is updated after task completion, otherwise our signals may not fire
        """
        # we assume that if the state is past starting, that this has been handled
        if states.state(status) > states.state(states.STARTED):
            return

        # mark the completion
        state = states.SUCCESS
        if einfo or isinstance(retval, Exception):
            state = states.FAILURE
        self.update_state(state=state, meta=retval)

    def report_exception(self, e):
        """
        Marks the task as failed and reports the exception to Sentry
        :type e: Exception
        """
        # @see AsyncResult.traceback
        self.update_state(state=states.FAILURE, traceback=e.__traceback__)
        report_exception(e)

    def update_state(self, task_id=None, state=None, meta=None, traceback=None):
        """
        The super.update_state doesn't expose or pass along the traceback kwarg to the backend... :(
        """
        if task_id is None:
            task_id = self.request.id
        self.backend.store_result(task_id, meta, state, traceback=traceback)


class CeleryAsyncResult(AsyncResult):
    @property
    def progress(self):
        """
        A somewhat confusing aspect is that even though we put `progress` into the metadata,
        the Redis backend puts that within the `result` when it stores the metadata
        """
        if self.ready():
            return 100
        try:
            return self.result["progress"] if self.result else 0
        except KeyError:
            return None
