#!/usr/bin/env python
import os

import requests
from base import BaseProbe


class WorkerProbe(BaseProbe):

    metric = "worker_ping_latency_msec"

    def do_probe(self):
        celery_dashboard_url = (
            os.getenv("CELERY_DASHBOARD_URL") or "http://127.0.0.1:5555/dashboard"
        )
        response = requests.get(celery_dashboard_url, params={"json": "1"})
        response.raise_for_status()

        active_workers = []
        for worker in response.json()["data"]:
            if worker["status"]:
                active_workers.append(worker["hostname"])

        if not active_workers:
            raise Exception("No workers are running!")


if __name__ == "__main__":
    WorkerProbe().run()
