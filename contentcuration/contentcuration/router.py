"""
As we store content databases in separate SQLite files per channel, we need dynamic database connection routing.
This file contains a decorator/context manager, `using_content_database`, that allows a specific content
database to be specified for a block of code, as follows:

    with using_content_database("nalanda"):
        objects = ContentNode.objects.all()
        return objects.count()

Thanks to https://github.com/ambitioninc/django-dynamic-db-router for inspiration behind the approach taken here.
"""

import os
import threading
from functools import wraps

from django.apps import apps
from django.conf import settings
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.utils import ConnectionDoesNotExist

from kolibri_content.apps import AppConfig

from .errors import ContentModelUsedOutsideDBContext

THREAD_LOCAL = threading.local()

_content_databases_with_attached_default_db = set()


def set_active_content_database(alias):
    setattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', alias)


class ContentDBRouter(object):
    """A router that decides what content database to read from based on a thread-local variable."""

    def _get_db(self, model, **hints):

        # if the model does not inherit from ContentDatabaseModel, leave it for the default database
        if model._meta.app_label != AppConfig.label:
            return None

        # if the model is already associated with a database, use that database
        if hasattr(hints.get("instance", None), "_state"):
            return hints["instance"]._state.db

        # determine the currently active content database, and return the alias
        return get_active_content_database()

    def db_for_read(self, model, **hints):
        return self._get_db(model, **hints)

    def db_for_write(self, model, **hints):
        return self._get_db(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):

        # This can blow up if we are deleting a model, so assume we can migrate if we are deleting a model
        # So, catch the LookupError, and let the migration proceed.
        try:

            model = apps.get_model(app_label=app_label, model_name=model_name) if model_name else None

        except LookupError:

            model = None

        # allow migrations for ContentDatabaseModels on non-default DBs, and for others only on default DB
        if model and model._meta.app_label == AppConfig.label:
            val = db != DEFAULT_DB_ALIAS
        else:
            val = db == DEFAULT_DB_ALIAS

        return val


class using_content_database(object):
    """A decorator and context manager to do queries on a specific content DB.

    :type alias: str
    :param alias: The alias for the content database to run queries on.

    Usage as a context manager:

    .. code-block:: python

        from models import ContentNode

        with using_content_database("nalanda"):
            objects = ContentNode.objects.all()
            return objects.count()

    Usage as a decorator:

    .. code-block:: python

        from models import ContentNode

        @using_content_database('nalanda')
        def delete_all_the_nalanda_content():
            ContentNode.objects.all().delete()

    """

    def __init__(self, alias):
        self.alias = alias

    def __enter__(self):
        self.previous_alias = getattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', None)
        set_active_content_database(self.alias)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        set_active_content_database(self.previous_alias)

    def __call__(self, querying_func):
        # allow using the context manager as a decorator
        @wraps(querying_func)
        def inner(*args, **kwargs):
            # Call the function in our context manager
            with self:
                return querying_func(*args, **kwargs)
        return inner
