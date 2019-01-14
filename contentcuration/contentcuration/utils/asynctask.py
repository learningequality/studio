import ast
import logging as logger

from celery import states
from celery import Task as CeleryTask
from celery.signals import after_task_publish

from contentcuration.models import Task
from contentcuration.models import User

logger.basicConfig()
logging = logger.getLogger(__name__)


class AsyncTask(CeleryTask):

    @after_task_publish.connect
    def before_start(sender, headers, body, **kwargs):
        """
        Create a Task object before the task actually started,
        set the task object status to be PENDING, with the signal
        after_task_publish to indicate that the task has been
        sent to the broker.
        """
        task_id = headers["id"]
        options = ast.literal_eval(headers["kwargsrepr"])
        task_type = options["task_type"]
        is_progress_tracking = options["is_progress_tracking"]
        metadata = options["metadata"]
        user_id = options["user_id"]
        user = User.objects.get(id=user_id)

        Task.objects.create(
            id=task_id,
            task_type=task_type,
            status=states.PENDING,
            is_progress_tracking=is_progress_tracking,
            user=user,
            metadata=metadata,
        )
        logging.info("Task object {} created with status PENDING.".format(task_id))

    def __call__(self, *args, **kwargs):
        """
        Overriding the function __call__ from Celery base Task class to
        update the Task object status to be STARTED.
        """
        Task.objects.filter(id=self.request.id).update(status=states.STARTED)
        logging.info("Task object {} started.".format(self.request.id))
        super(AsyncTask, self).__call__(*args, **kwargs)

    def on_success(self, *args, **kwargs):
        """
        Overriding the success handler from the Celery base Task class to
        update the Task object status to be SUCCESS.
        """
        Task.objects.filter(id=self.request.id).update(status=states.SUCCESS)
        logging.info("Task object {} succeeded.".format(self.request.id))
        super(AsyncTask, self).on_success(*args, **kwargs)

    def on_failure(self, *args, **kwargs):
        """
        Overriding the error handler from the Celery base Task class to
        update the Task object status to be FAILURE.
        """
        Task.objects.filter(id=self.request.id).update(status=states.FAILURE)
        logging.info("Task object {} failed.".format(self.request.id))
        super(AsyncTask, self).on_failure(*args, **kwargs)
