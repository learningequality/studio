from django.conf.urls import url
import search.views as views

urlpatterns = [
    url(r'^documents/$', views.search_documents),
    url(r'^topics/$', views.search_topics)
]
