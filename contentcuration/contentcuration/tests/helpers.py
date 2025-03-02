from importlib import import_module

import mock
from celery import states
from django_celery_results.models import TaskResult
from search.models import ContentNodeFullTextSearch

from contentcuration.models import ContentNode


def clear_tasks(except_task_id=None):
    """
    Revokes all tasks, except the task if specified by ID

    :param except_task_id: A task to exclude from revocation
    """
    from contentcuration.celery import app

    # remove any other tasks
    qs = TaskResult.objects.all()
    if except_task_id:
        qs = qs.exclude(task_id=except_task_id)
    for task_id in qs.values_list("task_id", flat=True):
        app.control.revoke(task_id, terminate=True)
    qs.update(status=states.REVOKED)


def mock_class_instance(target):
    """
    Helper that returns a Mocked instance of the `target` class

    :param target: A class or string module path to the class
    :return: A mocked class instance of `target`
    """
    if isinstance(target, str):
        target_split = target.split(".")
        target_mod = ".".join(target_split[:-1])
        target_name = target_split[-1]

        module = import_module(target_mod)
        target_cls = getattr(module, target_name)
    else:
        target_cls = target

    # ContentNode's node_fts field can be handled by Django when tests
    # access the database but we mock it so that we don't need to query
    # the database. By doing so we get faster test execution.
    if type(target_cls) is ContentNode:
        target_cls.node_fts = ContentNodeFullTextSearch()

    class MockClass(target_cls):
        def __new__(cls, *args, **kwargs):
            return mock.Mock(spec_set=cls)
    return MockClass()
