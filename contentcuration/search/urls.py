from django.conf.urls import url
import search.views as views

urlpatterns = [
    url(r'^items/$', views.search_items),
    url(r'^topics/$', views.search_topics)
]
