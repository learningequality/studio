from django.middleware.locale import LocaleMiddleware

LOCALE_EXEMPT = "_locale_exempt"


def locale_exempt(view):
    setattr(view, LOCALE_EXEMPT, True)
    return view


class KolibriStudioLocaleMiddleware(LocaleMiddleware):
    def _is_exempt(self, obj):
        return hasattr(obj, LOCALE_EXEMPT)

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if self._is_exempt(callback):
            setattr(request, LOCALE_EXEMPT, True)
        return None

    def process_response(self, request, response):
        if self._is_exempt(request):
            return response
        return super(KolibriStudioLocaleMiddleware, self).process_response(request, response)
