import json
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.db.models import Count
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import UUIDField
from django.db.models.functions import Cast
from django.http import HttpResponse
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.shortcuts import render
from django.urls import is_valid_path
from django.urls import reverse
from django.urls import reverse_lazy
from django.urls import translate_url
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import check_for_language
from django.utils.translation import get_language
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.views.decorators.http import require_POST
from django.views.i18n import LANGUAGE_QUERY_PARAMETER
from django_celery_results.models import TaskResult
from django_cte import With
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .json_dump import json_for_parse_from_data
from contentcuration.constants import channel_history
from contentcuration.decorators import browser_is_supported
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ChannelHistory
from contentcuration.models import ContentKind
from contentcuration.models import CustomTaskMetadata
from contentcuration.models import DEFAULT_USER_PREFERENCES
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.serializers import SimplifiedChannelProbeCheckSerializer
from contentcuration.utils.messages import get_messages

PUBLIC_CHANNELS_CACHE_DURATION = 30  # seconds
PUBLIC_CHANNELS_CACHE_KEYS = {
    "list": "public_channel_list",
    "languages": "public_channel_languages",
    "licenses": "public_channel_licenses",
    "kinds": "public_channel_kinds",
    "collections": "public_channel_collections",
}

MESSAGES = "i18n_messages"
PREFERENCES = "user_preferences"
CURRENT_USER = "current_user"
CHANNEL_EDIT_GLOBAL = "CHANNEL_EDIT_GLOBAL"

user_fields = (
    "email",
    "first_name",
    "last_name",
    "id",
    "is_active",
    "is_admin",
    "disk_space",
    "disk_space_used",
    "clipboard_tree_id",
    "policies",
    "feature_flags",
)


def current_user_for_context(user):
    if not user or user.is_anonymous:
        return json_for_parse_from_data(None)

    user_data = {field: getattr(user, field) for field in user_fields}

    user_data["user_rev"] = Change.objects.filter(applied=True, user=user).values_list("server_rev", flat=True).order_by("-server_rev").first() or 0

    return json_for_parse_from_data(user_data)


@browser_is_supported
@permission_classes((AllowAny,))
def base(request):
    if settings.LIBRARY_MODE:
        return channel_list(request)
    if request.user.is_authenticated:
        return redirect(reverse_lazy("channels"))
    return redirect(reverse_lazy("accounts"))


""" HEALTH CHECKS """


def health(request):
    c = Channel.objects.first()
    if c:
        return HttpResponse(c.name)
    return HttpResponse("No channels created yet!")


def stealth(request):
    return HttpResponse("<3")


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def get_prober_channel(request):
    if not request.user.is_admin:
        return HttpResponseForbidden()

    channel = Channel.objects.filter(editors=request.user).first()
    if not channel:
        channel = Channel.objects.create(actor_id=request.user.id, name="Prober channel", editors=[request.user])

    return Response(SimplifiedChannelProbeCheckSerializer(channel).data)

@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def publishing_status(request):
    if not request.user.is_admin:
        return HttpResponseForbidden()
    associated_custom_task_metadata_ids = CustomTaskMetadata.objects.filter(channel_id=Cast(OuterRef(OuterRef("channel_id")), UUIDField())).values_list("task_id",flat=True)
    associated_tasks = TaskResult.objects.filter(
        task_name="export-channel",
        task_id__in=Subquery(associated_custom_task_metadata_ids),
    )
    channel_publish_status = (
        ChannelHistory.objects
        .filter(
            action=channel_history.PUBLICATION,
            channel_id__in=Channel.objects.filter(main_tree__publishing=True).values("id"),
        )
        .annotate(task_id=associated_tasks.order_by("-date_created").values("task_id")[:1])
        .distinct("channel_id")
        .order_by("channel_id", "-performed")
        .values("channel_id", "performed", "task_id")
    )

    return Response(channel_publish_status)


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def celery_worker_status(request):
    if not request.user.is_admin:
        return HttpResponseForbidden()

    from contentcuration.celery import app

    # should return dict with structure like:
    # {'celery@hostname': {'ok': 'pong'}}
    return Response(app.control.inspect().ping() or {})


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def task_queue_status(request):
    if not request.user.is_admin:
        return HttpResponseForbidden()

    from contentcuration.celery import app

    return Response({
        'queued_task_count': app.count_queued_tasks(),
    })


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def unapplied_changes_status(request):
    if not request.user.is_admin:
        return HttpResponseForbidden()

    from contentcuration.celery import app

    active_task_count = 0
    for _ in app.get_active_and_reserved_tasks():
        active_task_count += 1

    return Response({
        'active_task_count': active_task_count,
        'unapplied_changes_count': Change.objects.filter(applied=False, errored=False).count(),
    })


