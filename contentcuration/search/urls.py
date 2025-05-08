from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers
from search.viewsets.contentnode import SearchContentNodeViewSet
from search.viewsets.savedsearch import SavedSearchViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register(r"search", SearchContentNodeViewSet, basename="search")
router.register(r"saved-search", SavedSearchViewSet)

urlpatterns = [url(r"^", include(router.urls))]
