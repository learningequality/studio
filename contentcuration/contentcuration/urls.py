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
import django_js_reverse.views as django_js_reverse_views
from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.db.models import Q
from django.views.generic.base import RedirectView
from rest_framework import routers

import contentcuration.views.admin as admin_views
import contentcuration.views.base as views
import contentcuration.views.internal as internal_views
import contentcuration.views.nodes as node_views
import contentcuration.views.public as public_views
import contentcuration.views.settings as settings_views
import contentcuration.views.users as registration_views
import contentcuration.views.zip as zip_views
from contentcuration.models import Channel
from contentcuration.viewsets.assessmentitem import AssessmentItemViewSet
from contentcuration.viewsets.channel import AdminChannelViewSet
from contentcuration.viewsets.channel import CatalogViewSet
from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.clipboard import ClipboardViewSet
from contentcuration.viewsets.contentnode import ContentNodeViewSet
from contentcuration.viewsets.file import FileViewSet
from contentcuration.viewsets.invitation import InvitationViewSet
from contentcuration.viewsets.sync.endpoint import sync
from contentcuration.viewsets.task import TaskViewSet
from contentcuration.viewsets.user import AdminUserViewSet
from contentcuration.viewsets.user import ChannelUserViewSet
from contentcuration.viewsets.user import UserViewSet


def get_channel_tree_ids(user):
    channels = Channel.objects.select_related('trash_tree').select_related('main_tree').filter(Q(editors=user) | Q(viewers=user) | Q(public=True))
    trash_tree_ids = channels.values_list('trash_tree__tree_id', flat=True).distinct()
    main_tree_ids = channels.values_list('main_tree__tree_id', flat=True).distinct()
    return [user.clipboard_tree.tree_id] + list(trash_tree_ids) + list(main_tree_ids)


class StagingPageRedirectView(RedirectView):
    def get_redirect_url(self, *args, **kwargs):
        channel_id = kwargs['channel_id']
        return '/channels/{}/#/staging'.format(channel_id)


router = routers.DefaultRouter(trailing_slash=False)
router.register(r'channel', ChannelViewSet)
router.register(r'channelset', ChannelSetViewSet)
router.register(r'catalog', CatalogViewSet, basename='catalog')
router.register(r'admin-channels', AdminChannelViewSet, basename='admin-channels')
router.register(r'file', FileViewSet)
router.register(r'task', TaskViewSet)
router.register(r'channeluser', ChannelUserViewSet, basename="channeluser")
router.register(r'user', UserViewSet)
router.register(r'invitation', InvitationViewSet)
router.register(r'contentnode', ContentNodeViewSet)
router.register(r'assessmentitem', AssessmentItemViewSet)
router.register(r'admin-users', AdminUserViewSet, basename='admin-users')
router.register(r'clipboard', ClipboardViewSet, basename='clipboard')

urlpatterns = [
    url(r'^$', views.base, name='base'),
    url(r'^api/', include(router.urls)),
    url(r'^api/activate_channel$', views.activate_channel_endpoint, name='activate_channel'),
    url(r'^healthz$', views.health, name='health'),
    url(r'^stealthz$', views.stealth, name='stealth'),
    url(r'^api/search/', include('search.urls'), name='search'),
    url(r'^api/download_channel_content_csv/(?P<channel_id>[^/]{32})$', views.download_channel_content_csv, name='download_channel_content_csv'),
    url(r'^api/probers/get_prober_channel', views.get_prober_channel, name='get_prober_channel'),
    url(r'^api/sync/$', sync, name="sync"),
]

# if activated, turn on django prometheus urls
if "django_prometheus" in settings.INSTALLED_APPS:
    urlpatterns += [
        url('', include('django_prometheus.urls')),
    ]


# Add public api endpoints
urlpatterns += [
    url(r'^api/public/channel/(?P<channel_id>[^/]+)', public_views.get_channel_name_by_id, name='get_channel_name_by_id'),
    url(r'^api/public/(?P<version>[^/]+)/channels$', public_views.get_public_channel_list, name='get_public_channel_list'),
    url(r'^api/public/(?P<version>[^/]+)/channels/lookup/(?P<identifier>[^/]+)', public_views.get_public_channel_lookup, name='get_public_channel_lookup'),
    url(r'^api/public/info', public_views.InfoViewSet.as_view({'get': 'list'}), name='info'),
]

# Add node api enpoints
urlpatterns += [
    url(r'^api/get_total_size/(?P<ids>[^/]*)$', node_views.get_total_size, name='get_total_size'),
    url(r'^api/get_channel_details/(?P<channel_id>[^/]*)$', node_views.get_channel_details, name='get_channel_details'),
    url(r'^api/get_node_details/(?P<node_id>[^/]*)$', node_views.get_node_details, name='get_node_details'),
]

# Add file api enpoints
urlpatterns += [
    url(r'^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)', zip_views.ZipContentView.as_view(), {}, "zipcontent"),
]

