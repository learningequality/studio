import logging
import os

from .settings import *

DEBUG = True
ALLOWED_HOSTS = ["studio.local", "192.168.31.9", "127.0.0.1", "*"]

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

# set loggers to log on both stderr and a django.log file
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.getenv('DJANGO_LOG_FILE') or 'django.log'
        },
        'console': {
            'class': 'logging.StreamHandler',
        }
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': True,
        }
    }
}
