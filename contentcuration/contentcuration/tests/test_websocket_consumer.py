import os

import pytest
from channels.testing import WebsocketCommunicator
from django.core.management import call_command
from django.test import TransactionTestCase

from contentcuration.asgi import application
from contentcuration.tests import testdata

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"


class WebsocketTestCase(TransactionTestCase):
    serialized_rollback = True

    def setUp(self):
        call_command("loadconstants")
        self.user = testdata.user("mrtest@testy.com")

    def tearDown(self):
        self.user.delete()

    @pytest.mark.asyncio
    async def test_authenticated_user_websocket_connection(self):
        self.client.force_login(self.user)
        headers = [(b'cookie', self.client.cookies.output(attrs=["value"], header='', sep='; ').encode())]
        communicator = WebsocketCommunicator(application, 'ws/sync_socket/12312312312123/', headers)
        connected = await communicator.connect()
        assert connected
        await communicator.disconnect()
