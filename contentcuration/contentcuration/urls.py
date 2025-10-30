"""URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  re_path(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  re_path(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  re_path(r'^blog/', include(blog_urls))
"""
import uuid

import django_js_reverse.views as django_js_reverse_views
from django.conf import settings
from django.conf.urls.i18n import i18n_patterns
from django.urls import include
from django.urls import path
from django.urls import re_path
from django.views.generic.base import RedirectView
from kolibri_public.urls import urlpatterns as kolibri_public_urls
from rest_framework import routers

import contentcuration.views.admin as admin_views
import contentcuration.views.base as views
import contentcuration.views.internal as internal_views
import contentcuration.views.nodes as node_views
import contentcuration.views.settings as settings_views
import contentcuration.views.users as registration_views
import contentcuration.views.zip as zip_views
from contentcuration.views import pwa
from contentcuration.viewsets.assessmentitem import AssessmentItemViewSet
from contentcuration.viewsets.bookmark import BookmarkViewSet
from contentcuration.viewsets.channel import AdminChannelViewSet
from contentcuration.viewsets.channel import CatalogViewSet
from contentcuration.viewsets.channel import ChannelViewSet
from contentcuration.viewsets.channelset import ChannelSetViewSet
from contentcuration.viewsets.clipboard import ClipboardViewSet
from contentcuration.viewsets.community_library_submission import (
    AdminCommunityLibrarySubmissionViewSet,
)
from contentcuration.viewsets.community_library_submission import (
    CommunityLibrarySubmissionViewSet,
)
from contentcuration.viewsets.contentnode import ContentNodeViewSet
from contentcuration.viewsets.feedback import FlagFeedbackEventViewSet
from contentcuration.viewsets.feedback import RecommendationsEventViewSet
from contentcuration.viewsets.feedback import RecommendationsInteractionEventViewSet
from contentcuration.viewsets.file import FileViewSet
from contentcuration.viewsets.invitation import InvitationViewSet
from contentcuration.viewsets.recommendation import RecommendationView
from contentcuration.viewsets.sync.endpoint import SyncView
from contentcuration.viewsets.user import AdminUserViewSet
from contentcuration.viewsets.user import ChannelUserViewSet
from contentcuration.viewsets.user import UserViewSet


class StagingPageRedirectView(RedirectView):
    def get_redirect_url(self, *args, **kwargs):
        try:
            channel_id = uuid.UUID(kwargs["channel_id"]).hex
            return "/channels/{}/#/staging".format(channel_id)
        except ValueError:
            return None


router = routers.DefaultRouter(trailing_slash=False)
router.register(r"bookmark", BookmarkViewSet, basename="bookmark")
router.register(r"channel", ChannelViewSet)
router.register(r"channelset", ChannelSetViewSet)
router.register(r"catalog", CatalogViewSet, basename="catalog")
router.register(r"admin-channels", AdminChannelViewSet, basename="admin-channels")
router.register(r"file", FileViewSet)
router.register(r"channeluser", ChannelUserViewSet, basename="channeluser")
router.register(r"user", UserViewSet)
router.register(r"invitation", InvitationViewSet)
router.register(r"contentnode", ContentNodeViewSet)
router.register(r"assessmentitem", AssessmentItemViewSet)
router.register(r"admin-users", AdminUserViewSet, basename="admin-users")
router.register(r"clipboard", ClipboardViewSet, basename="clipboard")
router.register(r"events/flagged", FlagFeedbackEventViewSet, basename="flagged-events")
router.register(
    r"events/recommendations",
    RecommendationsEventViewSet,
    basename="recommendations-events",
)
router.register(
    r"events/recommendationsinteraction",
    RecommendationsInteractionEventViewSet,
    basename="recommendations-interaction-events",
)
router.register(
    r"communitylibrary_submission",
    CommunityLibrarySubmissionViewSet,
    basename="community-library-submission",
)
router.register(
    r"admin_communitylibrary_submission",
    AdminCommunityLibrarySubmissionViewSet,
    basename="admin-community-library-submission",
)

