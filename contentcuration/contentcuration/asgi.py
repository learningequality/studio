import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter

from contentcuration.viewsets.websockets.routing import websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

application = ProtocolTypeRouter({
    "websocket":
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
})
