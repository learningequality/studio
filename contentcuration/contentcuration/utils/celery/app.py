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
