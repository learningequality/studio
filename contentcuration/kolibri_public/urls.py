from django.urls import include
from django.urls import path
from django.urls import re_path
from kolibri_public import views_v1
from kolibri_public.import_metadata_view import ImportMetadataViewset
from kolibri_public.views import ChannelMetadataViewSet
from kolibri_public.views import ContentNodeTreeViewset
from kolibri_public.views import ContentNodeViewset
from rest_framework import routers


public_content_v2_router = routers.SimpleRouter()
public_content_v2_router.register(
    r"channel", ChannelMetadataViewSet, basename="publicchannel"
)
public_content_v2_router.register(
    r"contentnode", ContentNodeViewset, basename="publiccontentnode"
)
public_content_v2_router.register(
    r"contentnode_tree",
    ContentNodeTreeViewset,
    basename="publiccontentnode_tree",
)
public_content_v2_router.register(
    r"importmetadata", ImportMetadataViewset, basename="publicimportmetadata"
)

urlpatterns = [
    re_path(
        r"^api/public/channel/(?P<channel_id>[^/]+)",
        views_v1.get_channel_name_by_id,
        name="get_channel_name_by_id",
    ),
    re_path(
        r"^api/public/(?P<version>[^/]+)/channels$",
        views_v1.get_public_channel_list,
        name="get_public_channel_list",
    ),
    re_path(
        r"^api/public/(?P<version>[^/]+)/channels/lookup/(?P<identifier>[^/]+)",
        views_v1.get_public_channel_lookup,
        name="get_public_channel_lookup",
    ),
    re_path(
        r"^api/public/info", views_v1.InfoViewSet.as_view({"get": "list"}), name="info"
    ),
    path("api/public/v2/", include(public_content_v2_router.urls)),
]
