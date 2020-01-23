from django.core.exceptions import PermissionDenied
from past.builtins import basestring
from rest_framework import permissions

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import Invitation
from contentcuration.models import User


def user_can_edit(user, channel):
    if isinstance(channel, int) or isinstance(channel, basestring):
        channel = Channel.objects.filter(pk=channel).first()
    if not user.is_admin and channel and not channel.editors.filter(pk=user.pk).exists():
        raise PermissionDenied("Cannot edit content")
    return True


def user_can_view(user, channel):
    if isinstance(channel, int) or isinstance(channel, basestring):
        channel = Channel.objects.filter(pk=channel).first()
    if not user.is_admin and channel and not channel.editors.filter(pk=user.pk).exists() and not channel.viewers.filter(pk=user.pk).exists():
        raise PermissionDenied("Cannot view content")
    return True


class CustomPermission(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):  # noqa: C901
        if request.method in permissions.SAFE_METHODS or request.user.is_admin:
            return True
        elif isinstance(obj, User) and obj.pk == request.user.pk:
            return True
        elif isinstance(obj, Invitation):
            if obj.channel.pending_editors.filter(pk=obj.pk).exists() or \
               obj.channel.pending_editors.filter(pk=obj.pk).exists() or \
               user_can_view(request.user, obj.channel):
                return True
        elif isinstance(obj, ChannelSet):
            return request.user.is_admin or obj.editors.filter(pk=request.user.pk).exists()
        elif isinstance(obj, Channel):
            if user_can_edit(request.user, obj):
                return True
        elif isinstance(obj, ContentNode):
            if user_can_edit(request.user, obj.get_channel()):
                return True
        elif isinstance(obj, ContentTag):
            if user_can_edit(request.user, obj.channel):
                return True
        elif isinstance(obj, File) or isinstance(obj, AssessmentItem):
            if user_can_edit(request.user, obj.contentnode and obj.contentnode.get_channel()):
                return True

        raise PermissionDenied("Cannot edit models without editing permissions")
