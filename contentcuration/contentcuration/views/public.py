import json

from django.conf import settings
from django.db.models import Q
from django.db.models import TextField
from django.db.models import Value
from django.http import HttpResponseNotFound
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import cache_page
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
    else:
        raise LookupError()


def _get_channel_list_v1(params, identifier=None):
    keyword = params.get('keyword', '').strip()
    language_id = params.get('language', '').strip()
    token_list = params.get('tokens', '').strip().replace('-', '').split(',')

    channels = None
    if identifier:
        channels = Channel.objects.prefetch_related('secret_tokens').filter(secret_tokens__token=identifier)
        if not channels.exists():
            channels = Channel.objects.filter(pk=identifier)
    else:
        channels = Channel.objects.prefetch_related('secret_tokens').filter(Q(public=True) | Q(secret_tokens__token__in=token_list))

    if keyword != '':
        channels = channels.prefetch_related('tags').filter(Q(name__icontains=keyword) | Q(
            description__icontains=keyword) | Q(tags__tag_name__icontains=keyword))

    if language_id != '':
        channels.filter(included_languages__id=language_id)

    return channels.annotate(tokens=Value(json.dumps(token_list), output_field=TextField()))\
        .filter(deleted=False, main_tree__published=True)\
        .order_by("-priority")\
        .distinct()


@cache_page(settings.PUBLIC_CHANNELS_CACHE_DURATION, key_prefix='get_public_channel_list')
@api_view(['GET'])
@permission_classes((AllowAny,))
@cache_no_user_data
def get_public_channel_list(request, version):
    """ Endpoint: /public/<version>/channels/?=<query params> """
    try:
        channel_list = _get_channel_list(version, request.query_params)
    except LookupError:
        return HttpResponseNotFound(_("Api endpoint {} is not available").format(version))
    return Response(PublicChannelSerializer(channel_list, many=True).data)


@api_view(['GET'])
@permission_classes((AllowAny,))
def get_public_channel_lookup(request, version, identifier):
    """ Endpoint: /public/<version>/channels/lookup/<identifier> """
    try:
        channel_list = _get_channel_list(version, request.query_params, identifier=identifier.strip().replace('-', ''))
    except LookupError:
        return HttpResponseNotFound(_("Api endpoint {} is not available").format(version))
    if not channel_list.exists():
        return HttpResponseNotFound(_("No channel matching {} found").format(identifier))
    return Response(PublicChannelSerializer(channel_list, many=True).data)


@api_view(['GET'])
@permission_classes((AllowAny,))
def get_channel_name_by_id(request, channel_id):
    """ Endpoint: /public/channels/<channel_id> """
    channel = Channel.objects.filter(pk=channel_id).first()
    if not channel:
        return HttpResponseNotFound('Channel with id {} not found'.format(channel_id))
    channel_info = {
        "name": channel.name,
        "description": channel.description,
        "version": channel.version
    }
    return Response(channel_info)


class InfoViewSet(viewsets.ViewSet):
    """
    An equivalent endpoint in kolibri which allows kolibri devices to know
    if this device can serve content.
    Spec doc: https://docs.google.com/document/d/1XKXQe25sf9Tht6uIXvqb3T40KeY3BLkkexcV08wvR9M/edit#
    """

    permission_classes = (AllowAny, )

    def list(self, request):
        """Returns metadata information about the type of device"""

        info = {'application': 'studio',
                'kolibri_version': None,
                'instance_id': None,
                'device_name': "Kolibri Studio",
                'operating_system': None,
                }
        return Response(info)
