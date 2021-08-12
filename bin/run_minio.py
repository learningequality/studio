#!/usr/bin/env python

import os
import pathlib
import subprocess

MINIO_RUN_TYPES = ["LOCAL", "GCS_PROXY"]

MINIO_LOCAL_HOME_STORAGE = pathlib.Path("/app") / "contentworkshop_content"

MINIO_CONFIG_DIR = MINIO_LOCAL_HOME_STORAGE / ".minio"

GOOGLE_APPLICATION_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

GOOGLE_GCS_PROJECT_ID = os.getenv("GOOGLE_GCS_PROJECT_ID")


if __name__ == "__main__":

    run_type = os.getenv("MINIO_RUN_TYPE")

    if run_type not in MINIO_RUN_TYPES:
        raise AssertionError("MINIO_RUN_TYPE must be one of {}".format(MINIO_RUN_TYPES))

    if run_type == "LOCAL":
        cmd = ["minio", "server", "-C", str(MINIO_CONFIG_DIR), str(MINIO_LOCAL_HOME_STORAGE)]
    elif run_type == "GCS_PROXY":

        if not os.path.exists(GOOGLE_APPLICATION_CREDENTIALS_PATH):
            raise AssertionError("the env var GOOGLE_APPLICATION_CREDENTIALS must be defined," " and pointing to a credentials file for your project.")

        if not GOOGLE_GCS_PROJECT_ID:
            raise AssertionError("$GOOGLE_GCS_PROJECT_ID must be defined with the project" " id where you store your objects.")
        cmd = ["minio", "gateway", "gcs", GOOGLE_GCS_PROJECT_ID]
    else:
        raise Exception("Unhandled run_type type: {}".format(run_type))

    subprocess.check_call(cmd)


