import json
import time

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.shortcuts import render
from django.template.loader import render_to_string
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
from contentcuration.utils.messages import get_messages
from contentcuration.views.base import current_user_for_context


def send_custom_email(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)
    try:
        subject = render_to_string('registration/custom_email_subject.txt', {'subject': data["subject"]})
        recipients = User.objects.filter(email__in=data["emails"]).distinct()

        for recipient in recipients:
            text = data["message"].format(current_date=time.strftime("%A, %B %d"), current_time=time.strftime("%H:%M %Z"), **recipient.__dict__)
            message = render_to_string('registration/custom_email.txt', {'message': text})
            recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return HttpResponse(json.dumps({"success": True}))


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
