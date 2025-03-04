import json
import re

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import redirect
from django.shortcuts import render
from django.shortcuts import get_object_or_404
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.response import Response

from .json_dump import json_for_parse_from_data
from contentcuration.decorators import browser_is_supported
from contentcuration.decorators import is_admin
from contentcuration.tasks import sendcustomemails_task
from contentcuration.utils.messages import get_messages
from contentcuration.views.base import current_user_for_context
from contentcuration.models import SecretToken, Channel
from contentcuration.viewsets.user import IsAdminUser
from contentcuration.viewsets.user import IsAuthenticated


@is_admin
@api_view(['POST'])
def send_custom_email(request):
    data = json.loads(request.body)
    try:
        sendcustomemails_task.enqueue(request.user, data["subject"], data["message"], data['query'])
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return Response({"success": True})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def support_token_redirect(request, token):

    if not request.user.is_admin:
            return Response({"Error": "Forbidden"}, status=403)

    try:
        # Inline regex for validating Proquint tokens
        token_regex = re.compile(
        r"^([bdfghjklmnprstvz][aeiou][bdfghjklmnprstvz][aeiou][bdfghjklmnprstvz])"
        r"(-[bdfghjklmnprstvz][aeiou][bdfghjklmnprstvz][aeiou][bdfghjklmnprstvz])*$"
        )

        if not token_regex.fullmatch(token):
            return Response({"Error": "Invalid token format"}, status=400)
        
        token_instance = SecretToken.objects.filter(token=token).first()
        if not token_instance:
            return Response({"Error": "Invalid token"}, status=404)

        channel = get_object_or_404(Channel, support_token__token=token)

        # Redirect to the channel edit page
        return redirect(f"channels/{channel.id}")
    
    except Channel.DoesNotExist:
        return Response({"Error": "Channel not found for token"}, status=404)

@login_required
@browser_is_supported
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
def administration(request):
    return render(request, 'administration.html', {
        "current_user": current_user_for_context(request.user),
        "default_sender": settings.DEFAULT_FROM_EMAIL,
        "messages": json_for_parse_from_data(get_messages()),
    })
