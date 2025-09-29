#!/usr/bin/env python
from base import BaseProbe


class UnappliedChangesProbe(BaseProbe):

    metric = "unapplied__changes_ping_latency_msec"

    def do_probe(self):
        r = self.request("api/probers/unapplied_changes_status/")
        r.raise_for_status()
        results = r.json()

        active_task_count = results.get("active_task_count", 0)
        unapplied_changes_count = results.get("unapplied_changes_count", 0)

        if active_task_count == 0 and unapplied_changes_count > 0:
            raise Exception(
                "There are unapplied changes and no active tasks! {} unapplied changes".format(
                    unapplied_changes_count
                )
            )


if __name__ == "__main__":
    UnappliedChangesProbe().run()
