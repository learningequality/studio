#!/usr/bin/env python
"""
The entrypoint for the studio-app docker image for development purposes.
This script is not used in the production, develop, or staging setups (k8s).

It currently has the following responsibilities:
  - Waits for postgres and minio to be ready
  - Runs the studio setup command
  - Run the CMD specified in the Dockerfile or passed in via docker compose file
"""
import logging
import os
import subprocess
import sys
import time


logging.basicConfig()

CONNECT_TRIES = 5


def check_postgresql_ready(postgres_checks=CONNECT_TRIES):
    import psycopg2

    """
    Check that postgres is ready to accept connections.
    """
    while True:
        try:
            psycopg2.connect(
                dbname=os.getenv("DATA_DB_NAME") or "kolibri-studio",
                user=os.getenv("DATA_DB_USER") or "learningequality",
                password=os.getenv("DATA_DB_PASS") or "kolibri",
                host=os.getenv("DATA_DB_HOST") or "localhost",
            )
            logging.info("Connected!")
            return True
        except psycopg2.OperationalError:
            if not postgres_checks:
                logging.error(
                    "Not able to connect to postgres within the allotted time!"
                )
                sys.exit(1)
            logging.info("DB refused connection. Waiting...")
            postgres_checks -= 1
            time.sleep(2)


def check_minio_ready(minio_checks=CONNECT_TRIES):
    import requests

    """
    Check that minio is accepting requests.
    """
    while True:
        url = os.getenv("AWS_S3_ENDPOINT_URL") or "http://localhost:9000"

        # Catch connection errors, as they will be thrown if minio is not ready
        try:
            robj = requests.get(url)
            if robj.status_code == 403:  # what we expect when we have no keys
                return True
        except requests.exceptions.ConnectionError:
            pass

        if not minio_checks:
            logging.error("Minio connection retries exceeded!")
            sys.exit(1)

        logging.info("Minio refused connection. Waiting...")
        minio_checks -= 1
        time.sleep(2)


def setup_studio():
    """
    Run the Studio `setup` management command that includes the following steps:
      - createcachetable
      - migrate
      - loadconstants
      - create admin account a@a.com:a
      - create sample user accounts: user@a.com:a, user@b.com:b, user@c.com:c
      - create sample channels
    """
    subprocess.call(
        [
            "python",
            "contentcuration/manage.py",
            "setup",
            "--settings=contentcuration.dev_settings",
        ]
    )


def run_cmd():
    cmd = sys.argv[1:]
    sys.exit(subprocess.call(cmd))


if __name__ == "__main__":
    check_postgresql_ready()
    check_minio_ready()
    setup_studio()
    run_cmd()