""" END HEALTH CHECKS """


@browser_is_supported
@permission_classes((AllowAny,))
def channel_list(request):
    anon = settings.LIBRARY_MODE or request.user.is_anonymous
    current_user = current_user_for_context(request.user)
    preferences = DEFAULT_USER_PREFERENCES if anon else request.user.content_defaults

    public_channel_list = cache.get(PUBLIC_CHANNELS_CACHE_KEYS["list"])
    if public_channel_list is None:
        public_channel_list = Channel.objects.filter(
            public=True, main_tree__published=True, deleted=False,
        ).values_list("main_tree__tree_id", flat=True)
        cache.set(PUBLIC_CHANNELS_CACHE_KEYS["list"], public_channel_list, None)

    # Get public channel languages
    languages = cache.get(PUBLIC_CHANNELS_CACHE_KEYS["languages"])
    if languages is None:
        public_lang_query = (
            Language.objects.filter(
                channel_language__public=True,
                channel_language__main_tree__published=True,
                channel_language__deleted=False,
            )
            .values("lang_code")
            .annotate(count=Count("lang_code"))
            .order_by("lang_code")
        )
        languages = {lang["lang_code"]: lang["count"] for lang in public_lang_query}
        cache.set(PUBLIC_CHANNELS_CACHE_KEYS["languages"], json_for_parse_from_data(languages), None)

    # Get public channel licenses
    licenses = cache.get(PUBLIC_CHANNELS_CACHE_KEYS["licenses"])
    if licenses is None:
        public_license_query = (
            License.objects.filter(contentnode__tree_id__in=public_channel_list)
            .values_list("id", flat=True)
            .order_by("id")
            .distinct()
        )
        licenses = list(public_license_query)
        cache.set(PUBLIC_CHANNELS_CACHE_KEYS["licenses"], json_for_parse_from_data(licenses), None)

    # Get public channel kinds
    kinds = cache.get(PUBLIC_CHANNELS_CACHE_KEYS["kinds"])
    if kinds is None:
        public_kind_query = (
            ContentKind.objects.filter(contentnodes__tree_id__in=public_channel_list)
            .values_list("kind", flat=True)
            .order_by("kind")
            .distinct()
        )
        kinds = list(public_kind_query)
        cache.set(PUBLIC_CHANNELS_CACHE_KEYS["kinds"], json_for_parse_from_data(kinds), None)

    return render(
        request,
        "channel_list.html",
        {
            CURRENT_USER: current_user,
            PREFERENCES: json_for_parse_from_data(preferences),
            MESSAGES: json_for_parse_from_data(get_messages()),
            "LIBRARY_MODE": settings.LIBRARY_MODE,
            "public_languages": languages,
            "public_kinds": kinds,
            "public_licenses": licenses,
        },
    )


@browser_is_supported
@permission_classes((AllowAny,))
def accounts(request):
    if not request.user.is_anonymous:
        return redirect("channels")
    return render(
        request,
        "accounts.html",
        {
            PREFERENCES: json_for_parse_from_data(DEFAULT_USER_PREFERENCES),
            MESSAGES: json_for_parse_from_data(get_messages()),
        },
    )


