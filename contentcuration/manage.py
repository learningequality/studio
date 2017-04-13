#!/usr/bin/env python
import os
import sys


# Attach Python Cloud Debugger
try:
    import googleclouddebugger
    if os.getenv("RUN_CLOUD_DEBUGGER"):
        googleclouddebugger.enable(
            enable_service_account_auth=True,
            project_id=os.getenv('GOOGLE_CLOUD_PROJECT'),
            project_number=os.getenv('GOOGLE_CLOUD_PROJECT_NUMBER'),
            service_account_json_file=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
except ImportError:
    pass

if __name__ == "__main__":
    #import warnings
    #warnings.filterwarnings('ignore', message=r'Module .*? is being added to sys\.path', append=True)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
