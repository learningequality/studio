from django.db.backends.postgresql.features import DatabaseFeatures
from django.db.backends.signals import connection_created
from django.dispatch import receiver


@receiver(connection_created)
def set_jit(sender, connection, **kwargs):
    """
    Disable Just-In-Time compilation for PostgreSQL databases >= 11, at least until we can
    optimize its use.
    https://www.postgresql.org/docs/12/runtime-config-query.html#GUC-JIT
    """
    if connection.vendor == 'postgresql':
        db_features = DatabaseFeatures(connection)
        # JIT is new in v11, and for reference this returns True for v11 and following
        if db_features.is_postgresql_11:
            with connection.cursor() as cursor:
                cursor.execute("SET jit = 'off';")
