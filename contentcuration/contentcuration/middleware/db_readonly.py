from django.http import HttpResponseBadRequest
from django.utils.translation import gettext as _

try:
    # Django 1.10+
    from django.utils.deprecation import MiddlewareMixin
except ImportError:
    # Before Django 1.9 and below
    class MiddlewareMixin(object):
        pass


from readonly.exceptions import DatabaseWriteDenied


class DatabaseReadOnlyMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        # Only process DatabaseWriteDenied exceptions
        if not isinstance(exception, DatabaseWriteDenied):
            return None

        # Handle the exception
        if request.method != "GET":
            return HttpResponseBadRequest(
                _("The site is currently in read-only mode. Please try again later.")
            )
