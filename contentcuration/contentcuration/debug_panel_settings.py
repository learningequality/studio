from .dev_settings import *  # noqa

# These endpoints will throw an error on the django debug panel.
EXCLUDED_DEBUG_URLS = [
    "/content/storage",

    # Disabling sync API because as soon as the sync API gets polled
    # the current request data gets overwritten.
    # Can be removed after websockets deployment.
    "/api/sync",
]

DEBUG_PANEL_ACTIVE = True


def custom_show_toolbar(request):
    return not any(
        request.path.startswith(url) for url in EXCLUDED_DEBUG_URLS
    )  # noqa F405


# if debug_panel exists, add it to our INSTALLED_APPS.
INSTALLED_APPS += ("debug_panel", "debug_toolbar", "pympler")  # noqa F405
MIDDLEWARE += (  # noqa F405
    "debug_toolbar.middleware.DebugToolbarMiddleware",
)
DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": custom_show_toolbar,
}
