import logging


class Router(object):

    def db_for_read(self, model, **hints):
        db = None
        logging.debug("Requesting where to read for {}".format(model.__name__))
        if model.__module__ == 'kolibri.content.models':
            db = 'export_staging'
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
        else:
            db = None

        logging.debug("Reading {0.__name__} from {1}".format(model, db))

    def db_for_write(self, model, **hints):
        db = None
        logging.debug("Requesting where to write for {}".format(model.__name__))
        if model.__module__ == 'kolibri.content.models':
            db = 'export_staging'
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
        else:
            db = None

        logging.debug("Reading {0.__name__} from {1}".format(model, db))
        return db
