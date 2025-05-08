from django.core import management
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/


class MigrationTestCase(TransactionTestCase):
    migrate_from = None
    migrate_to = None
    app = None

    def setUp(self):
        assert (
            self.migrate_from and self.migrate_to
        ), "TestCase '{}' must define migrate_from and migrate_to properties".format(
            type(self).__name__
        )

        migrate_from = [(self.app, self.migrate_from)]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(migrate_from).apps

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    @classmethod
    def tearDownClass(cls):
        """
        Ensures that the DB is reset and fully migrated due to this
        test class's selective migrations
        """
        management.call_command("migrate")
