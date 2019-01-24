from base import BaseTestCase

from contentcuration.tasks import exportchannel_task
# from celery.contrib.testing.worker import start_worker
# from contentcuration.celery import app


class AsyncTaskTestCase(BaseTestCase):

    # @patch('contentcuration.tasks.exportchannel_task.delay')
    def test_asynctask_success(self):
        metadata = {'test': True}
        task = exportchannel_task.s(
            self.channel.id,
            user_id=self.user.pk,
            task_type='exportchannel',
            is_progress_tracking=False,
            metadata=metadata
        ).apply()
        print(task.state)
        # self.assertTrue(Task.objects.filter(metadata__test=True).count()==1)
        # self.assertTrue(Task.objects.get(metadata__test=True).status == 'SUCCESS')
        # print(Task.objects.all().last().status)
