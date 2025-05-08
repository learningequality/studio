from contextlib import contextmanager
from multiprocessing import get_all_start_methods
from multiprocessing import get_start_method
from multiprocessing import Pipe
from multiprocessing import Process
from multiprocessing import set_start_method
from time import sleep

from django.db import transaction
from django.test.testcases import SimpleTestCase
from django_concurrent_tests.management.commands.concurrent_call_wrapper import (
    use_test_databases,
)
from mock import mock
from mock import patch
from pytest import mark
from pytest import raises

from contentcuration.db.advisory_lock import advisory_lock
from contentcuration.db.advisory_lock import AdvisoryLockBusy
from contentcuration.db.advisory_lock import execute_lock
from contentcuration.db.advisory_lock import try_advisory_lock

TEST_LOCK = 1337

# flake8 doesn't like the parameterized formatting
# flake8: noqa


@mark.parametrize(
    "key1, key2, unlock, session, shared, wait, expected_query",
    [
        # transaction level
        (
            1,
            None,
            False,
            False,
            False,
            True,
            "SELECT pg_advisory_xact_lock(%s) AS lock;",
        ),
        (
            3,
            None,
            False,
            False,
            True,
            True,
            "SELECT pg_advisory_xact_lock_shared(%s) AS lock;",
        ),
        (
            4,
            None,
            False,
            False,
            True,
            False,
            "SELECT pg_try_advisory_xact_lock_shared(%s) AS lock;",
        ),
        (
            5,
            None,
            False,
            False,
            False,
            False,
            "SELECT pg_try_advisory_xact_lock(%s) AS lock;",
        ),
        (
            6,
            1,
            False,
            False,
            False,
            True,
            "SELECT pg_advisory_xact_lock(%s, %s) AS lock;",
        ),
        (
            7,
            2,
            False,
            False,
            True,
            True,
            "SELECT pg_advisory_xact_lock_shared(%s, %s) AS lock;",
        ),
        (
            8,
            3,
            False,
            False,
            True,
            False,
            "SELECT pg_try_advisory_xact_lock_shared(%s, %s) AS lock;",
        ),
        (
            9,
            4,
            False,
            False,
            False,
            False,
            "SELECT pg_try_advisory_xact_lock(%s, %s) AS lock;",
        ),
        # session level
        (10, None, False, True, False, True, "SELECT pg_advisory_lock(%s) AS lock;"),
        (11, None, True, True, False, True, "SELECT pg_advisory_unlock(%s) AS lock;"),
        (
            12,
            None,
            False,
            True,
            True,
            True,
            "SELECT pg_advisory_lock_shared(%s) AS lock;",
        ),
        (
            13,
            None,
            True,
            True,
            True,
            True,
            "SELECT pg_advisory_unlock_shared(%s) AS lock;",
        ),
        (
            14,
            None,
            False,
            True,
            False,
            False,
            "SELECT pg_try_advisory_lock(%s) AS lock;",
        ),
        (
            15,
            None,
            True,
            True,
            False,
            False,
            "SELECT pg_try_advisory_unlock(%s) AS lock;",
        ),
        (
            16,
            None,
            False,
            True,
            True,
            False,
            "SELECT pg_try_advisory_lock_shared(%s) AS lock;",
        ),
        (
            17,
            None,
            True,
            True,
            True,
            False,
            "SELECT pg_try_advisory_unlock_shared(%s) AS lock;",
        ),
        (18, 1, False, True, False, True, "SELECT pg_advisory_lock(%s, %s) AS lock;"),
        (19, 2, True, True, False, True, "SELECT pg_advisory_unlock(%s, %s) AS lock;"),
        (
            20,
            3,
            False,
            True,
            True,
            True,
            "SELECT pg_advisory_lock_shared(%s, %s) AS lock;",
        ),
        (
            21,
            4,
            True,
            True,
            True,
            True,
            "SELECT pg_advisory_unlock_shared(%s, %s) AS lock;",
        ),
        (
            22,
            5,
            False,
            True,
            False,
            False,
            "SELECT pg_try_advisory_lock(%s, %s) AS lock;",
        ),
        (
            23,
            6,
            True,
            True,
            False,
            False,
            "SELECT pg_try_advisory_unlock(%s, %s) AS lock;",
        ),
        (
            24,
            7,
            False,
            True,
            True,
            False,
            "SELECT pg_try_advisory_lock_shared(%s, %s) AS lock;",
        ),
        (
            25,
            8,
            True,
            True,
            True,
            False,
            "SELECT pg_try_advisory_unlock_shared(%s, %s) AS lock;",
        ),
    ],
)
def test_execute_lock(key1, key2, unlock, session, shared, wait, expected_query):
    with patch("contentcuration.db.advisory_lock.connection") as conn:
        cursor = mock.Mock()
        conn.cursor.return_value.__enter__.return_value = cursor
        conn.in_atomic_block.return_value = not session
        cursor.execute.return_value = True

        with execute_lock(
            key1, key2=key2, unlock=unlock, session=session, shared=shared, wait=wait
        ) as c:
            assert c == cursor

        expected_params = [key1]
        if key2 is not None:
            expected_params.append(key2)

        query, params = cursor.execute.call_args_list[0][0]
        assert query == expected_query
        assert params == expected_params


