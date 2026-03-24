from importlib import import_module
from urllib.parse import urlencode

import mock
from celery import states
from django.urls import reverse
from django_celery_results.models import TaskResult
from search.models import ContentNodeFullTextSearch

from contentcuration.celery import app
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


def reverse_with_query(
    viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None
):
    """
    This helper wraps the Django `reverse` function to support the `query` argument.
    This argument is supported natively since Django 5.2, so when Django is updated
    above this version, this helper can be removed.
    """
    url = reverse(
        viewname, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app
    )
    if query:
        return f"{url}?{urlencode(query)}"
    return url


class EagerTasksTestMixin(object):
    """
    Mixin to make Celery tasks run synchronously during the tests.
    """

    celery_task_always_eager = None

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # update celery so tasks are always eager for this test, meaning they'll execute synchronously
        cls.celery_task_always_eager = app.conf.task_always_eager
        app.conf.update(task_always_eager=True)

    def setUp(self):
        super().setUp()
        clear_tasks()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        app.conf.update(task_always_eager=cls.celery_task_always_eager)
