"""Gunicorn entrypoint for the CI browser smoke test.

Wraps Studio's WSGI application in WhiteNoise so gunicorn can serve /static/
itself, with no nginx in front. CI-only: production serves static through
nginx (docker/nginx/nginx.conf), so WhiteNoise is not a runtime dependency and
is installed only in the smoke-test job.

Run from the repo root:
    gunicorn integration_testing.smoke_wsgi:application --bind 0.0.0.0:8080
"""
import os
import sys

# contentcuration package lives one level down; put it on sys.path so
# contentcuration.wsgi / contentcuration.settings import.
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), os.pardir, "contentcuration")
)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

from django.conf import settings  # noqa: E402
from whitenoise import WhiteNoise  # noqa: E402

from contentcuration.wsgi import application as _application  # noqa: E402

# collectstatic populates STATIC_ROOT before gunicorn starts; WhiteNoise indexes
# it at import and serves it at STATIC_URL, passing everything else to Django.
application = WhiteNoise(
    _application, root=settings.STATIC_ROOT, prefix=settings.STATIC_URL
)
