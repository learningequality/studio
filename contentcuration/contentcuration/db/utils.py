from contextlib import contextmanager

from django.db import connections
from django.db import DEFAULT_DB_ALIAS


TEMPORARY_MODELS = {}
SQL_CREATE_TEMP_TABLE = "CREATE TEMP TABLE %(table)s (%(definition)s) ON COMMIT DROP"


@contextmanager
def temporary_model(model, using=DEFAULT_DB_ALIAS, atomic=True):
    connection = connections[using]
    temp_models = TEMPORARY_MODELS.get(using, [])

    if model in temp_models:
        yield model
        return

    temp_models.append(model)
    TEMPORARY_MODELS.update({using: temp_models})

    # creates atomic transaction
    with connection.schema_editor(atomic=atomic) as schema:
        sql_create_table = schema.sql_create_table

        try:
            schema.sql_create_table = SQL_CREATE_TEMP_TABLE
            schema.create_model(model)
            yield model
        finally:
            schema.sql_create_table = sql_create_table
            TEMPORARY_MODELS.get(using).remove(model)
