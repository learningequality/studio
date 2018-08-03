#!/usr/bin/env python2
"""
Download the latest messages from CrowdIn.

We only download the latest strings if both the CROWDIN_PROJECT
and CROWDIN_API_KEY environment variables are defined.

Both environment variables are used to authenticate to CrowdIn.
We then use subprocess to spawn `make downloadmessages`. downloadmessages.py
expects to be called in the root of the project directory, where
`make downloadmessages` would actually run.
"""
from __future__ import print_function

import os
import subprocess
import sys


def main():
    """
    The main function, i.e. the entrypoint.

    Checks for the existence of CROWDIN_PROJECT and
    CROWDIN_API_KEY env vars, and then calls downloadmessages
    if they're present.
    """
    if os.getenv("CROWDIN_PROJECT") and os.getenv("CROWDIN_API_KEY"):
        msg = "Downloading messages."
        print(msg)
        ret = subprocess.call(
            ["make", "ensurecrowdinclient", "downloadmessages"]
        )
        sys.exit(ret)
    else:
        msg = ("CROWDIN_PROJECT or CROWDIN_API_KEY isn't defined;"
               "not executing anything.")
        print(msg)


if __name__ == "__main__":
    main()
