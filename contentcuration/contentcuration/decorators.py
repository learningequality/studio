from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render

from contentcuration.models import Channel

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
        if not request.user.is_anonymous() and request.user.is_admin:
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
                (not request.user.is_anonymous() and request.user.is_admin):
            return function(request, *args, **kwargs)

        return render(request, 'channel_not_found.html', status=404)

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


# NOTE: This approach only works because of a seeming bug in Django
# https://code.djangoproject.com/ticket/15855
# Essentially, what happens is that this decorator sets the Vary headers
# that cache_page uses to generate the full cache key. After this, however,
# middleware such as SessionMiddleware and LocaleMiddleware add their own
# Vary headers to the response. These headers are NOT included in the cache key,
# so we cannot currently use this decorator on calls that utilizes those
# middleware to customize the response. Also, if the caching function ever
# changes to incorporate the headers set by middleware, we will need to change this.
def cache_no_user_data(view_func):
    """
    Set appropriate Vary on headers on a view that specify there is
    no user specific data being rendered in the view.
    In order to ensure that the correct Vary headers are set,
    the session is deleted from the request, as otherwise Vary cookies
    will always be set by the Django session middleware.
    This should not be used on any view that bootstraps user specific
    data into it - this will remove the headers that will make this vary
    on a per user basis.
    """

    def wrap(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        response["vary"] = "accept-encoding, accept"
        return response

    return wrap
