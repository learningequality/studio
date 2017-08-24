import json
import logging
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.management import call_command
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q, Case, When, Value, IntegerField, F
from django.core.urlresolvers import reverse_lazy
from rest_framework.renderers import JSONRenderer
from contentcuration.api import check_supported_browsers, add_editor_to_channel, activate_channel, get_staged_diff
from contentcuration.models import VIEW_ACCESS, Language, Channel, License, FileFormat, FormatPreset, ContentKind, ContentNode, Invitation, User, SecretToken
from contentcuration.serializers import LanguageSerializer, AltChannelListSerializer, RootNodeSerializer, ChannelListSerializer, ChannelSerializer, PublicChannelSerializer, SimplifiedChannelListSerializer, LicenseSerializer, FileFormatSerializer, FormatPresetSerializer, ContentKindSerializer, CurrentUserSerializer, UserChannelListSerializer, InvitationSerializer
from contentcuration.utils.messages import get_messages
from rest_framework.authentication import SessionAuthentication, BasicAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from le_utils import proquint


def base(request):
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))
    if request.user.is_authenticated():
        return redirect('channels')
    else:
        return redirect('accounts/login')


def health(request):
    return HttpResponse("500")


def unsupported_browser(request):
    return render(request, 'unsupported_browser.html')


def unauthorized(request):
    return render(request, 'unauthorized.html')


def staging_not_found(request):
    return render(request, 'staging_not_found.html')


def get_or_set_cached_constants(constant, serializer):
    cached_data = cache.get(constant.__name__)
    if cached_data:
        return cached_data
    constant_objects = constant.objects.all()
    constant_serializer = serializer(constant_objects, many=True)
    constant_data = JSONRenderer().render(constant_serializer.data)
    cache.set(constant.__name__, constant_data, None)
    return constant_data


def redirect_to_channel(request, channel_id):
    channel = Channel.objects.get(pk=channel_id)
    if channel.editors.filter(pk=request.user.pk).exists():
        return redirect(reverse_lazy('channel', kwargs={'channel_id': channel_id}))
    elif channel.viewers.filter(pk=request.user.pk).exists() or channel.public:
        return redirect(reverse_lazy('channel_view_only', kwargs={'channel_id': channel_id}))
    return redirect(reverse_lazy('unauthorized'))


def redirect_to_channel_edit(request, channel_id):
    return redirect(reverse_lazy('channel', kwargs={'channel_id': channel_id}))


def redirect_to_channel_view(request, channel_id):
    return redirect(reverse_lazy('channel_view_only', kwargs={'channel_id': channel_id}))


def channel_page(request, channel, allow_edit=False, staging=False):
    channel_serializer = ChannelSerializer(channel)
    channel_list = Channel.objects.select_related('main_tree').prefetch_related('editors').prefetch_related('viewers')\
                          .exclude(id=channel.pk).filter(Q(deleted=False) & (Q(editors=request.user) | Q(viewers=request.user)))\
                          .annotate(is_view_only=Case(When(editors=request.user, then=Value(0)), default=Value(1), output_field=IntegerField()))\
                          .distinct().values("id", "name", "is_view_only").order_by('name')

    fileformats = get_or_set_cached_constants(FileFormat, FileFormatSerializer)
    licenses = get_or_set_cached_constants(License, LicenseSerializer)
    formatpresets = get_or_set_cached_constants(FormatPreset, FormatPresetSerializer)
    contentkinds = get_or_set_cached_constants(ContentKind, ContentKindSerializer)
    languages = get_or_set_cached_constants(Language, LanguageSerializer)

    token = None
    if channel.secret_tokens.filter(is_primary=True).exists():
        token = channel.secret_tokens.filter(is_primary=True).first().token
        token = token[:5] + "-" + token[5:]

    json_renderer = JSONRenderer()
    return render(request, 'channel_edit.html', {"allow_edit": allow_edit,
                                                 "staging": staging,
                                                 "is_public": channel.public,
                                                 "channel": json_renderer.render(channel_serializer.data),
                                                 "channel_id": channel.pk,
                                                 "channel_name": channel.name,
                                                 "channel_list": channel_list,
                                                 "fileformat_list": fileformats,
                                                 "license_list": licenses,
                                                 "fpreset_list": formatpresets,
                                                 "ckinds_list": contentkinds,
                                                 "langs_list": languages,
                                                 "current_user": json_renderer.render(CurrentUserSerializer(request.user).data),
                                                 "preferences": channel.preferences,
                                                 "messages": get_messages(),
                                                 "primary_token": token or channel.pk
                                                })


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel_list(request):
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    languages = get_or_set_cached_constants(Language, LanguageSerializer)

    return render(request, 'channel_list.html', {"channel_name": False,
                                                 "current_user": JSONRenderer().render(UserChannelListSerializer(request.user).data),
                                                 "user_preferences": request.user.preferences,
                                                 "langs_list": languages,
                                                 "messages": get_messages(),
                                                })


