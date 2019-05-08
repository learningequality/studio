#!/usr/bin/env python
import os
from datetime import datetime

import psycopg2
from base import BaseProbe

# Use dev options if no env set
DB_HOST = os.getenv("DATA_DB_HOST") or "localhost"
DB_PORT = 5432
DB_NAME = os.getenv("DATA_DB_NAME") or "kolibri-studio"
DB_USER = os.getenv("DATA_DB_USER") or "learningequality"
DB_PASSWORD = os.getenv("DATA_DB_PASS") or "kolibri"
TIMEOUT_SECONDS = 2


class PostgresWriteContentnodeProbe(BaseProbe):
    metric = "postgres_write_contentnode_latency_msec"

    develop_only = True

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
        now = datetime.now()
        cur.execute(
            """
            INSERT INTO contentcuration_contentnode(id, content_id, kind_id, title, description,sort_order, created,
            modified, changed, lft, rght, tree_id, level, published, node_id, freeze_authoring_data, publishing, role_visibility)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            (
                "testpostgreswriteprobe",
                "testprobecontentid",
                "topic",
                "test postgres write contentnode probe",
                "test postgres write contentnode probe",
                1,
                now,
                now,
                True,
                1,
                1,
                1,
                1,
                False,
                "testprobenodeid",
                False,
                False,
                "test",
            ),
        )
        conn.close()


if __name__ == "__main__":
    PostgresWriteContentnodeProbe().run()
