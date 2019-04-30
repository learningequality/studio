#!/usr/bin/env python

from base import BaseProbe
import sys
sys.path.insert(1, '../../contentcuration')
from contentcuration import celery_app

EXPECTED_WORKERS = {'celery'}

class WorkerProbe(BaseProbe):

    metric = "worker_ping_latency_msec"

    def do_probe(self):
        workers = celery_app.control.inspect().ping()
        workers_present = set()
        get_worker_name = lambda worker: worker.split('@')[0]
        if not workers:
            raise Exception('No workers are running! Yikes!')
        else:
            for worker, info in workers.items():
                if info[u'ok'] != 'pong':
                    raise Exception('Worker %s responded with an unexpected status `%s`!  Huh?' % (worker, info[u'ok']))
                else:
                    workers_present.add(get_worker_name(worker))
            if workers_present != EXPECTED_WORKERS:
                raise Exception('The set of currently instantiated workers did not match what was expected!')

if __name__ == "__main__":
    WorkerProbe().run()
