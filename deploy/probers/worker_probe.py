#!/usr/bin/env python
from base import BaseProbe


class WorkerProbe(BaseProbe):

    metric = "worker_ping_latency_msec"

    def do_probe(self):
        r = self.request("api/probers/celery_worker_status/")
        r.raise_for_status()
        results = r.json()

        active_workers = []
        for worker_hostname, worker_status in results.items():
            if "ok" in worker_status.keys():
                active_workers.append(worker_hostname)

        if not active_workers:
            raise Exception("No workers are running!")


if __name__ == "__main__":
    WorkerProbe().run()
