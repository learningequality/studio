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
from django.core.urlresolvers import reverse_lazy
from rest_framework import routers, viewsets
from rest_framework.permissions import AllowAny
from contentcuration.models import ContentNode, License, Channel, File, FileFormat, FormatPreset, ContentTag, Exercise, AssessmentItem, ContentKind, Language, User, Invitation
import contentcuration.serializers as serializers
import contentcuration.views as views
from contentcuration import api

from rest_framework_bulk.routes import BulkRouter
from rest_framework_bulk.generics import BulkModelViewSet

class LicenseViewSet(viewsets.ModelViewSet):
    queryset = License.objects.all()
    serializer_class = serializers.LicenseSerializer

class LanguageViewSet(viewsets.ModelViewSet):
    queryset = Language.objects.all()
    serializer_class = serializers.LanguageSerializer

class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = serializers.ChannelSerializer

class FileViewSet(BulkModelViewSet):
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

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = serializers.InvitationSerializer

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = serializers.ExerciseSerializer
    permission_classes = [AllowAny]


class AssessmentItemViewSet(BulkModelViewSet):
    queryset = AssessmentItem.objects.all()
    serializer_class = serializers.AssessmentItemSerializer

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'license', LicenseViewSet)
router.register(r'language', LanguageViewSet)
router.register(r'channel', ChannelViewSet)
router.register(r'exercise', ExerciseViewSet)
router.register(r'fileformat', FileFormatViewSet)
router.register(r'preset', FormatPresetViewSet)
router.register(r'tag', TagViewSet)
router.register(r'contentkind', ContentKindViewSet)
router.register(r'user', UserViewSet)
router.register(r'invitation', InvitationViewSet)

bulkrouter = BulkRouter(trailing_slash=False)
bulkrouter.register(r'assessmentitem', AssessmentItemViewSet)
bulkrouter.register(r'contentnode', ContentNodeViewSet)
bulkrouter.register(r'file', FileViewSet)

urlpatterns = [
    url(r'^$', views.base, name='base'),
    url(r'^test/', views.testpage, name='test'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(bulkrouter.urls)),
    url(r'^api/duplicate_nodes/$', views.duplicate_nodes, name='duplicate_nodes'),
    url(r'^api/publish_channel/$', views.publish_channel, name='publish_channel'),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'exercises/$', views.exercise_list, name='exercise_list'),
    url(r'exercises/(?P<exercise_id>\w+)', views.exercise, name='exercise'),
    url(r'^file_upload/', views.file_upload, name="file_upload"),
    url(r'^file_create/', views.file_create, name="file_create"),
    url(r'^accounts/logout/$', auth_views.logout, {'template_name': 'registration/logout.html'}),
    url(r'^accounts/password/reset/$',auth_views.password_reset,{'post_reset_redirect': reverse_lazy('auth_password_reset_done'),'html_email_template_name': 'registration/password_reset_email.html'}, name='auth_password_reset'),
    url(r'^accounts/register/$', views.UserRegistrationView.as_view(), name='registration_register'),
    url(r'^accounts/', include('registration.backends.hmac.urls')),
    url(r'^channels/$', views.channel_list, name='channels'),
    url(r'^channels/(?P<channel_id>[^/]+)', views.channel, name='channel'),
    url(r'^thumbnail_upload/', views.thumbnail_upload, name='thumbnail_upload'),
    url(r'^exercise_image_upload/', views.exercise_image_upload, name='exercise_image_upload'),
    url(r'^api/send_invitation_email/$', views.send_invitation_email, name='send_invitation_email'),
    url(r'^accept_invitation/(?P<user_id>[^/]+)/(?P<invitation_link>[^/]+)/(?P<channel_id>[^/]+)$', views.InvitationAcceptView.as_view(), name="accept_invitation"),
    url(r'^new/accept_invitation/(?P<user_id>[^/]+)/(?P<invitation_link>[^/]+)/(?P<channel_id>[^/]+)$', views.InvitationRegisterView.as_view(), name="accept_invitation_and_registration"),
    url(r'^decline_invitation/(?P<invitation_link>[^/]+)$', views.decline_invitation, name="decline_invitation"),
    url(r'^invitation_fail$', views.fail_invitation, name="fail_invitation"),
    url(r'^api/internal/file_diff$', views.file_diff, name="file_diff"),
    url(r'^api/internal/file_upload$', views.api_file_upload, name="api_file_upload"),
    url(r'^api/internal/create_channel$', views.api_create_channel_endpoint, name="api_create_channel"),
    url(r'^open_channel/(?P<invitation_id>[^/]+)/(?P<channel_id>[^/]+)$', views.api_open_channel, name="open_channel"),
    url(r'^open_fail$', views.fail_open_channel, name="fail_open_channel"),
    url(r'^o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    url(r'^settings/', views.settings, name='settings'),
]

urlpatterns += [url(r'^jsreverse/$', 'django_js_reverse.views.urls_js', name='js_reverse')]

if settings.DEBUG:
    # static files (images, css, javascript, etc.)
    urlpatterns += [
        url(r'^' + settings.STORAGE_URL[1:-1] + '(?P<path>.*)$', 'django.views.static.serve', {
        'document_root': settings.STORAGE_ROOT})]
