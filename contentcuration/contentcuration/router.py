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

        return db

    def db_for_write(self, model, **hints):
        db = None
        if issubclass(model, ContentDatabaseModel):
            db = 'export_staging'
        elif model.__module__ == 'contentcuration.models':
            db = 'default'
        else:
            db = None

        return db

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if "kolibri" in app_label and db == "default":
            return False        # don't run on main DB
        else:
            return None         # we have no opinion here. Best practice!