urlpatterns = [
    re_path(r"^api/", include(router.urls)),
    re_path(
        r"^serviceWorker.js$", pwa.ServiceWorkerView.as_view(), name="service_worker"
    ),
    re_path(r"^healthz$", views.health, name="health"),
    re_path(r"^stealthz$", views.stealth, name="stealth"),
    re_path(r"^api/search/", include("search.urls"), name="search"),
    re_path(
        r"^api/probers/get_prober_channel",
        views.get_prober_channel,
        name="get_prober_channel",
    ),
    re_path(
        r"^api/probers/publishing_status",
        views.publishing_status,
        name="publishing_status",
    ),
    re_path(
        r"^api/probers/celery_worker_status",
        views.celery_worker_status,
        name="celery_worker_status",
    ),
    re_path(
        r"^api/probers/task_queue_status",
        views.task_queue_status,
        name="task_queue_status",
    ),
    re_path(
        r"^api/probers/unapplied_changes_status",
        views.unapplied_changes_status,
        name="unapplied_changes_status",
    ),
    re_path(r"^api/sync/$", SyncView.as_view(), name="sync"),
    re_path(
        r"^api/recommendations/$", RecommendationView.as_view(), name="recommendations"
    ),
]

# if activated, turn on django prometheus urls
if "django_prometheus" in settings.INSTALLED_APPS:
    urlpatterns += [
        re_path("", include("django_prometheus.urls")),
    ]


# Add public api endpoints
urlpatterns += kolibri_public_urls

# Add node api enpoints
urlpatterns += [
    re_path(
        r"^api/get_channel_details/(?P<channel_id>[^/]*)$",
        node_views.get_channel_details,
        name="get_channel_details",
    ),
    re_path(
        r"^api/get_node_details/(?P<node_id>[^/]*)$",
        node_views.get_node_details,
        name="get_node_details",
    ),
    re_path(
        r"^api/get_node_diff/(?P<updated_id>[^/]*)/(?P<original_id>[^/]*)$",
        node_views.get_node_diff,
        name="get_node_diff",
    ),
    re_path(
        r"^api/generate_node_diff/(?P<updated_id>[^/]*)/(?P<original_id>[^/]*)$",
        node_views.generate_node_diff,
        name="generate_node_diff",
    ),
]

# Add file api enpoints
urlpatterns += [
    re_path(
        r"^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)",
        zip_views.ZipContentView.as_view(),
        {},
        "zipcontent",
    ),
]

# Add settings endpoints
urlpatterns += [
    re_path(
        r"^api/delete_user_account/$",
        settings_views.DeleteAccountView.as_view(),
        name="delete_user_account",
    ),
    re_path(
        r"^api/export_user_data/$",
        settings_views.export_user_data,
        name="export_user_data",
    ),
    re_path(
        r"^api/change_password/$",
        settings_views.UserPasswordChangeView.as_view(),
        name="change_password",
    ),
    re_path(
        r"^api/update_user_full_name/$",
        settings_views.UsernameChangeView.as_view(),
        name="update_user_full_name",
    ),
    re_path(
        r"^settings/issues",
        settings_views.IssuesSettingsView.as_view(),
        name="issues_settings",
    ),
    re_path(
        r"^settings/request_storage",
        settings_views.StorageSettingsView.as_view(),
        name="request_storage",
    ),
    re_path(
        r"^policies/update",
        settings_views.PolicyAcceptView.as_view(),
        name="policy_update",
    ),
]

