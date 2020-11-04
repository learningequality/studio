"""
WSGI config for contentcuration project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/howto/deployment/wsgi/
"""
import os

from django.core.wsgi import get_wsgi_application

# Attach newrelic APM
try:
    import newrelic.agent

    newrelic.agent.initialize()
except ImportError:
    pass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")
application = get_wsgi_application()
