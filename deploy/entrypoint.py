#!/usr/bin/env python2
"""
The entrypoint for the studio-app docker image.

It currently has the following responsibilities:

- Waits for minio, postgres and redis to be ready.
"""

import logging
import os
import subprocess
import sys
import time

import psycopg2
import requests

logging.basicConfig()

CONNECT_TRIES = 5

DEFAULT_CMD = [
    "make",
    "devserver",
]


def check_postgresql_ready(postgres_checks=CONNECT_TRIES):
    """
    Check that postgres is ready to accept connections.
    """
    while True:
        try:
            psycopg2.connect(
                dbname=os.getenv("DATA_DB_NAME") or "gonano",
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
    """
    Check that minio is accepting requests.
    """
    while True:
        url = os.getenv("AWS_S3_ENDPOINT_URL") or "http://localhost:9000"
        robj = requests.get(url)
        if robj.status_code == 403:  # what we expect when we have no keys
            return True

        if not minio_checks:
            logging.error("Minio connection retries exceeded!")
            sys.exit(1)

        logging.info("Minio refused connection. Waiting...")
        minio_checks -= 1
        time.sleep(2)


def run_cmd():
   cmd = sys.argv[1:]
   sys.exit(subprocess.call(cmd))



if __name__ == "__main__":
    # check_postgresql_ready()
    # check_minio_ready()
    run_cmd()
