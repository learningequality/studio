from rest_framework import permissions
from contentcuration.models import Channel, ContentNode, File, ContentTag

class CustomPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
    	channel = None
    	if request.method in permissions.SAFE_METHODS:
            return True
    	elif isinstance(obj, Channel):
    		channel = obj
    	elif isinstance(obj, ContentNode):
    		channel = obj.get_channel()
    	elif isinstance(obj, ContentTag):
    		channel = obj.channel
    	elif isinstance(obj, File):
    		channel = obj.contentnode.get_channel()
    	import pdb; pdb.set_trace()
        return not channel or channel.editors.filter(pk=request.user.pk).exists()



class User(AbstractBaseUser, PermissionsMixin):
class Channel(models.Model):
class ContentTag(models.Model):
class License(models.Model):
class ContentNode(MPTTModel, models.Model):
class ContentKind(models.Model):
class FileFormat(models.Model):
class FormatPreset(models.Model):
class Language(models.Model):
class AssessmentItem(models.Model):
class File(models.Model):
class Invitation(models.Model):