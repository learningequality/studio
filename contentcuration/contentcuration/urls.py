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
from contentcuration.models import ContentNode, License, Channel, TopicTree, File, FileFormat, FormatPreset, ContentTag, Exercise, AssessmentItem, ContentKind
import serializers
import views
from contentcuration import api

from rest_framework_bulk.routes import BulkRouter
from rest_framework_bulk.generics import BulkModelViewSet

class LicenseViewSet(viewsets.ModelViewSet):
    queryset = License.objects.all()
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

class FileFormatViewSet(viewsets.ModelViewSet):
    queryset = FileFormat.objects.all()
    serializer_class = serializers.FileFormatSerializer

class FormatPresetViewSet(viewsets.ModelViewSet):
    queryset = FormatPreset.objects.all()
    serializer_class = serializers.FormatPresetSerializer

class ContentKindViewSet(viewsets.ModelViewSet):
    queryset = ContentKind.objects.all()
    serializer_class = serializers.ContentKindSerializer

class ContentNodeViewSet(BulkModelViewSet):
    queryset = ContentNode.objects.all()
    serializer_class = serializers.ContentNodeSerializer

class TagViewSet(viewsets.ModelViewSet):
    queryset = ContentTag.objects.all()
    serializer_class = serializers.TagSerializer

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
router.register(r'exercise', ExerciseViewSet)
router.register(r'file', FileViewSet)
router.register(r'fileformat', FileFormatViewSet)
router.register(r'preset', FormatPresetViewSet)
router.register(r'tag', TagViewSet)
router.register(r'contentkind', ContentKindViewSet)

bulkrouter = BulkRouter(trailing_slash=False)
bulkrouter.register(r'assessmentitem', AssessmentItemViewSet)
bulkrouter.register(r'contentnode', ContentNodeViewSet)

urlpatterns = [
    url(r'^$', views.base, name='base'),
    url(r'^test/', views.testpage, name='test'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(bulkrouter.urls)),
    url(r'^api/duplicate_node/$', views.duplicate_node, name='duplicate_node'),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'exercises/$', views.exercise_list, name='exercise_list'),
    url(r'exercises/(?P<exercise_id>\w+)', views.exercise, name='exercise'),
    url(r'^file_upload/', views.file_upload, name="file_upload"),
    url(r'^accounts/logout/$', auth_views.logout, {'template_name': 'registration/logout.html'}),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^channels/$', views.channel_list, name='channels'),
    url(r'^channels/(?P<channel_id>[^/]+)', views.channel, name='channel'),
    url(r'^thumbnail_upload/', views.thumbnail_upload, name="thumbnail_upload"),
]


urlpatterns += [url(r'^jsreverse/$', 'django_js_reverse.views.urls_js', name='js_reverse')]

if settings.DEBUG:
    # static files (images, css, javascript, etc.)
    urlpatterns += [
        url(r'^' + settings.MEDIA_URL[1:-1] + '(?P<path>.*)$', 'django.views.static.serve', {
        'document_root': settings.MEDIA_ROOT})]
