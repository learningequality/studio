import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter
from django.conf import settings

from contentcuration.viewsets.websockets.routing import http_urlpatterns
from contentcuration.viewsets.websockets.routing import websocket_urlpatterns

django.setup(set_prefix=False)

protocol_config = {
    "websocket":
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
}

# production settings to add healthcheck
if not settings.DEBUG:
    protocol_config.update(http=URLRouter(http_urlpatterns))

application = ProtocolTypeRouter(protocol_config)
