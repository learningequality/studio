import threading
import time

import debug_panel.urls
from debug_panel.cache import cache
from debug_panel.middleware import DebugPanelMiddleware
from django.urls import reverse


class CustomDebugPanelMiddleware(DebugPanelMiddleware):
    """
    Custom version to fix SQL escaping:
    https://github.com/recamshak/django-debug-panel/issues/17#issuecomment-366268893
    """

    def process_response(self, request, response):
        """
        Store the DebugToolbarMiddleware rendered toolbar into a cache store.
        The data stored in the cache are then reachable from an URL that is appened
        to the HTTP response header under the 'X-debug-data-url' key.
        """
        toolbar = self.__class__.debug_toolbars.get(
            threading.current_thread().ident, None
        )

        response = super(DebugPanelMiddleware, self).process_response(request, response)

        if toolbar:
            # for django-debug-toolbar >= 1.4
            for panel in reversed(toolbar.enabled_panels):
                if (
                    hasattr(panel, "generate_stats") and not panel.get_stats()
                ):  # PATCH HERE
                    panel.generate_stats(request, response)

            cache_key = "%f" % time.time()
            cache.set(cache_key, toolbar.render_toolbar())

            response["X-debug-data-url"] = request.build_absolute_uri(
                reverse(
                    "debug_data",
                    urlconf=debug_panel.urls,
                    kwargs={"cache_key": cache_key},
                )
            )

        return response
