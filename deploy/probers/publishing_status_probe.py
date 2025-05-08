#!/usr/bin/env python
import datetime
import os

from base import BaseProbe
from base import ProberException
from base import PRODUCTION_MODE_ON


ALERT_THRESHOLD = int(
    os.getenv("PROBER_PUBLISHING_ALERT_THRESHOLD") or 2 * 3600
)  # default = 2 hours
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"


class PublishingStatusProbe(BaseProbe):

    metric = "max_publishing_duration_sec"
    prober_name = "PUBLISHING_STATUS_PROBER"

    def run(self):
        if self.develop_only and PRODUCTION_MODE_ON:
            return

        r = self.request("api/probers/publishing_status/")
        results = r.json()
        now = datetime.datetime.now()
        max_duration = 0
        channel_ids = []

        for result in results:
            duration = (
                now - datetime.datetime.strptime(result["performed"], DATE_FORMAT)
            ).seconds
            max_duration = max(max_duration, duration)
            if duration >= ALERT_THRESHOLD or not result["task_id"]:
                channel_ids.append(result["channel_id"])

        if max_duration > 0:
            print(  # noqa: T201
                "{metric_name} {duration_sec}".format(
                    metric_name=self.metric, duration_sec=max_duration
                )
            )

        if channel_ids:
            raise ProberException(
                "Publishing alert for channels: {}".format(", ".join(channel_ids))
            )


if __name__ == "__main__":
    PublishingStatusProbe().run()
