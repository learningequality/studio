from contextlib import ContextDecorator

from django.conf import settings
from django.shortcuts import render


ACCEPTED_BROWSERS = settings.HEALTH_CHECK_BROWSERS + settings.SUPPORTED_BROWSERS


def browser_is_supported(function):
    def wrap(request, *args, **kwargs):
        user_agent_string = request.META.get("HTTP_USER_AGENT") or ""

        # Check if the user agent string matches the Kubernetes agents, Google Health Check agents, or an accepted browser
        for expected_agent in ACCEPTED_BROWSERS:
            if expected_agent in user_agent_string:
                return function(request, *args, **kwargs)

        return render(request, "unsupported_browser.html")

    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap


def is_admin(function):
    def wrap(request, *args, **kwargs):
        if not request.user.is_anonymous and request.user.is_admin:
            return function(request, *args, **kwargs)

        return render(request, "unauthorized.html", status=403)

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


class DelayUserStorageCalculation(ContextDecorator):
    """
    Decorator class that will dedupe and delay requests to enqueue storage calculation tasks for users
    until after the wrapped function has exited
    """

    depth = 0
    queue = []

    @property
    def is_active(self):
        return self.depth > 0

    def add(self, user_id):
        if user_id not in self.queue:
            self.queue.append(user_id)

    def __enter__(self):
        self.depth += 1

    def __exit__(self, exc_type, exc_val, exc_tb):
        from contentcuration.utils.user import calculate_user_storage

        self.depth -= 1
        if not self.is_active:
            user_ids = set(self.queue)
            self.queue = []
            for user_id in user_ids:
                calculate_user_storage(user_id)


delay_user_storage_calculation = DelayUserStorageCalculation()
