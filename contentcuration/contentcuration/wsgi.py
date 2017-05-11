"""
WSGI config for contentcuration project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

# Attach Python Cloud Debugger
# try:
#     import googleclouddebugger
#     if os.getenv("RUN_CLOUD_DEBUGGER"):
#         googleclouddebugger.enable(
#             enable_service_account_auth=True,
#             project_id=os.getenv('GOOGLE_CLOUD_PROJECT'),
#             project_number=os.getenv('GOOGLE_CLOUD_PROJECT_NUMBER'),
#             service_account_json_file=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
# except ImportError:
#     pass

application = get_wsgi_application()
