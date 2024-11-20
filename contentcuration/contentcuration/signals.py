from django.db.backends.signals import connection_created
from django.dispatch import receiver


@receiver(connection_created)
def set_jit(sender, connection, **kwargs):
    """
    Disable Just-In-Time compilation for PostgreSQL databases, at least until we can
    optimize its use.
    https://www.postgresql.org/docs/12/runtime-config-query.html#GUC-JIT
    """
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("SET jit = 'off';")
