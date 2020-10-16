import json
import logging
from builtins import str

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.sites.shortcuts import get_current_site
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse_lazy
from django.db.models import Count
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseForbidden
from django.http import HttpResponseNotFound
from django.shortcuts import redirect
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.base import TemplateView
from le_utils.constants import content_kinds
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from .json_dump import json_for_parse_from_data
from .json_dump import json_for_parse_from_serializer
from contentcuration.api import activate_channel
from contentcuration.api import get_staged_diff
from contentcuration.db.models.aggregates import ArrayAgg
from contentcuration.decorators import browser_is_supported
from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import DEFAULT_USER_PREFERENCES
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.models import User
from contentcuration.serializers import ContentNodeSerializer
from contentcuration.serializers import SimplifiedChannelProbeCheckSerializer
from contentcuration.serializers import TaskSerializer
from contentcuration.tasks import create_async_task
from contentcuration.tasks import generatechannelcsv_task
from contentcuration.utils.messages import get_messages
from contentcuration.viewsets.channelset import PublicChannelSetSerializer

PUBLIC_CHANNELS_CACHE_DURATION = 30  # seconds

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
    "clipboard_tree_id",
    "policies",
)


def current_user_for_context(user):
    if not user or user.is_anonymous():
        return json_for_parse_from_data(None)
    return json_for_parse_from_data(
        {field: getattr(user, field) for field in user_fields}
    )


@browser_is_supported
@permission_classes((AllowAny,))
def base(request):
    if settings.LIBRARY_MODE:
        return channel_list(request)
    elif request.user.is_authenticated():
        return redirect(reverse_lazy("channels"))
    else:
        return redirect(reverse_lazy("accounts"))


""" HEALTH CHECKS """


def health(request):
    c = Channel.objects.first()
    if c:
        return HttpResponse(c.name)
    else:
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
        channel = Channel.objects.create(name="Prober channel", editors=[request.user])

    return Response(SimplifiedChannelProbeCheckSerializer(channel).data)


""" END HEALTH CHECKS """


def get_or_set_cached_constants(constant, serializer):
    cached_data = cache.get(constant.__name__)
    if cached_data:
        return cached_data
    constant_objects = constant.objects.all()
    constant_serializer = serializer(constant_objects, many=True)
    constant_data = JSONRenderer().render(constant_serializer.data)
    cache.set(constant.__name__, constant_data, None)
    return constant_data


