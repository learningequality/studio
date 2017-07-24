from django.core.exceptions import PermissionDenied
from rest_framework import permissions
from contentcuration.models import Channel, ContentNode, ContentTag, File, User, AssessmentItem, Invitation

class CustomPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or request.user.is_admin:
            return True
        elif isinstance(obj, User) and obj.pk == request.user.pk:
            return True
        elif isinstance(obj, Invitation):
            if obj.channel.editors.filter(pk=request.user.pk).exists() or obj.channel.viewers.filter(pk=request.user.pk).exists():
                return True
        elif isinstance(obj, Channel):
            if channel.editors.filter(pk=request.user.pk).exists():
                return True
        elif isinstance(obj, ContentNode):
            channel = obj.get_channel()
            if not channel or channel.editors.filter(pk=request.user.pk).exists():
                return True
        elif isinstance(obj, ContentTag):
            if obj.channel and obj.channel.editors.filter(pk=request.user.pk).exists():
                return True
        elif isinstance(obj, File) or isinstance(obj, AssessmentItem):
            channel = obj.contentnode and obj.contentnode.get_channel()
            if not channel or channel.editors.filter(pk=request.user.pk).exists():
                return True

        raise PermissionDenied("Cannot edit models without editing permissions")
