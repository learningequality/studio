import json
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.urlresolvers import reverse_lazy
from django.shortcuts import render, redirect
from django.template import RequestContext
from contentcuration.models import Channel
from contentcuration.utils.policies import check_policies
from django.shortcuts import render

ACCEPTED_BROWSERS = settings.HEALTH_CHECK_BROWSERS + settings.SUPPORTED_BROWSERS

def browser_is_supported(function):
    def wrap(request, *args, **kwargs):
        user_agent_string = request.META.get('HTTP_USER_AGENT') or ""

        # Check if the user agent string matches the Kubernetes agents, Google Health Check agents, or an accepted browser
        for expected_agent in ACCEPTED_BROWSERS:
            if expected_agent in user_agent_string:
                return function(request, *args, **kwargs)

        return render(request, 'unsupported_browser.html')

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap


def is_admin(function):
    def wrap(request, *args, **kwargs):
        if request.user.is_admin:
            return function(request, *args, **kwargs)

        return render(request, 'unauthorized.html', status=403)

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap

def can_access_channel(function):
    def wrap(request, *args, **kwargs):
        try:
            channel = Channel.objects.get(pk=kwargs['channel_id'])
        except ObjectDoesNotExist:
            return render(request, 'channel_not_found.html')

        if channel.public or \
            channel.editors.filter(id=request.user.id).exists() or \
            channel.viewers.filter(id=request.user.id).exists() or \
            request.user.is_admin:
            return function(request, *args, **kwargs)

        return render(request, 'unauthorized.html', status=403)

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap

def can_edit_channel(function):
    def wrap(request, *args, **kwargs):
        try:
            channel = Channel.objects.get(pk=kwargs['channel_id'], deleted=False)

            if not channel.editors.filter(id=request.user.id).exists() and not request.user.is_admin:
                return render(request, 'unauthorized.html', status=403)

            return function(request, *args, **kwargs)
        except ObjectDoesNotExist:
            return render(request, 'channel_not_found.html')

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap


def has_accepted_policies(function):
    def wrap(request, *args, **kwargs):
        if not request.user.is_authenticated():
            return function(request, *args, **kwargs)

        policies_to_accept = check_policies(request.user)
        if len(policies_to_accept):
            request.session["policies"] = json.dumps(policies_to_accept)
            return redirect(reverse_lazy("policy_update"))

        return function(request, *args, **kwargs)

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap
