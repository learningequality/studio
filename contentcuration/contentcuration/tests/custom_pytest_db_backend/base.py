from django.db.backends.postgresql.base import DatabaseWrapper as PostgresDatabaseWrapper
from django.db.backends.postgresql.creation import DatabaseCreation as PostgresDatabaseCreation


class CustomDBCreationForPytest(PostgresDatabaseCreation):
    """
    Overriding creation module to enable postgres pgvector extension before
    pytest runs migration. Because embeddings table rely on pgvector
    extension to work.
    """

    def _create_test_db(self, verbosity, autoclobber, keepdb=False):
        from contentcuration.management.commands.setup import enable_pgvector_extension

        # Create test database and get its name.
        test_db_name = super()._create_test_db(verbosity, autoclobber, keepdb)

        # Close current nodb_cursor connection and point connection to the
        # newly created test database.
        self.connection.close()
        self.connection.settings_dict["NAME"] = test_db_name

        # Enable pgvector extension.
        enable_pgvector_extension(self.connection)


class DatabaseWrapper(PostgresDatabaseWrapper):
    """
    A database wrapper to customise creation module. Rest everything is same as
    Postgres.
    """
    creation_class = CustomDBCreationForPytest
