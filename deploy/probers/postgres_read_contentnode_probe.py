#!/usr/bin/env python
import os

import psycopg2
from base import BaseProbe


# Use dev options if no env set
DB_HOST = os.getenv("DATA_DB_HOST") or "localhost"
DB_PORT = 5432
DB_NAME = os.getenv("DATA_DB_NAME") or "kolibri-studio"
DB_USER = os.getenv("DATA_DB_USER") or "learningequality"
DB_PASSWORD = os.getenv("DATA_DB_PASS") or "kolibri"
TIMEOUT_SECONDS = 2


class PostgresReadContentnodeProbe(BaseProbe):
    metric = "postgres_read_contentnode_latency_msec"

    def do_probe(self):
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=TIMEOUT_SECONDS,
        )
        cur = conn.cursor()
        cur.execute("SELECT * FROM contentcuration_contentnode LIMIT 1;")
        num = cur.fetchone()
        conn.close()
        if not num:
            raise Exception("Reading a ContentNode in PostgreSQL database failed.")


if __name__ == "__main__":
    PostgresReadContentnodeProbe().run()