# Add settings endpoints
urlpatterns += [
    url(r'^api/delete_user_account/$', settings_views.DeleteAccountView.as_view(), name='delete_user_account'),
    url(r'^api/export_user_data/$', settings_views.export_user_data, name='export_user_data'),
    url(r'^api/change_password/$', settings_views.UserPasswordChangeView.as_view(), name='change_password'),
    url(r'^api/update_user_full_name/$', settings_views.UsernameChangeView.as_view(), name='update_user_full_name'),
    url(r'^settings/issues', settings_views.IssuesSettingsView.as_view(), name='issues_settings'),
    url(r'^settings/feedback', settings_views.SubmitFeedbackView.as_view(), name='submit_feedback'),
    url(r'^settings/request_storage', settings_views.StorageSettingsView.as_view(), name='request_storage'),
    url(r'^policies/update', settings_views.PolicyAcceptView.as_view(), name='policy_update'),
]

# Add internal endpoints
urlpatterns += [
    url(r'^api/internal/authenticate_user_internal$', internal_views.authenticate_user_internal, name="authenticate_user_internal"),
    url(r'^api/internal/check_version$', internal_views.check_version, name="check_version"),
    url(r'^api/internal/file_diff$', internal_views.file_diff, name="file_diff"),
    url(r'^api/internal/file_upload$', internal_views.api_file_upload, name="api_file_upload"),
    url(r'^api/internal/publish_channel$', internal_views.api_publish_channel, name="api_publish_channel"),
    url(r'^api/internal/get_staged_diff_internal$', internal_views.get_staged_diff_internal, name='get_staged_diff_internal'),
    url(r'^api/internal/activate_channel_internal$', internal_views.activate_channel_internal, name='activate_channel_internal'),
    url(r'^api/internal/check_user_is_editor$', internal_views.check_user_is_editor, name='check_user_is_editor'),
    url(r'^api/internal/get_tree_data$', internal_views.get_tree_data, name='get_tree_data'),
    url(r'^api/internal/get_node_tree_data$', internal_views.get_node_tree_data, name='get_node_tree_data'),
    url(r'^api/internal/create_channel$', internal_views.api_create_channel_endpoint, name="api_create_channel"),
    url(r'^api/internal/add_nodes$', internal_views.api_add_nodes_to_tree, name="api_add_nodes_to_tree"),
    url(r'^api/internal/finish_channel$', internal_views.api_commit_channel, name="api_finish_channel"),
    url(r'^api/internal/get_channel_status_bulk$', internal_views.get_channel_status_bulk, name="get_channel_status_bulk"),
]

# Add admin endpoints
urlpatterns += [
    url(r'^api/get_user_details/(?P<user_id>[^/]+)$$', admin_views.get_user_details, name='get_user_details'),
    # url(r'^api/make_editor/$', admin_views.make_editor, name='make_editor'),
    # url(r'^api/remove_editor/$', admin_views.remove_editor, name='remove_editor'),
    # url(r'^api/get_editors/(?P<channel_id>[^/]+)$', admin_views.get_editors, name='get_editors'),
    url(r'^api/send_custom_email/$', admin_views.send_custom_email, name='send_custom_email'),
]

urlpatterns += [url(r'^jsreverse/$', django_js_reverse_views.urls_js, name='js_reverse')]

# I18N Endpoints
js_info_dict = {
    'packages': ('your.app.package',),
}

urlpatterns += [
    url(r'^i18n/', include('django.conf.urls.i18n')),
]

# Include all URLS prefixed by language
urlpatterns += i18n_patterns(
    #
    url(r'^channels/$', views.channel_list, name='channels'),
    # Redirect deprecated staging URL to new URL
    url(r'^channels/(?P<channel_id>[^/]{32})/staging/$', StagingPageRedirectView.as_view(), name='staging_redirect'),
    url(r'^channels/(?P<channel_id>[^/]{32})/$', views.channel, name='channel'),
    url(r'^accessible_channels/(?P<channel_id>[^/]{32})$', views.accessible_channels, name='accessible_channels'),
    url(r'^accounts/login/$', registration_views.login, name='login'),
    url(r'^accounts/logout/$', registration_views.logout, name='logout'),
    url(r'^accounts/request_activation_link/$', registration_views.request_activation_link, name='request_activation_link'),
    url(r"^accounts/$", views.accounts, name="accounts"),
    url(r'^accounts/password/reset/$', registration_views.UserPasswordResetView.as_view(), name='auth_password_reset'),
    url(r'^accounts/password/reset/confirm/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        registration_views.UserPasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    url(r'^accounts/register/$', registration_views.UserRegistrationView.as_view(), name='register'),
    url(r'^activate/(?P<activation_key>[-:\w]+)/$', registration_views.UserActivationView.as_view(), name='registration_activate'),
    url(r'^api/send_invitation_email/$', registration_views.send_invitation_email, name='send_invitation_email'),
    url(r'^new/accept_invitation/(?P<email>[^/]+)/', registration_views.new_user_redirect, name="accept_invitation_and_registration"),
    url(r'^api/deferred_user_data/$', registration_views.deferred_user_data, name="deferred_user_data"),
    url(r'^settings/$', settings_views.settings, name='settings'),
    url(r'^administration/', admin_views.administration, name='administration'),
    url(r'^admin/', include(admin.site.urls)),
)
