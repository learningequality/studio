import json

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.response import Response

from .json_dump import json_for_parse_from_data
from contentcuration.decorators import browser_is_supported
from contentcuration.decorators import is_admin
from contentcuration.models import User
from contentcuration.tasks import sendcustomemails_task
from contentcuration.utils.messages import get_messages
from contentcuration.views.base import current_user_for_context


@is_admin
@api_view(['POST'])
def send_custom_email(request):
    data = json.loads(request.body)
    try:
        sendcustomemails_task.delay(data["subject"], data["message"], data['query'])
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return Response({"success": True})


@login_required
@browser_is_supported
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
def administration(request):
    return render(request, 'administration.html', {
        "current_user": current_user_for_context(request.user),
        "default_sender": settings.DEFAULT_FROM_EMAIL,
        "messages": json_for_parse_from_data(get_messages()),
    })


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@is_admin
@api_view(['GET'])
def get_user_details(request, user_id):
    user = User.objects.get(pk=user_id)
    information = user.information or {}
    information.update({
        'edit_channels': user.editable_channels.filter(deleted=False).values('id', 'name'),
        'viewonly_channels': user.view_only_channels.filter(deleted=False).values('id', 'name'),
        'total_space': user.disk_space,
        'used_space': user.disk_space_used,
        'policies': user.policies,
    })
    return Response(information)