# Add internal endpoints
urlpatterns += [
    re_path(
        r"^api/internal/authenticate_user_internal$",
        internal_views.authenticate_user_internal,
        name="authenticate_user_internal",
    ),
    re_path(
        r"^api/internal/check_version$",
        internal_views.check_version,
        name="check_version",
    ),
    re_path(r"^api/internal/file_diff$", internal_views.file_diff, name="file_diff"),
    re_path(
        r"^api/internal/file_upload$",
        internal_views.api_file_upload,
        name="api_file_upload",
    ),
    re_path(
        r"^api/internal/publish_channel$",
        internal_views.api_publish_channel,
        name="api_publish_channel",
    ),
    re_path(
        r"^api/internal/check_user_is_editor$",
        internal_views.check_user_is_editor,
        name="check_user_is_editor",
    ),
    re_path(
        r"^api/internal/get_tree_data$",
        internal_views.get_tree_data,
        name="get_tree_data",
    ),
    re_path(
        r"^api/internal/get_node_tree_data$",
        internal_views.get_node_tree_data,
        name="get_node_tree_data",
    ),
    re_path(
        r"^api/internal/create_channel$",
        internal_views.api_create_channel_endpoint,
        name="api_create_channel",
    ),
    re_path(
        r"^api/internal/add_nodes$",
        internal_views.api_add_nodes_to_tree,
        name="api_add_nodes_to_tree",
    ),
    re_path(
        r"^api/internal/finish_channel$",
        internal_views.api_commit_channel,
        name="api_finish_channel",
    ),
    re_path(
        r"^api/internal/get_channel_status_bulk$",
        internal_views.get_channel_status_bulk,
        name="get_channel_status_bulk",
    ),
]

# Add admin endpoints
urlpatterns += [
    re_path(
        r"^api/send_custom_email/$",
        admin_views.send_custom_email,
        name="send_custom_email",
    ),
]

urlpatterns += [
    re_path(r"^jsreverse/$", django_js_reverse_views.urls_js, name="js_reverse")
]

# I18N Endpoints
urlpatterns += [
    re_path(r"^i18n/", include("django.conf.urls.i18n")),
]

# Include all URLS prefixed by language
urlpatterns += i18n_patterns(
    re_path(r"^$", views.base, name="base"),
    re_path(r"^i18n/setlang/$", views.set_language, name="set_language"),
    re_path(r"^channels/$", views.channel_list, name="channels"),
    # Redirect deprecated staging URL to new URL
    re_path(
        r"^channels/(?P<channel_id>[^/]{32})/staging/$",
        StagingPageRedirectView.as_view(),
        name="staging_redirect",
    ),
    re_path(r"^channels/(?P<channel_id>[^/]{32})/$", views.channel, name="channel"),
    re_path(r"^accounts/login/$", registration_views.login, name="login"),
    re_path(r"^accounts/logout/$", registration_views.logout, name="logout"),
    re_path(
        r"^accounts/request_activation_link/$",
        registration_views.request_activation_link,
        name="request_activation_link",
    ),
    re_path(r"^accounts/$", views.accounts, name="accounts"),
    path(
        r"accounts/password/reset/",
        registration_views.UserPasswordResetView.as_view(),
        name="auth_password_reset",
    ),
    path(
        r"accounts/password/reset/confirm/<uidb64>/<token>/",
        registration_views.UserPasswordResetConfirmView.as_view(),
        name="auth_password_reset_confirm",
    ),
    re_path(
        r"^accounts/register/$",
        registration_views.UserRegistrationView.as_view(),
        name="register",
    ),
    re_path(
        r"^activate/(?P<activation_key>[-:\w]+)/$",
        registration_views.UserActivationView.as_view(),
        name="registration_activate",
    ),
    re_path(
        r"^api/send_invitation_email/$",
        registration_views.send_invitation_email,
        name="send_invitation_email",
    ),
    re_path(
        r"^new/accept_invitation/(?P<email>[^/]+)/",
        registration_views.new_user_redirect,
        name="accept_invitation_and_registration",
    ),
    re_path(
        r"^api/deferred_user_space_by_kind/$",
        registration_views.deferred_user_space_by_kind,
        name="deferred_user_space_by_kind",
    ),
    re_path(
        r"^api/deferred_user_api_token/$",
        registration_views.deferred_user_api_token,
        name="deferred_user_api_token",
    ),
    re_path(r"^settings/$", settings_views.settings, name="settings"),
    re_path(r"^administration/", admin_views.administration, name="administration"),
    re_path(r"^manifest.webmanifest$", pwa.ManifestView.as_view(), name="manifest"),
)
