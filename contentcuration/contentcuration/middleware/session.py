from django.contrib.sessions.middleware import SessionMiddleware

SESSION_EXEMPT = "_session_exempt"


def session_exempt(view):
    setattr(view, SESSION_EXEMPT, True)
    return view


class KolibriStudioSessionMiddleware(SessionMiddleware):
    def _is_exempt(self, obj):
        return hasattr(obj, SESSION_EXEMPT)

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if self._is_exempt(callback):
            setattr(request, SESSION_EXEMPT, True)
        return None

    def process_response(self, request, response):
        if self._is_exempt(request):
            return response
        return super(KolibriStudioSessionMiddleware, self).process_response(
            request, response
        )
