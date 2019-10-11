from contextlib import contextmanager

from django.db import connections
from django.db import DEFAULT_DB_ALIAS


TEMPORARY_MODELS = {}
SQL_CREATE_TEMP_TABLE = "CREATE TEMP TABLE %(table)s (%(definition)s) ON COMMIT DROP"


@contextmanager
def temporary_model(model, using=DEFAULT_DB_ALIAS, atomic=True):
    """
    Creates a temporary database table, using a temporary model class, such that the implementer
    is able to use Django ORM tooling to interact with the short-lived instance of the table.

    :param model: The temporary model used to create the TEMP TABLE
    :type model: contentcuration.db.models.base.TemporaryModel
    :param using: The database connection alias
    :type using: str
    :param atomic: Bool indicating whether this will also initiate a transaction, as is default
    :type atomic: bool
    """
    connection = connections[using]
    temp_models = TEMPORARY_MODELS.get(using, [])

    # Avoid attempting to re-create temporary models
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