@mark.parametrize(
    "unlock, in_atomic_block",
    [
        (False, False),
        (True, False),
        (True, True),
    ],
)
def test_execute_lock__not_implemented(unlock, in_atomic_block):
    with patch("contentcuration.db.advisory_lock.connection") as conn:
        conn.in_atomic_block = in_atomic_block

        with raises(NotImplementedError):
            with execute_lock(
                99, key2=99, unlock=unlock, session=False, shared=False, wait=False
            ):
                pass


START_SIGNAL = "START_SIGNAL"
END_SIGNAL = "END_SIGNAL"
SLEEP_SEC = 0.1


def wait_for(conn, signal):
    while True:
        msg = conn.recv()
        if msg == signal:
            break
        sleep(SLEEP_SEC)


def child_lock(conn, shared):
    # make sure we're connecting to the test database
    use_test_databases()
    with transaction.atomic():
        advisory_lock(TEST_LOCK, shared=shared)
        sleep(SLEEP_SEC)
        conn.send(START_SIGNAL)
        wait_for(conn, END_SIGNAL)


# set to spawn, otherwise process would inherit connections, meaning queries would still be in
# the same transaction. If we can't use spawn, then we'll mark the test skipped
skipped = True
start_method = get_start_method(allow_none=True)
if start_method == "spawn":
    skipped = False
elif start_method is None and "spawn" in get_all_start_methods():
    set_start_method("spawn")
    skipped = False


@mark.skipif(skipped, reason="Requires spawn capability")
class AdvisoryLockDatabaseTest(SimpleTestCase):
    """
    Test case that creates simultaneous locking situations
    """

    # this test manages its own transactions
    allow_database_queries = True

    databases = ["default"]

    @contextmanager
    def child_lock(self, shared=False):
        parent_conn, child_conn = Pipe()
        p = Process(target=child_lock, args=(child_conn, shared))
        p.start()

        try:
            with transaction.atomic():
                wait_for(parent_conn, START_SIGNAL)
                yield parent_conn
        finally:
            parent_conn.send(END_SIGNAL)
            p.join(2)

    @mark.timeout(30)
    def test_shared(self):
        with self.child_lock(shared=True):
            # this won't raise an error because shared mode should allow
            # both locks simultaneously
            try_advisory_lock(TEST_LOCK, shared=True)

    @mark.timeout(30)
    def test_try__busy(self):
        with self.child_lock(shared=False):
            # since the lock should already be acquired, this will raise the error
            with raises(AdvisoryLockBusy):
                try_advisory_lock(TEST_LOCK)
