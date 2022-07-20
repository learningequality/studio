import os

import pytest
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.core.management import call_command
from django.test import override_settings
from django.test import TransactionTestCase

from contentcuration.asgi import application
from contentcuration.tests import testdata

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"


class WebsocketTestCase(TransactionTestCase):

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

    @pytest.mark.asyncio
    async def test_unauthenticated_user_websocket_connection(self):
        headers = [(b'cookie', self.client.cookies.output(attrs=["value"], header='', sep='; ').encode())]
        communicator = WebsocketCommunicator(application, 'ws/sync_socket/12312312312123/', headers)
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    @pytest.mark.asyncio
    async def test_disconnect_websockets(self):
        self.client.force_login(self.user)
        headers = [(b'cookie', self.client.cookies.output(attrs=["value"], header='', sep='; ').encode())]
        channel_layers_setting = {
            "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
        }
        with override_settings(CHANNEL_LAYERS=channel_layers_setting):
            communicator = WebsocketCommunicator(application, 'ws/sync_socket/12312312312123/', headers)
            connected, _ = await communicator.connect()
            channel_layer = get_channel_layer()
            assert connected
            await communicator.disconnect()
            assert channel_layer.groups == {}

    @pytest.mark.asyncio
    async def test_send_payload_websockets(self):
        self.client.force_login(self.user)
        headers = [(b'cookie', self.client.cookies.output(attrs=["value"], header='', sep='; ').encode())]
        communicator = WebsocketCommunicator(application, 'ws/sync_socket/12312312312123/', headers)
        connected = await communicator.connect()
        assert connected
        await communicator.send_json_to({
            "payload": {
                "changes": [
                    {
                        "type": 2,
                        "key": "7ae83505f20a4642a004fadde7f151ed",
                        "table": "channel",
                        "rev": 253,
                        "channel_id": "7ae83505f20a4642a004fadde7f151ed",
                        "mods": {
                            "name": "test"
                        }
                    }
                ],
                "channel_revs": {
                    "7ae83505f20a4642a004fadde7f151ed": 51
                },
                "user_rev": 0
            }})
        response = await communicator.receive_json_from()
        assert response["response_payload"]
        await communicator.disconnect()

    @pytest.mark.asyncio
    async def test_channels_groups(self):
        self.client.force_login(self.user)
        headers = [(b'cookie', self.client.cookies.output(attrs=["value"], header='', sep='; ').encode())]
        channel_layers_setting = {
            "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
        }
        with override_settings(CHANNEL_LAYERS=channel_layers_setting):
            communicator = WebsocketCommunicator(application, 'ws/sync_socket/12312312312123/', headers)
            connected, _ = await communicator.connect()
            channel_layer = get_channel_layer()
            # check the grou for channel exist
            assert channel_layer.groups['12312312312123']
            assert channel_layer.groups[f"{self.user.id}"]
            assert connected
            await communicator.disconnect()