@browser_is_supported
@permission_classes((AllowAny,))
def channel_list(request):
    anon = settings.LIBRARY_MODE or request.user.is_anonymous()
    current_user = current_user_for_context(None if anon else request.user)
    preferences = DEFAULT_USER_PREFERENCES if anon else request.user.content_defaults

    public_channel_list = Channel.objects.filter(
        public=True,
        main_tree__published=True,
        deleted=False,
    ).values_list('main_tree__tree_id', flat=True)

    # Get public channel languages
    languages = cache.get("public_channel_languages")
    if not languages:
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
        languages = json.dumps(
            {lang["lang_code"]: lang["count"] for lang in public_lang_query}
        )
        cache.set("public_channel_languages", languages, None)
    languages = json.loads(languages)

    # Get public channel licenses
    licenses = cache.get("public_channel_licenses")
    if not licenses:
        public_license_query = (
            License.objects.filter(contentnode__tree_id__in=public_channel_list).values("id").annotate(
                count=SQCountDistinct(
                    ContentNode.objects.filter(
                        tree_id__in=public_channel_list,
                        license_id=OuterRef("id")
                ),
                field="tree_id"
            )).order_by("id")
        )
        licenses = json.dumps(
            {license["id"]: license["count"] for license in public_license_query}
        )
        cache.set("public_channel_licenses", licenses, None)
    licenses = json.loads(licenses)

    # Get public channel kinds
    kinds = cache.get("public_channel_kinds")
    if not kinds:
        public_kind_query = (
            ContentKind.objects.values("kind").annotate(
                count=SQCountDistinct(
                    ContentNode.objects.filter(
                        tree_id__in=public_channel_list,
                        kind_id=OuterRef("kind")
                    ),
                    field="tree_id"
                )
            ).order_by("kind")
        )
        kinds = json.dumps(
            {kind["kind"]: kind["count"] for kind in public_kind_query}
        )
        cache.set("public_channel_kinds", kinds, None)
    kinds = json.loads(kinds)

    # Get public channel sets
    public_channelset_query = ChannelSet.objects.filter(public=True).annotate(
        count=SQCountDistinct(
            Channel.objects.filter(
                secret_tokens=OuterRef("secret_token"),
                public=True,
                main_tree__published=True,
                deleted=False,
            ).values_list("id", flat=True),
            field="id",
        )
    )
    return render(
        request,
        "channel_list.html",
        {
            CURRENT_USER: current_user,
            PREFERENCES: json_for_parse_from_data(preferences),
            MESSAGES: json_for_parse_from_data(get_messages()),
            "LIBRARY_MODE": settings.LIBRARY_MODE,
            "public_languages": json_for_parse_from_data(languages),
            "public_kinds": json_for_parse_from_data(kinds),
            "public_licenses": json_for_parse_from_data(licenses),
            "public_collections": json_for_parse_from_serializer(
                PublicChannelSetSerializer(public_channelset_query, many=True)
            ),
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
    channel_error = ''

    # Check if channel exists
    try:
        channel = Channel.objects.get(id=channel_id)
        channel_id = channel.id
    except Channel.DoesNotExist:
        channel_error = 'CHANNEL_EDIT_ERROR_CHANNEL_NOT_FOUND'
        channel_id = ''

    # Check if user has permission to view channel
    if channel_id != '':
        try:
            request.user.can_view_channel(channel)
            # If user can view channel, but it's deleted, then we show
            # an option to restore the channel in the Administration page
            if channel.deleted:
                channel_error = 'CHANNEL_EDIT_ERROR_CHANNEL_DELETED'
        except PermissionDenied:
            channel_error = 'CHANNEL_EDIT_ERROR_CHANNEL_NOT_FOUND'

    return render(
        request,
        "channel_edit.html",
        {
            CHANNEL_EDIT_GLOBAL: json_for_parse_from_data({
                "channel_id": channel_id,
                "channel_error": channel_error,
            }),
            CURRENT_USER: current_user_for_context(request.user),
            PREFERENCES: json_for_parse_from_data(request.user.content_defaults),
            MESSAGES: json_for_parse_from_data(get_messages()),
        },
    )


@csrf_exempt
@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    data = json.loads(request.body)

    try:
        channel_id = data["channel_id"]
        version_notes = data.get("version_notes")
        request.user.can_edit(channel_id)

        task_info = {
            "user": request.user,
            "metadata": {"affects": {"channels": [channel_id]}},
        }

        task_args = {
            "user_id": request.user.pk,
            "channel_id": channel_id,
            "version_notes": version_notes,
        }

        task, task_info = create_async_task("export-channel", task_info, task_args)
        return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


class SQCountDistinct(Subquery):
    # Include ALIAS at the end to support Postgres
    template = (
        "(SELECT COUNT(DISTINCT %(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    )
    output_field = IntegerField()


def map_channel_data(channel):
    channel["id"] = channel.pop("main_tree__id")
    channel["title"] = channel.pop("name")
    channel["children"] = [child for child in channel["children"] if child]
    return channel


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def accessible_channels(request, channel_id):
    # Used for import modal
    # Returns a list of objects with the following parameters:
    # id, title, resource_count, children
    channels = (
        Channel.objects.filter(
            Q(deleted=False)
            & (Q(public=True) | Q(editors=request.user) | Q(viewers=request.user))
        )
        .exclude(pk=channel_id)
        .select_related("main_tree")
    )
    channel_main_tree_nodes = ContentNode.objects.filter(
        tree_id=OuterRef("main_tree__tree_id")
    )
    # Add the unique count of distinct non-topic node content_ids
    non_topic_content_ids = (
        channel_main_tree_nodes.exclude(kind_id=content_kinds.TOPIC)
        .order_by("content_id")
        .distinct("content_id")
        .values_list("content_id", flat=True)
    )
    channels = channels.annotate(
        resource_count=SQCountDistinct(non_topic_content_ids, field="content_id"),
        children=ArrayAgg("main_tree__children", distinct=True),
    )
    channels_data = channels.values(
        "name", "resource_count", "children", "main_tree__id"
    )

    return Response(map(map_channel_data, channels_data))


def activate_channel_endpoint(request):
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    data = json.loads(request.body)
    channel = Channel.objects.get(pk=data["channel_id"])
    changes = []
    try:
        change = activate_channel(channel, request.user)
        changes.append(change)
    except PermissionDenied as e:
        return HttpResponseForbidden(str(e))

    return HttpResponse(json.dumps({"success": True, "changes": changes}))


def get_staged_diff_endpoint(request):
    if request.method == "POST":
        return HttpResponse(
            json.dumps(get_staged_diff(json.loads(request.body)["channel_id"]))
        )

    return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")


@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def add_bookmark(request):
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    data = json.loads(request.body)

    try:
        user = User.objects.get(pk=data["user_id"])
        channel = Channel.objects.get(pk=data["channel_id"])
        channel.bookmarked_by.add(user)
        channel.save()

        return HttpResponse(json.dumps({"success": True}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound(
            "Channel with id {} not found".format(data["channel_id"])
        )


@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def remove_bookmark(request):
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    data = json.loads(request.body)

    try:
        user = User.objects.get(pk=data["user_id"])
        channel = Channel.objects.get(pk=data["channel_id"])
        channel.bookmarked_by.remove(user)
        channel.save()

        return HttpResponse(json.dumps({"success": True}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound(
            "Channel with id {} not found".format(data["channel_id"])
        )


@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def set_channel_priority(request):
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    data = json.loads(request.body)

    try:
        channel = Channel.objects.get(pk=data["channel_id"])
        channel.priority = data["priority"]
        channel.save()

        return HttpResponse(json.dumps({"success": True}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound(
            "Channel with id {} not found".format(data["channel_id"])
        )


@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def download_channel_content_csv(request, channel_id):
    """ Writes list of channels to csv, which is then emailed """
    site = get_current_site(request)
    generatechannelcsv_task.delay(channel_id, site.domain, request.user.id)

    return HttpResponse({"success": True})


class SandboxView(TemplateView):
    template_name = "sandbox.html"

    def get_context_data(self, **kwargs):
        kwargs = super(SandboxView, self).get_context_data(**kwargs)

        active_channels = Channel.objects.filter(
            Q(editors=self.request.user) | Q(public=True)
        )
        active_tree_ids = active_channels.values_list("main_tree__tree_id", flat=True)
        active_nodes = ContentNode.objects.filter(tree_id__in=active_tree_ids)
        nodes = []

        # Get a node of every kind
        for kind, _ in reversed(sorted(content_kinds.choices)):
            node = active_nodes.filter(
                kind_id=kind, freeze_authoring_data=False
            ).first()
            if node:
                nodes.append(ContentNodeSerializer(node).data)

        # Add an imported node
        imported_node = (
            active_nodes.filter(freeze_authoring_data=True)
            .exclude(kind_id=content_kinds.TOPIC)
            .first()
        )
        if imported_node:
            nodes.append(ContentNodeSerializer(imported_node).data)
        kwargs.update(
            {
                "nodes": JSONRenderer().render(nodes),
                "channel": active_channels.first().pk,
                CURRENT_USER: current_user_for_context(self.request.user),
                "root_id": self.request.user.clipboard_tree.pk,
            }
        )
        return kwargs
