from kolibri_public.views import ContentNodeTreeViewset
from kolibri_public.views import ContentNodeViewset
from rest_framework import routers


public_content_v2_router = routers.SimpleRouter()
# public_content_v2_router.register(
#     r"channel", ChannelMetadataViewSet, basename="publicchannel"
# )
public_content_v2_router.register(
    r"contentnode", ContentNodeViewset, basename="publiccontentnode"
)
public_content_v2_router.register(
    r"contentnode_tree",
    ContentNodeTreeViewset,
    basename="publiccontentnode_tree",
)
# public_content_v2_router.register(
#     r"importmetadata", ImportMetadataViewset, basename="importmetadata"
# )

urlpatterns = public_content_v2_router.urls
