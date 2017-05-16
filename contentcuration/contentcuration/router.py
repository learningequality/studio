from kolibri.content.models import ContentDatabaseModel


class Router(object):
    def db_for_read(self, model, **hints):
        db = None
        if issubclass(model, ContentDatabaseModel):
            db = 'export_staging'
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
        else:
            db = None

        model_label = model._meta.label
        # logging.debug("Reading {0} from {1}".format(model_label, db))
        return db

    def db_for_write(self, model, **hints):
        db = None
        if issubclass(model, ContentDatabaseModel):
            db = 'export_staging'
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
        else:
            db = None

        model_label = model._meta.label
        # logging.debug("Writing {0} into {1}".format(model_label, db))
        return db

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if "kolibri" in app_label and db == "default":
            return False  # don't run on main DB
        elif "morango" in app_label and db == "default":
            return False  # don't run morango migrations on the default db either!
        else:
            return None  # we have no opinion here. Best practice!
