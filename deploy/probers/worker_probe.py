#!/usr/bin/env python

from base import BaseProbe
import sys
sys.path.insert(1, '../../contentcuration')
from contentcuration import celery_app

class WorkerProbe(BaseProbe):

    metric = "worker_ping_latency_msec"

    def do_probe(self):
        workers = celery_app.control.inspect().ping()
        # import pdb; pdb.set_trace()
        if not workers:
            raise Exception('No workers are running! Yikes!')
        else:
            for worker, info in workers.items():
                if info[u'ok'] != 'pong':
                    raise Exception('Worker %s responded with an unexpected status `%s`!  Yikes!' % (worker, info[u'ok']))

if __name__ == "__main__":
    WorkerProbe().run()