@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_channels(request):
    channel_list = Channel.objects.prefetch_related('editors').prefetch_related('viewers').filter(Q(deleted=False) & (Q(editors=request.user.pk) | Q(viewers=request.user.pk)))\
                    .annotate(is_view_only=Case(When(editors=request.user, then=Value(0)),default=Value(1),output_field=IntegerField()))
    channel_serializer = ChannelListSerializer(channel_list, many=True)

    return HttpResponse(JSONRenderer().render(channel_serializer.data))

@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_bookmarked_channels(request):
    bookmarked_channels = request.user.bookmarked_channels.exclude(deleted=True)\
                            .select_related('main_tree').prefetch_related('editors')\
                            .defer('trash_tree', 'clipboard_tree', 'staging_tree', 'chef_tree', 'previous_tree', 'viewers')
    return HttpResponse(JSONRenderer().render(AltChannelListSerializer(bookmarked_channels, many=True).data))


@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_edit_channels(request):
    edit_channels = request.user.editable_channels.exclude(deleted=True)\
                    .select_related('main_tree').prefetch_related('editors')\
                    .defer('trash_tree', 'clipboard_tree', 'staging_tree', 'chef_tree', 'previous_tree', 'viewers')
    return HttpResponse(JSONRenderer().render(AltChannelListSerializer(edit_channels, many=True).data))

@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_public_channels(request):
    channels = Channel.objects.filter(public=True)\
                    .exclude(deleted=True)\
                    .select_related('main_tree').prefetch_related('editors')\
                    .defer('trash_tree', 'clipboard_tree', 'staging_tree', 'chef_tree', 'previous_tree', 'viewers')
    return HttpResponse(JSONRenderer().render(AltChannelListSerializer(channels, many=True).data))

@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_view_channels(request):
    edit_channels = request.user.view_only_channels.exclude(deleted=True)\
                    .select_related('main_tree').prefetch_related('editors')\
                    .defer('trash_tree', 'clipboard_tree', 'staging_tree', 'chef_tree', 'previous_tree', 'viewers')
    return HttpResponse(JSONRenderer().render(AltChannelListSerializer(edit_channels, many=True).data))

@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_user_pending_channels(request):
    pending_list = Invitation.objects.select_related('channel', 'sender').filter(invited=request.user)
    invitation_serializer = InvitationSerializer(pending_list, many=True)

    return HttpResponse(JSONRenderer().render(invitation_serializer.data))


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel(request, channel_id):
    # Check if browser is supported
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel = get_object_or_404(Channel, id=channel_id, deleted=False)

    # Check user has permission to view channel
    if not channel.editors.filter(id=request.user.id).exists() and not request.user.is_admin:
        return redirect(reverse_lazy('channel_view_only', kwargs={'channel_id': channel_id}))

    return channel_page(request, channel, allow_edit=True)


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel_view_only(request, channel_id):
    # Check if browser is supported
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel = get_object_or_404(Channel, id=channel_id, deleted=False)

    # Check user has permission to view channel
    if not channel.public and not channel.editors.filter(id=request.user.id).exists() and not channel.viewers.filter(id=request.user.id).exists() and not request.user.is_admin:
        return redirect(reverse_lazy('unauthorized'))

    return channel_page(request, channel)


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel_staging(request, channel_id):
    # Check if browser is supported
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel = get_object_or_404(Channel, id=channel_id, deleted=False)

    # Check user has permission to edit channel
    if not channel.editors.filter(id=request.user.id).exists() and not request.user.is_admin:
        return redirect(reverse_lazy('unauthorized'))

    if not channel.staging_tree:
        return redirect(reverse_lazy('staging_not_found'))

    return channel_page(request, channel, allow_edit=True, staging=True)


