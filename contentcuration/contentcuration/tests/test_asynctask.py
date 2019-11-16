from base import BaseAPITestCase

from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.tasks import create_async_task
from contentcuration.tasks_test import non_async_test_task


class AsyncTaskTestCase(BaseAPITestCase):
    """
    These tests check that creating and updating Celery tasks using the create_async_task function result in
    an up-to-date Task object with the latest status and information about the task.
    """
    task_url = '/api/task'

    def test_asynctask_reports_success(self):
        """
        Tests that when an async task is created and completed, the Task object has a status of 'SUCCESS' and
        contains the return value of the task.
        """
        metadata = {'test': True}
        task_options = {
            'user_id': self.user.pk,
            'metadata': metadata
        }
        task, task_info = create_async_task('test', task_options)
        self.assertTrue(Task.objects.filter(metadata__test=True).count() == 1)
        self.assertEqual(task_info.user, self.user)
        self.assertEqual(task_info.task_type, 'test')
        self.assertEqual(task_info.is_progress_tracking, False)
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).metadata['result'], 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, 'SUCCESS')

    def test_asynctask_reports_progress(self):
        """
        Test that we can retrieve task progress via the Task API.
        """
        metadata = {'test': True}
        task_options = {
            'user_id': self.user.pk,
            'metadata': metadata
        }
        task, task_info = create_async_task('progress-test', task_options)
        self.assertTrue(Task.objects.filter(metadata__test=True).count() == 1)
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, 'SUCCESS')

        # progress is retrieved dynamically upon calls to get the task info, so
        # use an API call rather than checking the db directly for progress.
        url = '{}/{}'.format(self.task_url, task_info.id)
        response = self.get(url)
        self.assertEqual(response.data['status'], 'SUCCESS')
        self.assertEqual(response.data['task_type'], 'progress-test')
        self.assertEqual(response.data['metadata']['progress'], 100)
        self.assertEqual(response.data['metadata']['result'], 42)

    def test_asynctask_filters_by_channel(self):
        """
        Test that we can filter tasks by channel ID.
        """

        self.channel.editors.add(self.user)
        self.channel.save()
        metadata = {'affects': {'channels': [self.channel.id]}}
        task_options = {
            'user_id': self.user.pk,
            'metadata': metadata
        }
        task, task_info = create_async_task('progress-test', task_options)
        self.assertTrue(Task.objects.filter(metadata__affects__channels__contains=[self.channel.id]).count() == 1)
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, 'SUCCESS')

        # since tasks run sync in tests, we can't test it in an actual running state
        # so simulate the running state in the task object.
        db_task = Task.objects.get(task_id=task.id)
        db_task.status = 'STARTED'
        db_task.save()
        url = '{}?channel_id={}'.format(self.task_url, self.channel.id)
        response = self.get(url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'STARTED')
        self.assertEqual(response.data[0]['task_type'], 'progress-test')
        self.assertEqual(response.data[0]['metadata']['progress'], 100)
        self.assertEqual(response.data[0]['metadata']['result'], 42)

        # once the task is completed, it should be removed from the list of channel tasks.
        db_task.status = 'SUCCESS'
        db_task.save()
        response = self.get(url)
        self.assertEqual(len(response.data), 0)

        url = '{}?channel_id={}'.format(self.task_url, task_info.id, "nope")
        response = self.get(url)
        self.assertEqual(len(response.data), 0)

    def test_asynctask_reports_error(self):
        """
        Tests that if a task fails with an error, that the error information is stored in the Task object for later
        retrieval and analysis.
        """
        metadata = {'test': True}
        task_options = {
            'user_id': self.user.pk,
            'metadata': metadata
        }
        task, task_info = create_async_task('error-test', task_options)

        task = Task.objects.get(task_id=task.id)
        self.assertEqual(task.status, 'FAILURE')
        self.assertTrue('error' in task.metadata)

        error = task.metadata['error']
        self.assertItemsEqual(list(error.keys()), ['message', 'task_args', 'task_kwargs', 'traceback'])
        self.assertEqual(len(error['task_args']), 0)
        self.assertEqual(len(error['task_kwargs']), 0)
        traceback_string = '\n'.join(error['traceback'])
        self.assertTrue("Exception" in traceback_string)
        self.assertTrue("I'm sorry Dave, I'm afraid I can't do that." in traceback_string)

    def test_only_create_async_task_creates_task_entry(self):
        """
        Test that we don't add a Task entry when we create a new Celery task outside of the create_async_task API.
        """

        task = non_async_test_task.apply_async()

        result = task.get()
        self.assertEquals(result, 42)
        self.assertEquals(Task.objects.filter(task_id=task.id).count(), 0)

    def test_duplicate_nodes_task(self):
        metadata = {'test': True}
        task_options = {
            'user_id': self.user.pk,
            'metadata': metadata
        }

        ids = []
        node_ids = []
        for i in range(3, 6):
            node_id = '0000000000000000000000000000000' + str(i)
            node_ids.append(node_id)
            node = ContentNode.objects.get(node_id=node_id)
            ids.append(node.pk)

        parent_node = ContentNode.objects.get(node_id='00000000000000000000000000000002')

        task_args = {
            'user_id': self.user.pk,
            'channel_id': self.channel.pk,
            'node_ids': ids,
            'target_parent': parent_node.pk
        }
        task, task_info = create_async_task('duplicate-nodes', task_options, task_args)

        # progress is retrieved dynamically upon calls to get the task info, so
        # use an API call rather than checking the db directly for progress.
        url = '{}/{}'.format(self.task_url, task_info.id)
        response = self.get(url)
        assert response.data['status'] == 'SUCCESS', "Task failed, exception: {}".format(response.data['metadata']['error']['traceback'])
        self.assertEqual(response.data['status'], 'SUCCESS')
        self.assertEqual(response.data['task_type'], 'duplicate-nodes')
        self.assertEqual(response.data['metadata']['progress'], 100)
        result = response.data['metadata']['result']
        self.assertTrue(isinstance(result, list))

        parent_node.refresh_from_db()
        children = parent_node.get_children()

        child_ids = []
        for child in children:
            child_ids.append(child.source_node_id)

        # make sure the changes were actually made to the DB
        for node_id in node_ids:
            assert node_id in child_ids

        # make sure the copies are in the results
        for item in result:
            assert item['original_source_node_id'] in node_ids
