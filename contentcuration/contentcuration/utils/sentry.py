from django.conf import settings


def report_exception(exception=None, user=None, contexts=None):
    if getattr(settings, "SENTRY_ACTIVE", False):
        from sentry_sdk import capture_exception

        scope_args = {"contexts": contexts}

        if user and not user.is_anonymous:
            scope_args["user"] = {
                "email": user.email,
            }

        capture_exception(exception, **scope_args)
