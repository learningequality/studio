import os

import pytest
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import TestCase
from django.urls import re_path

from ..viewsets.websockets.consumers import SyncConsumer
from contentcuration.models import User
# from .base import BaseAPITestCase

application = AuthMiddlewareStack(
    URLRouter([
        re_path(r'ws/sync_socket/(?P<channel_id>\w+)/$', SyncConsumer.as_asgi()),
    ])
)

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"


@database_sync_to_async
def create_user(self):
    user = User.objects.create(
        email="mrtest@testy.com",
    )
    user.set_password("password")
    user.save()
    return user


class WebsocketTestCase(TestCase):
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        user = create_user()
        self.client.force_login(user)
        headers = [(b'origin', b'...'), (b'cookie', self.client.cookies.output(header='', sep='; ').encode())]
        communicator = WebsocketCommunicator(application, '/ws/sync_socket/12312312312123/', headers)
        connected, subprotocol = await communicator.connect()
        assert connected
        # Close
        await communicator.disconnect()
