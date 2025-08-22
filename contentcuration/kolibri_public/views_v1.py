import json

from django.conf import settings
from django.contrib.sites.models import Site
from django.db.models import Q
from django.db.models import TextField
from django.db.models import Value
from django.http import HttpResponseNotFound
from django.utils.html import escape
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import cache_page
from kolibri_content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION
from le_utils.uuidv5 import generate_ecosystem_namespaced_uuid
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from contentcuration.decorators import cache_no_user_data
from contentcuration.models import Channel
from contentcuration.serializers import PublicChannelSerializer


def _get_channel_list(version, params, identifier=None):
    if version == "v1":
        return _get_channel_list_v1(params, identifier=identifier)
    raise LookupError()


def _get_channel_list_v1(params, identifier=None):
    keyword = params.get("keyword", "").strip()
    language_id = params.get("language", "").strip()
    token_list = params.get("tokens", "").strip().replace("-", "").split(",")

    channels = None
    if identifier:
        channels = Channel.objects.prefetch_related("secret_tokens").filter(
            secret_tokens__token=identifier
        )
        if not channels.exists():
            channels = Channel.objects.filter(pk=identifier)
    else:
        channels = Channel.objects.prefetch_related("secret_tokens").filter(
            Q(public=True) | Q(secret_tokens__token__in=token_list)
        )

    if keyword != "":
        channels = channels.prefetch_related("tags").filter(
            Q(name__icontains=keyword)
            | Q(description__icontains=keyword)
            | Q(tags__tag_name__icontains=keyword)
        )

    if language_id != "":
        channels.filter(included_languages__id=language_id)

    return (
        channels.annotate(
            tokens=Value(json.dumps(token_list), output_field=TextField())
        )
        .filter(deleted=False, main_tree__published=True)
        .order_by("-priority")
        .distinct()
    )


@cache_page(
    settings.PUBLIC_CHANNELS_CACHE_DURATION, key_prefix="get_public_channel_list"
)
@api_view(["GET"])
@permission_classes((AllowAny,))
@cache_no_user_data
def get_public_channel_list(request, version):
    """ Endpoint: /public/<version>/channels/?=<query params> """
    try:
        channel_list = _get_channel_list(version, request.query_params)
    except LookupError:
        return HttpResponseNotFound(_("API version is unavailable"))
    return Response(PublicChannelSerializer(channel_list, many=True).data)


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_public_channel_lookup(request, version, identifier):
    """ Endpoint: /public/<version>/channels/lookup/<identifier> """
    try:
        channel_list = _get_channel_list(
            version,
            request.query_params,
            identifier=identifier.strip().replace("-", ""),
        )
    except LookupError:
        return HttpResponseNotFound(_("API version is unavailable"))
    if not channel_list.exists():
        return HttpResponseNotFound(
            _("No channel matching {} found").format(escape(identifier))
        )
    return Response(PublicChannelSerializer(channel_list, many=True).data)


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_channel_name_by_id(request, channel_id):
    """ Endpoint: /public/channels/<channel_id> """
    channel = Channel.objects.filter(pk=channel_id).first()
    if not channel:
        return HttpResponseNotFound(
            "Channel with id {} not found".format(escape(channel_id))
        )
    channel_info = {
        "name": channel.name,
        "description": channel.description,
        "version": channel.version,
    }
    return Response(channel_info)


device_info_keys = {
    "1": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
    ],
    "2": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
        "subset_of_users_device",
    ],
    "3": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
        "subset_of_users_device",
        "min_content_schema_version",
    ],
}

DEVICE_INFO_VERSION = "3"
INSTANCE_ID = None


def get_instance_id():
    """
    Returns a namespaced UUID for Studio based of the domain. The current site is configured
    through Django settings
    :return: A uuid
    """
    global INSTANCE_ID

    if INSTANCE_ID is None:
        INSTANCE_ID = generate_ecosystem_namespaced_uuid(
            Site.objects.get_current().domain
        ).hex
    return INSTANCE_ID


def get_device_info(version=DEVICE_INFO_VERSION):
    """
    Returns metadata information about the device
    The default kwarg version should always be the latest
    version of device info that this function supports.
    We maintain historic versions for backwards compatibility
    """

    if version not in device_info_keys:
        version = DEVICE_INFO_VERSION

    all_info = {
        "application": "studio",
        "kolibri_version": "0.16.0",
        "instance_id": get_instance_id(),
        "device_name": "Kolibri Studio",
        "operating_system": None,
        "subset_of_users_device": False,
        "min_content_schema_version": MIN_CONTENT_SCHEMA_VERSION,
    }

    info = {}

    # By this point, we have validated that the version is in device_info_keys
    for key in device_info_keys.get(version, []):
        info[key] = all_info[key]

    return info


class InfoViewSet(viewsets.ViewSet):
    """
    An equivalent endpoint in kolibri which allows kolibri devices to know
    if this device can serve content.
    Ref: https://github.com/learningequality/kolibri/blob/develop/kolibri/core/public/api.py#L53
    """

    permission_classes = (AllowAny,)

    def list(self, request):
        """Returns metadata information about the type of device"""
        # Default to version 1, as earlier versions of Kolibri
        # will not have sent a "v" query param.
        version = request.query_params.get("v", "1")

        return Response(get_device_info(version))
