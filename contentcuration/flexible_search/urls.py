from django.conf.urls import url, include
import search.views as views
from haystack.views import SearchView
from rest_framework import routers

from .views import ContentNodeSearchView

router = routers.DefaultRouter()
router.register("content", ContentNodeSearchView, base_name="content-node-search")

urlpatterns = [
    url(r'', include(router.urls)),
    # url(r'^items/$', views.search_items),
    # url(r'^topics/$', views.search_topics)
]

