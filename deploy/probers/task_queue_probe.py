#!/usr/bin/env python
from base import BaseProbe


class TaskQueueProbe(BaseProbe):

    metric = "task_queue_ping_latency_msec"
    threshold = 50

    def do_probe(self):
        r = self.request("api/probers/task_queue_status/")
        r.raise_for_status()
        results = r.json()

        task_count = results.get("queued_task_count", 0)
        if task_count >= self.threshold:
            raise Exception(
                "Task queue length is over threshold! {} > {}".format(
                    task_count, self.threshold
                )
            )


if __name__ == "__main__":
    TaskQueueProbe().run()