@login_required
@browser_is_supported
@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def channel(request, channel_id):
    channel_error = ""
    channel_rev = 0

    # Check if channel exists
    try:
        channel = Channel.filter_view_queryset(Channel.objects.all(), request.user).get(id=channel_id)
    except Channel.DoesNotExist:
        channel_error = "CHANNEL_EDIT_ERROR_CHANNEL_NOT_FOUND"
        channel = None

    if channel is not None:
        # If user can view channel, but it's deleted, then we show
        # an option to restore the channel in the Administration page
        if channel.deleted:
            channel_error = 'CHANNEL_EDIT_ERROR_CHANNEL_DELETED'
        else:
            channel_rev = channel.get_server_rev()

    return render(
        request,
        "channel_edit.html",
        {
            CHANNEL_EDIT_GLOBAL: json_for_parse_from_data(
                {"channel_id": channel_id, "channel_error": channel_error, "channel_rev": channel_rev}
            ),
            CURRENT_USER: current_user_for_context(request.user),
            PREFERENCES: json_for_parse_from_data(request.user.content_defaults),
            MESSAGES: json_for_parse_from_data(get_messages()),
        },
    )


class SQCountDistinct(Subquery):
    # Include ALIAS at the end to support Postgres
    template = (
        "(SELECT COUNT(DISTINCT %(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    )
    output_field = IntegerField()


@require_POST
# flake8: noqa: C901
def set_language(request):
    """
    We are using set_language from official Django set_language redirect view
    https://docs.djangoproject.com/en/3.2/_modules/django/views/i18n/#set_language
    and slighty modifying it according to our use case as we donot use AJAX, hence we donot
    redirect rather just respond the required URL!


    Since this view changes how the user will see the rest of the site, it must
    only be accessed as a POST request. If called as a GET request, it will
    error.
    """
    payload = json.loads(request.body)
    lang_code = payload.get(LANGUAGE_QUERY_PARAMETER)
    next_url = payload.get("next")

    if (
        (next_url or request.accepts('text/html')) and
        not url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        )
    ):
        next_url = request.META.get('HTTP_REFERER')
        if not url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            next_url = translate_url(reverse('base'), lang_code)
    next_url_split = urlsplit(next_url) if next_url else None
    if next_url and not is_valid_path(next_url_split.path):
        next_url = translate_url(reverse('base'), lang_code)
    response = HttpResponse(next_url) if next_url else HttpResponse(status=204)
    if request.method == 'POST':
        if lang_code and check_for_language(lang_code):
            if next_url:
                next_trans = translate_url(next_url, lang_code)
                if next_trans != next_url:
                    response = HttpResponse(next_trans)
            if hasattr(request, 'session'):
                # Storing the language in the session is deprecated.
                # (RemovedInDjango40Warning)
                request.session[LANGUAGE_SESSION_KEY] = lang_code
            response.set_cookie(
                settings.LANGUAGE_COOKIE_NAME, lang_code,
                max_age=settings.LANGUAGE_COOKIE_AGE,
                path=settings.LANGUAGE_COOKIE_PATH,
                domain=settings.LANGUAGE_COOKIE_DOMAIN,
                secure=settings.LANGUAGE_COOKIE_SECURE,
                httponly=settings.LANGUAGE_COOKIE_HTTPONLY,
                samesite=settings.LANGUAGE_COOKIE_SAMESITE,
            )
        else:
            lang_code = get_language()
            if lang_code and check_for_language(lang_code):
                if next_url:
                    next_trans = translate_url(next_url, lang_code)
                    if next_trans != next_url:
                        response = HttpResponse(next_trans)
            if hasattr(request, "session"):
                request.session.pop(LANGUAGE_SESSION_KEY, "")

    return response
