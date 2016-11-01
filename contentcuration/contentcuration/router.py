import logging
from kolibri.content.models import ContentDatabaseModel


class Router(object):

    def db_for_read(self, model, **hints):
        db = None
        model_label = None

        if issubclass(model, ContentDatabaseModel):
            db = 'export_staging'
            model_label = model._meta.label
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
            model_label = model._meta.label
        else:
            db = None
        # logging.debug("Reading {0} from {1}".format(model_label, db))
        return db

    def db_for_write(self, model, **hints):
        db = None
        model_label = None
        if issubclass(model, ContentDatabaseModel):
            db = 'export_staging'
            model_label = model._meta.label
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
            model_label = model._meta.label
        else:
            db = None

        # logging.debug("Writing {0} into {1}".format(model_label, db))
        return db
