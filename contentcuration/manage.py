#!/usr/bin/env python
import os
import sys

os.environ.setdefault(
    "KOLIBRI_HOME", os.path.join(os.path.expanduser("~"), ".kolibri")
)

# Attach Python Cloud Debugger
if __name__ == "__main__":
    #import warnings
    #warnings.filterwarnings('ignore', message=r'Module .*? is being added to sys\.path', append=True)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
