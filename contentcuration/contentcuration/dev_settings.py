from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = ["*", "192.168.99.102"]

ACCOUNT_ACTIVATION_DAYS = 7
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SITE_ID = 2
logging.basicConfig(level='DEBUG')

try:
    import debug_panel
except ImportError:
    # no debug panel, no use trying to add it to our middleware
    pass
else:
    # if debug_panel exists, add it to our INSTALLED_APPS
    INSTALLED_APPS += ('debug_panel', 'debug_toolbar', 'pympler')
    MIDDLEWARE_CLASSES += ('debug_panel.middleware.DebugPanelMiddleware',)
    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_TOOLBAR_CALLBACK': lambda x: True,
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
]

AWS_ACCESS_KEY_ID = "development"
AWS_SECRET_ACCESS_KEY = "development"
AWS_S3_ENDPOINT_URL = "http://localhost:9000"
