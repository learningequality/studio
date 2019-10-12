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

    An example:

        class TempThing(TemporaryModel):
            id = AutoField(primary_key=True)
            thing_id = IntegerField()
            thing_name = CharField()
            objects = CustomManager()


        with temporary_model(TempThing):
            # TempThing table now exists
            TempThing.objects.bulk_create([
                TempThing(thing_id=thing.get('id', None), thing_name=thing_name['name'])
                for thing in unsettled_things
            ])

            # Example: cross reference large list, get new
            existing = RealThing.objects.filter(name=OuterRef('thing_name'))
            new_things = TempThing.objects.exclude_by(Exists(existing))

            # Example: cross reference large list, get matching
            existing = RealThing.objects.filter(name=OuterRef('thing_name'))
            old_things = TempThing.objects.filter_by(Exists(existing))

            # Example: insert into another
            existing = RealThing.objects.filter(name=OuterRef('thing_name'))
            new_things = TempThing.objects.exclude_by(Exists(existing))
            RealThing.objects.create_from(new_things, name='thing_name')

            # Example: update another table
            update_from = TempThing.objects.filter(thing_id__isnull=False)
            RealThing.objects.update_from(Join(update_from, id='thing_id'), name='thing_name')

        # outside of `temporary_model` context, table no longer exists
        # end of example


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