@csrf_exempt
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            channel_id = data["channel_id"]
            request.user.can_edit(channel_id)
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        call_command("exportchannel", channel_id)
        return HttpResponse(json.dumps({
            "success": True,
            "channel": channel_id
        }))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def accessible_channels(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        accessible_list = ContentNode.objects.filter(
            pk__in=Channel.objects.select_related('main_tree')
            .filter(Q(deleted=False) & (Q(editors=request.user) | Q(viewers=request.user)))
            .exclude(pk=data["channel_id"]).values_list('main_tree_id', flat=True)
        )
        return HttpResponse(JSONRenderer().render(RootNodeSerializer(accessible_list, many=True).data))


def accept_channel_invite(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        invitation = Invitation.objects.get(pk=data['invitation_id'])
        channel = invitation.channel
        channel.is_view_only = invitation.share_mode == VIEW_ACCESS
        channel_serializer = ChannelListSerializer(channel)
        add_editor_to_channel(invitation)

        return HttpResponse(JSONRenderer().render(channel_serializer.data))


def activate_channel_endpoint(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        channel = Channel.objects.get(pk=data['channel_id'])
        activate_channel(channel)

        return HttpResponse(json.dumps({"success": True}))


def get_staged_diff_endpoint(request):
    if request.method == 'POST':
        return HttpResponse(json.dumps(get_staged_diff(json.loads(request.body)['channel_id'])))


@api_view(['GET'])
@permission_classes((AllowAny,))
def get_channel_name_by_id(request, channel_id):
    """ Endpoint: /public/channel/<channel_id> """
    try:
        channel = Channel.objects.get(pk=channel_id)
        return HttpResponse(json.dumps({"name": channel.name, "description": channel.description, "version": channel.version}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound('Channel with id {} not found'.format(channel_id))

@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def add_bookmark(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        try:
            user = User.objects.get(pk=data["user_id"])
            channel = Channel.objects.get(pk=data["channel_id"])
            channel.bookmarked_by.add(user)
            channel.save()

            return HttpResponse(json.dumps({"success": True}))
        except ObjectDoesNotExist:
            return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))

@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def remove_bookmark(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        try:
            user = User.objects.get(pk=data["user_id"])
            channel = Channel.objects.get(pk=data["channel_id"])
            channel.bookmarked_by.remove(user)
            channel.save()

            return HttpResponse(json.dumps({"success": True}))
        except ObjectDoesNotExist:
            return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))

@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def set_channel_priority(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        try:
            channel = Channel.objects.get(pk=data["channel_id"])
            channel.priority = data["priority"]
            channel.save()

            return HttpResponse(json.dumps({"success": True}))
        except ObjectDoesNotExist:
            return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))

@api_view(['GET'])
@permission_classes((AllowAny,))
def get_public_channel_list(request):
    try:
        keyword = request.query_params.get('keyword', '').strip()
        language_id = request.query_params.get('language', '').strip()
        token = request.query_params.get('token', '').strip().replace('-', '')
        channels = None

        if token != '':
            channels = Channel.objects.prefetch_related('secret_tokens').filter(Q(public=True) | Q(secret_tokens__contains=token))
        else:
            channels = Channel.objects.filter(public=True)

        if keyword != '':
            channels = channels.prefetch_related('tags').filter(Q(name__icontains=keyword) | Q(description__icontains=keyword) | Q(tags__tag_name__icontains=keyword))

        if language_id != '':
            channels = channels.select_related('language').filter(Q(language__id__icontains=language_id))

        return HttpResponse(json.dumps(PublicChannelSerializer(channels.order_by("-priority").distinct(), many=True).data))
    except ObjectDoesNotExist:
        return HttpResponseNotFound('Channel with token {} not found'.format(token))
