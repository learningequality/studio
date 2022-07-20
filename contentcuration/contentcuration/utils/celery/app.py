import base64
import json

from celery import Celery

from contentcuration.utils.celery.tasks import CeleryTask


class CeleryApp(Celery):
    task_cls = CeleryTask
    result_cls = 'contentcuration.utils.celery.tasks:CeleryAsyncResult'
    _result_cls = None

    def on_init(self):
        """
        Use init call back to set our own result class. Celery doesn't yet have an easier way
        to customize this class specifically
        """
        self._result_cls = self.subclass_with_self(self.result_cls)

    @property
    def AsyncResult(self):
        return self._result_cls

    def get_queued_tasks(self, queue_name="celery"):
        """
        Returns the list of tasks in the queue.

        Use `app.control.inspect()` to get information about tasks no longer in the queue

        :param queue_name: The queue name, defaults to the default "celery" queue
        :return: dict[]
        """
        decoded_tasks = []
        with self.pool.acquire(block=True) as conn:
            tasks = conn.default_channel.client.lrange(queue_name, 0, -1)

        for task in tasks:
            try:
                j = json.loads(task)
                body = json.loads(base64.b64decode(j['body']))
                decoded_tasks.append(body)
            except (TypeError, json.JSONDecodeError, AttributeError):
                pass

        return decoded_tasks
