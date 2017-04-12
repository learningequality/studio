from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = []

ACCOUNT_ACTIVATION_DAYS=7
# EMAIL_BACKEND = 'email_extras.backends.BrowsableEmailBackend'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SITE_ID =2
logging.basicConfig(level='DEBUG')

INSTALLED_APPS += ('debug_toolbar', 'pympler')

MIDDLEWARE_CLASSES += ('debug_toolbar.middleware.DebugToolbarMiddleware',)

DEBUG_TOOLBAR_CONFIG = {
	"SHOW_TOOLBAR_CALLBACK": lambda x: True,
}


DEBUG_TOOLBAR_PANELS = [
    'debug_toolbar.panels.versions.VersionsPanel',
    'debug_toolbar.panels.timer.TimerPanel',
    'debug_toolbar.panels.settings.SettingsPanel',
    'debug_toolbar.panels.headers.HeadersPanel',
    'debug_toolbar.panels.request.RequestPanel',
    'debug_toolbar.panels.sql.SQLPanel',
    'debug_toolbar.panels.staticfiles.StaticFilesPanel',
    'debug_toolbar.panels.templates.TemplatesPanel',
    'debug_toolbar.panels.cache.CachePanel',
    'debug_toolbar.panels.signals.SignalsPanel',
    'debug_toolbar.panels.logging.LoggingPanel',
    'debug_toolbar.panels.redirects.RedirectsPanel',
    # 'pympler.panels.MemoryPanel',
    # 'debug_toolbar.panels.profiling.ProfilingPanel',
]

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": "data.sqlite",
#         "OPTIONS": {
#             "timeout": 60,
#         },
#     }
# }