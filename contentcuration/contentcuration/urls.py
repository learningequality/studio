"""URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf.urls import include, url
from django.conf import settings
from django.contrib import admin
from django.contrib.auth import views as auth_views
from rest_framework import routers, viewsets
from rest_framework.permissions import AllowAny
from contentcuration.models import Channel, TopicTree, ContentTag, Node, ContentLicense, Exercise, AssessmentItem, File, Format, MimeType
import serializers
import views
from contentcuration import api

from rest_framework_bulk.routes import BulkRouter
from rest_framework_bulk.generics import BulkModelViewSet

class LicenseViewSet(viewsets.ModelViewSet):
    queryset = ContentLicense.objects.all()
    serializer_class = serializers.LicenseSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = serializers.ChannelSerializer

class TopicTreeViewSet(viewsets.ModelViewSet):
    queryset = TopicTree.objects.all()
    serializer_class = serializers.TopicTreeSerializer

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = serializers.FileSerializer

class FormatViewSet(viewsets.ModelViewSet):
    queryset = Format.objects.all()
    serializer_class = serializers.FormatSerializer

class MimeTypeViewSet(viewsets.ModelViewSet):
    queryset = MimeType.objects.all()
    serializer_class = serializers.MimeTypeSerializer

class NodeViewSet(BulkModelViewSet):
    queryset = Node.objects.all()
    serializer_class = serializers.NodeSerializer

class TagViewSet(viewsets.ModelViewSet):
    queryset = ContentTag.objects.all()
    serializer_class = serializers.TagSerializer

    def batch_save_tags(self, request, *args, **kwargs):
        """
        endpoint for api method
        """
        return api.batch_save_tags(request)

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = serializers.ExerciseSerializer
    permission_classes = [AllowAny]


class AssessmentItemViewSet(BulkModelViewSet):
    queryset = AssessmentItem.objects.all()
    serializer_class = serializers.AssessmentItemSerializer

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'license', LicenseViewSet)
router.register(r'channel', ChannelViewSet)
router.register(r'topictree', TopicTreeViewSet)
router.register(r'node', NodeViewSet)
router.register(r'exercise', ExerciseViewSet)
router.register(r'file', FileViewSet)
router.register(r'format', FormatViewSet)
router.register(r'mimetype', MimeTypeViewSet)
router.register(r'tag', TagViewSet)

bulkrouter = BulkRouter(trailing_slash=False)
bulkrouter.register(r'assessmentitem', AssessmentItemViewSet)

urlpatterns = [
    url(r'^$', views.base, name='base'),
    url(r'^test/', views.testpage, name='test'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(bulkrouter.urls)),
    url(r'^api/save_tags/', TagViewSet.as_view({'post': 'batch_save_tags'})),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'exercises/$', views.exercise_list, name='exercise_list'),
    url(r'exercises/(?P<exercise_id>\w+)', views.exercise, name='exercise'),
    url(r'^file_upload/', views.file_upload, name="file_upload"),
    url(r'^accounts/logout/$', auth_views.logout, {'template_name': 'registration/logout.html'}),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^channels/$', views.channel_list, name='channels'),
    url(r'^channels/(?P<channel_id>\w+)', views.channel, name='channel'),
]


urlpatterns += [url(r'^jsreverse/$', 'django_js_reverse.views.urls_js', name='js_reverse')]

if settings.DEBUG:
    # static files (images, css, javascript, etc.)
    urlpatterns += [
        url(r'^media/(?P<path>.*)$', 'django.views.static.serve', {
        'document_root': settings.MEDIA_ROOT})]
