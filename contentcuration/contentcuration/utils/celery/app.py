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

    def count_queued_tasks(self, queue_name="celery"):
        """
        :param queue_name: The queue name, defaults to the default "celery" queue
        :return: int
        """
        with self.pool.acquire(block=True) as conn:
            count = conn.default_channel.client.llen(queue_name)
        return count

    def decode_result(self, result, status=None):
        """
        Decodes the celery result, like the raw result from the database, using celery tools

        See .backend.decode_result() for similar functionality

        :param result: The string serialized/decoded result
        :param status: Pass the status to unserialize an exception result if status is an exception state
        :return: The decoded result
        """
        state = {
            "result": self.backend.decode(result),
            "status": status,
        }
        return self.backend.meta_from_decoded(state).get("result")
