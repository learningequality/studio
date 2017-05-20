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
import contentcuration.view.registration_views as registration_views
import contentcuration.view.settings_views as settings_views
import contentcuration.view.internal_views as internal_views
import contentcuration.view.zip_views as zip_views
import contentcuration.view.file_views as file_views
import contentcuration.view.node_views as node_views
from rest_framework.authtoken import views as auth_view
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
    serializer_class = serializers.ContentNodeCompleteSerializer

    def get_queryset(self):
        queryset = ContentNode.objects.all()
        # Set up eager loading to avoid N+1 selects
        queryset = self.get_serializer_class().setup_eager_loading(queryset)
        return queryset

class TagViewSet(viewsets.ModelViewSet):
    queryset = ContentTag.objects.all()
    serializer_class = serializers.TagSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = serializers.InvitationSerializer

class AssessmentItemViewSet(BulkModelViewSet):
    queryset = AssessmentItem.objects.all()
    serializer_class = serializers.AssessmentItemSerializer

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'license', LicenseViewSet)
router.register(r'language', LanguageViewSet)
router.register(r'channel', ChannelViewSet)
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
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(bulkrouter.urls)),
    url(r'^api/publish_channel/$', views.publish_channel, name='publish_channel'),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^channels/$', views.channel_list, name='channels'),
    url(r'^channels/(?P<channel_id>[^/]+)/edit', views.channel, name='channel'),
    url(r'^channels/(?P<channel_id>[^/]+)/view', views.channel_view_only, name='channel_view_only'),
    url(r'^channels/(?P<channel_id>[^/]+)/staging', views.channel_staging, name='channel_staging'),
    url(r'^unsupported_browser/$', views.unsupported_browser, name='unsupported_browser'),
    url(r'^unauthorized/$', views.unauthorized, name='unauthorized'),
    url(r'^staging_not_found/$', views.staging_not_found, name='staging_not_found'),
    url(r'^accessible_channels/$', views.accessible_channels, name='accessible_channels'),
    url(r'^get_user_channels/$', views.get_user_channels, name='get_user_channels'),
    url(r'^get_user_pending_channels/$', views.get_user_pending_channels, name='get_user_pending_channels'),
    url(r'^accept_channel_invite/$', views.accept_channel_invite, name='accept_channel_invite'),
    url(r'^activate_channel/$', views.activate_channel_endpoint, name='activate_channel'),
    url(r'^healthz$', views.health, name='health'),
]

# Add node api enpoints
urlpatterns += [
    url(r'^api/get_nodes_by_ids$', node_views.get_nodes_by_ids, name='get_nodes_by_ids'),
    url(r'^api/get_total_size$', node_views.get_total_size, name='get_total_size'),
    url(r'^api/duplicate_nodes/$', node_views.duplicate_nodes, name='duplicate_nodes'),
    url(r'^api/move_nodes/$', node_views.move_nodes, name='move_nodes'),
    url(r'^api/get_nodes_by_ids_simplified$', node_views.get_nodes_by_ids_simplified, name='get_nodes_by_ids_simplified'),
    url(r'^api/get_nodes_by_ids_complete$', node_views.get_nodes_by_ids_complete, name='get_nodes_by_ids_complete'),
    url(r'^api/create_new_node$', node_views.create_new_node, name='create_new_node'),
]

# Add file api enpoints
urlpatterns += [
     url(r'^api/thumbnail_upload/', file_views.thumbnail_upload, name='thumbnail_upload'),
    url(r'^api/exercise_image_upload/', file_views.exercise_image_upload, name='exercise_image_upload'),
    url(r'^api/image_upload/', file_views.image_upload, name='image_upload'),
    url(r'^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)', zip_views.ZipContentView.as_view(), {}, "zipcontent"),
    url(r'^api/file_upload/', file_views.file_upload, name="file_upload"),
    url(r'^api/file_create/', file_views.file_create, name="file_create"),
    url(r'^api/generate_thumbnail/$', file_views.generate_thumbnail, name='generate_thumbnail'),
]

# Add account/registration endpoints
urlpatterns += [
    url(r'^accounts/logout/$', auth_views.logout, {'template_name': 'registration/logout.html'}),
    url(r'^accounts/password/reset/$',registration_views.custom_password_reset,{'post_reset_redirect': reverse_lazy('auth_password_reset_done'),'email_template_name':'registration/password_reset_email.txt'}, name='auth_password_reset'), # Add 'html_email_template_name': 'registration/password_reset_email.html' to dict for html
    url(r'^accounts/register/$', registration_views.UserRegistrationView.as_view(), name='registration_register'),
    url(r'^accounts/', include('registration.backends.hmac.urls')),
    url(r'^api/send_invitation_email/$', registration_views.send_invitation_email, name='send_invitation_email'),
    url(r'^accept_invitation/(?P<invitation_link>[^/]+)$', registration_views.InvitationAcceptView.as_view(), name="accept_invitation"),
    url(r'^new/accept_invitation/(?P<user_id>[^/]+)/(?P<invitation_link>[^/]+)$', registration_views.InvitationRegisterView.as_view(), name="accept_invitation_and_registration"),
    url(r'^decline_invitation/(?P<invitation_link>[^/]+)$', registration_views.decline_invitation, name="decline_invitation"),
    url(r'^invitation_fail$', registration_views.fail_invitation, name="fail_invitation"),
]

# Add settings endpoints
urlpatterns += [
    url(r'^settings/$', settings_views.settings, name='settings'),
    url(r'^settings/profile', settings_views.ProfileView.as_view(), name='profile_settings'),
    url(r'^settings/preferences', settings_views.PreferencesView.as_view(), name='preferences_settings'),
    url(r'^settings/account$', settings_views.account_settings, name='account_settings'),
    url(r'^settings/account/success', settings_views.account_settings_success, name='account_settings_success'),
    url(r'^settings/tokens', settings_views.tokens_settings, name='tokens_settings'),
]

# Add internal endpoints
urlpatterns += [
    url(r'^api/internal/authenticate_user_internal$', internal_views.authenticate_user_internal, name="authenticate_user_internal"),
    url(r'^api/internal/check_version$', internal_views.check_version, name="check_version"),
    url(r'^api/internal/file_diff$', internal_views.file_diff, name="file_diff"),
    url(r'^api/internal/file_upload$', internal_views.api_file_upload, name="api_file_upload"),
    url(r'^api/internal/create_channel$', internal_views.api_create_channel_endpoint, name="api_create_channel"),
    url(r'^api/internal/add_nodes$', internal_views.api_add_nodes_to_tree, name="api_add_nodes_to_tree"),
    url(r'^api/internal/finish_channel$', internal_views.api_commit_channel, name="api_finish_channel"),
    url(r'^api/internal/publish_channel$', internal_views.api_publish_channel, name="api_publish_channel"),
]

urlpatterns += [url(r'^jsreverse/$', 'django_js_reverse.views.urls_js', name='js_reverse')]

if settings.DEBUG:
    # static files (images, css, javascript, etc.)
    urlpatterns += [
        url(r'^' + settings.STORAGE_URL[1:] + '(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STORAGE_ROOT}),
        url(r'^' + settings.CONTENT_DATABASE_URL[1:] + '(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.DB_ROOT})
    ]

    import debug_toolbar
    urlpatterns += [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ]
