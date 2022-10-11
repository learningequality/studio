import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter
from django.conf import settings

from contentcuration.viewsets.websockets.routing import http_urlpatterns
from contentcuration.viewsets.websockets.routing import websocket_urlpatterns

django.setup(set_prefix=False)

if settings.DEBUG:
    # Settings for development environment
    application = ProtocolTypeRouter({
        "websocket":
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    })
else:
    # Settings for production environment
    # we dont want to expose other url routes to daphne server
    application = ProtocolTypeRouter({
        "http":
        URLRouter(http_urlpatterns),

        "websocket":
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    })
