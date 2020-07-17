from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers
from search.viewsets import SearchContentNodeViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'search', SearchContentNodeViewSet, base_name='search')

urlpatterns = [url(r'^', include(router.urls))]
