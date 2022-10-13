from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/sync_socket/(?P<channel_id>\w+)/$', consumers.SyncConsumer.as_asgi()),
]

http_urlpatterns = [
    re_path(r'healthz$', consumers.HealthCheckHttpConsumer.as_asgi()),
]
