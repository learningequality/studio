import logging as logger
from contextlib import contextmanager

from django.db import connection


logging = logger.getLogger(__name__)

# signed limits are 2**32 or 2**64, so one less power of 2
# to become unsigned limits (half above 0, half below 0)
INT_32BIT = 2 ** 31
INT_64BIT = 2 ** 63


class AdvisoryLockBusy(RuntimeError):
    pass


def _prepare_keys(keys):
    """
    Ensures that integers do not exceed postgres constraints:
      - signed 64bit allowed with single key
      - signed 32bit allowed with two keys
    :param keys: A list of unsigned integers
    :return: A list of signed integers
    """
    limit = INT_64BIT if len(keys) == 1 else INT_32BIT
    new_keys = []
    for key in keys:
        # if key is over the limit, convert to negative int since key should be unsigned int
        if key >= limit:
            key = limit - key
        if key < -limit or key >= limit:
            raise OverflowError(f"Advisory lock key '{key}' is too large")
        new_keys.append(key)
    return new_keys


@contextmanager
def execute_lock(key1, key2=None, unlock=False, session=False, shared=False, wait=True):
    """
    Creates or destroys an advisory lock within postgres

    :param key1: An int sent to the PG lock function
    :param key2: A 2nd int sent to the PG lock function
    :param unlock: A bool representing whether query should use `unlock`
    :param session: A bool indicating if this should persist outside of transaction
    :param shared: A bool indicating if this should be shared, otherwise exclusive
    :param wait: A bool indicating if it should use a `try` PG function
    """
    if not session:
        if not connection.in_atomic_block:
            raise NotImplementedError("Advisory lock requires transaction")
        if unlock:
            raise NotImplementedError("Transaction level locks unlock automatically")

    keys = [key1]
    if key2 is not None:
        keys.append(key2)
    keys = _prepare_keys(keys)

    query = "SELECT pg{_try}_advisory_{xact_}{lock}{_shared}({keys}) AS lock;".format(
        _try="" if wait else "_try",
        xact_="" if session else "xact_",
        lock="unlock" if unlock else "lock",
        _shared="_shared" if shared else "",
        keys=", ".join(["%s" for i in range(0, 2 if key2 is not None else 1)]),
    )

    log_query = f"'{query}' with params {keys}"
    logging.debug(f"Acquiring advisory lock: {log_query}")
    with connection.cursor() as c:
        c.execute(query, keys)
        logging.debug(f"Acquired advisory lock: {log_query}")
        yield c


def advisory_lock(key1, key2=None, shared=False):
    """
    Creates a transaction level advisory lock that blocks until ready

    :param key1: int
    :param key2: int
    :param shared: bool
    """
    with execute_lock(key1, key2=key2, shared=shared):
        # the lock will exist until the transaction is either committed or rolled-back
        pass


def try_advisory_lock(key1, key2=None, shared=False):
    """
    Creates a transaction level advisory lock that doesn't block

    :param key1: int
    :param key2: int
    :param shared: bool
    :raises: AdvisoryLockBusy
    """
    with execute_lock(key1, key2=key2, shared=shared, wait=False) as cursor:
        # for `try` locks, the PG function will return True or False,
        # representing whether the lock was acquired or not
        results = cursor.fetchone()
        if not results[0]:
            raise AdvisoryLockBusy("Unable to acquire advisory lock")
